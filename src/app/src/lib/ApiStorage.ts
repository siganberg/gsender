import api from 'app/api';
import store from 'app/store';
import pubsub from 'pubsub-js';
import controller from 'app/lib/controller';

export interface ApiStorageOptions {
    syncOnInit?: boolean;
    debounceDelay?: number;
}

class ApiStorage {
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private syncPromise: Promise<void> | null = null;
    private options: ApiStorageOptions;

    constructor(options: ApiStorageOptions = {}) {
        this.options = {
            syncOnInit: true,
            debounceDelay: 300,
            ...options,
        };

        if (this.options.syncOnInit) {
            this.syncFromAPI();
        }

        // Listen for real-time state changes from other devices
        this.setupSocketListener();
    }

    get<T = any>(key: string, defaultValue?: T): T {
        return store.get(`workspace.${key}`, defaultValue);
    }

    async set<T = any>(key: string, value: T): Promise<void> {
        store.set(`workspace.${key}`, value);

        console.log(`📤 ApiStorage: Setting ${key} = ${value}`); // eslint-disable-line no-console
        this.debounceApiUpdate(key, value);
    }

    private debounceApiUpdate<T>(key: string, value: T): void {
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(async () => {
            try {
                console.log(`📡 ApiStorage: Sending to API: ${key} = ${value}`); // eslint-disable-line no-console
                
                const response = await api.setState({ [key]: value });
                console.log(`✅ ApiStorage: API call successful for ${key}`, response); // eslint-disable-line no-console
            } catch (error) {
                console.warn(`Failed to sync ${key} to API:`, error);
            }
            this.debounceTimers.delete(key);
        }, this.options.debounceDelay);

        this.debounceTimers.set(key, timer);
    }

    async syncFromAPI(): Promise<void> {
        if (this.syncPromise) {
            return this.syncPromise;
        }

        this.syncPromise = this.performSync();
        return this.syncPromise;
    }

    private async performSync(): Promise<void> {
        try {
            const response = await api.getState();
            const apiState = response.data;

            if (apiState && typeof apiState === 'object') {
                let hasChanges = false;
                Object.entries(apiState).forEach(([key, value]) => {
                    const currentValue = store.get(`workspace.${key}`);
                    if (currentValue !== value) {
                        store.set(`workspace.${key}`, value);
                        hasChanges = true;
                    }
                });
                
                // Trigger settings repopulation if there were changes
                if (hasChanges) {
                    pubsub.publish('repopulate');
                }
            }
        } catch (error) {
            console.warn('Failed to sync from API:', error);
        } finally {
            this.syncPromise = null;
        }
    }

    async syncToAPI(key?: string): Promise<void> {
        try {
            if (key) {
                const value = this.get(key);
                await api.setState({ [key]: value });
            } else {
                const workspace = store.get('workspace', {});
                await api.setState(workspace);
            }
        } catch (error) {
            console.warn('Failed to sync to API:', error);
        }
    }

    async replace<T = any>(key: string, value: T): Promise<void> {
        store.replace(`workspace.${key}`, value);
        await this.syncToAPI(key);
    }

    async unset(key: string): Promise<void> {
        store.unset(`workspace.${key}`);
        
        try {
            await api.unsetState({ key });
        } catch (error) {
            console.warn(`Failed to unset ${key} from API:`, error);
        }
    }

    private setupSocketListener(): void {
        // Listen for state changes broadcasted from the server
        console.log('🔗 ApiStorage: Setting up socket listener for state:change');
        controller.addListener('state:change', this.handleRemoteStateChange.bind(this));
    }

    private handleRemoteStateChange(stateChanges: Record<string, any>): void {
        console.log('🔄 ApiStorage: Received remote state changes:', stateChanges);
        let hasChanges = false;
        
        Object.entries(stateChanges).forEach(([key, value]) => {
            const workspaceKey = `workspace.${key}`;
            const currentValue = store.get(workspaceKey);
            
            console.log(`🔄 ApiStorage: Checking ${workspaceKey}: current=${currentValue}, new=${value}`);
            
            if (currentValue !== value) {
                console.log(`🔄 ApiStorage: Updating ${workspaceKey} from ${currentValue} to ${value}`);
                store.set(workspaceKey, value);
                hasChanges = true;
                
                // For enableDarkMode, also trigger immediate visual update
                if (key === 'enableDarkMode') {
                    console.log(`🌙 ApiStorage: Applying dark mode immediately: ${value}`);
                    if (value) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            }
        });

        // Trigger settings repopulation if there were changes
        if (hasChanges) {
            console.log('🔄 ApiStorage: Publishing repopulate event');
            pubsub.publish('repopulate');
        }
    }

    destroy(): void {
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // Remove socket listener
        controller.removeListener('state:change', this.handleRemoteStateChange.bind(this));
    }
}

export default ApiStorage;