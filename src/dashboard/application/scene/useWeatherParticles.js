import { useEffect, useRef } from 'react';
import { startWeatherParticleEffect } from '../../infrastructure/weatherParticles.js';
import { getWeatherEffects, useWeatherStatusState } from '../status/weatherStatus.jsx';

function isWeatherParticlesEnabled({ particleKind }) {
    return Boolean(particleKind);
}

function getWeatherParticlesView(weatherEffects) {
    return { weatherParticlesEnabled: isWeatherParticlesEnabled(weatherEffects) };
}

export function useWeatherParticles() {
    const weatherStatus = useWeatherStatusState();
    const weatherEffects = getWeatherEffects(weatherStatus.weatherCode);
    const weatherParticlesCanvasRef = useRef(null);
    const { weatherParticlesEnabled } = getWeatherParticlesView(weatherEffects);

    useEffect(() => startWeatherParticleEffect(weatherParticlesCanvasRef.current, weatherEffects), [weatherEffects.particleIntensity, weatherEffects.particleKind]);

    return { weatherParticlesCanvasRef, weatherParticlesEnabled };
}
