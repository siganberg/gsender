/*
 * Copyright (C) 2021 Sienci Labs Inc.
 *
 * This file is part of gSender.
 *
 * gSender is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, under version 3 of the License.
 *
 * gSender is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gSender.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact for information regarding this program and its license
 * can be sent through gSender@sienci.com or mailed to the main office
 * of Sienci Labs Inc. in Waterloo, Ontario, Canada.
 *
 */

import _, { noop } from 'lodash';
import classNames from 'classnames';
import Dropzone from 'react-dropzone';
import isElectron from 'is-electron';
import pubsub from 'pubsub-js';
import Header from 'app/containers/Header';
import React, { PureComponent, createRef } from 'react';
import { withRouter } from 'react-router-dom';
import api from 'app/api';
import { Confirm } from 'app/components/ConfirmationDialog/ConfirmationDialogLib';
import {
    WORKFLOW_STATE_IDLE,
    USER_DATA_COLLECTION,
    WORKSPACE_MODE
} from 'app/constants';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import store from 'app/store';
import { Toaster as Toast, TOASTER_SUCCESS } from 'app/lib/toaster/ToasterLib';

import * as widgetManager from './WidgetManager';
import DefaultWidgets from './DefaultWidgets';
import PrimaryWidgets from './PrimaryWidgets';
import ScreenAwake from './ScreenAwake';
import FeederPaused from './modals/FeederPaused';
import FeederWait from './modals/FeederWait';
import ServerDisconnected from './modals/ServerDisconnected';
import styles from './index.styl';
import {
    MODAL_NONE,
    MODAL_FEEDER_PAUSED,
    MODAL_FEEDER_WAIT,
    MODAL_SERVER_DISCONNECTED,
    MODAL_MAINTENANCE_ALERT
} from './constants';
import UpdateAvailableAlert from './UpdateAvailableAlert/UpdateAvailableAlert';
import Toaster from '../../lib/toaster/Toaster';
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog';
import DataCollectionPopup from './DataCollectionPopup';
import MobileWorkflow from './MobileWorkflow';
import MaintenanceAlert from './modals/MaintenanceAlert';
import maintenanceApiActions from '../Preferences/Stats/lib/maintenanceApiActions';


const WAIT = '%wait';
const TOOLCHANGE = '%toolchange';
const M0M1_PAUSE = '%m0m1_pause';

const startWaiting = () => {
    // Adds the 'wait' class to <html>
    const root = document.documentElement;
    root.classList.add('wait');
};
const stopWaiting = () => {
    // Adds the 'wait' class to <html>
    const root = document.documentElement;
    root.classList.remove('wait');
};

class Workspace extends PureComponent {
    static propTypes = {
        ...withRouter.propTypes
    };

    state = {
        disabled: true,
        mounted: false,
        port: '',
        modal: {
            name: MODAL_NONE,
            params: {}
        },
        isDraggingFile: false,
        isDraggingWidget: false,
        isUploading: false,
        showPrimaryContainer: store.get('workspace.container.primary.show'),
        inactiveCount: _.size(widgetManager.getInactiveWidgets()),
        reverseWidgets: store.get('workspace.reverseWidgets'),
        lastHealthUpdate: null,
        mobile: false,
        tablet: false,
        shouldShowRotate: true,
        serverDisconnectReason: null,
        alertTasks: [],
    };

    pubsubTokens = [];

    action = {
        openModal: (name = MODAL_NONE, params = {}) => {
            this.setState(state => ({
                modal: {
                    name: name,
                    params: params
                }
            }));
        },
        closeModal: () => {
            this.setState(state => ({
                modal: {
                    name: MODAL_NONE,
                    params: {}
                }
            }));
        },
        closePrompt: () => {
            this.setState(state => ({
                shouldShowRotate: false
            }));
        },
        updateModalParams: (params = {}) => {
            this.setState(state => ({
                modal: {
                    ...state.modal,
                    params: {
                        ...state.modal.params,
                        ...params
                    }
                }
            }));
        },
        sendRestartCommand: () => {
            if (isElectron()) {
                window.ipcRenderer.send('restart_app');
            }
        },
        reconnect: () => {
            controller.reconnect();
        }
    };

    primaryContainer = null;

    primaryWidgets = null;

    defaultContainer = null;

    dataCollectionRef = createRef()

