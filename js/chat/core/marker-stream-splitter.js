function normalizeMarkers(markers) {
    if (!Array.isArray(markers)) {
        return [];
    }

    return [...new Set(
        markers
            .filter((marker) => typeof marker === 'string')
            .map((marker) => marker.trim())
            .filter(Boolean)
    )];
}

function findNextMarker(buffer, markers) {
    let nextMatch = null;

    for (const marker of markers) {
        const index = buffer.indexOf(marker);
        if (index === -1) {
            continue;
        }

        if (!nextMatch || index < nextMatch.index || (index === nextMatch.index && marker.length > nextMatch.length)) {
            nextMatch = {
                index,
                length: marker.length
            };
        }
    }

    return nextMatch;
}

export function createMarkerStreamSplitter({ markers = [] } = {}) {
    const activeMarkers = normalizeMarkers(markers);
    if (activeMarkers.length === 0) {
        throw new Error('At least one marker is required for stream splitting.');
    }

    let buffer = '';

    function push(textDelta) {
        const safeDelta = typeof textDelta === 'string' ? textDelta : '';
        if (!safeDelta) {
            return [];
        }

        buffer += safeDelta;

        const segments = [];
        while (buffer.length > 0) {
            const nextMarker = findNextMarker(buffer, activeMarkers);
            if (!nextMarker) {
                break;
            }

            const segment = buffer.slice(0, nextMarker.index).trim();
            if (segment) {
                segments.push(segment);
            }

            buffer = buffer.slice(nextMarker.index + nextMarker.length);
        }

        return segments;
    }

    function flush() {
        const remaining = buffer.trim();
        buffer = '';
        return remaining;
    }

    function discardRemainder() {
        buffer = '';
    }

    function getBuffer() {
        return buffer;
    }

    return {
        push,
        flush,
        discardRemainder,
        getBuffer
    };
}
