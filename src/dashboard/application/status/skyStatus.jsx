import { createContext, useContext, useEffect, useState } from 'react';

const TIMEZONE = 'Asia/Shanghai';
const TIME_REFRESH_INTERVAL_MS = 1000;

function getTimeParts(date) {
    const parts = new Intl.DateTimeFormat('zh-CN', {
        timeZone: TIMEZONE,
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    }).formatToParts(date);
    let hour = 0;
    let minute = 0;
    let second = 0;
    for (const { type, value } of parts) {
        if (type === 'hour') hour = Number(value);
        else if (type === 'minute') minute = Number(value);
        else if (type === 'second') second = Number(value);
    }
    return { hour, minute, second };
}

function calculateRamp(value, start, end) {
    return Math.min(1, Math.max(0, (value - start) / (end - start)));
}

function calculateTrapezoid(hour, riseStart, riseEnd, fallStart, fallEnd) {
    return Math.min(calculateRamp(hour, riseStart, riseEnd), 1 - calculateRamp(hour, fallStart, fallEnd));
}

function getFractionalHour(date) {
    const { hour, minute, second } = getTimeParts(date);
    return (hour % 24) + minute / 60 + second / 3600;
}

function calculateDaylight(date) {
    return calculateTrapezoid(getFractionalHour(date), 6.5, 8.5, 15.5, 18);
}

function calculateSceneEffects(date) {
    const hour = getFractionalHour(date);
    const daytimeVisibility = calculateTrapezoid(hour, 5.5, 7, 17.5, 19);

    return {
        sunriseOpacity: calculateTrapezoid(hour, 5, 6.5, 7.5, 9),
        sunsetOpacity: calculateTrapezoid(hour, 15.5, 17, 18, 19.5),
        nightOpacity: 1 - daytimeVisibility,
    };
}

function calculateArcPosition(progress) {
    const angle = progress * Math.PI;
    return {
        x: 50 - Math.cos(angle) * 46,
        y: 88 - Math.sin(angle) * 80,
    };
}

function calculateCelestialBodies(date) {
    const hour = getFractionalHour(date);
    const sunPosition = calculateArcPosition(calculateRamp(hour, 6, 18));
    const isMoonAboveHorizon = hour >= 18 || hour <= 6;
    const moonHour = hour <= 6 ? hour + 24 : hour;
    const moonPosition = calculateArcPosition(isMoonAboveHorizon ? calculateRamp(moonHour, 18, 30) : 0);

    return {
        '--sun-x': `${sunPosition.x.toFixed(3)}%`,
        '--sun-y': `${sunPosition.y.toFixed(3)}%`,
        '--sun-opacity': calculateTrapezoid(hour, 6, 6.5, 17.5, 18).toFixed(3),
        '--moon-x': `${moonPosition.x.toFixed(3)}%`,
        '--moon-y': `${moonPosition.y.toFixed(3)}%`,
        '--moon-opacity': isMoonAboveHorizon ? calculateTrapezoid(moonHour, 18, 18.5, 29.5, 30).toFixed(3) : '0.000',
    };
}

function getSkyCycle(date) {
    const sceneEffects = calculateSceneEffects(date);
    const daylight = calculateDaylight(date);

    return {
        daylight,
        daylightCssValue: daylight.toFixed(3),
        nightOpacity: sceneEffects.nightOpacity,
        backgroundStyle: {
            '--sunrise-opacity': sceneEffects.sunriseOpacity.toFixed(3),
            '--sunset-opacity': sceneEffects.sunsetOpacity.toFixed(3),
            '--night-opacity': sceneEffects.nightOpacity.toFixed(3),
            ...calculateCelestialBodies(date),
        },
    };
}

function getSecondsSinceMidnight(date) {
    const { hour, minute, second } = getTimeParts(date);
    return (hour % 24) * 3600 + minute * 60 + second;
}

function getSkySceneView(skyCycle, initialSkyOffsetSeconds) {
    return {
        backgroundStyle: {
            '--seconds-since-midnight': `${initialSkyOffsetSeconds}`,
            ...skyCycle.backgroundStyle,
        },
        daylight: skyCycle.daylight,
        daylightCssValue: skyCycle.daylightCssValue,
        nightOpacity: skyCycle.nightOpacity,
    };
}

function useSkyStatus() {
    const [now, setNow] = useState(() => new Date());
    const [initialSkyOffsetSeconds] = useState(() => getSecondsSinceMidnight(now));

    useEffect(() => {
        const intervalId = window.setInterval(() => setNow(new Date()), TIME_REFRESH_INTERVAL_MS);
        return () => window.clearInterval(intervalId);
    }, []);

    return { now, timeZone: TIMEZONE, ...getSkySceneView(getSkyCycle(now), initialSkyOffsetSeconds) };
}

const SkyStatusContext = createContext(null);

export function SkyStatusProvider({ children }) {
    const skyStatus = useSkyStatus();
    return <SkyStatusContext.Provider value={skyStatus}>{children}</SkyStatusContext.Provider>;
}

export function useSkyStatusState() {
    return useContext(SkyStatusContext);
}
