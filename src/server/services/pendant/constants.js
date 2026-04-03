// Pendant protocol constants

export const PENDANT_BAUD_RATE = 460800;
export const DRO_INTERVAL = 1000;
export const SCAN_INTERVAL = 5000;
export const PROBE_TIMEOUT = 1500;
export const PONG_TIMEOUT = 3000;

// Identification
export const ID_COMMAND = '$ID';
export const ID_PENDANT = '$ID:pendant';
export const ID_DONGLE = '$ID:dongle';

// Handshake
export const CMD_PING = 'P';
export const CMD_PONG = 'K';
export const CMD_FULL_DRO = 'F';

// Command prefixes
export const CMD_JOG_PREFIX = 'J';
export const CMD_CNC_PREFIX = 'C';
export const CMD_JOB_PREFIX = 'R';

// Job control sub-commands
export const JOB_START = 'S';
export const JOB_PAUSE = 'P';
export const JOB_RESUME = 'R';
export const JOB_STOP = 'T';

// DRO prefixes
export const DRO_FULL_PREFIX = '$!';
export const DRO_DELTA_PREFIX = '$';
