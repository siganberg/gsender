import React, { useRef, useCallback } from 'react';
import { Input } from '../shadcn/Input';
import { useVirtualKeyboard } from './index';
import { MdKeyboard } from 'react-icons/md';
import { Button } from '../shadcn/Button';
import { cn } from 'app/lib/utils';

interface VirtualKeyboardInputProps extends React.ComponentProps<typeof Input> {
    showKeyboardIcon?: boolean;
    autoShowKeyboard?: boolean;
}

export const VirtualKeyboardInput: React.FC<VirtualKeyboardInputProps> = ({
    showKeyboardIcon = true,
    autoShowKeyboard = false,
    className,
    onFocus,
    ...props
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { showKeyboard, isVisible } = useVirtualKeyboard();

    const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
        if (autoShowKeyboard) {
            showKeyboard(event.target);
        }
        onFocus?.(event);
    }, [autoShowKeyboard, showKeyboard, onFocus]);

    const handleKeyboardClick = useCallback(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            showKeyboard(inputRef.current);
        }
    }, [showKeyboard]);

    const keyboardIcon = showKeyboardIcon && (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleKeyboardClick}
            className="h-6 w-6 p-0 hover:bg-transparent"
            type="button"
        >
            <MdKeyboard 
                size={16} 
                className={cn(
                    'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    isVisible && 'text-blue-600 dark:text-blue-400'
                )} 
            />
        </Button>
    );

    return (
        <Input
            ref={inputRef}
            className={className}
            onFocus={handleFocus}
            suffix={keyboardIcon}
            {...props}
        />
    );
};

export default VirtualKeyboardInput;