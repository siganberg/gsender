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

import React from 'react';
import cx from 'classnames';
import { GRBL_ACTIVE_STATE_JOG, GRBL_ACTIVE_STATE_RUN } from 'app/constants';
import styles from '../index.styl';

const JogCancel = ({ activeState, ...props }) => {
    return (
        <button
            {...props}
            type="button"
            className={cx(styles.jogCancelButton, { [styles.jogActive]: (activeState === GRBL_ACTIVE_STATE_RUN || activeState === GRBL_ACTIVE_STATE_JOG) })}
            title="Cancel movement"
        >
            <i className="fas fa-ban" />
        </button>
    );
};

export default JogCancel;
