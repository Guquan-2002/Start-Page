// Markdown renderer: sanitizes and renders assistant markdown safely.
const MARKDOWN_ALLOWED_TAGS = new Set([
    'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'span'
]);

const MARKDOWN_ALLOWED_ATTRS = {
    a: new Set(['href', 'title', 'target', 'rel']),
    code: new Set(['class']),
    span: new Set(['class'])
};

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const SAFE_CODE_CLASS = /^(hljs|hljs-[a-z0-9_-]+|language-[a-z0-9_+#.-]+)$/i;

export function setupMarked() {
    if (typeof marked === 'undefined') return;

    marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: function (code, lang) {
            if (typeof hljs === 'undefined') return code;
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        }
    });
}

function isSafeLink(href) {
    if (!href) return false;
    const value = href.trim();
    if (!value) return false;

    if (value.startsWith('#') || value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
        return true;
    }

    try {
        const parsed = new URL(value, window.location.origin);
        return SAFE_LINK_PROTOCOLS.has(parsed.protocol);
    } catch {
        return false;
    }
}

function sanitizeClassValue(value) {
    return value
        .split(/\s+/)
        .filter(token => SAFE_CODE_CLASS.test(token))
        .join(' ')
        .trim();
}

function sanitizeMarkdownHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html;

    const nodes = Array.from(template.content.querySelectorAll('*'));
    nodes.forEach((node) => {
        const tag = node.tagName.toLowerCase();

        if (!MARKDOWN_ALLOWED_TAGS.has(tag)) {
            if (['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base'].includes(tag)) {
                node.remove();
            } else {
                const fragment = document.createDocumentFragment();
                while (node.firstChild) {
                    fragment.appendChild(node.firstChild);
                }
                node.replaceWith(fragment);
            }
            return;
        }

        const allowedAttrs = MARKDOWN_ALLOWED_ATTRS[tag] || new Set();
        Array.from(node.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = attr.value;

            if (name.startsWith('on') || !allowedAttrs.has(name)) {
                node.removeAttribute(attr.name);
                return;
            }

            if (name === 'href' && !isSafeLink(value)) {
                node.removeAttribute('href');
                return;
            }

            if (name === 'class') {
                const safeClass = sanitizeClassValue(value);
                if (safeClass) {
                    node.setAttribute('class', safeClass);
                } else {
                    node.removeAttribute('class');
                }
            }
        });

        if (tag === 'a' && node.hasAttribute('href')) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });

    return template.innerHTML;
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function renderMarkdown(text) {
    if (typeof marked === 'undefined') return escapeHtml(text);
    try {
        return sanitizeMarkdownHtml(marked.parse(text));
    } catch {
        return escapeHtml(text);
    }
}

