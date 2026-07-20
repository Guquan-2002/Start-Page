import { execFile } from 'node:child_process';

// 通过 WSL 互操作读取 Windows 宿主机状态（os.* 只能看到 WSL 虚拟机的裁剪视图）
// 输出三个数字：CPU 百分比、物理内存总量 KB、可用内存 MB
const POWERSHELL_PATH = '/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe';
const PS_COMMAND = `$c = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"; $o = Get-CimInstance Win32_OperatingSystem; $m = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; "$($c.PercentProcessorTime) $($o.TotalVisibleMemorySize) $($m.AvailableMBytes)"`;
const POWERSHELL_TIMEOUT_MS = 20_000;
const SYSTEM_STATUS_CACHE_TTL_MS = 1_000;

let cachedStatus = null;
let cacheExpiresAt = 0;
let pendingStatusQuery = null;

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8'
    });
    response.end(JSON.stringify(payload));
}

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

function getWindowsStatus() {
    if (cachedStatus !== null && Date.now() < cacheExpiresAt) {
        return cachedStatus;
    }

    if (pendingStatusQuery === null) {
        pendingStatusQuery = queryWindowsStatus()
            .then((status) => {
                cachedStatus = status;
                cacheExpiresAt = Date.now() + SYSTEM_STATUS_CACHE_TTL_MS;
                return status;
            })
            .finally(() => {
                pendingStatusQuery = null;
            });
    }

    return pendingStatusQuery;
}

export async function handleSystemStatusApi(request, response, next) {
    if (new URL(request.url, 'http://localhost').pathname !== '/api/system') {
        next?.();
        return false;
    }

    try {
        sendJson(response, 200, await getWindowsStatus());
    } catch (error) {
        console.error('读取系统状态失败:', error.message);
        sendJson(response, 500, { error: '读取系统状态失败' });
    }
    return true;
}
