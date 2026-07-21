import { useEffect, useRef } from 'react';
import { useSkyStatusState } from '../status/skyStatus.jsx';

const SHOOTING_STARS_MIN_NIGHT_OPACITY = 0.5;
const SHOOTING_STAR_MIN_INTERVAL_MS = 5000;
const SHOOTING_STAR_MAX_INTERVAL_MS = 14000;
const SHOOTING_STAR_DURATION_MS = 1400;
const SHOOTING_STAR_INITIAL_DELAY_MS = 3000;
const SHOOTING_STAR_CLEANUP_DELAY_MS = 200;
const SHOOTING_STAR_LEFT_RANGE = [30, 95];
const SHOOTING_STAR_TOP_RANGE = [0, 45];
const SHOOTING_STAR_ANGLE_RANGE = [120, 145];
const SHOOTING_STAR_LENGTH_RANGE = [100, 190];

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function isShootingStarsEnabled(nightOpacity) {
    return nightOpacity >= SHOOTING_STARS_MIN_NIGHT_OPACITY;
}

function getShootingStarsView({ nightOpacity }) {
    return { shootingStarsEnabled: isShootingStarsEnabled(nightOpacity) };
}

function spawnShootingStar(shootingStarsContainer) {
    const shootingStar = document.createElement('div');
    shootingStar.className = 'shooting-stars__item';
    shootingStar.style.left = `${randomBetween(...SHOOTING_STAR_LEFT_RANGE)}%`;
    shootingStar.style.top = `${randomBetween(...SHOOTING_STAR_TOP_RANGE)}%`;
    shootingStar.style.setProperty('--shooting-star-angle', `${randomBetween(...SHOOTING_STAR_ANGLE_RANGE)}deg`);
    shootingStar.style.setProperty('--shooting-star-length', `${randomBetween(...SHOOTING_STAR_LENGTH_RANGE)}px`);
    shootingStar.style.setProperty('--shooting-star-duration', `${SHOOTING_STAR_DURATION_MS}ms`);
    shootingStarsContainer.appendChild(shootingStar);
    window.setTimeout(() => shootingStar.remove(), SHOOTING_STAR_DURATION_MS + SHOOTING_STAR_CLEANUP_DELAY_MS);
}

function startShootingStarEffect(shootingStarsContainer, isEnabled) {
    if (!isEnabled) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let shootingStarTimeoutId;

    const scheduleNext = (delayMs) => {
        shootingStarTimeoutId = window.setTimeout(() => {
            spawnShootingStar(shootingStarsContainer);
            scheduleNext(SHOOTING_STAR_MIN_INTERVAL_MS + Math.random() * (SHOOTING_STAR_MAX_INTERVAL_MS - SHOOTING_STAR_MIN_INTERVAL_MS));
        }, delayMs);
    };

    scheduleNext(SHOOTING_STAR_INITIAL_DELAY_MS + Math.random() * SHOOTING_STAR_MIN_INTERVAL_MS);
    return () => window.clearTimeout(shootingStarTimeoutId);
}

export function useShootingStars() {
    const { nightOpacity } = useSkyStatusState();
    const shootingStarsContainerRef = useRef(null);
    const { shootingStarsEnabled } = getShootingStarsView({ nightOpacity });

    useEffect(() => startShootingStarEffect(shootingStarsContainerRef.current, shootingStarsEnabled), [shootingStarsEnabled]);

    return { shootingStarsContainerRef };
}
