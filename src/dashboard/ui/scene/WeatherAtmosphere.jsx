import { useWeatherAtmosphere } from '../../application/scene/useWeatherAtmosphere.js';
import './WeatherAtmosphere.css';

export function WeatherAtmosphere({ children }) {
    useWeatherAtmosphere();

    return (
        <div
            className="weather-atmosphere"
            aria-hidden="true"
        >
            {children}
        </div>
    );
}
