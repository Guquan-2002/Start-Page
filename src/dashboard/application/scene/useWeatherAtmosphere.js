import { useLayoutEffect } from 'react';
import { setBodyCssProperties } from '../../infrastructure/bodyStyle.js';
import { getWeatherEffects, useWeatherStatusState } from '../status/weatherStatus.jsx';

const WEATHER_ATMOSPHERE_BY_PARTICLE = {
    rain: { brightness: 0.8, saturation: 0.65 },
    snow: { brightness: 0.92, saturation: 0.8 },
};
const OVERCAST_MIN_COVERAGE = 0.7;
const OVERCAST_ATMOSPHERE = { brightness: 0.88, saturation: 0.7 };
const CLEAR_ATMOSPHERE = { brightness: 1, saturation: 1 };

function getWeatherAtmosphere({ particleKind, cloudCoverage }) {
    if (WEATHER_ATMOSPHERE_BY_PARTICLE[particleKind]) {
        return WEATHER_ATMOSPHERE_BY_PARTICLE[particleKind];
    }
    if (cloudCoverage >= OVERCAST_MIN_COVERAGE) {
        return OVERCAST_ATMOSPHERE;
    }
    return CLEAR_ATMOSPHERE;
}

function getWeatherAtmosphereStyle(weatherEffects) {
    const { brightness, saturation } = getWeatherAtmosphere(weatherEffects);
    return {
        '--sky-brightness': `${brightness}`,
        '--sky-saturation': `${saturation}`,
    };
}

export function useWeatherAtmosphere() {
    const weatherStatus = useWeatherStatusState();
    const { cloudCoverage, particleKind } = getWeatherEffects(weatherStatus.weatherCode);

    useLayoutEffect(() => setBodyCssProperties(getWeatherAtmosphereStyle({ cloudCoverage, particleKind })), [cloudCoverage, particleKind]);
}
