import test from 'node:test';
import assert from 'node:assert/strict';

// markdown.js reads DOMPurify / marked / document lazily inside its functions,
// so we can stub these globals before calling renderMarkdown. No jsdom needed:
// we only assert the DOMPurify config plumbing and the fallback branches.
import { renderMarkdown, setupMarked } from '../../js/chat/ui/markdown.js';

function stubDocument() {
    globalThis.document = {
        createElement() {
            let text = '';
            return {
                set textContent(value) { text = value; },
                get textContent() { return text; },
                get innerHTML() {
                    return String(text)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;');
                }
            };
        }
    };
}

function withDomPurifyAndMarked() {
    stubDocument();
    const hooks = [];
    let lastConfig = null;
    globalThis.DOMPurify = {
        sanitize: (_html, config) => {
            lastConfig = config;
            return 'SANITIZED';
        },
        addHook: (name) => hooks.push(name)
    };
    globalThis.marked = {
        parse: (text) => `<p>${text}</p>`,
        setOptions() {}
    };
    return { hooks, getConfig: () => lastConfig };
}

test('renderMarkdown sanitizes via DOMPurify with the markdown whitelist', () => {
    const { hooks, getConfig } = withDomPurifyAndMarked();

    const output = renderMarkdown('# hi');

    assert.equal(output, 'SANITIZED');
    const config = getConfig();
    assert.ok(config, 'DOMPurify.sanitize was called with a config');
    assert.deepEqual(config.ALLOWED_TAGS, [
        'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'span'
    ]);
    assert.deepEqual(config.ALLOWED_ATTR, ['href', 'title', 'target', 'rel', 'class']);
    assert.ok(config.FORBID_TAGS.includes('script'));
    assert.ok(config.FORBID_TAGS.includes('iframe'));
    assert.ok(config.ALLOWED_URI_REGEXP instanceof RegExp);
    assert.deepEqual(hooks, ['afterSanitizeAttributes']);
});

test('renderMarkdown escapes output when DOMPurify is unavailable', () => {
    stubDocument();
    delete globalThis.DOMPurify;
    globalThis.marked = { parse: (text) => text, setOptions() {} };

    const output = renderMarkdown('<script>alert(1)</script>');

    assert.ok(!output.includes('<script>'), 'raw script tag must not survive');
    assert.ok(output.includes('&lt;script&gt;'), 'fallback should escape the tag');
});

test('renderMarkdown escapes output when marked is unavailable', () => {
    stubDocument();
    delete globalThis.marked;

    const output = renderMarkdown('<b>hi</b>');

    assert.ok(!output.includes('<b>'), 'raw tag must not survive when marked is missing');
    assert.ok(output.includes('&lt;b&gt;'), 'fallback should escape the tag');
});

test('setupMarked is a no-op when marked is unavailable', () => {
    delete globalThis.marked;
    assert.doesNotThrow(() => setupMarked());
});
