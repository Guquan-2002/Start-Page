export function formatClock(now) {
    return {
        time: now.toLocaleTimeString('zh-CN', { hour12: false }),
        date: `${now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })} ${now.toLocaleDateString('zh-CN', { weekday: 'long' })}`,
    };
}
