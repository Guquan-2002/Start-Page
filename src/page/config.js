// App-level runtime config for weather/network/search; merged from localStorage and optional global overrides.
import { safeGetJson, safeSetJson } from '../shared/safe-storage.js';
import { asTrimmedString } from '../shared/string-utils.js';

const RUNTIME_CONFIG_STORAGE_KEY = 'startpage_config';
const WEATHER_SETUP_PROMPT_FLAG_KEY = 'weather_setup_prompted';

// localStorage values are base config; window.__STARTPAGE_CONFIG__ can override per deployment.
function readRuntimeConfig() {
    const globalConfig = globalThis.__STARTPAGE_CONFIG__ || {};
    const localConfig = safeGetJson(RUNTIME_CONFIG_STORAGE_KEY, {}, globalThis.localStorage);
    return { ...localConfig, ...globalConfig };
}

export function saveRuntimeConfig(partialConfig) {
    const existingConfig = safeGetJson(RUNTIME_CONFIG_STORAGE_KEY, {}, globalThis.localStorage);
    safeSetJson(RUNTIME_CONFIG_STORAGE_KEY, { ...existingConfig, ...partialConfig }, globalThis.localStorage);
}

const runtimeConfig = readRuntimeConfig();
const weatherApiKey = asTrimmedString(runtimeConfig.weatherApiKey);
const weatherProxyUrl = asTrimmedString(runtimeConfig.weatherProxyUrl);

export function hasWeatherServiceConfig() {
    return Boolean(weatherApiKey || weatherProxyUrl);
}

export function shouldPromptWeatherSetup() {
    if (hasWeatherServiceConfig()) return false;
    if (typeof localStorage === 'undefined') return false;

    try {
        return localStorage.getItem(WEATHER_SETUP_PROMPT_FLAG_KEY) !== '1';
    } catch {
        return false;
    }
}

export function markWeatherSetupPrompted() {
    if (typeof localStorage === 'undefined') return;

    try {
        localStorage.setItem(WEATHER_SETUP_PROMPT_FLAG_KEY, '1');
    } catch {
        // Ignore write failures.
    }
}

// Prefer proxy endpoint when provided; otherwise call Seniverse directly with API key.
function buildWeatherUrl(location) {
    if (weatherProxyUrl) {
        const separator = weatherProxyUrl.includes('?') ? '&' : '?';
        return `${weatherProxyUrl}${separator}location=${encodeURIComponent(location)}`;
    }

    if (!weatherApiKey) return '';

    return `https://api.seniverse.com/v3/weather/now.json?key=${encodeURIComponent(weatherApiKey)}&location=${encodeURIComponent(location)}&language=zh-Hans&unit=c`;
}

export const CONFIG = {
    WEATHER_API_KEY: weatherApiKey,
    WEATHER_PROXY_URL: weatherProxyUrl,
    WEATHER_UPDATE_INTERVAL: 30 * 60 * 1000,
    NETWORK_CHECK_INTERVAL: 10 * 1000,
    THEME_CHECK_INTERVAL: 60 * 1000,
    TIME_UPDATE_INTERVAL: 1000,
    NETWORK_TIMEOUT: 2000,
    STARS_COUNT: { small: 300, medium: 80, big: 40 }
};

export const WEATHER_API_URLS = {
    default: buildWeatherUrl('ip'),
    googleAvailable: buildWeatherUrl('WSSU6EXX52RE')
};

export const WEATHER_ICON_MAP = {
    '0': 'sun',
    '1': 'moon',
    '2': 'sun',
    '3': 'moon',
    '4': 'cloud',
    '5': 'cloud-sun',
    '6': 'cloud-sun',
    '7': 'cloud',
    '8': 'cloud',
    '9': 'cloud',
    '10': 'rain',
    '11': 'bolt',
    '12': 'bolt',
    '13': 'rain',
    '14': 'rain',
    '15': 'rain',
    '16': 'wind',
    '17': 'wind',
    '18': 'wind',
    '19': 'snow',
    '20': 'snow',
    '21': 'snow',
    '22': 'snow',
    '23': 'snow',
    '24': 'snow',
    '25': 'snow',
    '26': 'fog',
    '27': 'fog',
    '28': 'fog',
    '29': 'fog',
    '30': 'fog',
    '31': 'fog',
    '32': 'wind',
    '33': 'wind',
    '34': 'wind',
    '35': 'wind',
    '36': 'wind',
    '37': 'temperature',
    '38': 'temperature'
};

export const NETWORK_ENDPOINTS = {
    google: 'https://www.google.com/generate_204',
    bing: 'https://www.bing.com/generate_204'
};

export const SEARCH_ENGINES = {
    google: {
        action: 'https://www.google.com/search',
        placeholder: '使用 Google 搜索',
        statusClass: 'google-ok',
        statusText: '国际'
    },
    bing: {
        action: 'https://cn.bing.com/search',
        placeholder: '使用 Bing 搜索',
        statusClass: 'bing-ok',
        statusText: '国内'
    },
    offline: {
        action: '#',
        placeholder: '网络连接不可用',
        statusClass: 'net-fail',
        statusText: '断开'
    }
};
