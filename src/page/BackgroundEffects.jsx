import { useEffect, useRef } from 'react';

import { CONFIG } from './config.js';

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

function createStars(counts, width, height) {
    const stars = [];

    appendStars(stars, counts.small, width, height, {
        radius: 0.5,
        minSpeed: 0.3,
        speedRange: 0.2,
        minAlpha: 0.4,
        alphaRange: 0.6,
        minTwinkleSpeed: 0.002,
        twinkleSpeedRange: 0.003
    });
    appendStars(stars, counts.medium, width, height, {
        radius: 1,
        minSpeed: 0.15,
        speedRange: 0.1,
        minAlpha: 0.5,
        alphaRange: 0.5,
        minTwinkleSpeed: 0.001,
        twinkleSpeedRange: 0.002
    });
    appendStars(stars, counts.big, width, height, {
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

export function BackgroundEffects({ starCounts = CONFIG.STARS_COUNT }) {
    const canvasRef = useRef(null);
    const { small, medium, big } = starCounts;

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return undefined;

        let disposed = false;
        let frameId = null;
        let resizeTimerId = null;
        let stars = [];
        let viewportWidth = 0;
        let viewportHeight = 0;
        let lastTime = window.performance.now();

        const resizeCanvas = () => {
            const devicePixelRatio = window.devicePixelRatio || 1;
            viewportWidth = window.innerWidth;
            viewportHeight = window.innerHeight;

            canvas.width = Math.max(1, Math.floor(viewportWidth * devicePixelRatio));
            canvas.height = Math.max(1, Math.floor(viewportHeight * devicePixelRatio));
            canvas.style.width = `${viewportWidth}px`;
            canvas.style.height = `${viewportHeight}px`;
            context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
            stars = createStars({ small, medium, big }, viewportWidth, viewportHeight);
            lastTime = window.performance.now();
        };

        const render = (time) => {
            if (disposed) return;

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

        const handleResize = () => {
            if (resizeTimerId !== null) {
                window.clearTimeout(resizeTimerId);
            }
            resizeTimerId = window.setTimeout(() => {
                resizeTimerId = null;
                if (!disposed) resizeCanvas();
            }, 200);
        };

        resizeCanvas();
        window.addEventListener('resize', handleResize);
        frameId = window.requestAnimationFrame(render);

        return () => {
            disposed = true;
            window.removeEventListener('resize', handleResize);
            if (resizeTimerId !== null) {
                window.clearTimeout(resizeTimerId);
            }
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [small, medium, big]);

    return (
        <div id="background-effects" aria-hidden="true">
            <canvas id="starfield-canvas" ref={canvasRef} />
            <div className="stars-bg" />
        </div>
    );
}
