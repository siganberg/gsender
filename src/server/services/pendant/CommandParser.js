import {
    CMD_PING, CMD_FULL_DRO,
    CMD_JOG_PREFIX, CMD_CNC_PREFIX, CMD_JOB_PREFIX,
    JOB_START, JOB_PAUSE, JOB_RESUME, JOB_STOP,
} from './constants';

const JOG_REGEX = /^J([XYZA])(-?[\d.]+)F([\d.]+)(S?)$/;
const HEX_ESCAPE_REGEX = /\\x([0-9a-fA-F]{2})/g;

class CommandParser {
    parse(line) {
        if (!line || line.length === 0) {
            return null;
        }

        if (line === CMD_PING) {
            return { type: 'ping' };
        }

        if (line === CMD_FULL_DRO) {
            return { type: 'fullDRO' };
        }

        if (line.startsWith('$OTA:')) {
            return { type: 'ota', data: line };
        }

        if (line.startsWith('[')) {
            return { type: 'debug', message: line };
        }

        if (line.startsWith(CMD_JOG_PREFIX)) {
            const match = line.match(JOG_REGEX);
            if (match) {
                return {
                    type: 'jog',
                    axis: match[1],
                    distance: parseFloat(match[2]),
                    feedrate: parseFloat(match[3]),
                    silent: match[4] === 'S',
                };
            }
        }

        if (line.startsWith(CMD_CNC_PREFIX) && line.length > 1) {
            let command = line.substring(1);
            command = command.replace(HEX_ESCAPE_REGEX, (_, hex) => {
                return String.fromCharCode(parseInt(hex, 16));
            });
            return { type: 'cncCommand', command: command };
        }

        if (line.startsWith(CMD_JOB_PREFIX) && line.length === 2) {
            const sub = line[1];
            switch (sub) {
            case JOB_START: return { type: 'jobStart' };
            case JOB_PAUSE: return { type: 'jobPause' };
            case JOB_RESUME: return { type: 'jobResume' };
            case JOB_STOP: return { type: 'jobStop' };
            default: break;
            }
        }

        if (line.startsWith('G') || line.startsWith('M') || line.startsWith('$')) {
            return { type: 'gcode', command: line };
        }

        return null;
    }
}

export default CommandParser;
