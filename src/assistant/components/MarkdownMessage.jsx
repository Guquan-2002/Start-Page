import { Streamdown } from 'streamdown';
import 'streamdown/styles.css';
import './MarkdownMessage.css';

function CodeRenderer({ node, className, children, 'data-block': isBlock, ...props }) {
    if (isBlock) {
        return (
            <pre className={className} {...props}>
                <code>{children}</code>
            </pre>
        );
    }
    return (
        <code className={className} {...props}>
            {children}
        </code>
    );
}

const MARKDOWN_COMPONENTS = { code: CodeRenderer };

export function MarkdownMessage({ text, isStreaming }) {
    return (
        <Streamdown
            mode={isStreaming ? 'streaming' : 'static'}
            isAnimating={isStreaming}
            components={MARKDOWN_COMPONENTS}
        >
            {text}
        </Streamdown>
    );
}
