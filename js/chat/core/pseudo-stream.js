const SENTENCE_PUNCTUATION_REGEX = /[。！？!?]/u;
const CLAUSE_PUNCTUATION_REGEX = /[，,；;：:]/u;
const BOUNDARY_REGEX = /[\s\n\r\t]/u;

function resolveChunkSize(remainingLength) {
    if (remainingLength <= 24) return 1;
    if (remainingLength <= 80) return 2;
    if (remainingLength <= 200) return 4;
    if (remainingLength <= 500) return 6;
    if (remainingLength <= 1000) return 8;
    return 12;
}

function findChunkBoundary(text, startIndex, targetIndex, lookahead) {
    const safeTargetIndex = Math.min(text.length, Math.max(startIndex + 1, targetIndex));
    const searchEnd = Math.min(text.length, safeTargetIndex + lookahead);

    for (let index = safeTargetIndex; index < searchEnd; index += 1) {
        const char = text[index];
        if (SENTENCE_PUNCTUATION_REGEX.test(char) || CLAUSE_PUNCTUATION_REGEX.test(char) || char === '\n') {
            return index + 1;
        }
    }

    for (let index = safeTargetIndex - 1; index > startIndex; index -= 1) {
        if (BOUNDARY_REGEX.test(text[index])) {
            return index + 1;
        }
    }

    return safeTargetIndex;
}

export function buildPseudoStreamChunks(text, {
    lookahead = 8
} = {}) {
    const normalizedText = typeof text === 'string' ? text : '';
    if (!normalizedText) {
        return [];
    }

    const chunks = [];
    let cursor = 0;

    while (cursor < normalizedText.length) {
        const remainingLength = normalizedText.length - cursor;
        const chunkSize = resolveChunkSize(remainingLength);
        const targetIndex = cursor + chunkSize;
        const endIndex = findChunkBoundary(normalizedText, cursor, targetIndex, lookahead);
        const chunk = normalizedText.slice(cursor, endIndex);

        if (!chunk) {
            break;
        }

        chunks.push(chunk);
        cursor = endIndex;
    }

    return chunks;
}

function resolveChunkDelayMs(chunk, baseDelayMs) {
    const trimmed = chunk.trimEnd();
    if (!trimmed) {
        return baseDelayMs;
    }

    const lastChar = trimmed[trimmed.length - 1];
    if (SENTENCE_PUNCTUATION_REGEX.test(lastChar)) {
        return baseDelayMs + 35;
    }

    if (CLAUSE_PUNCTUATION_REGEX.test(lastChar) || lastChar === '\n') {
        return baseDelayMs + 20;
    }

    return baseDelayMs;
}

async function waitForChunkDelay(delayMs, signal) {
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
        return !signal?.aborted;
    }

    if (signal?.aborted) {
        return false;
    }

    return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
            resolve(true);
        }, delayMs);

        const onAbort = () => {
            clearTimeout(timeoutId);
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
            resolve(false);
        };

        if (signal) {
            signal.addEventListener('abort', onAbort, { once: true });
        }
    });
}

export async function runPseudoStream({
    text,
    signal = null,
    baseDelayMs = 20,
    lookahead = 8,
    onProgress = null
}) {
    const chunks = buildPseudoStreamChunks(text, { lookahead });
    let renderedText = '';

    for (const chunk of chunks) {
        if (signal?.aborted) {
            return { renderedText, interrupted: true, chunkCount: chunks.length };
        }

        renderedText += chunk;
        if (typeof onProgress === 'function') {
            onProgress(renderedText, chunk);
        }

        const shouldContinue = await waitForChunkDelay(resolveChunkDelayMs(chunk, baseDelayMs), signal);
        if (!shouldContinue) {
            return { renderedText, interrupted: true, chunkCount: chunks.length };
        }
    }

    return { renderedText, interrupted: false, chunkCount: chunks.length };
}
