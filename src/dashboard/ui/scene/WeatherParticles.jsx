import { useWeatherParticles } from '../../application/scene/useWeatherParticles.js';
import './WeatherParticles.css';

export function WeatherParticles() {
    const { weatherParticlesCanvasRef, weatherParticlesEnabled } =
        useWeatherParticles();

    if (!weatherParticlesEnabled) return null;

    return (
        <canvas
            className="weather-particles"
            ref={weatherParticlesCanvasRef}
            aria-hidden="true"
        />
    );
}
