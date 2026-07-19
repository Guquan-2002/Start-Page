import { useLayoutEffect, useRef } from 'react';

import { Icon } from '../../shared/Icon.jsx';
import { MarkdownMessage } from './MarkdownMessage.jsx';
import './MessageList.css';

function FilePart({ part, index }) {
    const label = part.filename || `attachment-${index + 1}`;

    return (
        <div className="assistant-message-attachments">
            {part.mediaType.startsWith('image/') ? (
                <img
                    className="assistant-message-attachment-image"
                    src={part.url}
                    alt={label}
                    loading="lazy"
                />
            ) : (
                <a
                    className="assistant-file-link"
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={part.filename}
                >
                    {label}
                </a>
            )}
        </div>
    );
}

function ReasoningPart({ part, isStreaming }) {
    return (
        <details className="assistant-reasoning" open={isStreaming}>
            <summary>推理过程</summary>
            <MarkdownMessage text={part.text} isStreaming={isStreaming} />
        </details>
    );
}

function SourcePart({ part }) {
    const label = part.title || part.filename || part.url || '来源';

    return part.type === 'source-url' ? (
        <a
            className="assistant-source-link"
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
        >
            {label}
        </a>
    ) : <span className="assistant-source-link">{label}</span>;
}

function isRenderablePart({ type, text, url }) {
    if (type === 'file') return Boolean(url);
    if (type === 'source-url' || type === 'source-document') return true;
    return (type === 'text' || type === 'reasoning') && Boolean(text);
}

function renderMessagePart(part, index, role, isStreaming) {
    if (!isRenderablePart(part)) return null;

    const isPartStreaming = isStreaming && part.state !== 'done';

    switch (part.type) {
        case 'text':
            return role === 'assistant' ? (
                <MarkdownMessage
                    key={index}
                    text={part.text}
                    isStreaming={isPartStreaming}
                />
            ) : (
                <span key={index}>{part.text}</span>
            );
        case 'reasoning':
            return (
                <ReasoningPart
                    key={index}
                    part={part}
                    isStreaming={isPartStreaming}
                />
            );
        case 'file':
            return (
                <FilePart
                    key={index}
                    part={part}
                    index={index}
                />
            );
        case 'source-url':
        case 'source-document':
            return <SourcePart key={index} part={part} />;
        default:
            return null;
    }
}

function hasRenderableContent({ parts }) {
    return parts.some(isRenderablePart);
}

const STICK_TO_BOTTOM_THRESHOLD_PX = 48;

function MessageItem({ message, isStreaming, isPending, onRegenerate }) {
    const { role, parts } = message;

    if (!hasRenderableContent(message)) return null;

    return (
        <div className={`assistant-message ${role}${isStreaming ? ' is-streaming' : ''}`}>
            {parts.map((part, index) => renderMessagePart(part, index, role, isStreaming))}
            {role === 'assistant' && (
                <button
                    type="button"
                    className="assistant-regenerate-button"
                    title="重新生成回复"
                    aria-label="重新生成回复"
                    disabled={isPending}
                    onClick={() => onRegenerate(message.id)}
                >
                    <Icon name="retry" />
                </button>
            )}
        </div>
    );
}

export function MessageList({ messages, status, error, onRegenerate }) {
    const listRef = useRef(null);
    const stickToBottomRef = useRef(true);
    const isPending = status === 'submitted' || status === 'streaming';
    const lastMessage = messages.at(-1);
    const lastMessageHasAssistantContent = lastMessage?.role === 'assistant'
        && hasRenderableContent(lastMessage);
    const showStreamingPlaceholder = status === 'submitted'
        || (status === 'streaming' && !lastMessageHasAssistantContent);

    const handleScroll = () => {
        const list = listRef.current;
        stickToBottomRef.current =
            list.scrollHeight - list.scrollTop - list.clientHeight
            < STICK_TO_BOTTOM_THRESHOLD_PX;
    };

    useLayoutEffect(() => {
        const list = listRef.current;
        if (stickToBottomRef.current || lastMessage?.role === 'user') {
            list.scrollTop = list.scrollHeight;
        }
    }, [messages, status, error]);

    return (
        <div
            id="assistant-messages"
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={isPending}
            onScroll={handleScroll}
        >
            {messages.length === 0 && !isPending && !error && (
                <div id="assistant-empty-state">
                    <Icon name="comments" />
                    <span>开始对话</span>
                </div>
            )}
            {messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                    isPending={isPending}
                    onRegenerate={onRegenerate}
                    isStreaming={status === 'streaming'
                        && message.role === 'assistant'
                        && message === lastMessage}
                />
            ))}
            {showStreamingPlaceholder && (
                <div className="assistant-message assistant is-streaming is-streaming-placeholder">
                    思考中...
                </div>
            )}
            {error && (
                <div className="assistant-message error" role="alert">
                    <div className="assistant-error-title">请求无法完成</div>
                    <div className="assistant-error-detail">{error}</div>
                </div>
            )}
        </div>
    );
}
