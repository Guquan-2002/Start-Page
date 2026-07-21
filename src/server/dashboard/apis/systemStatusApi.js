import { execFile } from 'node:child_process';

import { createCachedLoader, sendJson } from './apiSupport.js';

const POWERSHELL_PATH = '/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe';
const PS_COMMAND = `$c = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"; $o = Get-CimInstance Win32_OperatingSystem; $m = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; "$($c.PercentProcessorTime) $($o.TotalVisibleMemorySize) $($m.AvailableMBytes)"`;
const POWERSHELL_TIMEOUT_MS = 20_000;
const SYSTEM_STATUS_CACHE_TTL_MS = 1_000;

function queryWindowsStatus() {
    return new Promise((resolve, reject) => {
        execFile(
            POWERSHELL_PATH,
            ['-NoProfile', '-NonInteractive', '-Command', PS_COMMAND],
            { encoding: 'utf8', timeout: POWERSHELL_TIMEOUT_MS },
            (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }

                const [cpuPercent, totalKB, availableMB] = stdout.trim().split(/\s+/).map(Number);
                if (![cpuPercent, totalKB, availableMB].every(Number.isFinite)) {
                    reject(new Error(`无法解析输出: ${stdout.trim()}`));
                    return;
                }

                resolve({
                    cpuPercent,
                    memTotalMB: Math.round(totalKB / 1024),
                    memAvailableMB: availableMB
                });
            }
        );
    });
}

const getSystemStatus = createCachedLoader(
    queryWindowsStatus,
    SYSTEM_STATUS_CACHE_TTL_MS
);

export async function handleSystemStatusApi(request, response) {
    if (new URL(request.url, 'http://localhost').pathname !== '/api/system') {
        return false;
    }

    try {
        sendJson(response, 200, await getSystemStatus());
    } catch (error) {
        sendJson(response, 500, { error: '读取系统状态失败' });
    }
    return true;
}
