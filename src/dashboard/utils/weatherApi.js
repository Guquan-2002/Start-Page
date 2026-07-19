const WEATHER_API_KEY_STORAGE_KEY = 'startpage_weather_api_key';

const externalConfig = globalThis.__STARTPAGE_CONFIG__ || {};

export const weatherApiKey = (
    externalConfig.weatherApiKey
    || localStorage.getItem(WEATHER_API_KEY_STORAGE_KEY)
    || ''
).trim();

export const WEATHER_ICONS = [
    'sun', 'moon', 'sun', 'moon', 'cloud', 'cloud-sun', 'cloud-sun', 'cloud',
    'cloud', 'cloud', 'rain', 'bolt', 'bolt', 'rain', 'rain', 'rain', 'wind',
    'wind', 'wind', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow',
    'fog', 'fog', 'fog', 'fog', 'fog', 'fog', 'wind', 'wind', 'wind', 'wind',
    'wind', 'temperature', 'temperature',
];

export const WEATHER_REQUEST_TIMEOUT_MS = 10000;

export const WEATHER_SETUP_PROMPT_FLAG_KEY = 'startpage_weather_setup_prompted';

export function getWeatherUrl(networkConnectivity) {
    const location = networkConnectivity === 'global' ? 'WSSU6EXX52RE' : 'ip';
    return `https://api.seniverse.com/v3/weather/now.json?key=${encodeURIComponent(weatherApiKey)}&location=${encodeURIComponent(location)}&language=zh-Hans&unit=c`;
}

export function promptWeatherSetupIfNeeded() {
    if (weatherApiKey || localStorage.getItem(WEATHER_SETUP_PROMPT_FLAG_KEY) === '1') {
        return false;
    }

    localStorage.setItem(WEATHER_SETUP_PROMPT_FLAG_KEY, '1');
    const input = window.prompt('输入心知天气 API Key：');
    const trimmedKey = (input || '').trim();

    if (!trimmedKey) return false;

    localStorage.setItem(WEATHER_API_KEY_STORAGE_KEY, trimmedKey);
    window.alert('天气 API Key 已保存');
    window.location.reload();
    return true;
}

export async function fetchWeather(apiUrl, signal) {
    const response = await fetch(apiUrl, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.results[0];
}

export async function runWeatherCheck(networkConnectivity, setWeather) {
    if (!weatherApiKey) {
        setWeather({ icon: 'key', spinning: false, details: '未配置天气服务' });
        return;
    }

    setWeather({ icon: 'spinner', spinning: true, details: '正在获取天气...' });

    try {
        const result = await fetchWeather(
            getWeatherUrl(networkConnectivity),
            AbortSignal.timeout(WEATHER_REQUEST_TIMEOUT_MS),
        );

        setWeather({
            icon: WEATHER_ICONS[result.now.code],
            spinning: false,
            details: `${result.location.name} · ${result.now.text} ${result.now.temperature}°C`,
        });
    } catch (error) {
        setWeather({ icon: 'warning', spinning: false, details: '获取失败' });
    }
}
