import { useEffect, useState } from 'react';
import { ConnectionStateIndicator } from './components/ConnectionStateIndicator';
import { ConnectionInfo } from './components/ConnectionInfo';
//import styles from './assets/animations.module.css';
import cn from 'classnames';
import { refreshPorts, refreshPortsOnParentEntry } from './utils/connection';
import { PortListings } from './components/PortListings';
import { connect } from 'react-redux';
import get from 'lodash/get';
import controller from 'app/lib/controller';
import { DisconnectButton } from './components/DisconnectButton';
import { Port } from './definitions';

export enum ConnectionState {
    DISCONNECTED,
    CONNECTED,
    CONNECTING,
    ERROR,
}

export enum ConnectionType {
    DISCONNECTED = 'DISCONNECTED',
    ETHERNET = 'ETHERNET',
    USB = 'USB',
    REMOTE = 'REMOTE',
}

export interface ConnectionProps {
    ports: Port[];
}

function Connection(props: ConnectionProps) {
    const [connectionState, setConnectionState] = useState(
        ConnectionState.DISCONNECTED,
    );
    const [connectionType, setConnectionType] = useState(
        ConnectionType.DISCONNECTED,
    );
    const [activePort, setActivePort] = useState('');

    useEffect(() => {
        refreshPorts();
    }, []);

    function onConnectClick(port: string, type: ConnectionType) {
        if (!port) {
            console.assert('Connect called with empty port');
        }

        const network = type === ConnectionType.ETHERNET;

        // workflow - set element to connecting state, attempt to connect, and use callback to update state on end
        setConnectionState(ConnectionState.CONNECTING);
        setConnectionType(type);

        // Attempt connect with callback
        controller.openPort(
            port,
            'grblHAL',
            {
                baudrate: 115200,
                network,
            },
            (err: string) => {
                if (err) {
                    setConnectionState(ConnectionState.ERROR);
                    return;
                }

                setConnectionState(ConnectionState.CONNECTED);
                setActivePort(port);
            },
        );
    }

    function onDisconnectClick() {
        setConnectionState(ConnectionState.DISCONNECTED);
        setConnectionType(ConnectionType.DISCONNECTED);

        controller.closePort(activePort, (err: string) => {
            if (err) {
                console.error(err);
            }
            refreshPorts();
        });
    }

    return (
        <div
            className="relative group cursor-pointer dropdown"
            onMouseEnter={refreshPortsOnParentEntry}
        >
            {connectionState !== ConnectionState.CONNECTED && (
                <div
                    className={cn(
                        'absolute -inset-0.5 bg-gradient-to-r from-blue-300 to-blue-800 rounded-lg blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200',
                    )}
                />
            )}
            <div className="relative border border-gray-400 bg-gray-100 font-bold  px-4 py-2 ring-1 ring-gray-900/5 gap-4 justify-between items-center rounded-lg leading-none flex flex-row items-top min-w-[250px]">
                <ConnectionStateIndicator
                    state={connectionState}
                    type={connectionType}
                />
                {connectionState === ConnectionState.DISCONNECTED && (
                    <span>Connect to CNC</span>
                )}
                {connectionState === ConnectionState.CONNECTING && (
                    <span>Connecting...</span>
                )}
                {connectionState === ConnectionState.ERROR && (
                    <span>Unable to connect.</span>
                )}
                {connectionState == ConnectionState.CONNECTED && (
                    <ConnectionInfo port={activePort} firmwareType="grblHAL" />
                )}
                {connectionState == ConnectionState.DISCONNECTED && (
                    <PortListings
                        connectHandler={onConnectClick}
                        ports={props.ports}
                    />
                )}
                {connectionState == ConnectionState.CONNECTED && (
                    <DisconnectButton disconnectHandler={onDisconnectClick} />
                )}
            </div>
        </div>
    );
}

export default connect((store) => {
    const connection = get(store, 'connection', {});
    const ports = get(connection, 'ports', []);

    return {
        ports,
    };
})(Connection);