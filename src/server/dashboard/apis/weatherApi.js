import { request as httpRequest } from 'node:https';

import { createCachedLoader, sendJson } from './apiSupport.js';

const WEATHER_API_URL = 'https://api.seniverse.com/v3/weather/now.json';
const WEATHER_REQUEST_TIMEOUT_MS = 10_000;
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

function fetchWeather() {
    const key = process.env.WEATHER_API_KEY;
    const location = process.env.WEATHER_LOCATION;
    const url = `${WEATHER_API_URL}?location=${location}&language=zh-Hans&unit=c&key=${encodeURIComponent(key)}`;
    return new Promise((resolve, reject) => {
        const req = httpRequest(url, { timeout: WEATHER_REQUEST_TIMEOUT_MS }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`心知天气返回 HTTP ${res.statusCode}`));
                    return;
                }
                try {
                    const result = JSON.parse(body).results[0];
                    if (!result) {
                        reject(new Error('心知天气返回为空'));
                        return;
                    }
                    resolve({
                        weatherCode: Number(result.now.code),
                        locationName: result.location.name,
                        text: result.now.text,
                        temperature: result.now.temperature
                    });
                } catch (error) {
                    reject(error);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('心知天气请求超时')));
        req.end();
    });
}

const getWeather = createCachedLoader(
    fetchWeather,
    WEATHER_CACHE_TTL_MS
);

export async function handleWeatherApi(request, response) {
    if (new URL(request.url, 'http://localhost').pathname !== '/api/weather') {
        return false;
    }

    if (!process.env.WEATHER_API_KEY) {
        sendJson(response, 503, { error: '未配置天气服务' });
        return true;
    }

    try {
        sendJson(response, 200, await getWeather());
    } catch (error) {
        sendJson(response, 500, { error: '获取天气失败' });
    }
    return true;
}
