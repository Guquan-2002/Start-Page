// 星星数量按视口面积（百万像素）计算，避免大屏稀疏、小屏过密
const STAR_DENSITY_PER_MPX = { small: 150, medium: 40, big: 20 };
const STAR_MIN_COUNTS = { small: 120, medium: 30, big: 15 };
const STAR_MAX_COUNTS = { small: 600, medium: 160, big: 80 };

const STAR_COLORS = [
    { name: 'white', weight: 0.82 },
    { name: 'cool', weight: 0.1 },
    { name: 'warm', weight: 0.08 },
];

export const STAR_RGB = {
    white: '255, 255, 255',
    cool: '190, 215, 255',
    warm: '255, 236, 200',
};

function pickColor() {
    const roll = Math.random();
    let cumulative = 0;
    for (const color of STAR_COLORS) {
        cumulative += color.weight;
        if (roll < cumulative) return color.name;
    }
    return 'white';
}

function starCount(kind, width, height) {
    const megapixels = (width * height) / 1e6;
    const count = Math.round(megapixels * STAR_DENSITY_PER_MPX[kind]);
    return Math.min(STAR_MAX_COUNTS[kind], Math.max(STAR_MIN_COUNTS[kind], count));
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
            twinklePhase: Math.random() * Math.PI * 2,
            color: pickColor(),
            glow: options.glow === true,
        });
    }
}

export function createStars(width, height) {
    const stars = [];

    appendStars(stars, starCount('small', width, height), width, height, {
        radius: 0.5,
        minSpeed: 0.3,
        speedRange: 0.2,
        minAlpha: 0.4,
        alphaRange: 0.6,
        minTwinkleSpeed: 0.002,
        twinkleSpeedRange: 0.003,
    });
    appendStars(stars, starCount('medium', width, height), width, height, {
        radius: 1,
        minSpeed: 0.15,
        speedRange: 0.1,
        minAlpha: 0.5,
        alphaRange: 0.5,
        minTwinkleSpeed: 0.001,
        twinkleSpeedRange: 0.002,
    });
    appendStars(stars, starCount('big', width, height), width, height, {
        radius: 1.5,
        minSpeed: 0.08,
        speedRange: 0.07,
        minAlpha: 0.6,
        alphaRange: 0.4,
        minTwinkleSpeed: 0.0008,
        twinkleSpeedRange: 0.0015,
        glow: true,
    });

    return stars;
}
