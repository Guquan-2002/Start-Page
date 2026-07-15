export function isImageAttachment(part) {
    return part.mediaType === 'image' || part.mediaType?.startsWith('image/');
}
