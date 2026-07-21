import { useWeatherCloud } from '../../application/scene/useWeatherCloud.js';
import './WeatherCloud.css';

export function WeatherCloud() {
    const { weatherCloudLayerStyle, weatherCloudEnabled, visibleWeatherClouds } =
        useWeatherCloud();

    if (!weatherCloudEnabled) return null;

    return (
        <div className="weather-cloud" style={weatherCloudLayerStyle} aria-hidden="true">
            {visibleWeatherClouds.map((weatherCloud) => (
                <div
                    key={weatherCloud.id}
                    className="weather-cloud__item"
                    style={weatherCloud.style}
                />
            ))}
        </div>
    );
}
