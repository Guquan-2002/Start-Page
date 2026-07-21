import { execFile } from 'node:child_process';

import { createCachedLoader, sendJson } from './apiSupport.js';

const POWERSHELL_PATH = '/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe';
const POWERSHELL_TIMEOUT_MS = 20 * 1000;
const NETWORK_REQUEST_TIMEOUT_MS = 2 * 1000;
const NETWORK_CACHE_TTL_MS = 10 * 1000;
const NETWORK_ENDPOINTS = {
    global: 'https://www.google.com/generate_204',
    domestic: 'https://www.bing.com/generate_204',
};

function createNetworkProbeCommand(url) {
    return `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.Net.Http; $client = New-Object System.Net.Http.HttpClient; $client.Timeout = [TimeSpan]::FromSeconds(${NETWORK_REQUEST_TIMEOUT_MS / 1000}); $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Head, '${url}'); try { $response = $client.SendAsync($request).GetAwaiter().GetResult(); 'true' } catch { 'false' } finally { if ($response) { $response.Dispose() }; if ($request) { $request.Dispose() }; $client.Dispose() }`;
}

function checkNetworkEndpoint(url) {
    return new Promise((resolve) => {
        execFile(
            POWERSHELL_PATH,
            [
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                createNetworkProbeCommand(url),
            ],
            { encoding: 'utf8', timeout: POWERSHELL_TIMEOUT_MS },
            (error, stdout) => {
                resolve(!error && stdout.trim() === 'true');
            }
        );
    });
}

async function queryNetworkConnectivity() {
    const [isGlobalReachable, isDomesticReachable] = await Promise.all([
        checkNetworkEndpoint(NETWORK_ENDPOINTS.global),
        checkNetworkEndpoint(NETWORK_ENDPOINTS.domestic),
    ]);

    if (isGlobalReachable) return 'global';
    if (isDomesticReachable) return 'domestic';
    return 'offline';
}

const getNetworkConnectivity = createCachedLoader(
    queryNetworkConnectivity,
    NETWORK_CACHE_TTL_MS
);

export async function handleNetworkApi(request, response) {
    if (new URL(request.url, 'http://localhost').pathname !== '/api/network') {
        return false;
    }

    try {
        sendJson(response, 200, {
            networkConnectivity: await getNetworkConnectivity(),
        });
    } catch (error) {
        console.error('检测网络状态失败:', error.message);
        sendJson(response, 500, { error: '检测网络状态失败' });
    }
    return true;
}
