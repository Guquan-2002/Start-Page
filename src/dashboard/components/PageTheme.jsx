import { useRef } from 'react';
import { usePageTheme } from '../hooks/usePageTheme.js';
import './PageTheme.css';

export function PageTheme() {
    const canvasRef = useRef(null);

    usePageTheme(canvasRef);

    return (
        <div id="background-effects" aria-hidden="true">
            <canvas id="starfield-canvas" ref={canvasRef} />
            <div className="stars-bg" />
        </div>
    );
}
