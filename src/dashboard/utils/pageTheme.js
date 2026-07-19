const STAR_COUNTS = { small: 300, medium: 80, big: 40 };

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
        });
    }
}

export function createStars(width, height) {
    const stars = [];

    appendStars(stars, STAR_COUNTS.small, width, height, {
        radius: 0.5,
        minSpeed: 0.3,
        speedRange: 0.2,
        minAlpha: 0.4,
        alphaRange: 0.6,
        minTwinkleSpeed: 0.002,
        twinkleSpeedRange: 0.003,
    });
    appendStars(stars, STAR_COUNTS.medium, width, height, {
        radius: 1,
        minSpeed: 0.15,
        speedRange: 0.1,
        minAlpha: 0.5,
        alphaRange: 0.5,
        minTwinkleSpeed: 0.001,
        twinkleSpeedRange: 0.002,
    });
    appendStars(stars, STAR_COUNTS.big, width, height, {
        radius: 1.5,
        minSpeed: 0.08,
        speedRange: 0.07,
        minAlpha: 0.6,
        alphaRange: 0.4,
        minTwinkleSpeed: 0.0008,
        twinkleSpeedRange: 0.0015,
    });

    return stars;
}
