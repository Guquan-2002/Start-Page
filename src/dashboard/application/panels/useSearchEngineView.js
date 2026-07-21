import { useNetworkStatusState } from '../status/networkStatus.jsx';

const SEARCH_ENGINE_VIEWS = {
    checking: { searchUrl: '#', placeholderText: '正在检测网络', isDisabled: true },
    global: { searchUrl: 'https://www.google.com/search', placeholderText: '使用 Google 搜索', isDisabled: false },
    domestic: { searchUrl: 'https://cn.bing.com/search', placeholderText: '使用 Bing 搜索', isDisabled: false },
    offline: { searchUrl: '#', placeholderText: '网络连接不可用', isDisabled: true },
};

function getSearchEngineView(networkStatus) {
    return SEARCH_ENGINE_VIEWS[networkStatus];
}

export function useSearchEngineView() {
    const networkStatus = useNetworkStatusState();
    return getSearchEngineView(networkStatus);
}
