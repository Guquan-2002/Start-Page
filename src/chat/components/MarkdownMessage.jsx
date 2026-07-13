import { Streamdown } from 'streamdown';
import 'streamdown/styles.css';

function SimpleCode({ node, className, children, ...props }) {
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

export function MarkdownMessage({ className, text = '', isStreaming = false }) {
    return (
        <Streamdown
            className={className}
            mode={isStreaming ? 'streaming' : 'static'}
            isAnimating={isStreaming}
            components={{ code: SimpleCode }}
        >
            {text}
        </Streamdown>
    );
}
