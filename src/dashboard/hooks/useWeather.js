import { useEffect, useState } from 'react';
import { fetchWeatherNow } from '../utils/weatherApi.js';

const WEATHER_UPDATE_INTERVAL = 30 * 60 * 1000;
const WEATHER_REQUEST_TIMEOUT_MS = 10 * 1000;

export function useWeather(networkConnectivity) {
    const [weather, setWeather] = useState({ status: 'loading' });

    useEffect(() => {
        if (networkConnectivity === null) {
            return;
        }

        const update = async () => {
            setWeather({ status: 'loading' });
            try {
                const data = await fetchWeatherNow(
                    networkConnectivity,
                    AbortSignal.timeout(WEATHER_REQUEST_TIMEOUT_MS),
                );
                setWeather({ status: 'success', ...data });
            } catch {
                setWeather({ status: 'error' });
            }
        };

        void update();
        const intervalId = window.setInterval(update, WEATHER_UPDATE_INTERVAL);

        return () => window.clearInterval(intervalId);
    }, [networkConnectivity]);

    return weather;
}
