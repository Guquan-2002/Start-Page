import { Icon } from '../../../shared/Icon.jsx';
import { useSearchEngineView } from '../../application/panels/useSearchEngineView.js';
import './SearchEngine.css';

export function SearchEngine() {
    const { searchUrl, placeholderText, isDisabled } = useSearchEngineView();

    return (
        <form
            className="search-engine"
            role="search"
            action={searchUrl}
            method="get"
            target="_blank"
        >
            <label htmlFor="search-engine-input" className="sr-only">
                搜索
            </label>
            <input
                type="text"
                id="search-engine-input"
                className="search-engine__input glass-surface"
                name="q"
                placeholder={placeholderText}
                autoComplete="off"
                autoFocus
                disabled={isDisabled}
            />
            <button
                type="submit"
                className="search-engine__button"
                aria-label="搜索"
                disabled={isDisabled}
            >
                <Icon name="search" className="search-engine__icon" />
            </button>
        </form>
    );
}
