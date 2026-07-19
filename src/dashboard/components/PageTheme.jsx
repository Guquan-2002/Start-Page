import { useEffect, useRef } from 'react';
import { usePageTheme } from '../hooks/usePageTheme.js';
import './PageTheme.css';

const SHOOTING_STAR_MIN_INTERVAL = 5000;
const SHOOTING_STAR_MAX_INTERVAL = 14000;
const SHOOTING_STAR_DURATION = 1400;
const SHOOTING_STAR_INITIAL_DELAY = 3000;

function spawnShootingStar(container) {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    star.style.left = `${30 + Math.random() * 65}%`;
    star.style.top = `${Math.random() * 45}%`;
    star.style.setProperty('--angle', `${120 + Math.random() * 25}deg`);
    star.style.setProperty('--len', `${100 + Math.random() * 90}px`);
    container.appendChild(star);
    window.setTimeout(() => star.remove(), SHOOTING_STAR_DURATION + 200);
}

export function PageTheme() {
    const canvasRef = useRef(null);
    const shootingStarsRef = useRef(null);

    const theme = usePageTheme(canvasRef);

    useEffect(() => {
        if (theme !== 'night') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const container = shootingStarsRef.current;
        let timerId;

        const scheduleNext = (delay) => {
            timerId = window.setTimeout(() => {
                spawnShootingStar(container);
                scheduleNext(
                    SHOOTING_STAR_MIN_INTERVAL +
                        Math.random() * (SHOOTING_STAR_MAX_INTERVAL - SHOOTING_STAR_MIN_INTERVAL)
                );
            }, delay);
        };

        scheduleNext(SHOOTING_STAR_INITIAL_DELAY + Math.random() * SHOOTING_STAR_MIN_INTERVAL);

        return () => window.clearTimeout(timerId);
    }, [theme]);

    return (
        <div id="background-effects" aria-hidden="true">
            <div className="scene scene-morning">
                <div className="sunrise-glow" />
                <div className="sunrise-sun" />
            </div>
            <div className="scene scene-day">
                <div className="sun" />
                <div className="cloud cloud-1" />
                <div className="cloud cloud-2" />
                <div className="cloud cloud-3" />
                <div className="bokeh bokeh-1" />
                <div className="bokeh bokeh-2" />
                <div className="bokeh bokeh-3" />
                <div className="bokeh bokeh-4" />
            </div>
            <div className="scene scene-evening">
                <div className="sunset-glow" />
                <div className="sunset-sun" />
            </div>
            <div className="scene scene-night">
                <div className="milky-way" />
                <canvas id="starfield-canvas" ref={canvasRef} />
                <div className="moon" />
                <div className="shooting-stars" ref={shootingStarsRef} />
            </div>
        </div>
    );
}
