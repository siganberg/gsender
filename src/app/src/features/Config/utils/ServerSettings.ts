import api from 'app/api';
import store from 'app/store';
import pubsub from 'pubsub-js';
import controller from 'app/lib/controller';

/**
 * Server-side settings management utility
 * Handles migration from workspace storage to server-side storage
 */

export interface ServerSettingsCache {
    [key: string]: any;
}

class ServerSettingsManager {
    private cache: ServerSettingsCache = {};
    private migrationComplete = false;

    /**
     * Get a setting from server-side storage only
     */
    async getSetting(key: string, defaultValue?: any): Promise<any> {
        try {
            // Check cache first
            if (this.cache.hasOwnProperty(key)) {
                return this.cache[key];
            }

            // Get from server-side storage
            const response = await api.getState({ key });
            const value = response.data !== undefined && response.data !== null ? response.data : defaultValue;
            
            this.cache[key] = value;
            return value;
        } catch (error) {
            console.warn(`Failed to get server setting '${key}':`, error);
            return defaultValue;
        }
    }

    /**
     * Get a setting synchronously from cache only
     * Use this for components that can't wait for async server calls
     */
    getSettingSync(key: string, defaultValue?: any): any {
        // Check cache first
        if (this.cache.hasOwnProperty(key)) {
            return this.cache[key];
        }

        // Return default value if not cached
        return defaultValue;
    }

    /**
     * Set a setting in server-side storage
     */
    async setSetting(key: string, value: any): Promise<boolean> {
        try {
            await api.setState({ [key]: value });
            this.cache[key] = value;
            
            // Emit server setting change for real-time sync across devices
            this.notifySettingChange(key, value);
            
            return true;
        } catch (error) {
            console.error(`Failed to set server setting '${key}':`, error);
            return false;
        }
    }

    /**
     * Notify other connected devices about setting changes
     */
    private notifySettingChange(key: string, value: any): void {
        // Publish locally for same-device tabs
        pubsub.publish('server-setting-changed', { key, value });
        
        // Emit socket event for cross-device synchronization
        if (controller && controller.socket && controller.connected) {
            controller.socket.emit('server-setting-changed', { key, value });
            console.log(`📡 Broadcast server setting change to all devices: ${key} = ${value}`);
        } else {
            console.warn('Controller not connected, server setting change not broadcasted to other devices');
        }
    }

