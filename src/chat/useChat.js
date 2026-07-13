import { useChat as useAiChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';

function readFilePart(file, readers) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const settle = (callback) => {
            readers.delete(reader);
            callback();
        };

        reader.onload = () => settle(() => resolve({
            type: 'file',
            mediaType: file.type || 'application/octet-stream',
            filename: file.name || undefined,
            url: String(reader.result)
        }));
        reader.onerror = () => settle(() => reject(
            new Error(`Failed to read ${file.name || 'attachment'}.`)
        ));
        reader.onabort = () => settle(() => {
            const error = new Error('Attachment reading was cancelled.');
            error.name = 'AbortError';
            reject(error);
        });

        readers.add(reader);
        reader.readAsDataURL(file);
    });
}

function getMissingConfig(config) {
    if (!config?.apiKey?.trim()) return 'API Key is required.';
    if (!config?.model?.trim()) return 'Model is required.';
    return '';
}

export function useChat({ requestConfig, onRequireSettings }) {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [localError, setLocalError] = useState('');
    const inputRef = useRef(null);
    const readersRef = useRef(new Set());
    const requestConfigRef = useRef(requestConfig);
    const transportRef = useRef(null);
    requestConfigRef.current = requestConfig;

    if (!transportRef.current) {
        transportRef.current = new DefaultChatTransport({
            api: '/api/chat',
            body: () => ({ config: requestConfigRef.current })
        });
    }

    const {
        messages,
        status,
        error,
        sendMessage: sendAiMessage,
        regenerate,
        stop,
        setMessages,
        clearError
    } = useAiChat({
        transport: transportRef.current,
        onFinish: () => inputRef.current?.focus()
    });
    const isStreaming = status === 'submitted' || status === 'streaming';

    const sendMessage = useCallback(async () => {
        if (isStreaming) return;

        const text = input.trim();
        if (!text && attachments.length === 0) return;

        const configError = getMissingConfig(requestConfigRef.current);
        if (configError) {
            setLocalError(configError);
            onRequireSettings?.();
            return;
        }

        setLocalError('');
        clearError();
        setInput('');
        setAttachments([]);

        await sendAiMessage(text
            ? { text, files: attachments }
            : { files: attachments });
    }, [attachments, clearError, input, isStreaming, onRequireSettings, sendAiMessage]);

    const addFiles = useCallback(async (files) => {
        const images = Array.from(files || []).filter((file) => file?.type?.startsWith('image/'));
        if (images.length === 0) return;

        try {
            const parts = await Promise.all(
                images.map((file) => readFilePart(file, readersRef.current))
            );
            setAttachments((current) => [...current, ...parts]);
            setLocalError('');
        } catch (readError) {
            if (readError?.name !== 'AbortError') {
                setLocalError(readError?.message || 'Failed to read image file.');
            }
        }
    }, []);

    const removeAttachment = useCallback((index) => {
        setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    }, []);

    const regenerateMessage = useCallback((messageId) => {
        if (isStreaming) return;
        setLocalError('');
        clearError();
        return regenerate(messageId ? { messageId } : undefined);
    }, [clearError, isStreaming, regenerate]);

    const clearConversation = useCallback(() => {
        if (isStreaming) return;
        setMessages([]);
        setInput('');
        setAttachments([]);
        setLocalError('');
        clearError();
        inputRef.current?.focus();
    }, [clearError, isStreaming, setMessages]);

    useEffect(() => () => {
        readersRef.current.forEach((reader) => reader.abort());
        readersRef.current.clear();
        void stop();
    }, [stop]);

    return {
        messages,
        status,
        error: localError || error?.message || '',
        input,
        setInput,
        inputRef,
        attachments,
        addFiles,
        removeAttachment,
        isStreaming,
        sendMessage,
        stopGeneration: stop,
        clearConversation,
        regenerateMessage
    };
}
