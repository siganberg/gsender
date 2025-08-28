import React, { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react';
import { cn } from 'app/lib/utils';
import { Button } from '../shadcn/Button';
import { MdKeyboard, MdKeyboardHide, MdBackspace, MdSpaceBar } from 'react-icons/md';
import { FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

// Virtual Keyboard Context
interface VirtualKeyboardContextType {
    isVisible: boolean;
    targetInput: HTMLInputElement | HTMLTextAreaElement | null;
    showKeyboard: (input?: HTMLInputElement | HTMLTextAreaElement) => void;
    hideKeyboard: () => void;
    toggleKeyboard: () => void;
    setTargetInput: (input: HTMLInputElement | HTMLTextAreaElement | null) => void;
}

const VirtualKeyboardContext = createContext<VirtualKeyboardContextType | null>(null);

export const useVirtualKeyboard = () => {
    const context = useContext(VirtualKeyboardContext);
    if (!context) {
        throw new Error('useVirtualKeyboard must be used within VirtualKeyboardProvider');
    }
    return context;
};

// Key definitions
const QWERTY_ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];

const SYMBOLS_MAP: Record<string, string> = {
    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
    '-': '_', '=': '+', '[': '{', ']': '}',
    ';': ':', "'": '"', ',': '<', '.': '>', '/': '?'
};

interface KeyProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    variant?: 'default' | 'special' | 'space';
}

const Key: React.FC<KeyProps> = ({ children, className, onClick, variant = 'default' }) => {
    const baseClasses = 'h-8 min-w-[36px] text-xs font-medium transition-colors duration-150 active:scale-95';
    
    const variantClasses = {
        default: 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white',
        special: 'bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white',
        space: 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white flex-1 min-w-[150px]'
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            className={cn(baseClasses, variantClasses[variant], className)}
            onClick={onClick}
        >
            {children}
        </Button>
    );
};

