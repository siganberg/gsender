import React, { useRef, useCallback } from 'react';
import { Textarea } from '../shadcn/TextArea';
import { useVirtualKeyboard } from './index';
import { MdKeyboard } from 'react-icons/md';
import { Button } from '../shadcn/Button';
import { cn } from 'app/lib/utils';

interface VirtualKeyboardTextAreaProps extends React.ComponentProps<typeof Textarea> {
    showKeyboardIcon?: boolean;
    autoShowKeyboard?: boolean;
}

export const VirtualKeyboardTextArea: React.FC<VirtualKeyboardTextAreaProps> = ({
    showKeyboardIcon = true,
    autoShowKeyboard = false,
    className,
    onFocus,
    ...props
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { showKeyboard, isVisible } = useVirtualKeyboard();

    const handleFocus = useCallback((event: React.FocusEvent<HTMLTextAreaElement>) => {
        if (autoShowKeyboard) {
            showKeyboard(event.target);
        }
        onFocus?.(event);
    }, [autoShowKeyboard, showKeyboard, onFocus]);

    const handleKeyboardClick = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            showKeyboard(textareaRef.current);
        }
    }, [showKeyboard]);

    return (
        <div className="relative">
            <Textarea
                ref={textareaRef}
                className={cn(showKeyboardIcon && 'pr-10', className)}
                onFocus={handleFocus}
                {...props}
            />
            {showKeyboardIcon && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleKeyboardClick}
                    className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-transparent"
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
            )}
        </div>
    );
};

export default VirtualKeyboardTextArea;