import { useNightStarfield } from '../../application/scene/useNightStarfield.js';
import './NightStarfield.css';

export function NightStarfield() {
    const { nightStarfieldCanvasRef } = useNightStarfield();

    return (
        <canvas
            className="night-starfield"
            ref={nightStarfieldCanvasRef}
            aria-hidden="true"
        />
    );
}
