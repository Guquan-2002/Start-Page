import { useEffect, useState } from 'react';
import { runWeatherCheck, promptWeatherSetupIfNeeded } from '../utils/weatherApi.js';

const WEATHER_UPDATE_INTERVAL = 30 * 60 * 1000;

export function useWeather(networkConnectivity) {
    const [weather, setWeather] = useState({ icon: 'spinner', spinning: true, details: '正在获取天气...' });

    useEffect(() => {
        if (promptWeatherSetupIfNeeded() || networkConnectivity === null) {
            return;
        }

        void runWeatherCheck(networkConnectivity, setWeather);
        const intervalId = window.setInterval(() => {
            void runWeatherCheck(networkConnectivity, setWeather);
        }, WEATHER_UPDATE_INTERVAL);

        return () => window.clearInterval(intervalId);
    }, [networkConnectivity]);

    return weather;
}
