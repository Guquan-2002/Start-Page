/**
 * Thinking configuration helper.
 *
 * Maps provider-registry reasoning metadata to the existing settings UI API.
 */
import { getProviderThinkingConfig } from '../providers/provider-registry.js';

function normalizeValue(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getThinkingConfig(providerId) {
    return getProviderThinkingConfig(providerId) || {
        field: 'thinkingBudget',
        label: 'Reasoning (optional)',
        options: [],
        note: ''
    };
}

export function getUiMeta(providerId) {
    const config = getThinkingConfig(providerId);
    return {
        label: config.label,
        note: config.note
    };
}

export function getThinkingOptions(providerId) {
    const config = getThinkingConfig(providerId);
    return config.options.map((value, index) => ({
        value,
        label: index === 0 ? 'Disabled' : value
    }));
}

export function normalizeFromUi(providerId, uiValue) {
    const config = getThinkingConfig(providerId);
    const raw = normalizeValue(uiValue);
    const allowedValues = new Set(config.options);

    return {
        field: config.field,
        value: raw && allowedValues.has(raw) ? raw : null
    };
}

export function formatForUi(providerId, profile) {
    const config = getThinkingConfig(providerId);
    const value = normalizeValue(profile?.[config.field]);
    return config.options.includes(value) ? value : '';
}