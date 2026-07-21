import { useSceneBackground } from '../../application/scene/useSceneBackground.js';
import './SceneBackground.css';

export function SceneBackground() {
    useSceneBackground();

    return (
        <div className="scene-background" aria-hidden="true">
            <div className="sky-layer" />
            <div className="celestial-bodies">
                <div className="celestial-bodies__sun" />
                <div className="celestial-bodies__moon" />
            </div>
            <div className="sky-glow">
                <div className="sky-glow__sunrise" />
                <div className="sky-glow__sunset" />
                <div className="sky-glow__milky-way" />
            </div>
        </div>
    );
}
