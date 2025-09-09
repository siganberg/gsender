/**
 * Unified batch operations for all server settings in Config
 * This provides a centralized way to handle all server settings as one "Config" group
 */

import { setServerSettings } from './ServerSettings';

export interface ServerSettingApplier {
    (): Promise<{ settings: Record<string, any>; changed: number }>;
}

/**
 * Global registry for all server setting appliers
 * Each ServerSettingInput registers its applier function here
 */
declare global {
    interface Window {
        serverSettingAppliers?: Record<string, ServerSettingApplier>;
    }
}

/**
 * Apply all server settings in one batch operation
 * This is called from the main settings apply function
 */
export async function applyAllServerSettings(): Promise<{
    success: number;
    failed: number;
    totalComponents: number;
}> {
    const appliers = Object.values(window.serverSettingAppliers || {});
    
    if (appliers.length === 0) {
        return { success: 0, failed: 0, totalComponents: 0 };
    }

    console.log(`📡 Collecting server settings from ${appliers.length} components...`);

    try {
        // Collect all changed server settings
        const allServerSettings: Record<string, any> = {};
        let totalChanges = 0;

        // Execute all appliers in parallel
        const results = await Promise.allSettled(appliers.map(applier => applier()));

        // Process results and collect settings
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const { settings, changed } = result.value;
                Object.assign(allServerSettings, settings);
                totalChanges += changed;
            } else {
                console.error(`Server setting applier ${index} failed:`, result.reason);
            }
        });

        const settingsCount = Object.keys(allServerSettings).length;
        
        if (settingsCount > 0) {
            console.log(`🚀 Applying ${settingsCount} server settings in unified Config batch...`);
            
            const { success, failed } = await setServerSettings(allServerSettings);
            
            console.log(`✅ Config batch complete: ${success.length} applied${failed.length > 0 ? `, ${failed.length} failed` : ''}`);
            
            return {
                success: success.length,
                failed: failed.length,
                totalComponents: appliers.length
            };
        } else {
            console.log('No server settings changes to apply');
            return { success: 0, failed: 0, totalComponents: appliers.length };
        }

    } catch (error) {
        console.error('Failed to apply server settings batch:', error);
        return { success: 0, failed: Object.keys(window.serverSettingAppliers || {}).length, totalComponents: appliers.length };
    }
}

/**
 * Register a server setting applier
 */
export function registerServerSettingApplier(id: string, applier: ServerSettingApplier): () => void {
    if (!window.serverSettingAppliers) {
        window.serverSettingAppliers = {};
    }
    
    window.serverSettingAppliers[id] = applier;
    
    // Return cleanup function
    return () => {
        delete window.serverSettingAppliers?.[id];
    };
}

/**
 * Get count of registered appliers (for debugging)
 */
export function getServerSettingApplierCount(): number {
    return Object.keys(window.serverSettingAppliers || {}).length;
}