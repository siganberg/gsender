import { useEffect, useState, useCallback } from 'react';
import apiStore from 'app/lib/apiStore';
import store from 'app/store';

export const useDarkModeApi = () => {
    const [enableDarkMode, setEnableDarkMode] = useState<boolean>(
        () => apiStore.get('enableDarkMode', false)
    );

    const updateDarkMode = useCallback((newValue: boolean) => {
        setEnableDarkMode(newValue);
        apiStore.set('enableDarkMode', newValue);
    }, []);

    useEffect(() => {
        const handleStoreChange = () => {
            const currentValue = store.get('workspace.enableDarkMode', false);
            setEnableDarkMode(currentValue);
        };

        store.on('change', handleStoreChange);
        
        return () => {
            store.off('change', handleStoreChange);
        };
    }, []);

    useEffect(() => {
        if (enableDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [enableDarkMode]);

    return {
        enableDarkMode,
        setEnableDarkMode: updateDarkMode
    };
};