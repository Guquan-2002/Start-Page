import { SEARCH_ENGINES } from '../config.js';
import { useNetworkStatus } from './useNetworkStatus.js';
import { useWeather } from './useWeather.js';

const CHECKING_SEARCH_CONFIG = Object.freeze({
    action: '#',
    placeholder: '使用 Google 搜索',
    statusClass: '',
    statusText: 'Checking network...'
});

export function useStartPageServices() {
    const { isGoogleAvailable, networkEngine } = useNetworkStatus();
    const weather = useWeather(isGoogleAvailable);

    const searchConfig = networkEngine === null
        ? CHECKING_SEARCH_CONFIG
        : SEARCH_ENGINES[networkEngine];

    return {
        isOffline: networkEngine === 'offline',
        searchConfig,
        weather
    };
}
