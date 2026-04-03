import { DRO_FULL_PREFIX, DRO_DELTA_PREFIX } from './constants';

class DROFormatter {
    constructor() {
        this._lastSnapshot = null;
    }

    snapshot(controller) {
        if (!controller) {
            return null;
        }

        const state = controller.state || {};
        const status = state.status || {};
        const parserstate = state.parserstate || {};
        const modal = parserstate.modal || {};
        const runner = controller.runner || {};
        const settings = (runner.settings && runner.settings.settings) || {};
        const sender = controller.sender || {};
        const senderState = sender.state || {};
        const workflow = controller.workflow || {};
        const wpos = status.wpos || {};
        const wco = status.wco || {};
        const ov = status.ov || [];

        return {
            activeState: status.activeState || 'Idle',
            wpos: {
                x: parseFloat(wpos.x) || 0,
                y: parseFloat(wpos.y) || 0,
                z: parseFloat(wpos.z) || 0,
            },
            wco: {
                x: parseFloat(wco.x) || 0,
                y: parseFloat(wco.y) || 0,
                z: parseFloat(wco.z) || 0,
            },
            ovFeed: ov[0] || 100,
            ovRapid: ov[1] || 100,
            ovSpindle: ov[2] || 100,
            feedrate: parseFloat(status.feedrate) || 0,
            spindle: parseFloat(status.spindle) || 0,
            connected: true,
            homed: status.activeState !== 'Alarm',
            alarmCode: status.alarmCode || null,
            sentLines: senderState.sent || 0,
            totalLines: senderState.total || 0,
            workflowState: workflow.state || 'idle',
            workspace: modal.wcs || 'G54',
            maxFeedX: parseFloat(settings.$110) || 0,
            maxFeedY: parseFloat(settings.$111) || 0,
            maxFeedZ: parseFloat(settings.$112) || 0,
        };
    }

    formatFull(snap) {
        if (!snap) {
            return '$!Idle';
        }

        const parts = this._buildParts(snap);
        this._lastSnapshot = snap;
        return DRO_FULL_PREFIX + parts.join('|');
    }

    formatDelta(snap) {
        if (!snap) {
            return '$Idle';
        }
        if (!this._lastSnapshot) {
            return this.formatFull(snap);
        }

        const parts = this._buildParts(snap);
        this._lastSnapshot = snap;
        return DRO_DELTA_PREFIX + parts.join('|');
    }

    reset() {
        this._lastSnapshot = null;
    }

    _buildParts(snap) {
        const parts = [snap.activeState];
        parts.push('P:' + snap.wpos.x.toFixed(3) + ',' + snap.wpos.y.toFixed(3) + ',' + snap.wpos.z.toFixed(3));
        parts.push('O:' + snap.ovFeed + ',' + snap.ovRapid + ',' + snap.ovSpindle);

        if (snap.feedrate > 0) {
            parts.push('F:' + Math.round(snap.feedrate));
        }
        if (snap.spindle > 0) {
            parts.push('R:' + Math.round(snap.spindle));
        }
        if (snap.connected) {
            parts.push('C');
        }
        if (snap.homed) {
            parts.push('H');
        }
        if (snap.activeState === 'Alarm' && snap.alarmCode) {
            parts.push('A:' + snap.alarmCode);
        }
        if (snap.totalLines > 0) {
            parts.push('J:' + snap.sentLines + '/' + snap.totalLines);
        }

        const jobStatus = this._mapWorkflowState(snap.workflowState);
        if (jobStatus) {
            parts.push('D:' + jobStatus);
        }

        parts.push('W:' + snap.wco.x.toFixed(3) + ',' + snap.wco.y.toFixed(3) + ',' + snap.wco.z.toFixed(3));
        parts.push('G:' + snap.workspace);

        if (snap.maxFeedX > 0 || snap.maxFeedY > 0 || snap.maxFeedZ > 0) {
            parts.push('M:' + Math.round(snap.maxFeedX) + ',' + Math.round(snap.maxFeedY) + ',' + Math.round(snap.maxFeedZ));
        }

        return parts;
    }

    _mapWorkflowState(state) {
        switch (state) {
        case 'running': return 'running';
        case 'paused': return 'paused';
        default: return null;
        }
    }
}

export default DROFormatter;
