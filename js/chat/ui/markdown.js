/**
 * Markdown 渲染器
 *
 * 职责：
 * - 安全地渲染助手消息的 Markdown 内容
 * - 使用 DOMPurify 清理 HTML，防止 XSS 攻击（包括 mutation-XSS）
 * - 配置 marked.js 进行解析；代码高亮由 ui-manager.js 在渲染后调用 hljs.highlightElement 完成
 * - 限制链接协议与 CSS 类名白名单
 *
 * 依赖：marked.js, DOMPurify（外部库）；hljs 由 ui-manager.js 使用
 * 被依赖：ui-manager.js
 */

// Markdown 允许的 HTML 标签白名单（传递给 DOMPurify 的 ALLOWED_TAGS）
const MARKDOWN_ALLOWED_TAGS = [
    'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'span'
];

// 允许的 HTML 属性白名单（传递给 DOMPurify 的 ALLOWED_ATTR）
const MARKDOWN_ALLOWED_ATTRS = ['href', 'title', 'target', 'rel', 'class'];

/**
 * 允许的 URI 协议 + 相对路径
 *
 * 仅放行 http/https/mailto 以及 #、/、./、../ 开头的相对链接；
 * javascript:、data: 等会被 DOMPurify 据此正则剔除。
 */
const SAFE_URI_REGEXP = /^(?:(?:https?|mailto):|#|\/|(?:\.\.?\/|$))/i;

// 安全的 CSS 类名正则表达式（用于代码高亮）
const SAFE_CODE_CLASS = /^(hljs|hljs-[a-z0-9_-]+|language-[a-z0-9_+#.-]+)$/i;

let purifyConfigured = false;

/**
 * 清理 CSS 类名
 *
 * 只保留符合代码高亮规范的类名（hljs-*、language-*）
 */
function sanitizeClassValue(value) {
    return value
        .split(/\s+/)
        .filter((token) => SAFE_CODE_CLASS.test(token))
        .join(' ')
        .trim();
}

/**
 * 注册 DOMPurify 钩子（仅注册一次）
 *
 * - afterSanitizeAttributes：限制 class 仅保留高亮类名；为外部链接补 target/rel
 */
function configurePurifyOnce() {
    if (purifyConfigured || typeof DOMPurify === 'undefined' || !DOMPurify.addHook) {
        return;
    }

    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (!node || typeof node.getAttribute !== 'function') {
            return;
        }

        // 限制 class 仅保留代码高亮类名
        if (node.hasAttribute('class')) {
            const safeClass = sanitizeClassValue(node.getAttribute('class'));
            if (safeClass) {
                node.setAttribute('class', safeClass);
            } else {
                node.removeAttribute('class');
            }
        }

        // 为外部链接添加安全属性
        if (node.tagName === 'A' && node.hasAttribute('href')) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });

    purifyConfigured = true;
}

/**
 * DOMPurify 配置
 */
function buildPurifyConfig() {
    return {
        ALLOWED_TAGS: MARKDOWN_ALLOWED_TAGS,
        ALLOWED_ATTR: MARKDOWN_ALLOWED_ATTRS,
        ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
        // 禁止任何形式的脚本与危险内容
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
        FORBID_ATTR: ['style', 'srcset', 'formaction'],
        // 保留文本内容而非整体删除未知标签的子树
        KEEP_CONTENT: true
    };
}

/**
 * 配置 marked.js
 *
 * 启用 GFM 与换行转 <br>。代码高亮不在解析阶段进行（marked 5+ 已移除 highlight 回调），
 * 而是由 ui-manager.js 在渲染后对 <pre><code> 调用 hljs.highlightElement。
 */
export function setupMarked() {
    if (typeof marked === 'undefined') return;

    marked.setOptions({
        breaks: true,  // 将换行符转换为 <br>
        gfm: true      // 启用 GitHub Flavored Markdown
    });
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 清理 Markdown 生成的 HTML
 *
 * 使用 DOMPurify 进行清理，相比手写白名单方案能更好地抵御 mutation-XSS
 * 等边缘攻击。配置项限制标签、属性、URI 协议，并通过钩子收敛 class 与链接属性。
 *
 * @param {string} html - 原始 HTML
 * @returns {string} 清理后的 HTML
 */
function sanitizeMarkdownHtml(html) {
    if (typeof DOMPurify === 'undefined') {
        // DOMPurify 未加载时的兜底：转义全部 HTML，牺牲格式换安全
        return escapeHtml(html);
    }

    configurePurifyOnce();
    return DOMPurify.sanitize(html, buildPurifyConfig());
}

/**
 * 渲染 Markdown 文本
 *
 * @param {string} text - Markdown 文本
 * @returns {string} 渲染后的 HTML（已清理）
 */
export function renderMarkdown(text) {
    if (typeof marked === 'undefined') return escapeHtml(text);
    try {
        return sanitizeMarkdownHtml(marked.parse(text));
    } catch {
        return escapeHtml(text);
    }
}
