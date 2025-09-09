import { useEffect, useState } from 'react';
import { getServerSetting } from 'app/features/Config/utils/ServerSettings';
import store from 'app/store';
import pubsub from 'pubsub-js';

export const useDarkMode = () => {
    const [enableDarkMode, setEnableDarkMode] = useState(() => {
        // Try to get initial value from workspace store as fallback to prevent flash
        // This helps during the transition period or if server settings fail to load
        try {
            return store.get('workspace.enableDarkMode', false);
        } catch {
            return false;
        }
    });

    useEffect(() => {
        // Load value from server settings (this is the authoritative source)
        const loadDarkMode = async () => {
            try {
                const value = await getServerSetting('enableDarkMode', false);
                setEnableDarkMode(value);
                console.log('🎨 Loaded dark mode from server:', value);
            } catch (error) {
                console.warn('Failed to load dark mode from server, keeping current value:', error);
            }
        };

        loadDarkMode();

        // Subscribe to server setting changes for real-time sync across devices
        const token = pubsub.subscribe('server-setting-changed', (msg, data) => {
            if (data.key === 'enableDarkMode') {
                setEnableDarkMode(data.value);
                console.log('🎨 Dark mode synced from another device:', data.value);
            }
        });

        return () => {
            pubsub.unsubscribe(token);
        };
    }, []);

    useEffect(() => {
        if (enableDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [enableDarkMode]);
};
