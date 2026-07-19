import { Icon } from '../../shared/Icon.jsx';
import './SearchEngine.css';

const ENGINE_UI_CONFIGS = {
    checking: {
        action: '#',
        placeholder: '使用 Google 搜索'
    },
    global: {
        action: 'https://www.google.com/search',
        placeholder: '使用 Google 搜索'
    },
    cn: {
        action: 'https://cn.bing.com/search',
        placeholder: '使用 Bing 搜索'
    },
    offline: {
        action: '#',
        placeholder: '网络连接不可用'
    }
};

export function SearchEngine({ networkConnectivity }) {
    const engineUi = ENGINE_UI_CONFIGS[networkConnectivity ?? 'checking'];

    return (
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
                    disabled={networkConnectivity === 'offline'}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur();
                        }
                    }}
                />
                <Icon name="search" className="search-icon" />
            </form>
        </div>
    );
}
