import {
    WEATHER_API_URLS,
    WEATHER_ICON_MAP,
    CONFIG,
    shouldPromptWeatherSetup,
    markWeatherSetupPrompted,
    saveRuntimeConfig
} from './config.js';
import { elements, checkConnectivity } from './utils.js';
import { NETWORK_ENDPOINTS } from './config.js';

function asTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function promptWeatherSetupIfNeeded() {
    if (!shouldPromptWeatherSetup()) return false;

    markWeatherSetupPrompted();

    const apiKey = window.prompt('检测到未配置天气服务，请输入心知天气 API Key：');
    const weatherApiKey = asTrimmedString(apiKey);

    if (!weatherApiKey) return false;

    saveRuntimeConfig({ weatherApiKey });
    window.alert('天气 API Key 已保存，页面即将刷新。');
    window.location.reload();
    return true;
}

export async function updateWeather(url) {
    if (!url) {
        elements.weatherIconEl.className = 'fas fa-key';
        elements.weatherDetailsEl.textContent = '未配置天气服务';
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.results?.[0]) throw new Error('\u5929\u6c14\u6570\u636e\u683c\u5f0f\u9519\u8bef');

        const { location, now } = data.results[0];
        elements.weatherIconEl.className = `fas ${WEATHER_ICON_MAP[now.code] || 'fa-question-circle'}`;
        elements.weatherDetailsEl.textContent = `${location.name} \u00b7 ${now.text} ${now.temperature}\u00b0C`;
    } catch (error) {
        console.error('\u5929\u6c14\u4fe1\u606f\u83b7\u53d6\u5931\u8d25:', error);
        elements.weatherIconEl.className = 'fas fa-exclamation-triangle';
        elements.weatherDetailsEl.textContent = '\u5929\u6c14\u4fe1\u606f\u52a0\u8f7d\u5931\u8d25';
    }
}

export async function runWeatherCheck(isGoogleAvailable) {
    elements.weatherIconEl.className = 'fas fa-spinner fa-spin';
    elements.weatherDetailsEl.textContent = '\u6b63\u5728\u52a0\u8f7d\u5929\u6c14...';
    const apiUrl = isGoogleAvailable ? WEATHER_API_URLS.googleAvailable : WEATHER_API_URLS.default;
    await updateWeather(apiUrl);
}

export function startWeatherUpdater(interval) {
    setInterval(async () => {
        const googleOk = await checkConnectivity(NETWORK_ENDPOINTS.google, CONFIG.NETWORK_TIMEOUT);
        runWeatherCheck(googleOk);
    }, interval);
}
