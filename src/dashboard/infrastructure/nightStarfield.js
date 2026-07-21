import { startCanvasAnimation } from './canvasAnimation.js';
const STAR_GLOW_SCALE = 12;

// 星星数量按视口面积（百万像素）计算，避免大屏稀疏、小屏过密。
const STAR_GROUPS = [
    {
        densityPerMpx: 150,
        minCount: 120,
        maxCount: 600,
        radius: 0.5,
        minSpeed: 0.3,
        speedRange: 0.2,
        minOpacity: 0.4,
        opacityRange: 0.6,
        minTwinkleSpeed: 0.002,
        twinkleSpeedRange: 0.003,
    },
    {
        densityPerMpx: 40,
        minCount: 30,
        maxCount: 160,
        radius: 1,
        minSpeed: 0.15,
        speedRange: 0.1,
        minOpacity: 0.5,
        opacityRange: 0.5,
        minTwinkleSpeed: 0.001,
        twinkleSpeedRange: 0.002,
    },
    {
        densityPerMpx: 20,
        minCount: 15,
        maxCount: 80,
        radius: 1.5,
        minSpeed: 0.08,
        speedRange: 0.07,
        minOpacity: 0.6,
        opacityRange: 0.4,
        minTwinkleSpeed: 0.0008,
        twinkleSpeedRange: 0.0015,
        hasGlow: true,
    },
];

const STAR_COLORS = [
    { rgb: '255, 255, 255', weight: 0.82 },
    { rgb: '190, 215, 255', weight: 0.1 },
    { rgb: '255, 236, 200', weight: 0.08 },
];

// 大星星的光晕用预渲染的径向渐变 sprite，避免每帧 shadowBlur 的性能开销。
const GLOW_SPRITE_SIZE = 64;

function createGlowSprite(rgb) {
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = GLOW_SPRITE_SIZE;
    glowCanvas.height = GLOW_SPRITE_SIZE;
    const glowContext = glowCanvas.getContext('2d');
    const center = GLOW_SPRITE_SIZE / 2;
    const gradient = glowContext.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        center
    );
    gradient.addColorStop(0, `rgba(${rgb}, 1)`);
    gradient.addColorStop(0.25, `rgba(${rgb}, 0.55)`);
    gradient.addColorStop(0.6, `rgba(${rgb}, 0.15)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    glowContext.fillStyle = gradient;
    glowContext.fillRect(0, 0, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
    return glowCanvas;
}

function pickStarColor() {
    const roll = Math.random();
    let cumulative = 0;
    for (const color of STAR_COLORS) {
        cumulative += color.weight;
        if (roll < cumulative) return color.rgb;
    }
    return STAR_COLORS[0].rgb;
}

function calculateStarCount(starGroup, width, height) {
    const megapixels = (width * height) / 1e6;
    const count = Math.round(megapixels * starGroup.densityPerMpx);
    return Math.min(
        starGroup.maxCount,
        Math.max(starGroup.minCount, count)
    );
}

function appendStarGroup(stars, starGroup, width, height) {
    const count = calculateStarCount(starGroup, width, height);
    for (let index = 0; index < count; index += 1) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: starGroup.radius,
            speed:
                starGroup.minSpeed +
                Math.random() * starGroup.speedRange,
            opacity:
                starGroup.minOpacity +
                Math.random() * starGroup.opacityRange,
            twinkleSpeed:
                starGroup.minTwinkleSpeed +
                Math.random() * starGroup.twinkleSpeedRange,
            twinklePhase: Math.random() * Math.PI * 2,
            colorRgb: pickStarColor(),
            hasGlow: starGroup.hasGlow,
        });
    }
}

function createStars(width, height) {
    const stars = [];
    STAR_GROUPS.forEach((starGroup) => {
        appendStarGroup(stars, starGroup, width, height);
    });

    return stars;
}

export function startStarfieldEffect(canvas, isEnabled) {
    if (!isEnabled) return undefined;

    const glowSpriteCache = {};

    const getGlowSprite = (colorRgb) => {
        glowSpriteCache[colorRgb] ??= createGlowSprite(colorRgb);
        return glowSpriteCache[colorRgb];
    };

    const drawStar = (canvasContext, star, opacity) => {
        canvasContext.globalAlpha = opacity;
        if (star.hasGlow) {
            const glowSize = star.radius * STAR_GLOW_SCALE;
            canvasContext.drawImage(
                getGlowSprite(star.colorRgb),
                star.x - glowSize / 2,
                star.y - glowSize / 2,
                glowSize,
                glowSize
            );
            return;
        }

        canvasContext.fillStyle = `rgb(${star.colorRgb})`;
        canvasContext.beginPath();
        canvasContext.arc(
            star.x,
            star.y,
            star.radius,
            0,
            Math.PI * 2
        );
        canvasContext.fill();
    };

    return startCanvasAnimation(canvas, {
        createState: createStars,
        renderFrame: ({
            canvasContext,
            canvasState: stars,
            viewportWidth,
            viewportHeight,
            deltaTimeMs,
            isAnimated,
        }) => {
            stars.forEach((star) => {
                if (isAnimated) {
                    star.y -= star.speed * (deltaTimeMs * 0.06);
                    if (star.y < -5) {
                        star.y = viewportHeight + 5;
                        star.x = Math.random() * viewportWidth;
                    }
                    star.twinklePhase += star.twinkleSpeed * deltaTimeMs;
                }
                const opacity = isAnimated
                    ? star.opacity *
                      (0.5 + 0.5 * Math.sin(star.twinklePhase))
                    : star.opacity;
                drawStar(canvasContext, star, opacity);
            });
        },
    });
}
