import { Icon } from '../../shared/Icon.jsx';
import './SearchEngine.css';

const ENGINE_UI_CONFIGS = {
    checking: {
        action: '#',
        placeholder: '使用 Google 搜索',
        statusClass: '',
        statusText: '正在检测网络...'
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

export function SearchEngine({ networkEngine }) {
    const engineUi = ENGINE_UI_CONFIGS[networkEngine ?? 'checking'];

    return (
        <>
            <div id="search-container" role="search">
                <form
                    id="search-form"
                    action={engineUi.action}
                    method="get"
                    target="_blank"
                >
                    <label htmlFor="search-input" className="sr-only">
                        搜索
                    </label>
                    <input
                        type="text"
                        id="search-input"
                        name="q"
                        placeholder={engineUi.placeholder}
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

            <div id="network-status" aria-live="polite" aria-label="Network status">
                <span id="network-indicator" className={engineUi.statusClass} />
                <span id="network-text">{engineUi.statusText}</span>
            </div>
        </>
    );
}
