import { useEffect, useState } from 'react';
import apiStore from 'app/lib/apiStore';
import store from 'app/store';

export const useDarkMode = () => {
    const [enableDarkMode, setEnableDarkModeState] = useState<boolean>(
        () => apiStore.get('enableDarkMode', false)
    );

    useEffect(() => {
        const handleStoreChange = () => {
            const currentValue = store.get('workspace.enableDarkMode', false);
            setEnableDarkModeState(currentValue);
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
};
