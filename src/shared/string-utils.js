export function asTrimmedString(value, fallback = '') {
    return typeof value === 'string' ? value.trim() : fallback;
}
