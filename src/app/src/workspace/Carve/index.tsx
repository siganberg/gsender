import { useLocation } from 'react-router';
import cx from 'classnames';
import { useMediaQuery } from 'react-responsive';

import Visualizer from 'app/features/Visualizer';

import { Column } from '../Column';
import { ToolArea } from '../ToolArea';
import { useVirtualKeyboard } from 'app/components/VirtualKeyboard';
import VirtualKeyboard from 'app/components/VirtualKeyboard';

export const Carve = () => {
    const { pathname } = useLocation();
    const isPortrait = useMediaQuery({ query: '(orientation: portrait)' });
    const { isVisible: isKeyboardVisible } = useVirtualKeyboard();

    const shouldHide = pathname !== '/';

    // Calculate heights based on keyboard visibility - only adjust if keyboard is actually visible
    const getVisualizerHeight = () => {
        if (isPortrait) {
            return isKeyboardVisible 
                ? 'h-[30%] max-h-[30%]' 
                : 'h-[45%] max-h-[45%]';
        }
        return isKeyboardVisible 
            ? 'h-[50%] max-xl:h-[50%] max-xl:max-h-[50%] max-h-[50%]' 
            : 'h-[75%] max-xl:h-[76%] max-xl:max-h-[76%] max-h-[75%]';
    };

    const getToolAreaHeight = () => {
        if (isPortrait) {
            return isKeyboardVisible 
                ? 'h-[40%] min-h-0 max-h-[40%]' 
                : 'h-[55%] min-h-0 max-h-[55%]';
        }
        return isKeyboardVisible 
            ? 'h-[30%] max-xl:h-[30%] max-xl:max-h-[30%] max-h-[30%] min-h-32' 
            : 'h-[25%] max-xl:h-[24%] max-xl:max-h-[24%] max-h-[25%] min-h-48 max-xl:min-h-max';
    };

    return (
        <div className={cx({ hidden: shouldHide }, 'h-full flex flex-col')}>
            <div
                className={cx(
                    'flex',
                    getVisualizerHeight(),
                    'pb-10 max-xl:pb-6 transition-all duration-300'
                )}
            >
                <div className={isPortrait ? 'h-full w-full' : 'flex-grow'}>
                    <Visualizer />
                </div>

                {!isPortrait && (
                    <div className="flex-shrink-0 w-[33%] max-w-md overflow-hidden flex flex-col h-full">
                        <Column />
                    </div>
                )}
            </div>

            <div
                className={cx(
                    'flex',
                    getToolAreaHeight(),
                    'transition-all duration-300'
                )}
            >
                <div className={isPortrait ? 'w-2/3' : 'w-full'}>
                    <ToolArea />
                </div>

                {isPortrait && (
                    <div className="w-1/3 min-w-[400px]">
                        <Column />
                    </div>
                )}
            </div>

            {/* Virtual Keyboard - positioned at bottom of layout */}
            <VirtualKeyboard />
        </div>
    );
};
