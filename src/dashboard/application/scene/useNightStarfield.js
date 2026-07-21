import { useEffect, useRef } from 'react';
import { startStarfieldEffect } from '../../infrastructure/nightStarfield.js';
import { useSkyStatusState } from '../status/skyStatus.jsx';

const NIGHT_STARFIELD_MIN_OPACITY = 0.05;

function isNightStarfieldEnabled(nightOpacity) {
    return nightOpacity > NIGHT_STARFIELD_MIN_OPACITY;
}

function getNightStarfieldView({ nightOpacity }) {
    return { nightStarfieldEnabled: isNightStarfieldEnabled(nightOpacity) };
}

export function useNightStarfield() {
    const { nightOpacity } = useSkyStatusState();
    const nightStarfieldCanvasRef = useRef(null);
    const { nightStarfieldEnabled } = getNightStarfieldView({ nightOpacity });

    useEffect(() => startStarfieldEffect(nightStarfieldCanvasRef.current, nightStarfieldEnabled), [nightStarfieldEnabled]);

    return {nightStarfieldCanvasRef };
}
