import { useWeatherStatusState } from '../status/weatherStatus.jsx';

const WEATHER_DETAILS_URL = 'https://weather.cma.cn/web/weather';
const WEATHER_ICONS = ['sun', 'moon', 'sun', 'moon', 'cloud', 'cloud-sun', 'cloud-sun', 'cloud', 'cloud', 'cloud', 'rain', 'bolt', 'bolt', 'rain', 'rain', 'rain', 'wind', 'wind', 'wind', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'fog', 'fog', 'fog', 'fog', 'fog', 'fog', 'wind', 'wind', 'wind', 'wind', 'wind', 'temperature', 'temperature'];
const WEATHER_BADGE_VIEWS = {
    loading: { iconName: 'spinner', isIconSpinning: true,  detailText: '正在获取天气...' },
    error: { iconName: 'warning', isIconSpinning: false, detailText: '获取失败' },
};

function getWeatherBadgeView(weatherStatus) {
    const badgeView =
        weatherStatus.status === 'success'
            ? {
                  iconName: WEATHER_ICONS[weatherStatus.weatherCode],
                  isIconSpinning: false,
                  detailText: `${weatherStatus.locationName} · ${weatherStatus.text} ${weatherStatus.temperature} °C`,
              }
            : WEATHER_BADGE_VIEWS[weatherStatus.status];

    return {
        targetUrl: WEATHER_DETAILS_URL,
        ...badgeView,
    };
}

export function useWeatherBadge() {
    const weatherStatus = useWeatherStatusState();
    return getWeatherBadgeView(weatherStatus);
}
