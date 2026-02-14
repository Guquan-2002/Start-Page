// Theme module: switches day/night classes and keeps UI theme in sync with time.
import { elements } from './utils.js';

export function updateBackground() {
    const hour = new Date().getHours();
    let theme = 'night';
    if (hour >= 6 && hour < 8) theme = 'morning';
    else if (hour >= 8 && hour < 16) theme = 'day';
    else if (hour >= 16 && hour < 18) theme = 'evening';

    if (elements.body.className !== theme) {
        elements.body.className = theme;
    }
}

export function startThemeUpdater(interval) {
    updateBackground();
    setInterval(updateBackground, interval);
}
