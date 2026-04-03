import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';
import { PENDANT_BAUD_RATE } from './constants';

class PendantSerial extends EventEmitter {
    constructor(portPath) {
        super();
        this.portPath = portPath;
        this.port = null;
        this.parser = null;
    }

    get isOpen() {
        return this.port && this.port.isOpen;
    }

    open() {
        return new Promise((resolve, reject) => {
            this.port = new SerialPort({
                path: this.portPath,
                baudRate: PENDANT_BAUD_RATE,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                autoOpen: false,
            });

            this.port.on('open', () => {
                this.port.set({ dtr: true, rts: false });
            });

            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

            this.parser.on('data', (line) => {
                const trimmed = line.trim();
                if (trimmed.length > 0) {
                    this.emit('data', trimmed);
                }
            });

            this.port.on('close', () => this.emit('close'));
            this.port.on('error', (err) => this.emit('error', err));

            this.port.open((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    write(line) {
        if (!this.isOpen) {
            return;
        }
        this.port.write(line + '\n');
    }

    close() {
        return new Promise((resolve) => {
            if (!this.port || !this.port.isOpen) {
                resolve();
                return;
            }
            this.port.close(() => resolve());
        });
    }
}

export default PendantSerial;
