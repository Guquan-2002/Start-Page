import { useWeather } from '../hooks/useWeather.js';
import { Icon } from '../../shared/Icon.jsx';
import './Weather.css';

export function Weather({ networkConnectivity }) {
    const weather = useWeather(networkConnectivity);

    return (
        <a
            id="weather-container"
            href="https://weather.cma.cn/web/weather"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="天气信息"
        >
            <Icon
                id="weather-icon"
                name={weather.icon}
                spin={weather.spinning}
            />
            <span id="weather-details">{weather.details}</span>
        </a>
    );
}
