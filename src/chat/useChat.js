import { useChat as useAiChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';

function readFilePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve({
            type: 'file',
            mediaType: file.type,
            filename: file.name,
            url: String(reader.result)
        });
        reader.onerror = () => reject(
            new Error(`Failed to read ${file.name}.`)
        );

        reader.readAsDataURL(file);
    });
}

function getMissingConfig(config) {
    if (!config.apiKey.trim()) return 'API Key is required.';
    if (!config.model.trim()) return 'Model is required.';
    return '';
}

export function useChat({ requestConfig, onRequireSettings }) {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [localError, setLocalError] = useState('');
    const inputRef = useRef(null);
    const requestConfigRef = useRef(requestConfig);
    requestConfigRef.current = requestConfig;
    const [transport] = useState(() => (
        new DefaultChatTransport({
            api: '/api/chat',
            body: () => ({ config: requestConfigRef.current })
        })
    ));

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
        transport,
        onFinish: () => inputRef.current.focus()
    });
    const isStreaming = status === 'submitted' || status === 'streaming';

    const sendMessage = async () => {
        const text = input.trim();
        if (!text && attachments.length === 0) return;

        const configError = getMissingConfig(requestConfigRef.current);
        if (configError) {
            setLocalError(configError);
            onRequireSettings();
            return;
        }

        setLocalError('');
        clearError();
        setInput('');
        setAttachments([]);

        await sendAiMessage(text
            ? { text, files: attachments }
            : { files: attachments });
    };

    const addFiles = async (files) => {
        const images = files.filter((file) => file.type.startsWith('image/'));
        if (images.length === 0) return;

        try {
            const parts = await Promise.all(
                images.map((file) => readFilePart(file))
            );
            setAttachments((current) => [...current, ...parts]);
            setLocalError('');
        } catch (readError) {
            setLocalError(readError.message);
        }
    };

    const removeAttachment = (index) => {
        setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    };

    const regenerateMessage = (messageId) => {
        setLocalError('');
        clearError();
        return regenerate({ messageId });
    };

    const clearConversation = () => {
        setMessages([]);
        setInput('');
        setAttachments([]);
        setLocalError('');
        clearError();
        inputRef.current.focus();
    };

    useEffect(() => () => { void stop(); }, [stop]);

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
