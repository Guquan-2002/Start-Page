import { useEffect, useState } from 'react';

import {
    CONFIG,
    markWeatherSetupPrompted,
    saveRuntimeConfig,
    shouldPromptWeatherSetup,
    WEATHER_API_URLS,
    WEATHER_ICON_MAP
} from '../config.js';
import { abortActiveRequests, fetchWithTimeout } from './service-utils.js';

const INITIAL_WEATHER = Object.freeze({
    icon: 'spinner',
    spinning: true,
    details: 'Loading weather...'
});
const WEATHER_REQUEST_TIMEOUT_MS = 10000;

function promptWeatherSetupIfNeeded() {
    if (!shouldPromptWeatherSetup()) return false;

    markWeatherSetupPrompted();
    const apiKey = window.prompt('输入心知天气 API Key：');
    const weatherApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';

    if (!weatherApiKey) return false;

    saveRuntimeConfig({ weatherApiKey });
    window.alert('天气 API Key 已保存');
    window.location.reload();
    return true;
}

export function useWeather(isGoogleAvailable) {
    const [setupReady, setSetupReady] = useState(false);
    const [weather, setWeather] = useState(INITIAL_WEATHER);

    useEffect(() => {
        if (!promptWeatherSetupIfNeeded()) {
            setSetupReady(true);
        }
    }, []);

    useEffect(() => {
        if (!setupReady || typeof isGoogleAvailable !== 'boolean') {
            return undefined;
        }

        let disposed = false;
        const activeControllers = new Set();

        const updateWeather = async (url) => {
            if (!url) {
                if (!disposed) {
                    setWeather({
                        icon: 'key',
                        spinning: false,
                        details: '未配置天气服务'
                    });
                }
                return;
            }

            try {
                const response = await fetchWithTimeout(url, {
                    activeControllers,
                    timeoutMs: WEATHER_REQUEST_TIMEOUT_MS
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                if (!data.results?.[0]) throw new Error('格式错误');

                const { location, now } = data.results[0];
                if (!disposed) {
                    setWeather({
                        icon: WEATHER_ICON_MAP[now.code] || 'question',
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
            if (!disposed) {
                setWeather({
                    icon: 'spinner',
                    spinning: true,
                    details: '正在获取天气...'
                });
            }

            const apiUrl = isGoogleAvailable
                ? WEATHER_API_URLS.googleAvailable
                : WEATHER_API_URLS.default;
            return updateWeather(apiUrl);
        };

        const intervalId = window.setInterval(() => {
            void runWeatherCheck();
        }, CONFIG.WEATHER_UPDATE_INTERVAL);
        void runWeatherCheck();

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
            abortActiveRequests(activeControllers);
        };
    }, [isGoogleAvailable, setupReady]);

    return weather;
}
