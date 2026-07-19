import { useEffect, useRef, useState } from 'react';
import './PageTheme.css';

const TIME_THEME_CLASSES = ['morning', 'day', 'evening', 'night'];
const THEME_CHECK_INTERVAL = 60 * 1000;
const STAR_COUNTS = { small: 300, medium: 80, big: 40 };

function getTimeTheme(hour) {
    if (hour >= 6 && hour < 8) return 'morning';
    if (hour >= 8 && hour < 16) return 'day';
    if (hour >= 16 && hour < 18) return 'evening';
    return 'night';
}

function useTimeTheme() {
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

    return theme;
}

function appendStars(stars, count, width, height, options) {
    for (let index = 0; index < count; index += 1) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: options.radius,
            speed: options.minSpeed + Math.random() * options.speedRange,
            alpha: options.minAlpha + Math.random() * options.alphaRange,
            twinkleSpeed: options.minTwinkleSpeed + Math.random() * options.twinkleSpeedRange,
            twinklePhase: Math.random() * Math.PI * 2
        });
    }
}

function createStars(width, height) {
    const stars = [];

    appendStars(stars, STAR_COUNTS.small, width, height, {
        radius: 0.5,
        minSpeed: 0.3,
        speedRange: 0.2,
        minAlpha: 0.4,
        alphaRange: 0.6,
        minTwinkleSpeed: 0.002,
        twinkleSpeedRange: 0.003
    });
    appendStars(stars, STAR_COUNTS.medium, width, height, {
        radius: 1,
        minSpeed: 0.15,
        speedRange: 0.1,
        minAlpha: 0.5,
        alphaRange: 0.5,
        minTwinkleSpeed: 0.001,
        twinkleSpeedRange: 0.002
    });
    appendStars(stars, STAR_COUNTS.big, width, height, {
        radius: 1.5,
        minSpeed: 0.08,
        speedRange: 0.07,
        minAlpha: 0.6,
        alphaRange: 0.4,
        minTwinkleSpeed: 0.0008,
        twinkleSpeedRange: 0.0015
    });

    return stars;
}

export function PageTheme() {
    const active = useTimeTheme() === 'night';
    const canvasRef = useRef(null);

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
    }, [active]);

    return (
        <div id="background-effects" aria-hidden="true">
            <canvas id="starfield-canvas" ref={canvasRef} />
            <div className="stars-bg" />
        </div>
    );
}
