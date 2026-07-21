import { Icon } from '../../../shared/Icon.jsx';
import { useWeatherBadge } from '../../application/panels/useWeatherBadge.js';
import './WeatherBadge.css';

export function WeatherBadge() {
    const badgeView = useWeatherBadge();

    return (
        <a
            className="weather-badge"
            href={badgeView.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="天气信息"
        >
            <Icon
                name={badgeView.iconName}
                spin={badgeView.isIconSpinning}
                className="weather-badge__icon"
            />
            <span>{badgeView.detailText}</span>
        </a>
    );
}
