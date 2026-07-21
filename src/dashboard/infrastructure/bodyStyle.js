export function setBodyCssProperty(propertyName, value) {
    document.body.style.setProperty(propertyName, value);
    return () => document.body.style.removeProperty(propertyName);
}

export function setBodyCssProperties(properties) {
    const cleanups = Object.entries(properties).map(([propertyName, value]) => setBodyCssProperty(propertyName, value));
    return () => cleanups.forEach((cleanup) => cleanup());
}