    controllerEvents = {
        'hPong': () => {
            this.setState({
                lastHealthUpdate: new Date()
            });
        },
        'connect': () => {
            this.setState({ disabled: false });
            if (controller.connected) {
                this.action.closeModal();
                Toast.pop({
                    msg: 'Server Reconnected Succesfully',
                    type: TOASTER_SUCCESS,
                });
            } else {
                this.setState({ serverDisconnectReason: 'connect' });
                this.action.openModal(MODAL_SERVER_DISCONNECTED);
            }
        },
        'connect_error': () => {
            if (controller.connected) {
                this.action.closeModal();
                Toast.pop({
                    msg: 'Server Reconnected Succesfully',
                    type: TOASTER_SUCCESS,
                });
            } else {
                this.setState({ serverDisconnectReason: 'connect_error' });
                this.action.openModal(MODAL_SERVER_DISCONNECTED);
            }
        },
        'disconnect': () => {
            this.setState({ disabled: true });
            if (controller.connected) {
                this.action.closeModal();
                Toast.pop({
                    msg: 'Server Reconnected Succesfully',
                    type: TOASTER_SUCCESS,
                });
            } else {
                this.setState({ serverDisconnectReason: 'disconnect' });
                this.action.openModal(MODAL_SERVER_DISCONNECTED);
                this.action.reconnect();
            }
        },
        'serialport:open': (options) => {
            const { controllerType, port } = options;
            const { DEFAULT, ROTARY } = WORKSPACE_MODE;

            this.setState({ disabled: false, port });

            if (controllerType === 'grblHAL') {
                const isRotaryMode = store.get('workspace.mode', DEFAULT) === ROTARY;
                controller.command('updateRotaryMode', isRotaryMode);
            }
        },
        'serialport:close': (options) => {
            this.setState({ disabled: true, port: '' });
        },
        'feeder:status': (status) => {
            const { modal } = this.state;
            const { hold, holdReason } = { ...status };
            if (!hold) {
                if (_.includes([MODAL_FEEDER_PAUSED, MODAL_FEEDER_WAIT], modal.name)) {
                    this.action.closeModal();
                }
                return;
            }

            const { err, data, comment, strategy } = { ...holdReason };

            if (err) {
                this.action.openModal(MODAL_FEEDER_PAUSED, {
                    title: i18n._('Error')
                });
                return;
            }

            if (data === WAIT) {
                this.action.openModal(MODAL_FEEDER_WAIT, {
                    title: '%wait'
                });
                return;
            }

            if (data === TOOLCHANGE || data === M0M1_PAUSE) {
                return;
            }

            const title = {
                'M0': i18n._('M0 Program Pause'),
                'M1': i18n._('M1 Program Pause'),
                'M2': i18n._('M2 Program End'),
                'M30': i18n._('M30 Program End'),
                'M6': i18n._('M6 Tool Change'),
                'M109': i18n._('M109 Set Extruder Temperature'),
                'M190': i18n._('M190 Set Heated Bed Temperature')
            }[data] || data;

            const commentString = comment || '';
            const content = (commentString.length > 0)
                ? <div><p>Press Resume to continue operation.</p><p>Line contained following comment: <b>{commentString}</b></p></div>
                : 'Press Resume to continue operation.';

            if (hold && strategy !== 'Manual' && strategy !== 'Pause') {
                Confirm({
                    title,
                    content,
                    confirmLabel: 'Resume',
                    cancelLabel: 'Stop',
                    onConfirm: () => {
                        controller.command('feeder:start');
                    },
                    onClose: () => {
                        controller.command('feeder:stop');
                    }
                });
            }
        }
    };

    widgetEventHandler = {
        onForkWidget: (widgetId) => {
            // TODO
        },
        onRemoveWidget: (widgetId) => {
            const inactiveWidgets = widgetManager.getInactiveWidgets();
            this.setState({ inactiveCount: inactiveWidgets.length });
        },
        onDragStart: () => {
            const { isDraggingWidget } = this.state;
            if (!isDraggingWidget) {
                this.setState({ isDraggingWidget: true });
            }
        },
        onDragEnd: () => {
            const { isDraggingWidget } = this.state;
            if (isDraggingWidget) {
                this.setState({ isDraggingWidget: false });
            }
        }
    };

