import { FILE_TYPE, WORKFLOW_STATES, RENDER_STATE, TOGGLE_STATUS } from "../constants";
import { EEPROMSettings, EEPROMDescriptions } from "definitions/firmware";
import { BasicObject, BasicPosition, BBox } from "definitions/general";
import { Axes } from "features/Axes/definitions";
import { Connection } from "features/Connection/definitions";
import { Console } from "features/Console/definitions";
import { JobStatus } from "features/JobControl/definitions";
import { Location } from "features/Location/definitions";
import { Macro } from "features/Macro/definitions";
import { Probe } from "features/Probe/definitions";
import { Rotary } from "features/Rotary/definitions";
import { Spindle, SpindleState } from "features/Spindle/definitions";
import { Surfacing } from "features/Surfacing/definitions";
import { VISUALIZER_TYPES_T, Visualizer } from "features/Visualizer/definitions";
import { Modal, PDData, FeedrateChanges, ModalChanges } from "lib/definitions/gcode_virtualization";
import { Feeder, Sender } from "lib/definitions/sender_feeder";
import { CommandKeys } from "lib/definitions/shortcuts";
import { Workspace } from "workspace/definitions";


// Types

export type FILE_TYPE_T = (typeof FILE_TYPE)[keyof typeof FILE_TYPE];
export type WORKFLOW_STATES_T =
(typeof WORKFLOW_STATES)[keyof typeof WORKFLOW_STATES];
export type RENDER_STATE_T = (typeof RENDER_STATE)[keyof typeof RENDER_STATE];
export type TOGGLE_STATUS_T =
(typeof TOGGLE_STATUS)[keyof typeof TOGGLE_STATUS];


// Interfaces
// Redux States

export interface FirmwareOptions {
    OPT: string,
    NEWOPT: string,
    FIRMWARE: string,
    NVS_STORAGE: string,
    FREE_MEMORY: string,
    DRIVER: string,
    DRIVER_VERSION: string,
    BOARD: string,
    AUX_IO: string,
    WIZCHIP: string,
    IP: string,
    PLUGIN: string,
    SPINDLE: string,
};

export interface ControllerSettings { //TODO
    parameters: BasicObject,
    settings: EEPROMSettings,
    info?: FirmwareOptions,
    descriptions?: EEPROMDescriptions
    groups: BasicObject,
    alarms: BasicObject,
};

export interface ControllerState {
    type: string,
    settings: ControllerSettings,
    state: any,
    modal: Modal,
    mpos: BasicPosition,
    wpos: BasicPosition,
    homingFlag: boolean,
    homingRun: boolean,
    feeder: Feeder,
    sender: Sender,
    workflow: {
        state: WORKFLOW_STATES_T
    },
    tool: {
        context: BasicObject
    },
    terminalHistory: Array<string>,
    spindles: Array<Spindle>
};

export interface PortInfo {
    port: string,
    manufacturer?: string,
    inuse: boolean
};

export interface ConnectionState {
    isConnected: boolean,
    isScanning: boolean,
    port: string,
    baudrate: string,
    ports: Array<PortInfo>,
    unrecognizedPorts: Array<PortInfo>,
    networkPorts: Array<PortInfo>,
    err: string,
};

export interface FileInfoState {
    fileLoaded: boolean,
    fileProcessing: boolean,
    renderState: RENDER_STATE_T,
    name: string,
    path: string,
    size: number,
    total: number,
    toolSet: Array<string>,
    spindleSet: Array<string>,
    movementSet: Array<string>,
    invalidGcode: Array<string>,
    estimatedTime: number,
    fileModal: string,
    bbox: BBox,
    content: string,
    fileType: FILE_TYPE_T,
};

export interface PreferencesState {
    shortcuts: {
        list: CommandKeys,
        shouldHold: boolean,
    },
    ipList: Array<string>,
};

export interface VisualizerState {
    activeVisualizer: VISUALIZER_TYPES_T,
    jobOverrides: {
        isChecked: boolean,
        toggleStatus: TOGGLE_STATUS_T
    }
};

export interface ReduxState {
    controller: ControllerState,
    connection: ConnectionState,
    file: FileInfoState,
    visualizer: VisualizerState,
    preferences: PreferencesState,
};


// Indexed DB

export interface ParsedData {
    id: string,
    data: Array<PDData>,
    estimates: Array<number>
    feedrateChanges: Array<FeedrateChanges>,
    modalChanges: Array<ModalChanges>,
    info: FileInfoState
};

export interface EstimateData {
    estimates: Array<number>,
    estimatedTime: number
};


// Front-end State

export interface GRBL {
    minimized: boolean,
    panel: {
        queueReports: {
            expanded: boolean,
        },
        statusReports: {
            expanded: boolean,
        },
        modalGroups: {
            expanded: boolean,
        },
    }
};

export interface Session {
    name: string,
    token: string,
};

export interface DefaultState {
    session: Session,
    workspace: Workspace,
    widgets: {
        axes: Axes,
        connection: Connection,
        console: Console,
        job_status: JobStatus,
        grbl: GRBL,
        location: Location,
        macro: Macro,
        probe: Probe,
        rotary: Rotary,
        spindle: SpindleState,
        surfacing: Surfacing,
        visualizer: Visualizer
    };
    commandKeys: CommandKeys;
}

export interface SerialPortOptions {
    port: string,
    inuse: boolean,
};