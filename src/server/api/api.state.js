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

import deepKeys from 'deep-keys';
import _ from 'lodash';
import config from '../services/configstore';
import CNCEngine from '../services/cncengine';
import {
    ERR_NOT_FOUND
} from '../constants';

export const get = (req, res) => {
    const query = req.query || {};

    if (!query.key) {
        res.send(config.get('state'));
        return;
    }

    const key = `state.${query.key}`;
    if (!config.has(key)) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Not found'
        });
        return;
    }

    const value = config.get(key);
    res.send(value);
};

export const unset = (req, res) => {
    const query = req.query || {};

    if (!query.key) {
        res.send(config.get('state'));
        return;
    }

    const key = `state.${query.key}`;
    if (!config.has(key)) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Not found'
        });
        return;
    }

    config.unset(key);
    res.send({ err: false });
};

export const set = (req, res) => {
    console.log('📥 Server: Received setState request', { query: req.query, body: req.body }); // eslint-disable-line no-console
    const query = req.query || {};
    const data = { ...req.body };
    const changedKeys = [];

    if (query.key) {
        const oldValue = config.get(`state.${query.key}`);
        config.set(`state.${query.key}`, data);
        if (oldValue !== data) {
            changedKeys.push(query.key);
        }
        res.send({ err: false });

        // Broadcast the change to all connected clients
        if (changedKeys.length > 0) {
            const cnc = CNCEngine();
            if (cnc && cnc.io) {
                console.log('🚀 Server: Broadcasting state:change for key:', query.key, 'value:', data); // eslint-disable-line no-console
                cnc.io.emit('state:change', { [query.key]: data });
            } else {
                console.log('❌ Server: CNCEngine or io not available for broadcasting'); // eslint-disable-line no-console
            }
        }
        return;
    }

    deepKeys(data).forEach((key) => {
        const oldValue = config.get(`state.${key}`);
        const newValue = _.get(data, key);

        if (typeof oldValue === 'object' && typeof newValue === 'object') {
            const mergedValue = {
                ...oldValue,
                ...newValue
            };
            config.set(`state.${key}`, mergedValue);
            if (!_.isEqual(oldValue, mergedValue)) {
                changedKeys.push(key);
            }
        } else {
            config.set(`state.${key}`, newValue);
            if (oldValue !== newValue) {
                changedKeys.push(key);
            }
        }
    });

    res.send({ err: false });

    // Broadcast the changes to all connected clients
    if (changedKeys.length > 0) {
        const cnc = CNCEngine();
        if (cnc && cnc.io) {
            const changedData = {};
            changedKeys.forEach(key => {
                changedData[key] = _.get(data, key);
            });
            console.log('🚀 Server: Broadcasting state:change for keys:', changedKeys, 'data:', changedData); // eslint-disable-line no-console
            cnc.io.emit('state:change', changedData);
        } else {
            console.log('❌ Server: CNCEngine or io not available for broadcasting'); // eslint-disable-line no-console
        }
    }
};
