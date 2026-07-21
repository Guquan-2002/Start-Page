import { useLayoutEffect } from 'react';
import { useSkyStatusState } from '../status/skyStatus.jsx';
import { setBodyCssProperties, setBodyCssProperty } from '../../infrastructure/bodyStyle.js';

export function useSceneBackground() {
    const skyStatus = useSkyStatusState();

    useLayoutEffect(() => setBodyCssProperty('--daylight', skyStatus.daylightCssValue), [skyStatus.daylightCssValue]);
    useLayoutEffect(() => setBodyCssProperties(skyStatus.backgroundStyle), [skyStatus.backgroundStyle]);
}
