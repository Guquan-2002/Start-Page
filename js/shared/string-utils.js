/**
 * Shared string and URL normalization utilities.
 *
 * Centralizes simple helpers that were previously duplicated across many files
 * to reduce code duplication and maintenance overhead.
 */

export function asTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function normalizeApiUrl(apiUrl) {
    return asTrimmedString(apiUrl).replace(/\/+$/, '');
}

/** Shared CJK character range for token estimation. */
export const CJK_CHAR_REGEX = /[\u4e00-\u9fff\u3000-\u303f]/;
