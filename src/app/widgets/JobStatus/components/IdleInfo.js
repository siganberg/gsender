import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import moment from 'moment';
import get from 'lodash/get';
import humanizeDuration from 'humanize-duration';

import { in2mm, mm2in } from '../../../lib/units';
import styles from './IdleInfo.styl';
import FileStat from './FileStat';
import { IMPERIAL_UNITS, METRIC_UNITS } from '../../../constants';

const getFeedString = (movementSet, convertedFeedMin, convertedFeedMax, feedUnits) => {
    if (movementSet.length === 0) {
        return 'No Feedrates';
    }
    if (convertedFeedMin === convertedFeedMax) {
        return `${convertedFeedMax} ${feedUnits}`;
    }
    return `${convertedFeedMin}-${convertedFeedMax} ${feedUnits}`;
};

const getSpindleString = (spindleSet, spindleMin, spindleMax) => {
    if (spindleSet.length === 0) {
        return 'No Spindle';
    }
    if (spindleMin === spindleMax) {
        return `${spindleMax} RPM`;
    }
    return `${spindleMin}-${spindleMax} RPM`;
};

/**
 * Idle Information component displaying job information when status is set to idle
 * @param {Object} state Default state given from parent component
 */
const IdleInfo = ({ state, ...props }) => {
    const {
        units,
        lastFileRan,
        fileModal,
        bbox: { delta, min, max } // This is mapped to correct units from redux earlier in the component tree
    } = state;
    const {
        fileLoaded,
        spindleSet,
        toolSet,
        movementSet,
        estimatedTime,
        usedAxes
    } = props;

    let convertedFeedMin, convertedFeedMax, feedUnits;
    feedUnits = (units === METRIC_UNITS) ? 'mm/min' : 'ipm';

    let feedrateMin = Math.min(...movementSet);
    let feedrateMax = Math.max(...movementSet);
    let spindleMin = Math.min(...spindleSet);
    let spindleMax = Math.max(...spindleSet);

    convertedFeedMin = feedrateMin;
    convertedFeedMax = feedrateMax;
    if (units === METRIC_UNITS) {
        if (fileModal === IMPERIAL_UNITS) {
            convertedFeedMin = in2mm(feedrateMin).toFixed(3);
            convertedFeedMax = in2mm(feedrateMax).toFixed(3);
        }
    } else if (fileModal === METRIC_UNITS) {
        convertedFeedMin = mm2in(feedrateMin).toFixed(2);
        convertedFeedMax = mm2in(feedrateMax).toFixed(2);
    }

    /**
     * Return formatted list of tools in use
     */
    const formattedToolsUsed = () => {
        let line = '';

        for (const item of toolSet) {
            line += `${item}, `;
        }

        return line.slice(0, -2); //Remove space and apostrophe at the end
    };

    const outputFormattedTimeForLastFile = (givenTime) => {
        if (!givenTime) {
            return '-';
        }
        //Given time is a unix timestamp to be compared to unix timestamp 0
        const elapsedMinute = moment(moment(givenTime)).diff(moment.unix(0), 'minutes');
        const elapsedSecond = String((moment(moment(givenTime)).diff(moment.unix(0), 'seconds')));

        //Grab last two characters in the elapsedSecond variable, which represent the seconds that have passed
        const strElapsedSecond = `${(elapsedSecond[elapsedSecond.length - 2] !== undefined ? elapsedSecond[elapsedSecond.length - 2] : '')}${String(elapsedSecond[elapsedSecond.length - 1])}`;
        const formattedSeconds = Number(strElapsedSecond) < 59 ? Number(strElapsedSecond) : `${Number(strElapsedSecond) - 60}`;

        return `${elapsedMinute}m ${Math.abs(formattedSeconds)}s`;
    };

    const formatEstimatedTime = (time = 0) => {
        if (time <= 1) {
            return '-';
        }

        const minuteInSeconds = 60;
        const hourInSeconds = minuteInSeconds * 60;
        const dayInSeconds = hourInSeconds * 24;

        let units = ['d', 'h', 'm', 's'];

        if (time > minuteInSeconds && time < hourInSeconds) {
            units = ['m', 's'];
        }

        if (time > hourInSeconds && time < dayInSeconds) {
            units = ['h', 'm'];
        }

        if (time >= dayInSeconds) {
            units = ['d', 'h'];
        }

        const shortEnglishHumanizer = humanizeDuration.humanizer({
            language: 'shortEn',
            languages: {
                shortEn: {
                    d: () => 'd',
                    h: () => 'h',
                    m: () => 'm',
                    s: () => 's',
                },
            },
            round: true,
            units,
            delimiter: ' ',
            spacer: ''
        });

        return shortEnglishHumanizer(time * 1000);
    };

    const feedString = getFeedString(movementSet, convertedFeedMin, convertedFeedMax, feedUnits);

    let elapsedTimeToDisplay = outputFormattedTimeForLastFile(state.lastFileRunLength);

    const formattedEstimateTime = formatEstimatedTime(estimatedTime);

    const usedAxesStr = usedAxes ? [...usedAxes].toString() : '';

    return fileLoaded ? (
        <div className={styles['idle-info']}>
            <div className={styles.idleInfoRow}>
                <FileStat label="Attributes">
                    Axes Used: {usedAxesStr}
                    <br />
                    {formattedEstimateTime}
                    <br />
                    {feedString}
                </FileStat>
                <FileStat label="Spindle">
                    {
                        getSpindleString(spindleSet, spindleMin, spindleMax)
                    }
                    <br />
                    {toolSet.length > 0 ? `${toolSet.length} (${formattedToolsUsed()})` : 'No Tools'}
                </FileStat>
                <FileStat label="Dimensions">
                    {`${delta.x} ${units} (X)`}
                    <br />
                    {`${delta.y} ${units} (Y)`}
                    <br />
                    {`${delta.z} ${units} (Z)`}
                </FileStat>
                <FileStat label="Minimum">
                    {`${min.x} ${units} (X)`}
                    <br />
                    {`${min.y} ${units} (Y)`}
                    <br />
                    {`${min.z} ${units} (Z)`}
                </FileStat>
                <FileStat label="Maximum">
                    {`${max.x} ${units} (X)`}
                    <br />
                    {`${max.y} ${units} (Y)`}
                    <br />
                    {`${max.z} ${units} (Z)`}
                </FileStat>
                {
                    lastFileRan
                        ? (
                            <FileStat label="Previous Run">
                                <span className={styles.textWrap}>{lastFileRan}</span>
                                {`Run Length: ${elapsedTimeToDisplay}`}
                            </FileStat>
                        ) : <FileStat label="Previous Run">-</FileStat>
                }
            </div>
        </div>
    ) : (
        <div className={styles['idle-info']}>
            <div className={styles.idleInfoRow}>
                <FileStat label="Attributes">-</FileStat>
                <FileStat label="Spindle">-</FileStat>
                <FileStat label="Dimensions">-</FileStat>
                <FileStat label="Minimum">-</FileStat>
                <FileStat label="Maximum">-</FileStat>
                {
                    lastFileRan
                        ? (
                            <FileStat label="Previous Run">
                                <span className={styles.textWrap}>{lastFileRan}</span>
                                {`Run Length: ${elapsedTimeToDisplay}`}
                            </FileStat>
                        ) : <FileStat label="Previous Run">-</FileStat>
                }
            </div>
        </div>
    );
};

IdleInfo.propTypes = {
    state: PropTypes.object,
};

export default connect((store) => {
    const file = get(store, 'file', {});

    const movementSet = [...file.movementSet].map(value => Number(value.slice(1)));
    const toolSet = [...file.toolSet];
    const spindleSet = [...file.spindleSet].map(value => Number(value.slice(1)));

    return {
        ...file,
        movementSet,
        toolSet,
        spindleSet,
        usedAxes: file.usedAxes
    };
})(IdleInfo);
