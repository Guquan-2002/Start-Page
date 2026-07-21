import { handleNetworkApi } from './apis/networkApi.js';
import { handleSystemStatusApi } from './apis/systemStatusApi.js';
import { handleWeatherApi } from './apis/weatherApi.js';

const DASHBOARD_API_HANDLERS = [
    handleNetworkApi,
    handleSystemStatusApi,
    handleWeatherApi,
];

export async function handleDashboardApi(request, response, next) {
    for (const handleApi of DASHBOARD_API_HANDLERS) {
        if (await handleApi(request, response)) return true;
    }

    next?.();
    return false;
}
