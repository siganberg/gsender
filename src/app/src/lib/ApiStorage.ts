import api from 'app/api';
import store from 'app/store';
import pubsub from 'pubsub-js';

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
    }

    get<T = any>(key: string, defaultValue?: T): T {
        return store.get(`workspace.${key}`, defaultValue);
    }

    async set<T = any>(key: string, value: T): Promise<void> {
        store.set(`workspace.${key}`, value);

        this.debounceApiUpdate(key, value);
    }

    private debounceApiUpdate<T>(key: string, value: T): void {
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(async () => {
            try {
                await api.setState({ [key]: value });
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

    destroy(): void {
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}

export default ApiStorage;