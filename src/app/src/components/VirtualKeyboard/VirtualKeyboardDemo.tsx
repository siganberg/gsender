import React, { useState } from 'react';
import { Card } from '../shadcn/Card';
import { VirtualKeyboardInput } from './VirtualKeyboardInput';
import { VirtualKeyboardTextArea } from './VirtualKeyboardTextArea';
import { useVirtualKeyboard } from './index';
import { Button } from '../shadcn/Button';

export const VirtualKeyboardDemo: React.FC = () => {
    const [inputValue, setInputValue] = useState('');
    const [textareaValue, setTextareaValue] = useState('');
    const { showKeyboard, hideKeyboard, isVisible } = useVirtualKeyboard();

    return (
        <Card className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Virtual Keyboard Demo</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Test the virtual keyboard functionality with the inputs below. 
                    Click the keyboard icon in inputs or use the toggle button in the top bar.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="text-md font-medium mb-2">Regular Input with Virtual Keyboard</h4>
                    <VirtualKeyboardInput
                        label="Test Input Field"
                        placeholder="Click the keyboard icon or focus to use virtual keyboard"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        showKeyboardIcon={true}
                    />
                </div>

                <div>
                    <h4 className="text-md font-medium mb-2">Auto-Show Keyboard Input</h4>
                    <VirtualKeyboardInput
                        label="Auto-Show Input"
                        placeholder="Virtual keyboard will show automatically on focus"
                        autoShowKeyboard={true}
                        showKeyboardIcon={false}
                    />
                </div>

                <div>
                    <h4 className="text-md font-medium mb-2">Text Area with Virtual Keyboard</h4>
                    <VirtualKeyboardTextArea
                        placeholder="This is a textarea that works with the virtual keyboard"
                        value={textareaValue}
                        onChange={(e) => setTextareaValue(e.target.value)}
                        rows={4}
                        showKeyboardIcon={true}
                    />
                </div>

                <div>
                    <h4 className="text-md font-medium mb-2">Manual Control</h4>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => showKeyboard()} 
                            disabled={isVisible}
                            variant="outline"
                        >
                            Show Keyboard
                        </Button>
                        <Button 
                            onClick={hideKeyboard} 
                            disabled={!isVisible}
                            variant="outline"
                        >
                            Hide Keyboard
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Current Values:</h4>
                <div className="text-xs space-y-1">
                    <div><strong>Input:</strong> {inputValue || '(empty)'}</div>
                    <div><strong>Textarea:</strong> {textareaValue || '(empty)'}</div>
                    <div><strong>Keyboard Visible:</strong> {isVisible ? 'Yes' : 'No'}</div>
                </div>
            </div>
        </Card>
    );
};

export default VirtualKeyboardDemo;