import { execFile } from 'node:child_process';

const SYSTEM_STATUS_API_PATH = '/api/system';
const POWERSHELL_TIMEOUT_MS = 10 * 1000;

// 通过 WSL 互操作读取 Windows 宿主机状态（os.* 只能看到 WSL 虚拟机的裁剪视图）
// 输出三个数字：CPU 百分比、物理内存总量 KB、可用内存 MB
const PS_COMMAND = `$c = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"; $o = Get-CimInstance Win32_OperatingSystem; $m = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; "$($c.PercentProcessorTime) $($o.TotalVisibleMemorySize) $($m.AvailableMBytes)"`;

function getRequestPath(request) {
    return new URL(request.url, 'http://localhost').pathname;
}

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
            'powershell.exe',
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

function getSystemStatus() {
    return queryWindowsStatus();
}

export async function handleSystemStatusApi(request, response, next) {
    if (getRequestPath(request) !== SYSTEM_STATUS_API_PATH) {
        next?.();
        return false;
    }

    if (request.method !== 'GET') {
        response.writeHead(405, {
            Allow: 'GET',
            'Content-Type': 'text/plain; charset=utf-8'
        });
        response.end('方法不允许');
        return true;
    }

    try {
        sendJson(response, 200, await getSystemStatus());
    } catch (error) {
        console.error('读取系统状态失败:', error.message);
        sendJson(response, 500, { error: '读取系统状态失败' });
    }
    return true;
}
