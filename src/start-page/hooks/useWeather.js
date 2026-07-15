import { useEffect, useState } from 'react';

const WEATHER_API_KEY_STORAGE_KEY = 'startpage_weather_api_key';
const WEATHER_SETUP_PROMPT_FLAG_KEY = 'startpage_weather_setup_prompted';

const externalConfig = globalThis.__STARTPAGE_CONFIG__ || {};
const weatherApiKey = (
    externalConfig.weatherApiKey
    || localStorage.getItem(WEATHER_API_KEY_STORAGE_KEY)
    || ''
).trim();
const weatherProxyUrl = (externalConfig.weatherProxyUrl || '').trim();

function saveWeatherApiKey(apiKey) {
    localStorage.setItem(WEATHER_API_KEY_STORAGE_KEY, apiKey);
}

function shouldPromptWeatherSetup() {
    return !weatherApiKey
        && !weatherProxyUrl
        && localStorage.getItem(WEATHER_SETUP_PROMPT_FLAG_KEY) !== '1';
}

function markWeatherSetupPrompted() {
    localStorage.setItem(WEATHER_SETUP_PROMPT_FLAG_KEY, '1');
}

function buildWeatherUrl(location) {
    if (weatherProxyUrl) {
        const separator = weatherProxyUrl.includes('?') ? '&' : '?';
        return `${weatherProxyUrl}${separator}location=${encodeURIComponent(location)}`;
    }

    if (!weatherApiKey) return '';

    return `https://api.seniverse.com/v3/weather/now.json?key=${encodeURIComponent(weatherApiKey)}&location=${encodeURIComponent(location)}&language=zh-Hans&unit=c`;
}

const WEATHER_API_URLS = {
    default: buildWeatherUrl('ip'),
    googleAvailable: buildWeatherUrl('WSSU6EXX52RE')
};

const WEATHER_ICONS = [
    'sun', 'moon', 'sun', 'moon', 'cloud', 'cloud-sun', 'cloud-sun', 'cloud',
    'cloud', 'cloud', 'rain', 'bolt', 'bolt', 'rain', 'rain', 'rain', 'wind',
    'wind', 'wind', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow',
    'fog', 'fog', 'fog', 'fog', 'fog', 'fog', 'wind', 'wind', 'wind', 'wind',
    'wind', 'temperature', 'temperature'
];

const INITIAL_WEATHER = {
    icon: 'spinner',
    spinning: true,
    details: 'Loading weather...'
};
const WEATHER_REQUEST_TIMEOUT_MS = 10000;
const WEATHER_UPDATE_INTERVAL = 30 * 60 * 1000;

function promptWeatherSetupIfNeeded() {
    if (!shouldPromptWeatherSetup()) return false;

    markWeatherSetupPrompted();
    const apiKey = window.prompt('输入心知天气 API Key：');
    const weatherApiKey = apiKey?.trim() || '';

    if (!weatherApiKey) return false;

    saveWeatherApiKey(weatherApiKey);
    window.alert('天气 API Key 已保存');
    window.location.reload();
    return true;
}

export function useWeather(isGoogleAvailable) {
    const [weather, setWeather] = useState(INITIAL_WEATHER);

    useEffect(() => {
        if (promptWeatherSetupIfNeeded() || isGoogleAvailable === null) {
            return;
        }

        let disposed = false;

        const updateWeather = async (url) => {
            if (!url) {
                setWeather({
                    icon: 'key',
                    spinning: false,
                    details: '未配置天气服务'
                });
                return;
            }

            try {
                const response = await fetch(url, {
                    signal: AbortSignal.timeout(WEATHER_REQUEST_TIMEOUT_MS)
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                const { location, now } = data.results[0];
                if (!disposed) {
                    setWeather({
                        icon: WEATHER_ICONS[now.code],
                        spinning: false,
                        details: `${location.name} · ${now.text} ${now.temperature}°C`
                    });
                }
            } catch (error) {
                if (disposed) return;

                console.error('获取失败:', error);
                setWeather({
                    icon: 'warning',
                    spinning: false,
                    details: '获取失败'
                });
            }
        };

        const runWeatherCheck = () => {
            setWeather({
                icon: 'spinner',
                spinning: true,
                details: '正在获取天气...'
            });

            const apiUrl = isGoogleAvailable
                ? WEATHER_API_URLS.googleAvailable
                : WEATHER_API_URLS.default;
            return updateWeather(apiUrl);
        };

        const intervalId = window.setInterval(() => {
            void runWeatherCheck();
        }, WEATHER_UPDATE_INTERVAL);
        void runWeatherCheck();

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, [isGoogleAvailable]);

    return weather;
}
