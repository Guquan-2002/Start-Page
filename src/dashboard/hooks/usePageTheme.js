import { useEffect, useState } from 'react';
import { createStars } from '../utils/pageTheme.js';

// ======== Time-of-day theme ========

const TIME_THEME_CLASSES = ['morning', 'day', 'evening', 'night'];
const THEME_CHECK_INTERVAL = 60 * 1000;

function getTimeTheme(hour) {
    if (hour >= 6 && hour < 8) return 'morning';
    if (hour >= 8 && hour < 16) return 'day';
    if (hour >= 16 && hour < 18) return 'evening';
    return 'night';
}

// ======== Combined hook ========

export function usePageTheme(canvasRef) {
    const [theme, setTheme] = useState(() => getTimeTheme(new Date().getHours()));

    useEffect(() => {
        const body = document.body;

        const updateTheme = () => {
            const nextTheme = getTimeTheme(new Date().getHours());
            body.classList.remove(...TIME_THEME_CLASSES);
            body.classList.add(nextTheme);
            setTheme(nextTheme);
        };

        updateTheme();
        const timerId = window.setInterval(updateTheme, THEME_CHECK_INTERVAL);

        return () => {
            window.clearInterval(timerId);
            body.classList.remove(...TIME_THEME_CLASSES);
        };
    }, []);

    const active = theme === 'night';

    useEffect(() => {
        if (!active) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let frameId;
        let resizeTimerId = null;
        let stars = [];
        let viewportWidth = 0;
        let viewportHeight = 0;
        let lastTime = window.performance.now();

        const resizeCanvas = () => {
            const { devicePixelRatio } = window;
            viewportWidth = window.innerWidth;
            viewportHeight = window.innerHeight;

            canvas.width = Math.floor(viewportWidth * devicePixelRatio);
            canvas.height = Math.floor(viewportHeight * devicePixelRatio);
            canvas.style.width = `${viewportWidth}px`;
            canvas.style.height = `${viewportHeight}px`;
            context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            stars = createStars(viewportWidth, viewportHeight);
            lastTime = window.performance.now();
        };

        const render = (time) => {
            const deltaTime = time - lastTime;
            lastTime = time;
            context.clearRect(0, 0, viewportWidth, viewportHeight);

            stars.forEach((star) => {
                star.y -= star.speed * (deltaTime * 0.06);
                if (star.y < -5) {
                    star.y = viewportHeight + 5;
                    star.x = Math.random() * viewportWidth;
                }

                star.twinklePhase += star.twinkleSpeed * deltaTime;
                context.globalAlpha = star.alpha * (0.5 + 0.5 * Math.sin(star.twinklePhase));
                context.fillStyle = '#fff';
                context.beginPath();
                context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                context.fill();
            });

            context.globalAlpha = 1;
            frameId = window.requestAnimationFrame(render);
        };

        const drawStatic = () => {
            context.clearRect(0, 0, viewportWidth, viewportHeight);
            stars.forEach((star) => {
                context.globalAlpha = star.alpha;
                context.fillStyle = '#fff';
                context.beginPath();
                context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                context.fill();
            });
            context.globalAlpha = 1;
        };

        const handleResize = () => {
            if (resizeTimerId !== null) {
                window.clearTimeout(resizeTimerId);
            }
            resizeTimerId = window.setTimeout(() => {
                resizeTimerId = null;
                resizeCanvas();
                if (reducedMotion) drawStatic();
            }, 200);
        };

        resizeCanvas();
        window.addEventListener('resize', handleResize);
        if (reducedMotion) {
            drawStatic();
        } else {
            frameId = window.requestAnimationFrame(render);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimerId !== null) {
                window.clearTimeout(resizeTimerId);
            }
            window.cancelAnimationFrame(frameId);
        };
    }, [active, canvasRef]);
}
