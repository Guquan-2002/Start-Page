import { elements } from './utils.js';

export function updateTime() {
    const now = new Date();
    elements.timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
    elements.dateEl.textContent = `${now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleDateString('zh-CN', { weekday: 'long' })}`;
}

export function startTimeClock(interval) {
    updateTime();
    setInterval(updateTime, interval);
}
