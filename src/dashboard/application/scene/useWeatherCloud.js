import { useState } from 'react';
import { getWeatherEffects, useWeatherStatusState } from '../status/weatherStatus.jsx';

const WEATHER_CLOUD_COUNT_RANGE = [3, 5];
const WEATHER_CLOUD_WIDTH_RANGE = [140, 280];
const WEATHER_CLOUD_TOP_RANGE = [12, 58];
const WEATHER_CLOUD_ASPECT_RATIO_RANGE = [0.24, 0.32];
const WEATHER_CLOUD_ALPHA_RANGE = [0.42, 0.72];
const WEATHER_CLOUD_DURATION_RANGE = [90, 170];
const WEATHER_CLOUD_PUFF_OFFSET_RANGE = [-10, 10];
const WEATHER_CLOUD_PUFF_SCALE_RANGE = [0.78, 1.22];

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function randomInteger(min, max) {
    return Math.floor(randomBetween(min, max + 1));
}

function createWeatherCloud(index) {
    const width = randomInteger(...WEATHER_CLOUD_WIDTH_RANGE);
    const aspectRatio = randomBetween(...WEATHER_CLOUD_ASPECT_RATIO_RANGE);
    const duration = randomInteger(...WEATHER_CLOUD_DURATION_RANGE);
    const delay = -randomInteger(0, duration);

    return {
        id: `weather-cloud-${index}`,
        style: {
            '--weather-cloud-top': `${randomBetween(...WEATHER_CLOUD_TOP_RANGE).toFixed(1)}%`,
            '--weather-cloud-width': `${width}px`,
            '--weather-cloud-height': `${Math.round(width * aspectRatio)}px`,
            '--weather-cloud-alpha': randomBetween(...WEATHER_CLOUD_ALPHA_RANGE).toFixed(2),
            '--weather-cloud-duration': `${duration}s`,
            '--weather-cloud-delay': `${delay}s`,
            '--weather-cloud-puff-one-x': `${randomInteger(...WEATHER_CLOUD_PUFF_OFFSET_RANGE)}%`,
            '--weather-cloud-puff-one-y': `${randomInteger(...WEATHER_CLOUD_PUFF_OFFSET_RANGE)}%`,
            '--weather-cloud-puff-one-scale': randomBetween(...WEATHER_CLOUD_PUFF_SCALE_RANGE).toFixed(2),
            '--weather-cloud-puff-two-x': `${randomInteger(...WEATHER_CLOUD_PUFF_OFFSET_RANGE)}%`,
            '--weather-cloud-puff-two-y': `${randomInteger(...WEATHER_CLOUD_PUFF_OFFSET_RANGE)}%`,
            '--weather-cloud-puff-two-scale': randomBetween(...WEATHER_CLOUD_PUFF_SCALE_RANGE).toFixed(2),
        },
    };
}

function createWeatherClouds() {
    const [minCount, maxCount] = WEATHER_CLOUD_COUNT_RANGE;
    const count = randomInteger(minCount, maxCount);
    return Array.from({ length: count }, (_, index) => createWeatherCloud(index));
}

function getWeatherCloudView({ cloudCoverage }, weatherClouds) {
    const visibleWeatherCloudCount = Math.ceil(weatherClouds.length * cloudCoverage);

    return {
        weatherCloudLayerStyle: { '--weather-cloud-coverage': `${cloudCoverage}` },
        weatherCloudEnabled: cloudCoverage > 0 && visibleWeatherCloudCount > 0,
        visibleWeatherClouds: weatherClouds.slice(0, visibleWeatherCloudCount),
    };
}

export function useWeatherCloud() {
    const weatherStatus = useWeatherStatusState();
    const weatherEffects = getWeatherEffects(weatherStatus.weatherCode);
    const [weatherClouds] = useState(createWeatherClouds);
    const { weatherCloudLayerStyle, weatherCloudEnabled, visibleWeatherClouds } = getWeatherCloudView(weatherEffects, weatherClouds);

    return { weatherCloudLayerStyle, weatherCloudEnabled, visibleWeatherClouds };
}
