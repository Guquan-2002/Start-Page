import { NetworkStatusProvider } from '../application/status/networkStatus.jsx';
import { SkyStatusProvider } from '../application/status/skyStatus.jsx';
import { SystemStatusProvider } from '../application/status/systemStatus.jsx';
import { WeatherStatusProvider } from '../application/status/weatherStatus.jsx';
import { Clock } from './panels/Clock.jsx';
import { WeatherBadge } from './panels/WeatherBadge.jsx';
import { SearchEngine } from './panels/SearchEngine.jsx';
import { StatusCapsule } from './panels/StatusCapsule.jsx';
import { NightStarfield } from './scene/NightStarfield.jsx';
import { SceneBackground } from './scene/SceneBackground.jsx';
import { ShootingStars } from './scene/ShootingStars.jsx';
import { WeatherAtmosphere } from './scene/WeatherAtmosphere.jsx';
import { WeatherCloud } from './scene/WeatherCloud.jsx';
import { WeatherParticles } from './scene/WeatherParticles.jsx';
import './DashboardView.css';

export function DashboardView() {
    return (
        <NetworkStatusProvider>
            <WeatherStatusProvider>
                <SystemStatusProvider>
                    <SkyStatusProvider>
                        <WeatherAtmosphere>
                            <SceneBackground />
                            <NightStarfield />
                            <WeatherCloud />
                            <WeatherParticles />
                            <ShootingStars />
                        </WeatherAtmosphere>
                        <main className="panels">
                            <div className="hero glass-surface">
                                <Clock />
                                <WeatherBadge />
                            </div>
                            <SearchEngine />
                            <StatusCapsule />
                        </main>
                    </SkyStatusProvider>
                </SystemStatusProvider>
            </WeatherStatusProvider>
        </NetworkStatusProvider>
    );
}
