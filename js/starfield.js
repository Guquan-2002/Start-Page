// Starfield module: creates and animates background stars for the landing page.
import { CONFIG } from './config.js';

let canvas, ctx;
let stars = [];
let animId = null;
let lastTime = 0;

function createStars() {
    stars = [];
    const w = canvas.width;
    const h = canvas.height;
    const counts = CONFIG.STARS_COUNT;

    // 小星 - 快速移动
    for (let i = 0; i < counts.small; i++) {
        stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 0.5,
            speed: 0.3 + Math.random() * 0.2,
            alpha: 0.4 + Math.random() * 0.6,
            twinkleSpeed: 0.002 + Math.random() * 0.003,
            twinklePhase: Math.random() * Math.PI * 2
        });
    }
    // 中星
    for (let i = 0; i < counts.medium; i++) {
        stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 1,
            speed: 0.15 + Math.random() * 0.1,
            alpha: 0.5 + Math.random() * 0.5,
            twinkleSpeed: 0.001 + Math.random() * 0.002,
            twinklePhase: Math.random() * Math.PI * 2
        });
    }
    // 大星 - 慢速移动
    for (let i = 0; i < counts.big; i++) {
        stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 1.5,
            speed: 0.08 + Math.random() * 0.07,
            alpha: 0.6 + Math.random() * 0.4,
            twinkleSpeed: 0.0008 + Math.random() * 0.0015,
            twinklePhase: Math.random() * Math.PI * 2
        });
    }
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createStars();
}

function render(time) {
    const dt = time - lastTime;
    lastTime = time;

    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // 向上移动
        s.y -= s.speed * (dt * 0.06);
        if (s.y < -5) {
            s.y = h + 5;
            s.x = Math.random() * w;
        }

        // 闪烁
        s.twinklePhase += s.twinkleSpeed * dt;
        const alpha = s.alpha * (0.5 + 0.5 * Math.sin(s.twinklePhase));

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(render);
}

export function generateStars() {
    canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();

    // 防抖 resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeCanvas, 200);
    });

    lastTime = performance.now();
    animId = requestAnimationFrame(render);
}