interface VirtualKeyboardProps {
    className?: string;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ className }) => {
    const { isVisible, targetInput, hideKeyboard } = useVirtualKeyboard();
    const [isShift, setIsShift] = useState(false);
    const [isCapsLock, setCapsLock] = useState(false);

    const insertText = useCallback((text: string) => {
        if (!targetInput) return;

        const start = targetInput.selectionStart || 0;
        const end = targetInput.selectionEnd || 0;
        const currentValue = targetInput.value;
        
        const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
        targetInput.value = newValue;
        
        // Trigger input event to notify React of the change
        const event = new Event('input', { bubbles: true });
        targetInput.dispatchEvent(event);
        
        // Move cursor to after inserted text
        const newPosition = start + text.length;
        targetInput.focus();
        targetInput.setSelectionRange(newPosition, newPosition);
    }, [targetInput]);

    const handleBackspace = useCallback(() => {
        if (!targetInput) return;

        const start = targetInput.selectionStart || 0;
        const end = targetInput.selectionEnd || 0;
        const currentValue = targetInput.value;

        if (start !== end) {
            // Delete selection
            const newValue = currentValue.slice(0, start) + currentValue.slice(end);
            targetInput.value = newValue;
            targetInput.setSelectionRange(start, start);
        } else if (start > 0) {
            // Delete previous character
            const newValue = currentValue.slice(0, start - 1) + currentValue.slice(start);
            targetInput.value = newValue;
            targetInput.setSelectionRange(start - 1, start - 1);
        }

        const event = new Event('input', { bubbles: true });
        targetInput.dispatchEvent(event);
        targetInput.focus();
    }, [targetInput]);

    const handleArrowKey = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
        if (!targetInput) return;

        const start = targetInput.selectionStart || 0;
        let newPosition = start;

        switch (direction) {
            case 'left':
                newPosition = Math.max(0, start - 1);
                break;
            case 'right':
                newPosition = Math.min(targetInput.value.length, start + 1);
                break;
            case 'up':
            case 'down':
                // For up/down, we'll move to beginning/end for simplicity
                newPosition = direction === 'up' ? 0 : targetInput.value.length;
                break;
        }

        targetInput.focus();
        targetInput.setSelectionRange(newPosition, newPosition);
    }, [targetInput]);

    const handleKeyPress = useCallback((key: string) => {
        let char = key;
        
        if (isShift || isCapsLock) {
            if (SYMBOLS_MAP[key]) {
                char = isShift ? SYMBOLS_MAP[key] : key;
            } else {
                char = key.toUpperCase();
            }
        }
        
        insertText(char);
        
        // Reset shift after key press (but not caps lock)
        if (isShift && !isCapsLock) {
            setIsShift(false);
        }
    }, [insertText, isShift, isCapsLock]);

    const toggleShift = useCallback(() => {
        setIsShift(prev => !prev);
    }, []);

    const toggleCapsLock = useCallback(() => {
        setCapsLock(prev => !prev);
        setIsShift(false); // Reset shift when toggling caps lock
    }, []);

    if (!isVisible) return null;

    return (
        <div className={cn(
            'w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 shadow-inner',
            'transition-all duration-300 ease-in-out',
            className
        )}>
            <div className="max-w-5xl mx-auto">
                {/* Keyboard Layout */}
                <div className="space-y-1">
                    {/* Number Row */}
                    <div className="flex justify-center gap-1">
                        {QWERTY_ROWS[0].map(key => (
                            <Key key={key} onClick={() => handleKeyPress(key)}>
                                {isShift ? (SYMBOLS_MAP[key] || key.toUpperCase()) : key}
                            </Key>
                        ))}
                        <Key variant="special" onClick={handleBackspace} className="min-w-[50px]">
                            <MdBackspace size={16} />
                        </Key>
                    </div>

                    {/* First Row */}
                    <div className="flex justify-center gap-1">
                        <Key variant="special" className="min-w-[45px]">Tab</Key>
                        {QWERTY_ROWS[1].map(key => (
                            <Key key={key} onClick={() => handleKeyPress(key)}>
                                {isShift ? (SYMBOLS_MAP[key] || key.toUpperCase()) : key}
                            </Key>
                        ))}
                    </div>

                    {/* Second Row */}
                    <div className="flex justify-center gap-1">
                        <Key 
                            variant="special" 
                            className={cn("min-w-[50px]", (isCapsLock ? "bg-blue-200 dark:bg-blue-600" : ""))}
                            onClick={toggleCapsLock}
                        >
                            Caps
                        </Key>
                        {QWERTY_ROWS[2].map(key => (
                            <Key key={key} onClick={() => handleKeyPress(key)}>
                                {(isShift || isCapsLock) ? (SYMBOLS_MAP[key] || key.toUpperCase()) : key}
                            </Key>
                        ))}
                        <Key variant="special" onClick={() => insertText('\n')} className="min-w-[50px]">
                            Enter
                        </Key>
                    </div>

                    {/* Third Row */}
                    <div className="flex justify-center gap-1">
                        <Key 
                            variant="special"
                            className={cn("min-w-[55px]", (isShift ? "bg-blue-200 dark:bg-blue-600" : ""))}
                            onClick={toggleShift}
                        >
                            Shift
                        </Key>
                        {QWERTY_ROWS[3].map(key => (
                            <Key key={key} onClick={() => handleKeyPress(key)}>
                                {(isShift || isCapsLock) ? (SYMBOLS_MAP[key] || key.toUpperCase()) : key}
                            </Key>
                        ))}
                        <Key 
                            variant="special"
                            className={cn("min-w-[55px]", (isShift ? "bg-blue-200 dark:bg-blue-600" : ""))}
                            onClick={toggleShift}
                        >
                            Shift
                        </Key>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex justify-center gap-1 items-center">
                        <Key variant="special" className="min-w-[40px]">Ctrl</Key>
                        <Key variant="special" className="min-w-[40px]">Alt</Key>
                        <Key variant="space" onClick={() => insertText(' ')}>
                            <MdSpaceBar size={20} />
                        </Key>
                        <Key variant="special" className="min-w-[40px]">Alt</Key>
                        
                        {/* Arrow Keys */}
                        <div className="flex flex-col gap-0.5 ml-2">
                            <Key variant="special" className="h-5 min-w-[24px]" onClick={() => handleArrowKey('up')}>
                                <FaArrowUp size={8} />
                            </Key>
                            <div className="flex gap-0.5">
                                <Key variant="special" className="h-5 min-w-[24px]" onClick={() => handleArrowKey('left')}>
                                    <FaArrowLeft size={8} />
                                </Key>
                                <Key variant="special" className="h-5 min-w-[24px]" onClick={() => handleArrowKey('down')}>
                                    <FaArrowDown size={8} />
                                </Key>
                                <Key variant="special" className="h-5 min-w-[24px]" onClick={() => handleArrowKey('right')}>
                                    <FaArrowRight size={8} />
                                </Key>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Provider Component
interface VirtualKeyboardProviderProps {
    children: React.ReactNode;
}

export const VirtualKeyboardProvider: React.FC<VirtualKeyboardProviderProps> = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [targetInput, setTargetInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

    const showKeyboard = useCallback((input?: HTMLInputElement | HTMLTextAreaElement) => {
        if (input) {
            setTargetInput(input);
        }
        setIsVisible(true);
    }, []);

    const hideKeyboard = useCallback(() => {
        setIsVisible(false);
        setTargetInput(null);
    }, []);

    const toggleKeyboard = useCallback(() => {
        if (isVisible) {
            hideKeyboard();
        } else {
            showKeyboard();
        }
    }, [isVisible, showKeyboard, hideKeyboard]);

    const contextValue: VirtualKeyboardContextType = {
        isVisible,
        targetInput,
        showKeyboard,
        hideKeyboard,
        toggleKeyboard,
        setTargetInput,
    };

    return (
        <VirtualKeyboardContext.Provider value={contextValue}>
            {children}
        </VirtualKeyboardContext.Provider>
    );
};

// Toggle Button Component
interface VirtualKeyboardToggleProps {
    className?: string;
}

export const VirtualKeyboardToggle: React.FC<VirtualKeyboardToggleProps> = ({ className }) => {
    const { isVisible, toggleKeyboard } = useVirtualKeyboard();

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={toggleKeyboard}
            className={cn(
                'shadow-sm',
                'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700',
                'border-gray-300 dark:border-gray-600',
                'transition-colors duration-200',
                className
            )}
            title={isVisible ? 'Hide Virtual Keyboard' : 'Show Virtual Keyboard'}
        >
            {isVisible ? <MdKeyboardHide size={18} /> : <MdKeyboard size={18} />}
        </Button>
    );
};

export default VirtualKeyboard;