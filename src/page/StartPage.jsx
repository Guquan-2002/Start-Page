import { BackgroundEffects } from './BackgroundEffects.jsx';
import { Icon } from '../shared/Icon.jsx';
import { useClock } from './hooks/useClock.js';
import { useStartPageServices } from './hooks/useStartPageServices.js';
import { useTimeTheme } from './hooks/useTimeTheme.js';

export function NetworkStatus({ statusClass, statusText }) {
    return (
        <div id="network-status" aria-live="polite" aria-label="Network status">
            <span id="network-indicator" className={statusClass} />
            <span id="network-text">{statusText}</span>
        </div>
    );
}

export function StartPage() {
    const clock = useClock();
    const {
        isOffline,
        searchConfig,
        weather
    } = useStartPageServices();

    useTimeTheme();

    return (
        <>
            <BackgroundEffects />

            <main className="container">
                <div id="time-container" role="timer" aria-label="Current time">
                    <div id="time">{clock.time}</div>
                    <div id="date">{clock.date}</div>
                </div>

                <a
                    id="weather-container"
                    href="https://weather.cma.cn/web/weather"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Weather information"
                >
                    <Icon
                        id="weather-icon"
                        name={weather.icon}
                        spin={weather.spinning}
                    />
                    <span id="weather-details">{weather.details}</span>
                </a>

                <div id="search-container" role="search">
                    <form
                        id="search-form"
                        action={searchConfig.action}
                        method="get"
                        target="_blank"
                    >
                        <label
                            htmlFor="search-input"
                            className="sr-only"
                        >
                            Search
                        </label>
                        <input
                            type="text"
                            id="search-input"
                            name="q"
                            placeholder={searchConfig.placeholder}
                            autoComplete="off"
                            autoFocus
                            disabled={isOffline}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                }
                            }}
                        />
                        <Icon name="search" className="search-icon" />
                    </form>
                </div>
            </main>

            <NetworkStatus
                statusClass={searchConfig.statusClass}
                statusText={searchConfig.statusText}
            />
        </>
    );
}
