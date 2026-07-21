import { startCanvasAnimation } from './canvasAnimation.js';

// 雨滴下落时向左倾斜的斜率（水平速度 / 垂直速度）
const RAIN_HORIZONTAL_SLOPE = 0.18;

function calculateWeatherParticleCount(particleKind, particleIntensity, width) {
    const baseCount = particleKind === 'rain' ? width / 7 : width / 14;
    return Math.round(Math.min(240, Math.max(40, baseCount * particleIntensity)));
}

function createWeatherParticle(particleKind, width, height, randomizeVerticalPosition) {
    if (particleKind === 'rain') {
        return {
            x: Math.random() * (width + 100) - 50,
            y: randomizeVerticalPosition ? Math.random() * height : -30,
            length: 14 + Math.random() * 14,
            speed: 780 + Math.random() * 420,
            opacity: 0.25 + Math.random() * 0.35,
        };
    }
    return {
        x: Math.random() * width,
        y: randomizeVerticalPosition ? Math.random() * height : -10,
        radius: 1 + Math.random() * 1.8,
        speed: 36 + Math.random() * 48,
        sway: 20 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.5 + Math.random() * 0.5,
    };
}

function updateWeatherParticle(particle, particleKind, width, height, deltaSeconds, time) {
    particle.y += particle.speed * deltaSeconds;
    if (particleKind === 'rain') {
        particle.x -= particle.speed * RAIN_HORIZONTAL_SLOPE * deltaSeconds;
        if (particle.y - particle.length > height) {
            Object.assign(particle, createWeatherParticle('rain', width, height, false));
        }
    } else {
        particle.x += Math.sin(time / 1000 + particle.phase) * particle.sway * deltaSeconds;
        if (particle.y - particle.radius > height) {
            Object.assign(particle, createWeatherParticle('snow', width, height, false));
        }
    }
}

export function startWeatherParticleEffect(canvas, { particleKind, particleIntensity }) {
    if (!particleKind) return undefined;

    const drawWeatherParticle = (canvasContext, particle) => {
        canvasContext.globalAlpha = particle.opacity;
        if (particleKind === 'rain') {
            canvasContext.strokeStyle = 'rgb(190, 215, 255)';
            canvasContext.lineWidth = 1;
            canvasContext.beginPath();
            canvasContext.moveTo(particle.x, particle.y);
            canvasContext.lineTo(particle.x + particle.length * RAIN_HORIZONTAL_SLOPE, particle.y - particle.length);
            canvasContext.stroke();
            return;
        }

        canvasContext.fillStyle = 'rgb(255, 255, 255)';
        canvasContext.beginPath();
        canvasContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        canvasContext.fill();
    };

    return startCanvasAnimation(canvas, {
        createState: (viewportWidth, viewportHeight) =>
            Array.from(
                { length: calculateWeatherParticleCount(particleKind, particleIntensity, viewportWidth) },
                () => createWeatherParticle(particleKind, viewportWidth, viewportHeight, true)
            ),
        renderFrame: ({ canvasContext, canvasState: particles, viewportWidth, viewportHeight, time, deltaTimeMs, isAnimated }) => {
            const deltaSeconds = Math.min(deltaTimeMs / 1000, 0.05);
            particles.forEach((particle) => {
                if (isAnimated) {
                    updateWeatherParticle(particle, particleKind, viewportWidth, viewportHeight, deltaSeconds, time);
                }
                drawWeatherParticle(canvasContext, particle);
            });
        },
    });
}
