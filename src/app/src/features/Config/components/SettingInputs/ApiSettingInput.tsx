import React from 'react';
import { Switch } from 'app/components/shadcn/Switch';

interface ApiSettingInputProps {
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: () => boolean;
}

export const ApiSettingInput: React.FC<ApiSettingInputProps> = ({
    value,
    onChange,
    disabled,
}) => {
    const isDisabled = disabled && disabled();
    
    const handleChange = (checked: boolean, id: string) => {
        onChange(checked);
    };
    
    return (
        <div className="flex justify-end">
            <Switch 
                checked={value} 
                onChange={handleChange} 
                disabled={isDisabled} 
                id="api-setting"
            />
        </div>
    );
};