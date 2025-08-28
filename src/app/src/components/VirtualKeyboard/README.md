# Virtual Keyboard Component

A comprehensive virtual keyboard solution for gSender that provides on-screen keyboard functionality for Electron applications where OS virtual keyboards may not be accessible.

## Features

- **Full QWERTY Layout**: Standard keyboard layout with all alphanumeric keys and symbols
- **Shift & Caps Lock**: Support for uppercase letters and symbol variants
- **Arrow Keys**: Navigation keys for cursor movement
- **Special Keys**: Backspace, Enter, Space, Tab, and modifier keys
- **Auto-Show**: Option to automatically show keyboard when input fields are focused
- **Manual Control**: Toggle button for showing/hiding the keyboard
- **Input Integration**: Seamless integration with any input field or textarea
- **Dark Mode**: Respects the application's dark/light theme
- **Touch-Friendly**: Optimized for touch interaction with visual feedback

## Components

### VirtualKeyboardProvider
The main context provider that manages keyboard state and should wrap your app.

```tsx
import { VirtualKeyboardProvider } from './components/VirtualKeyboard';

function App() {
    return (
        <VirtualKeyboardProvider>
            {/* Your app content */}
        </VirtualKeyboardProvider>
    );
}
```

### VirtualKeyboardToggle
A floating toggle button to show/hide the keyboard.

```tsx
import { VirtualKeyboardToggle } from './components/VirtualKeyboard';

// Renders a floating button in bottom-right corner
<VirtualKeyboardToggle />
```

### VirtualKeyboardInput
Enhanced input component with built-in keyboard integration.

```tsx
import { VirtualKeyboardInput } from './components/VirtualKeyboard/VirtualKeyboardInput';

<VirtualKeyboardInput
    label="Test Input"
    placeholder="Click keyboard icon to show virtual keyboard"
    showKeyboardIcon={true}        // Shows keyboard icon in input
    autoShowKeyboard={false}       // Auto-show on focus
    value={value}
    onChange={handleChange}
/>
```

### VirtualKeyboardTextArea
Enhanced textarea component with virtual keyboard support.

```tsx
import { VirtualKeyboardTextArea } from './components/VirtualKeyboard/VirtualKeyboardTextArea';

<VirtualKeyboardTextArea
    placeholder="Type using virtual keyboard"
    showKeyboardIcon={true}
    autoShowKeyboard={true}
    rows={4}
    value={value}
    onChange={handleChange}
/>
```

## Hook Usage

### useVirtualKeyboard
Access keyboard state and controls from any component within the provider.

```tsx
import { useVirtualKeyboard } from './components/VirtualKeyboard';

function MyComponent() {
    const { 
        isVisible, 
        showKeyboard, 
        hideKeyboard, 
        toggleKeyboard,
        setTargetInput 
    } = useVirtualKeyboard();
    
    const handleCustomInput = (event) => {
        // Show keyboard for any input
        showKeyboard(event.target);
    };
    
    return (
        <div>
            <input onFocus={handleCustomInput} />
            <button onClick={toggleKeyboard}>
                {isVisible ? 'Hide' : 'Show'} Keyboard
            </button>
        </div>
    );
}
```

## API Reference

### VirtualKeyboardProvider Props
- **children**: React.ReactNode - The app content to wrap

### VirtualKeyboardToggle Props
- **className**: string (optional) - Additional CSS classes

### VirtualKeyboardInput Props
Extends all standard HTML input props plus:
- **showKeyboardIcon**: boolean (default: true) - Show keyboard icon in input
- **autoShowKeyboard**: boolean (default: false) - Auto-show on focus

### VirtualKeyboardTextArea Props
Extends all standard HTML textarea props plus:
- **showKeyboardIcon**: boolean (default: true) - Show keyboard icon in textarea
- **autoShowKeyboard**: boolean (default: false) - Auto-show on focus

### useVirtualKeyboard Hook Returns
- **isVisible**: boolean - Current keyboard visibility state
- **targetInput**: HTMLInputElement | HTMLTextAreaElement | null - Currently focused input
- **showKeyboard**: (input?: HTMLElement) => void - Show keyboard function
- **hideKeyboard**: () => void - Hide keyboard function
- **toggleKeyboard**: () => void - Toggle keyboard visibility
- **setTargetInput**: (input: HTMLElement | null) => void - Set target input

## Styling

The virtual keyboard uses Tailwind CSS classes and respects the application's dark mode settings. Key styling features:

- **Responsive**: Adapts to different screen sizes
- **Dark Mode**: Automatic theme switching
- **Animations**: Smooth slide-in/out animations
- **Visual Feedback**: Button press animations and hover states

## Integration

The virtual keyboard has been integrated into gSender in the following locations:

1. **App.tsx**: Provider wraps the entire application
2. **Tools Page**: Demo component available in the "Virtual Keyboard" tab
3. **Toggle Button**: Floating button available globally

## Usage Tips

1. **Touch Devices**: Optimized for touch interaction with proper button sizing
2. **Keyboard Shortcuts**: All standard keyboard functionality is supported
3. **Input Focus**: The keyboard automatically targets the last focused input
4. **Cursor Movement**: Arrow keys move the cursor within the input text
5. **Text Selection**: Supports text replacement when text is selected

## Testing

A demo component is available in the Tools section under "Virtual Keyboard" tab that demonstrates:
- Basic input field with keyboard icon
- Auto-show functionality
- Textarea integration
- Manual keyboard control
- Real-time value display

## Browser Compatibility

The virtual keyboard is built using modern React patterns and should work in all browsers that support:
- ES6+ JavaScript
- React 16.8+ (Hooks)
- Modern CSS (Flexbox, Grid)

## Performance

The keyboard is designed to be lightweight and performant:
- Event listeners are properly cleaned up
- Only renders when visible
- Minimal DOM manipulation
- Efficient state management

This virtual keyboard provides a complete solution for touch-based interaction in Electron applications where system virtual keyboards may not be available or suitable.