import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import PendantSerial from './PendantSerial';
import DROFormatter from './DROFormatter';
import CommandParser from './CommandParser';
import store from '../../store';
import {
    PENDANT_BAUD_RATE, SCAN_INTERVAL, DRO_INTERVAL, PROBE_TIMEOUT,
    ID_COMMAND, ID_PENDANT, ID_DONGLE, CMD_PONG,
} from './constants';
import logger from '../../lib/logger';

const log = logger('service:pendant');

class PendantService {
    constructor() {
        this.io = null;
        this.serial = null;
        this.connectedPort = null;
        this.deviceType = null;
        this.pendantConnected = false;
        this._scanTimer = null;
        this._droTimer = null;
        this._droFormatter = new DROFormatter();
        this._commandParser = new CommandParser();
        this._scanning = false;
    }

    start(io) {
        this.io = io;
        log.info('Pendant service started');
        this._startScanning();
    }

    stop() {
        this._stopScanning();
        this._stopDROPush();
        if (this.serial) {
            this.serial.close().catch(() => {});
            this.serial = null;
        }
        this.connectedPort = null;
        this.deviceType = null;
        this.pendantConnected = false;
        log.info('Pendant service stopped');
    }

    // -- Port Scanning --

    _startScanning() {
        if (this._scanTimer) {
            return;
        }
        this._scanPorts();
        this._scanTimer = setInterval(() => this._scanPorts(), SCAN_INTERVAL);
    }

    _stopScanning() {
        if (this._scanTimer) {
            clearInterval(this._scanTimer);
            this._scanTimer = null;
        }
    }

    async _scanPorts() {
        if (this._scanning || this.serial) {
            return;
        }
        this._scanning = true;

        try {
            const ports = await SerialPort.list();
            const cncPorts = this._getActiveCncPorts();

            const candidates = ports
                .map((p) => p.path)
                .filter((portPath) => {
                    if (cncPorts.has(portPath)) {
                        return false;
                    }
                    if (!portPath.startsWith('/dev/cu.') && !portPath.startsWith('/dev/tty') && !portPath.startsWith('COM')) {
                        return false;
                    }
                    // macOS: prefer cu. over tty.
                    if (portPath.startsWith('/dev/tty.') && ports.some((p) => p.path === portPath.replace('/dev/tty.', '/dev/cu.'))) {
                        return false;
                    }
                    return true;
                });

            await this._probeAndConnect(candidates);
        } catch (err) {
            log.error('Port scan error:', err.message);
        } finally {
            this._scanning = false;
        }
    }

    _getActiveCncPorts() {
        const controllers = store.get('controllers', {});
        const ports = new Set();
        Object.keys(controllers).forEach((port) => {
            ports.add(port);
        });
        return ports;
    }

    async _probeAndConnect(candidates) {
        if (candidates.length === 0) {
            return;
        }
        const portPath = candidates[0];
        const result = await this._probePort(portPath);
        if (result) {
            this._scanning = false;
            await this._connect(portPath, result);
            return;
        }
        await this._probeAndConnect(candidates.slice(1));
    }

    _probePort(portPath) {
        return new Promise((resolve) => {
            let port;
            let timer;
            let resolved = false;

            const cleanup = () => {
                if (resolved) {
                    return;
                }
                resolved = true;
                clearTimeout(timer);
                try {
                    if (port && port.isOpen) {
                        port.close(() => {});
                    }
                } catch (e) { // eslint-disable-line no-unused-vars
                    // ignore
                }
            };

            try {
                port = new SerialPort({
                    path: portPath,
                    baudRate: PENDANT_BAUD_RATE,
                    autoOpen: false,
                });

                const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

                parser.on('data', (line) => {
                    const trimmed = line.trim();
                    if (trimmed === ID_PENDANT) {
                        cleanup();
                        resolve('pendant');
                    } else if (trimmed === ID_DONGLE) {
                        cleanup();
                        resolve('dongle');
                    }
                });

                port.on('error', () => {
                    cleanup();
                    resolve(null);
                });

                timer = setTimeout(() => {
                    cleanup();
                    resolve(null);
                }, PROBE_TIMEOUT);

                port.open((err) => {
                    if (err) {
                        cleanup();
                        resolve(null);
                        return;
                    }
                    port.set({ dtr: true, rts: false });
                    setTimeout(() => {
                        if (!resolved) {
                            port.write(ID_COMMAND + '\n');
                        }
                    }, 100);
                });
            } catch (e) { // eslint-disable-line no-unused-vars
                resolve(null);
            }
        });
    }

    // -- Connection --

