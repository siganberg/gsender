import { useTypedSelector } from 'app/hooks/useTypedSelector';
import get from 'lodash/get';

export function ToolDisplay() {
    const currentTool = useTypedSelector((state) =>
        get(state, 'controller.tool.currentTool')
    );
    const isConnected = useTypedSelector((state) =>
        get(state, 'connection.isConnected', false)
    );

    if (!isConnected || currentTool === undefined) {
        return null;
    }

    return (
        <div className="absolute top-2 right-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono">
            <span className="text-gray-600 dark:text-gray-400">Tool:</span>
            <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                T{currentTool}
            </span>
        </div>
    );
}