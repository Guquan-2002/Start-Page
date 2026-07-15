import { BackgroundEffects } from './BackgroundEffects.jsx';
import { Icon } from '../shared/Icon.jsx';
import { useClock } from './hooks/useClock.js';
import { useNetworkStatus } from './hooks/useNetworkStatus.js';
import { useTimeTheme } from './hooks/useTimeTheme.js';
import { useWeather } from './hooks/useWeather.js';
import './StartPage.css';

const SEARCH_CONFIGS = {
    checking: {
        action: '#',
        placeholder: '使用 Google 搜索',
        statusClass: '',
        statusText: 'Checking network...'
    },
    google: {
        action: 'https://www.google.com/search',
        placeholder: '使用 Google 搜索',
        statusClass: 'google-ok',
        statusText: '国际'
    },
    bing: {
        action: 'https://cn.bing.com/search',
        placeholder: '使用 Bing 搜索',
        statusClass: 'bing-ok',
        statusText: '国内'
    },
    offline: {
        action: '#',
        placeholder: '网络连接不可用',
        statusClass: 'net-fail',
        statusText: '断开'
    }
};

export function StartPage() {
    const clock = useClock();
    const { isGoogleAvailable, networkEngine } = useNetworkStatus();
    const theme = useTimeTheme();
    const weather = useWeather(isGoogleAvailable);
    const searchConfig = SEARCH_CONFIGS[networkEngine ?? 'checking'];

    return (
        <>
            <BackgroundEffects active={theme === 'night'} />

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
                            disabled={networkEngine === 'offline'}
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

            <div id="network-status" aria-live="polite" aria-label="Network status">
                <span id="network-indicator" className={searchConfig.statusClass} />
                <span id="network-text">{searchConfig.statusText}</span>
            </div>
        </>
    );
}