    /**
     * Batch migrate workspace settings to server-side storage
     */
    async migrateWorkspaceSettings(): Promise<void> {
        if (this.migrationComplete) return;

        console.log('Starting workspace to server settings migration...');

        const settingsToMigrate = [
            // Basic settings
            { server: 'workspace.units', workspace: 'workspace.units' },
            { server: 'workspace.defaultFirmware', workspace: 'workspace.defaultFirmware' },
            { server: 'workspace.safeRetractHeight', workspace: 'workspace.safeRetractHeight' },
            { server: 'workspace.outlineMode', workspace: 'workspace.outlineMode' },
            { server: 'workspace.sendUsageData', workspace: 'workspace.sendUsageData' },
            { server: 'workspace.enableDarkMode', workspace: 'workspace.enableDarkMode' },
            { server: 'workspace.customDecimalPlaces', workspace: 'workspace.customDecimalPlaces' },
            { server: 'workspace.shouldWarnZero', workspace: 'workspace.shouldWarnZero' },
            
            // Probe settings
            { server: 'workspace.probeProfile.touchplateType', workspace: 'workspace.probeProfile.touchplateType' },
            { server: 'workspace.probeProfile.zThickness', workspace: 'workspace.probeProfile.zThickness' },
            { server: 'workspace.probeProfile.xyThickness', workspace: 'workspace.probeProfile.xyThickness' },
            { server: 'workspace.probeProfile.ballDiameter', workspace: 'workspace.probeProfile.ballDiameter' },
            { server: 'workspace.probeProfile.zPlungeDistance', workspace: 'workspace.probeProfile.zPlungeDistance' },
            { server: 'workspace.probeProfile.zThickness3DTouch', workspace: 'workspace.probeProfile.zThickness3DTouch' },
            
            // Machine settings
            { server: 'workspace.park', workspace: 'workspace.park' },
            { server: 'workspace.spindleFunctions', workspace: 'workspace.spindleFunctions' },
            { server: 'workspace.coolantFunctions', workspace: 'workspace.coolantFunctions' },
            
            // Rotary settings
            { server: 'workspace.rotaryAxis.firmwareSettings.$101', workspace: 'workspace.rotaryAxis.firmwareSettings.$101' },
            { server: 'workspace.rotaryAxis.firmwareSettings.$111', workspace: 'workspace.rotaryAxis.firmwareSettings.$111' },
            { server: 'workspace.rotaryAxis.firmwareSettings.$21', workspace: 'workspace.rotaryAxis.firmwareSettings.$21' },
            { server: 'workspace.rotaryAxis.firmwareSettings.$20', workspace: 'workspace.rotaryAxis.firmwareSettings.$20' },
            
            // Tool changing settings
            { server: 'workspace.toolChange.passthrough', workspace: 'workspace.toolChange.passthrough' },
            { server: 'workspace.toolChangeOption', workspace: 'workspace.toolChangeOption' },
            { server: 'workspace.toolChange.skipDialog', workspace: 'workspace.toolChange.skipDialog' },
            { server: 'workspace.toolChangePosition', workspace: 'workspace.toolChangePosition' },
            { server: 'workspace.toolChangeHooks.preHook', workspace: 'workspace.toolChangeHooks.preHook' },
            { server: 'workspace.toolChangeHooks.postHook', workspace: 'workspace.toolChangeHooks.postHook' },
            
            // Other settings
            { server: 'workspace.repurposeDoorAsPause', workspace: 'workspace.repurposeDoorAsPause' },
        ];

        let migratedCount = 0;
        let errorCount = 0;

        for (const setting of settingsToMigrate) {
            try {
                const workspaceValue = store.get(setting.workspace);
                if (workspaceValue !== undefined) {
                    const success = await this.setSetting(setting.server, workspaceValue);
                    if (success) {
                        migratedCount++;
                        console.log(`✓ Migrated ${setting.workspace} → ${setting.server}`);
                    } else {
                        errorCount++;
                    }
                }
            } catch (error) {
                console.error(`✗ Failed to migrate ${setting.workspace}:`, error);
                errorCount++;
            }
        }

        console.log(`Migration complete: ${migratedCount} settings migrated, ${errorCount} errors`);
        this.migrationComplete = true;
    }

    /**
     * Clear the cache (useful for testing or manual refresh)
     */
    clearCache(): void {
        this.cache = {};
    }

    /**
     * Get all cached settings (for debugging)
     */
    getCache(): ServerSettingsCache {
        return { ...this.cache };
    }
}

// Export singleton instance
export const serverSettings = new ServerSettingsManager();

// Subscribe to server setting changes to update cache for sync functions
if (typeof window !== 'undefined') {
    pubsub.subscribe('server-setting-changed', (msg, data) => {
        // Update cache so sync functions return fresh values
        serverSettings.clearCache();
        serverSettings['cache'][data.key] = data.value;
        console.log(`📡 Updated cache for '${data.key}' from local broadcast`);
    });
    
    // Listen for server setting changes from other devices via Socket.IO
    controller.addListener('server-setting-changed', (data) => {
        // Update cache
        serverSettings.clearCache();
        serverSettings['cache'][data.key] = data.value;
        
        // Publish locally so UI components update
        pubsub.publish('server-setting-changed', data);
        
        console.log(`🌐 Received server setting change from another device: ${data.key} = ${data.value}`);
    });
}

// Export convenience functions
export const getServerSetting = (key: string, defaultValue?: any) =>
    serverSettings.getSetting(key, defaultValue);

export const getServerSettingSync = (key: string, defaultValue?: any) =>
    serverSettings.getSettingSync(key, defaultValue);

export const setServerSetting = (key: string, value: any) =>
    serverSettings.setSetting(key, value);

export const migrateWorkspaceSettings = () =>
    serverSettings.migrateWorkspaceSettings();