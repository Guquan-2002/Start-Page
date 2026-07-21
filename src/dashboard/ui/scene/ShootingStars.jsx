import { useShootingStars } from '../../application/scene/useShootingStars.js';
import './ShootingStars.css';

export function ShootingStars() {
    const { shootingStarsContainerRef } = useShootingStars();

    return (
        <div
            className="shooting-stars"
            ref={shootingStarsContainerRef}
            aria-hidden="true"
        />
    );
}
