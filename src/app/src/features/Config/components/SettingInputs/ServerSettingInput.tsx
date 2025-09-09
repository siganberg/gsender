import React, { useState, useEffect } from 'react';
import { gSenderSetting, gSenderSettingsValues } from 'app/features/Config/assets/SettingsMenu.ts';
import { getServerSetting, setServerSetting, serverSettings } from 'app/features/Config/utils/ServerSettings.ts';
import { registerServerSettingApplier } from 'app/features/Config/utils/ServerSettingsBatch.ts';
import { useSettings } from 'app/features/Config/utils/SettingsContext.tsx';
import { BooleanSettingInput } from './BooleanSettingInput.tsx';
import { SelectSettingInput } from './SelectSettingInput.tsx';
import { NumberSettingInput } from './NumberSettingInput.tsx';
import { RadioSettingInput } from './RadioSettingInput.tsx';
import api from 'app/api';
import pubsub from 'pubsub-js';

interface ServerSettingInputProps {
    setting: gSenderSetting;
    index: number;
    onChange: (value: gSenderSettingsValues) => void;
}

export const ServerSettingInput: React.FC<ServerSettingInputProps> = ({
    setting,
    index,
    onChange,
}) => {
    const [value, setValue] = useState<gSenderSettingsValues>(setting.defaultValue || '');
    const [originalValue, setOriginalValue] = useState<gSenderSettingsValues>(setting.defaultValue || '');
    const [loading, setLoading] = useState(true);
    const { setSettingsAreDirty } = useSettings();

    const settingId = `api_${setting.serverKey}`;

    useEffect(() => {
        loadValue();
        
        // Subscribe to server setting changes for real-time sync
        const token = pubsub.subscribe('server-setting-changed', (msg, data) => {
            if (data.key === setting.serverKey) {
                setValue(data.value);
                setOriginalValue(data.value);
                console.log(`🔄 Synced '${setting.serverKey}' from another device:`, data.value);
            }
        });
        
        return () => {
            pubsub.unsubscribe(token);
        };
    }, [setting.serverKey]);

    const loadValue = async () => {
        if (!setting.serverKey) {
            console.warn('ServerSettingInput: No serverKey provided for', setting.label);
            setLoading(false);
            return;
        }

        try {
            const serverValue = await getServerSetting(
                setting.serverKey,
                setting.defaultValue
            );
            setValue(serverValue);
            setOriginalValue(serverValue);
            console.log(`✓ Loaded '${setting.serverKey}' from server:`, serverValue);
        } catch (error) {
            console.error('Failed to load server setting:', error);
            setValue(setting.defaultValue);
            setOriginalValue(setting.defaultValue);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (newValue: gSenderSettingsValues) => {
        setValue(newValue);
        
        // Mark settings as dirty if value changed from original
        if (newValue !== originalValue) {
            setSettingsAreDirty(true);
        }
        
        console.log(`✓ Changed '${setting.serverKey}' temporarily to:`, newValue, '(will save when Apply Settings is clicked)');
        onChange(newValue);
    };

    // This function will be called when Apply Settings is clicked
    const applyServerSideSetting = async () => {
        // Check if value actually changed
        if (value === originalValue) {
            return { settings: {}, changed: 0 };
        }

        // Return the setting to be included in batch operation
        const settings = { [setting.serverKey]: value };
        
        // Update original value since batch operation will handle the actual API call
        setOriginalValue(value);
        
        // Clear cache so consumers get the fresh value
        serverSettings.clearCache();
        
        console.log(`✓ Prepared '${setting.serverKey}' for batch update:`, value);
        return { settings, changed: 1 };
    };

    // Register apply function in unified batch system
    useEffect(() => {
        const cleanup = registerServerSettingApplier(settingId, applyServerSideSetting);
        
        return cleanup;
    }, [value]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-2">
                <div className="text-sm text-gray-500">Loading...</div>
            </div>
        );
    }

    // Determine the input type based on the setting structure
    const getInputType = (): string => {
        if (setting.options) {
            return Array.isArray(setting.options) && setting.options.length <= 2 ? 'radio' : 'select';
        }
        
        if (typeof setting.defaultValue === 'boolean') {
            return 'boolean';
        }
        
        if (typeof setting.defaultValue === 'number') {
            return 'number';
        }
        
        return 'select';
    };

    const inputType = getInputType();

    switch (inputType) {
        case 'boolean':
            return (
                <BooleanSettingInput
                    value={value as boolean}
                    index={index}
                    onChange={handleChange}
                    disabled={setting.disabled}
                />
            );
        case 'select':
            return (
                <SelectSettingInput
                    options={setting.options}
                    index={index}
                    value={value as string}
                    onChange={handleChange}
                    disabled={setting.disabled}
                />
            );
        case 'number':
            return (
                <NumberSettingInput
                    unit={setting.unit}
                    value={value as number}
                    index={index}
                    onChange={handleChange}
                    max={setting.max}
                    min={setting.min}
                />
            );
        case 'radio':
            return (
                <RadioSettingInput
                    options={setting.options}
                    index={index}
                    value={value as string}
                    onChange={handleChange}
                    disabled={setting.disabled}
                />
            );
        default:
            return (
                <div className="text-red-500 text-sm">
                    Unsupported server setting type
                </div>
            );
    }
};