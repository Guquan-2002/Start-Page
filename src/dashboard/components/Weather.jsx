import { useWeather } from '../hooks/useWeather.js';
import { useWeatherConfig } from '../hooks/useWeatherConfig.js';
import { weatherApiKey } from '../utils/weatherApi.js';
import { WeatherConfig } from './WeatherConfig.jsx';
import { Icon } from '../../shared/Icon.jsx';
import './Weather.css';

const STATUS_DISPLAY = {
    unconfigured: { icon: 'key', details: '未配置天气服务' },
    loading: { icon: 'spinner', spinning: true, details: '正在获取天气...' },
    error: { icon: 'warning', spinning: false, details: '获取失败' },
};

export function Weather({ networkConnectivity }) {
    const { showConfig, requestConfig, closeConfig } = useWeatherConfig();

    if (!weatherApiKey) {
        const openConfig = (event) => {
            event.preventDefault();
            requestConfig();
        };
        const display = STATUS_DISPLAY.unconfigured;

        return (
            <>
                <WeatherBadge
                    href="#"
                    onClick={openConfig}
                    icon={display.icon}
                    details={display.details}
                />
                {showConfig && <WeatherConfig onClose={closeConfig} />}
            </>
        );
    }

    return <WeatherNow networkConnectivity={networkConnectivity} />;
}

function WeatherNow({ networkConnectivity }) {
    const weather = useWeather(networkConnectivity);
    const display = weather.status === 'success' ? weather : STATUS_DISPLAY[weather.status];

    return (
        <WeatherBadge
            href="https://weather.cma.cn/web/weather"
            icon={display.icon}
            spinning={display.spinning}
            details={display.details}
        />
    );
}

function WeatherBadge({ href, onClick, icon, spinning, details }) {
    return (
        <a
            id="weather-container"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="天气信息"
            onClick={onClick}
        >
            <Icon id="weather-icon" name={icon} spin={spinning} />
            <span id="weather-details">{details}</span>
        </a>
    );
}
