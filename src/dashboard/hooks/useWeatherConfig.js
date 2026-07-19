import { useState } from 'react';
import { WEATHER_API_KEY_STORAGE_KEY } from '../utils/weatherApi.js';

export function useWeatherConfig() {
    const [showConfig, setShowConfig] = useState(false);

    const requestConfig = () => setShowConfig(true);

    const closeConfig = (key) => {
        setShowConfig(false);
        localStorage.setItem(WEATHER_API_KEY_STORAGE_KEY, key);
        window.location.reload();
    };

    return { showConfig, requestConfig, closeConfig };
}
