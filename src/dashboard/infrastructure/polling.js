export function startPolling({
    poll,
    intervalMs,
    timeoutMs,
    onStart,
    onSuccess,
    onError,
}) {
    const abortController = new AbortController();
    const { signal } = abortController;
    let pollTimeoutId;

    const runPoll = async () => {
        if (signal.aborted) return;
        onStart?.();

        try {
            const pollSignal = timeoutMs
                ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
                : signal;
            const result = await poll(pollSignal);
            if (!signal.aborted) onSuccess(result);
        } catch (error) {
            if (!signal.aborted) onError?.(error);
        } finally {
            if (!signal.aborted) {
                pollTimeoutId = window.setTimeout(runPoll, intervalMs);
            }
        }
    };

    void runPoll();
    return () => {
        abortController.abort();
        window.clearTimeout(pollTimeoutId);
    };
}
