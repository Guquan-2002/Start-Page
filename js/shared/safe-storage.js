// Shared helpers for resilient localStorage access.
// These wrappers avoid throwing when storage is unavailable or JSON is malformed.
function isStorageLike(storage) {
    return Boolean(storage)
        && typeof storage.getItem === 'function'
        && typeof storage.setItem === 'function';
}

function resolveStorage(storage) {
    return isStorageLike(storage) ? storage : null;
}

export function safeGetJson(key, fallbackValue, storage = null) {
    const targetStorage = resolveStorage(storage);
    if (!targetStorage) {
        return fallbackValue;
    }

    try {
        const rawValue = targetStorage.getItem(key);
        if (!rawValue) {
            return fallbackValue;
        }

        return JSON.parse(rawValue);
    } catch {
        return fallbackValue;
    }
}

export function safeSetJson(key, value, storage = null) {
    const targetStorage = resolveStorage(storage);
    if (!targetStorage) {
        return false;
    }

    try {
        targetStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

