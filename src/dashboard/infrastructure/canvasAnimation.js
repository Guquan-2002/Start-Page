const CANVAS_RESIZE_DEBOUNCE_MS = 200;

export function startCanvasAnimation(canvas, { createState, renderFrame }) {
    if (!canvas) return undefined;

    const canvasContext = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;
    let animationFrameId = null;
    let resizeTimeoutId = null;
    let canvasState;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let previousFrameTime = window.performance.now();

    const syncCanvasSize = () => {
        const { devicePixelRatio } = window;
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        canvas.width = Math.floor(viewportWidth * devicePixelRatio);
        canvas.height = Math.floor(viewportHeight * devicePixelRatio);
        canvas.style.width = `${viewportWidth}px`;
        canvas.style.height = `${viewportHeight}px`;
        canvasContext.setTransform(
            devicePixelRatio,
            0,
            0,
            devicePixelRatio,
            0,
            0
        );
        canvasState = createState(viewportWidth, viewportHeight);
        previousFrameTime = window.performance.now();
    };

    const renderCanvasFrame = (time, isAnimated) => {
        const deltaTimeMs = time - previousFrameTime;
        previousFrameTime = time;
        canvasContext.clearRect(0, 0, viewportWidth, viewportHeight);
        renderFrame({
            canvasContext,
            canvasState,
            viewportWidth,
            viewportHeight,
            time,
            deltaTimeMs,
            isAnimated,
        });
        canvasContext.globalAlpha = 1;
    };

    const renderAnimationFrame = (time) => {
        renderCanvasFrame(time, true);
        animationFrameId = window.requestAnimationFrame(renderAnimationFrame);
    };

    const handleResize = () => {
        if (resizeTimeoutId !== null) window.clearTimeout(resizeTimeoutId);
        resizeTimeoutId = window.setTimeout(() => {
            resizeTimeoutId = null;
            syncCanvasSize();
            if (prefersReducedMotion) {
                renderCanvasFrame(previousFrameTime, false);
            }
        }, CANVAS_RESIZE_DEBOUNCE_MS);
    };

    syncCanvasSize();
    window.addEventListener('resize', handleResize);
    if (prefersReducedMotion) {
        renderCanvasFrame(previousFrameTime, false);
    } else {
        animationFrameId = window.requestAnimationFrame(renderAnimationFrame);
    }

    return () => {
        window.removeEventListener('resize', handleResize);
        if (resizeTimeoutId !== null) window.clearTimeout(resizeTimeoutId);
        if (animationFrameId !== null) {
            window.cancelAnimationFrame(animationFrameId);
        }
    };
}