    resizeDefaultContainer = () => {
        // const sidebar = document.querySelector('#sidebar');
        // const secondaryToggler = ReactDOM.findDOMNode(this.secondaryToggler);
        const { showPrimaryContainer } = this.state;

        /* Calculate VH based on current window height
        let vh = window.visualViewport.height * 0.01;
        let vw = window.visualViewport.width * 0.01;
        //Update styling with new VH value for CSS calculations
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.documentElement.style.setProperty('--vw', `${vw}px`);*/

        { // Mobile-Friendly View
            const { location } = this.props;
            const disableHorizontalScroll = !(showPrimaryContainer);

            if (location.pathname === '/workspace' && disableHorizontalScroll) {
                // Disable horizontal scroll
                document.body.scrollLeft = 0;
                document.body.style.overflowX = 'hidden';
            } else {
                // Enable horizontal scroll
                document.body.style.overflowX = '';
            }
        }
        // Publish a 'resize' event
        pubsub.publish('resize'); // Also see "widgets/Visualizer"
    };

    updateScreenSize = () => {
        const isMobile = window.screen.width <= 639;
        this.setState({
            mobile: isMobile
        });
        const isTablet = window.screen.width > 639; //width smaller than height and wider than a phone
        this.setState({
            tablet: isTablet
        });
    };

    onDrop = (files) => {
        const { port } = this.state;

        if (!port) {
            return;
        }

        let file = files[0];
        let reader = new FileReader();

        reader.onloadend = (event) => {
            const { result, error } = event.target;

            if (error) {
                log.error(error);
                return;
            }

            log.debug('FileReader:', _.pick(file, [
                'lastModified',
                'lastModifiedDate',
                'meta',
                'name',
                'size',
                'type'
            ]));

            startWaiting();
            this.setState({ isUploading: true });

            const name = file.name;
            const gcode = result;

            api.loadGCode({ port, name, gcode })
                .then((res) => {
                    const { name = '', gcode = '' } = { ...res.body };
                    pubsub.publish('gcode:load', { name, gcode });
                })
                .catch((res) => {
                    log.error('Failed to upload G-code file');
                })
                .then(() => {
                    stopWaiting();
                    this.setState({ isUploading: false });
                });
        };

        try {
            reader.readAsText(file);
        } catch (err) {
            // Ignore error
        }
    };

    handleCollectUserData = async () => {
        const { INITIAL, ACCEPTED, REJECTED } = USER_DATA_COLLECTION;
        const res = await api.metrics.getCollectDataStatus();

        const collectUserDataStatus = res.body.collectUserDataStatus;

        if (collectUserDataStatus === REJECTED) {
            return;
        }

        if (collectUserDataStatus === INITIAL) {
            this.dataCollectionRef.current.show();
            return;
        }

        if (collectUserDataStatus === ACCEPTED) {
            try {
                const machineProfile = store.get('workspace.machineProfile', {});
                await api.metrics.sendData(machineProfile);
            } catch (error) {
                console.log(error);
            }
        }
    }

    sendMaintenanceAlerts = () => {
        maintenanceApiActions.fetch(noop).then((tasks) => {
            let shouldAlert = false;
            for (const task of tasks) {
                const { rangeStart, currentTime } = task;
                if (currentTime >= rangeStart) {
                    shouldAlert = true;
                    break;
                }
            }
            if (shouldAlert) {
                this.setState({ alertTasks: tasks }, () => this.action.openModal(MODAL_MAINTENANCE_ALERT));
            }
        });
    }

