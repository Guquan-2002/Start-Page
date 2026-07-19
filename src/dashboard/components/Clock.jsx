import { useClock } from '../hooks/useClock.js';
import './Clock.css';

export function Clock() {
    const { time, date } = useClock();

    return (
        <div id="time-container" aria-label="Current time">
            <div id="time">{time}</div>
            <div id="date">{date}</div>
        </div>
    );
}
