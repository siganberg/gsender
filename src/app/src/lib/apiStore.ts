import ApiStorage from './ApiStorage';

const apiStore = new ApiStorage({
    syncOnInit: true,
    debounceDelay: 300,
});

export default apiStore;