    componentDidMount() {
        this.updateScreenSize();
        this.addControllerEvents();
        this.addResizeEventListener();
        this.subscribe();
        this.handleCollectUserData();
        this.sendMaintenanceAlerts();

        setTimeout(() => {
            // A workaround solution to trigger componentDidUpdate on initial render
            this.setState({ mounted: true });
        }, 0);
    }

    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
        this.removeResizeEventListener();
    }

    componentDidUpdate() {
        store.set('workspace.container.primary.show', this.state.showPrimaryContainer);

        this.resizeDefaultContainer();
    }

    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.addListener(eventName, callback);
        });
    }

    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.removeListener(eventName, callback);
        });
    }

    addResizeEventListener() {
        this.onResizeThrottled = _.throttle(() => {
            this.updateScreenSize();
            this.resizeDefaultContainer();
        }, 25);
        window.addEventListener('resize', this.onResizeThrottled);
    }

    removeResizeEventListener() {
        window.removeEventListener('resize', this.onResizeThrottled);
        this.onResizeThrottled = null;
    }

    subscribe() {
        const tokens = [
            pubsub.subscribe('widgets:reverse', (msg, value) => {
                this.setState({
                    reverseWidgets: value
                });
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }

    unsubscribe() {
        this.pubsubTokens.forEach((token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
    }


    render() {
        const { style, className } = this.props;
        let disabled = this.state.disabled;
        const {
            port,
            modal,
            isDraggingFile,
            isDraggingWidget,
            showPrimaryContainer,
            reverseWidgets,
            mobile,
            serverDisconnectReason
        } = this.state;
        const hidePrimaryContainer = !showPrimaryContainer;
        const tableStyle = mobile ? styles.workspaceTableMobile : styles.workspaceTable;
        const rowStyle = mobile ? styles.workspaceTableRowMobile : styles.workspaceTableRow;
        const primaryContainerStyle = mobile ? styles.primaryContainerMobile : styles.primaryContainer;

        const modalItem = {
            [MODAL_FEEDER_PAUSED]: <FeederPaused title={modal.params.title} onClose={this.action.closeModal} />,
            [MODAL_FEEDER_WAIT]: <FeederWait title={modal.params.title} onClose={this.action.closeModal} />,
            [MODAL_SERVER_DISCONNECTED]: <ServerDisconnected reason={serverDisconnectReason} onClose={this.action.closeModal} />,
            [MODAL_MAINTENANCE_ALERT]: <MaintenanceAlert tasks={this.state.alertTasks} onClose={this.action.closeModal} />
        }[modal.name];

        return (
            <ScreenAwake>
                <div style={style} className={classNames(className, styles.workspace)}>
                    {modalItem}

                    <div
                        className={classNames(
                            styles.dropzoneOverlay,
                            { [styles.hidden]: !(port && isDraggingFile) }
                        )}
                    >
                        <div className={styles.textBlock}>
                            {i18n._('Drop G-code file here')}
                        </div>
                    </div>
                    <Dropzone
                        className={styles.dropzone}
                        disabled={controller.workflow.state !== WORKFLOW_STATE_IDLE}
                        disableClick={true}
                        disablePreview={true}
                        multiple={false}
                        onDragStart={(event) => {
                        }}
                        onDragEnter={(event) => {
                            if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                                return;
                            }
                            if (isDraggingWidget) {
                                return;
                            }
                            if (!isDraggingFile) {
                                this.setState({ isDraggingFile: true });
                            }
                        }}
                        onDragLeave={(event) => {
                            if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                                return;
                            }
                            if (isDraggingWidget) {
                                return;
                            }
                            if (isDraggingFile) {
                                this.setState({ isDraggingFile: false });
                            }
                        }}
                        onDrop={(acceptedFiles, rejectedFiles) => {
                            if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                                return;
                            }
                            if (isDraggingWidget) {
                                return;
                            }
                            if (isDraggingFile) {
                                this.setState({ isDraggingFile: false });
                            }
                            this.onDrop(acceptedFiles);
                        }}
                    >
                        <div className={tableStyle}>
                            <UpdateAvailableAlert restartHandler={this.action.sendRestartCommand} />
                            <Toaster />
                            <DataCollectionPopup ref={this.dataCollectionRef} />
                            <Header />
                            <ConfirmationDialog />
                            <div className={classNames(rowStyle, { [styles.reverseWorkspace]: reverseWidgets })}>
                                {
                                    !mobile && (
                                        <DefaultWidgets
                                            ref={node => {
                                                this.defaultContainer = node;
                                            }}
                                        />
                                    )
                                }
                                <div
                                    ref={node => {
                                        this.primaryContainer = node;
                                    }}
                                    className={classNames(
                                        primaryContainerStyle,
                                        { [styles.hidden]: hidePrimaryContainer },
                                        { [styles.disabled]: disabled }
                                    )}
                                >
                                    {
                                        mobile && (
                                            <MobileWorkflow />
                                        )
                                    }
                                    <PrimaryWidgets
                                        ref={node => {
                                            this.primaryWidgets = node;
                                        }}
                                        onForkWidget={this.widgetEventHandler.onForkWidget}
                                        onRemoveWidget={this.widgetEventHandler.onRemoveWidget}
                                        onDragStart={this.widgetEventHandler.onDragStart}
                                        onDragEnd={this.widgetEventHandler.onDragEnd}
                                    />
                                </div>
                            </div>
                        </div>
                    </Dropzone>
                </div>
            </ScreenAwake>
        );
    }
}

export default withRouter(Workspace);