    async _connect(portPath, deviceType) {
        this._stopScanning();

        this.serial = new PendantSerial(portPath);
        this.connectedPort = portPath;
        this.deviceType = deviceType;

        this.serial.on('data', (line) => this._onData(line));
        this.serial.on('close', () => this._onDisconnect());
        this.serial.on('error', (err) => {
            log.error('Pendant serial error:', err.message);
            this._onDisconnect();
        });

        try {
            await this.serial.open();
            log.info('Pendant ' + deviceType + ' connected on ' + portPath);
            this._startDROPush();

            if (this.io) {
                this.io.emit('pendant:connected', { port: portPath, type: deviceType });
            }
        } catch (err) {
            log.error('Failed to open pendant port ' + portPath + ':', err.message);
            this.serial = null;
            this.connectedPort = null;
            this.deviceType = null;
            this._startScanning();
        }
    }

    _onDisconnect() {
        const port = this.connectedPort;
        this._stopDROPush();
        this._droFormatter.reset();
        this.serial = null;
        this.connectedPort = null;
        this.deviceType = null;
        this.pendantConnected = false;

        log.info('Pendant disconnected from ' + port);
        if (this.io) {
            this.io.emit('pendant:disconnected');
        }

        this._startScanning();
    }

    // -- DRO Push --

    _startDROPush() {
        if (this._droTimer) {
            return;
        }
        this._droTimer = setInterval(() => this._pushDRO(), DRO_INTERVAL);
    }

    _stopDROPush() {
        if (this._droTimer) {
            clearInterval(this._droTimer);
            this._droTimer = null;
        }
    }

    _pushDRO() {
        if (!this.serial || !this.serial.isOpen) {
            return;
        }

        const controller = this._getActiveController();
        const snap = this._droFormatter.snapshot(controller);
        let dro;

        if (!this.pendantConnected) {
            dro = this._droFormatter.formatFull(snap);
        } else {
            dro = this._droFormatter.formatDelta(snap);
        }

        this.serial.write(dro);
    }

    _sendFullDRO() {
        if (!this.serial || !this.serial.isOpen) {
            return;
        }
        const controller = this._getActiveController();
        const snap = this._droFormatter.snapshot(controller);
        const dro = this._droFormatter.formatFull(snap);
        this.serial.write(dro);
    }

    // -- Incoming Data --

    _onData(line) {
        const action = this._commandParser.parse(line);
        if (!action) {
            log.debug('Unrecognized pendant message: ' + line);
            return;
        }

        switch (action.type) {
        case 'ping':
            this._handlePing();
            break;
        case 'fullDRO':
            this._sendFullDRO();
            break;
        case 'jog':
            this._handleJog(action);
            break;
        case 'cncCommand':
            this._handleCncCommand(action.command);
            break;
        case 'jobStart':
            this._handleJobControl('gcode:start');
            break;
        case 'jobPause':
            this._handleJobControl('gcode:pause');
            break;
        case 'jobResume':
            this._handleJobControl('gcode:resume');
            break;
        case 'jobStop':
            this._handleJobControl('gcode:stop');
            break;
        case 'gcode':
            this._handleGcode(action.command);
            break;
        case 'debug':
            log.debug('Pendant: ' + action.message);
            break;
        default:
            break;
        }
    }

    _handlePing() {
        if (!this.serial) {
            return;
        }
        this.serial.write(CMD_PONG);
        this.pendantConnected = true;
        setTimeout(() => this._sendFullDRO(), 100);
    }

    _handleJog(action) {
        const controller = this._getActiveController();
        if (!controller) {
            return;
        }
        const jogCommand = '$J=G21 G91 ' + action.axis + action.distance + ' F' + action.feedrate;
        controller.command('gcode', jogCommand);
    }

    _handleCncCommand(command) {
        const controller = this._getActiveController();
        if (!controller) {
            return;
        }

        switch (command) {
        case '$H':
            controller.command('homing');
            break;
        case '$X':
            controller.command('unlock');
            break;
        case '!':
            controller.command('feedhold');
            break;
        case '~':
            controller.command('cyclestart');
            break;
        case '\x18':
            controller.command('reset');
            break;
        default:
            controller.command('gcode', command);
            break;
        }
    }

    _handleJobControl(cmd) {
        const controller = this._getActiveController();
        if (!controller) {
            return;
        }

        if (cmd === 'gcode:stop') {
            controller.command(cmd, { force: true });
        } else {
            controller.command(cmd);
        }
    }

    _handleGcode(command) {
        const controller = this._getActiveController();
        if (!controller) {
            return;
        }
        controller.command('gcode', command);
    }

    // -- Helpers --

    _getActiveController() {
        const controllers = store.get('controllers', {});
        const ports = Object.keys(controllers);
        if (ports.length === 0) {
            return null;
        }
        return controllers[ports[0]];
    }
}

export default PendantService;
