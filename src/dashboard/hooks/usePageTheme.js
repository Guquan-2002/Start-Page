import { useEffect, useState } from 'react';
import { createStars, STAR_RGB } from '../utils/pageTheme.js';

// ======== Time-of-day theme ========

const TIME_THEME_CLASSES = ['morning', 'day', 'evening', 'night'];
const THEME_CHECK_INTERVAL = 60 * 1000;

// 大星星的光晕用预渲染的径向渐变 sprite，避免每帧 shadowBlur 的性能开销
const GLOW_SPRITE_SIZE = 64;
const GLOW_DRAW_SCALE = 12;

function createGlowSprite(rgb) {
    const sprite = document.createElement('canvas');
    sprite.width = GLOW_SPRITE_SIZE;
    sprite.height = GLOW_SPRITE_SIZE;
    const spriteContext = sprite.getContext('2d');
    const center = GLOW_SPRITE_SIZE / 2;
    const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, `rgba(${rgb}, 1)`);
    gradient.addColorStop(0.25, `rgba(${rgb}, 0.55)`);
    gradient.addColorStop(0.6, `rgba(${rgb}, 0.15)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    spriteContext.fillStyle = gradient;
    spriteContext.fillRect(0, 0, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
    return sprite;
}

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
        const glowSprites = {};

        const getGlowSprite = (color) => {
            if (!glowSprites[color]) {
                glowSprites[color] = createGlowSprite(STAR_RGB[color]);
            }
            return glowSprites[color];
        };

        const drawStar = (star, alpha) => {
            context.globalAlpha = alpha;
            if (star.glow) {
                const size = star.r * GLOW_DRAW_SCALE;
                context.drawImage(getGlowSprite(star.color), star.x - size / 2, star.y - size / 2, size, size);
            } else {
                context.fillStyle = `rgb(${STAR_RGB[star.color]})`;
                context.beginPath();
                context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                context.fill();
            }
        };

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
                drawStar(star, star.alpha * (0.5 + 0.5 * Math.sin(star.twinklePhase)));
            });

            context.globalAlpha = 1;
            frameId = window.requestAnimationFrame(render);
        };

        const drawStatic = () => {
            context.clearRect(0, 0, viewportWidth, viewportHeight);
            stars.forEach((star) => drawStar(star, star.alpha));
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

    return theme;
}
