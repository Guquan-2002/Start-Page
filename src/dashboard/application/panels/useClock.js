import { useSkyStatusState } from '../status/skyStatus.jsx';

function createClockView(now, timeZone) {
    return {
        timeText: now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone }),
        dateText: `${now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone })} ${now.toLocaleDateString('zh-CN', { weekday: 'long', timeZone })}`,
    };
}

export function useClock() {
    const { now, timeZone } = useSkyStatusState();
    return createClockView(now, timeZone);
}
