import { execFile } from 'node:child_process';

// 通过 WSL 互操作读取 Windows 宿主机状态（os.* 只能看到 WSL 虚拟机的裁剪视图）
// 输出三个数字：CPU 百分比、物理内存总量 KB、可用内存 MB
const PS_COMMAND = `$c = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"; $o = Get-CimInstance Win32_OperatingSystem; $m = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory; "$($c.PercentProcessorTime) $($o.TotalVisibleMemorySize) $($m.AvailableMBytes)"`;
const POWERSHELL_TIMEOUT_MS = 20_000;

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

export async function handleSystemStatusApi(request, response, next) {
    if (new URL(request.url, 'http://localhost').pathname !== '/api/system') {
        next?.();
        return false;
    }

    try {
        sendJson(response, 200, await queryWindowsStatus());
    } catch (error) {
        console.error('读取系统状态失败:', error.message);
        sendJson(response, 500, { error: '读取系统状态失败' });
    }
    return true;
}
