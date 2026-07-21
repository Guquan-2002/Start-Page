import { useClock } from '../../application/panels/useClock.js';
import './Clock.css';

export function Clock() {
    const clockView = useClock();

    return (
        <div className="clock" aria-label="当前时间">
            <div className="clock__time">{clockView.timeText}</div>
            <div className="clock__date">{clockView.dateText}</div>
        </div>
    );
}
