import { Streamdown } from 'streamdown';
import 'streamdown/styles.css';
import './MarkdownMessage.css';

function CodeRenderer({ node, className, children, ...props }) {
    // Block-level code (fenced code blocks) — render simple <pre><code>
    if ('data-block' in props) {
        const { 'data-block': _, ...rest } = props;
        return (
            <pre className={className} {...rest}>
                <code>{children}</code>
            </pre>
        );
    }
    // Inline code
    return (
        <code className={className} {...props}>
            {children}
        </code>
    );
}

export function MarkdownMessage({ text, isStreaming }) {
    return (
        <Streamdown
            mode={isStreaming ? 'streaming' : 'static'}
            isAnimating={isStreaming}
            components={{ code: CodeRenderer }}
        >
            {text}
        </Streamdown>
    );
}
