import PendantService from './PendantService';

const pendant = new PendantService();

export default {
    start: (io) => pendant.start(io),
    stop: () => pendant.stop(),
};
