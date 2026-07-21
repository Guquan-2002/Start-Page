import { createContext, useContext, useEffect, useState } from 'react';
import { startPolling } from '../../infrastructure/polling.js';
import { fetchCurrentWeather } from '../../infrastructure/statusApi.js';

const WEATHER_STATUS_POLL_INTERVAL_MS = 30 * 60 * 1000;
const WEATHER_STATUS_TIMEOUT_MS = 10 * 1000;
const INITIAL_WEATHER_STATUS = { status: 'loading' };

// 心知天气 code → 粒子种类/强度与云量。
const CLOUD_COVERAGE = {
    4: 0.7,
    5: 0.35,
    6: 0.55,
    7: 0.75,
    8: 0.9,
    9: 1,
};

const RAIN_INTENSITY = {
    10: 0.7, // 阵雨
    11: 1.0, // 雷阵雨
    12: 1.0, // 雷阵雨伴有冰雹
    13: 0.5, // 小雨
    14: 0.8, // 中雨
    15: 1.1, // 大雨
    16: 1.4, // 暴雨
    17: 1.4, // 大暴雨
    18: 1.4, // 特大暴雨
    19: 0.8, // 冻雨
};

const SNOW_INTENSITY = {
    20: 0.6, // 雨夹雪
    21: 0.6, // 阵雪
    22: 0.5, // 小雪
    23: 0.8, // 中雪
    24: 1.1, // 大雪
    25: 1.4, // 暴雪
};

export function getWeatherEffects(weatherCode) {
    if (RAIN_INTENSITY[weatherCode]) {
        return { particleKind: 'rain', particleIntensity: RAIN_INTENSITY[weatherCode], cloudCoverage: 1 };
    }
    if (SNOW_INTENSITY[weatherCode]) {
        return { particleKind: 'snow', particleIntensity: SNOW_INTENSITY[weatherCode], cloudCoverage: 0.9 };
    }
    return {
        particleKind: null,
        particleIntensity: 0,
        cloudCoverage: CLOUD_COVERAGE[weatherCode] ?? 0,
    };
}

function useWeatherStatus() {
    const [weatherStatus, setWeatherStatus] = useState(INITIAL_WEATHER_STATUS);

    useEffect(() => startPolling({
        poll: fetchCurrentWeather,
        intervalMs: WEATHER_STATUS_POLL_INTERVAL_MS,
        timeoutMs: WEATHER_STATUS_TIMEOUT_MS,
        onStart: () => setWeatherStatus({ status: 'loading' }),
        onSuccess: (currentWeather) => setWeatherStatus({ status: 'success', ...currentWeather }),
        onError: () => setWeatherStatus({ status: 'error' }),
    }), []);

    return weatherStatus;
}

const WeatherStatusContext = createContext(null);

export function WeatherStatusProvider({ children }) {
    const weatherStatus = useWeatherStatus();
    return <WeatherStatusContext.Provider value={weatherStatus}>{children}</WeatherStatusContext.Provider>;
}

export function useWeatherStatusState() {
    return useContext(WeatherStatusContext);
}
