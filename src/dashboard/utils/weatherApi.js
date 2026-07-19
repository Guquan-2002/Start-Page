export const WEATHER_API_KEY_STORAGE_KEY = 'startpage_weather_api_key';

export const weatherApiKey = localStorage.getItem(WEATHER_API_KEY_STORAGE_KEY);

const WEATHER_ICONS = [
    'sun', 'moon', 'sun', 'moon', 'cloud', 'cloud-sun', 'cloud-sun', 'cloud',
    'cloud', 'cloud', 'rain', 'bolt', 'bolt', 'rain', 'rain', 'rain', 'wind',
    'wind', 'wind', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow',
    'fog', 'fog', 'fog', 'fog', 'fog', 'fog', 'wind', 'wind', 'wind', 'wind',
    'wind', 'temperature', 'temperature',
];

function getWeatherUrl(networkConnectivity) {
    const location = networkConnectivity === 'global' ? 'WSSU6EXX52RE' : 'ip';
    return `https://api.seniverse.com/v3/weather/now.json?key=${encodeURIComponent(weatherApiKey)}&location=${encodeURIComponent(location)}&language=zh-Hans&unit=c`;
}

export async function fetchWeatherNow(networkConnectivity, signal) {
    const response = await fetch(getWeatherUrl(networkConnectivity), { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const result = data.results[0];
    return {
        icon: WEATHER_ICONS[result.now.code],
        details: `${result.location.name} · ${result.now.text} ${result.now.temperature} °C`,
    };
}
