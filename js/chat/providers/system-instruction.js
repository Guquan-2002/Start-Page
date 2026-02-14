import { ASSISTANT_SEGMENT_MARKER, ASSISTANT_SENTENCE_MARKER } from '../constants.js';

function buildMarkerInstruction(enableMarkerSplit) {
    if (!enableMarkerSplit) {
        return '';
    }

    return [
        'Formatting rules:',
        `- When you need role-level segment boundaries, use ${ASSISTANT_SEGMENT_MARKER}.`,
        `- After each completed sentence in normal prose, append ${ASSISTANT_SENTENCE_MARKER}.`,
        '- Do not output marker tokens inside code blocks, tables, URLs, or inline code.'
    ].join('\n');
}

export function buildSystemInstruction(config, enableMarkerSplit) {
    const basePrompt = typeof config?.systemPrompt === 'string'
        ? config.systemPrompt.trim()
        : '';
    const markerInstruction = buildMarkerInstruction(enableMarkerSplit);

    if (!basePrompt) {
        return markerInstruction;
    }

    if (!markerInstruction) {
        return basePrompt;
    }

    return `${basePrompt}\n\n${markerInstruction}`;
}
