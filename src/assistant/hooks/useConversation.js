import { useChat as useAiConversation } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';

function readAttachment(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve({
            type: 'file',
            mediaType: file.type,
            filename: file.name,
            url: String(reader.result)
        });
        reader.onerror = () => reject(
            new Error(`读取文件失败: ${file.name}`)
        );

        reader.readAsDataURL(file);
    });
}

function getProviderConfigError(providerConfig) {
    if (!providerConfig.apiKey.trim()) return '请输入 API Key';
    if (!providerConfig.model.trim()) return '请输入模型名称';
    return '';
}

export function useConversation({ providerConfig, onRequireSettings }) {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [localError, setLocalError] = useState('');
    const inputRef = useRef(null);
    const providerConfigRef = useRef(providerConfig);
    providerConfigRef.current = providerConfig;
    const [transport] = useState(() => (
        new DefaultChatTransport({
            api: '/api/provider',
            body: () => ({ providerConfig: providerConfigRef.current })
        })
    ));

    const {
        messages,
        status,
        error,
        sendMessage: sendConversationMessage,
        regenerate,
        stop,
        setMessages,
        clearError
    } = useAiConversation({
        transport,
        onFinish: () => inputRef.current.focus()
    });
    const isStreaming = status === 'submitted' || status === 'streaming';

    const sendMessage = async () => {
        const text = input.trim();
        if (!text && attachments.length === 0) return;

        const providerConfigError = getProviderConfigError(providerConfigRef.current);
        if (providerConfigError) {
            setLocalError(providerConfigError);
            onRequireSettings();
            return;
        }

        setLocalError('');
        clearError();
        setInput('');
        setAttachments([]);

        await sendConversationMessage(text
            ? { text, files: attachments }
            : { files: attachments });
    };

    const addAttachments = async (files) => {
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        try {
            const newAttachments = await Promise.all(
                imageFiles.map((file) => readAttachment(file))
            );
            setAttachments((current) => [...current, ...newAttachments]);
            setLocalError('');
        } catch (readError) {
            setLocalError(readError.message);
        }
    };

    const removeAttachment = (index) => {
        setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    };

    const regenerateResponse = (messageId) => {
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
        addAttachments,
        removeAttachment,
        isStreaming,
        sendMessage,
        stopGeneration: stop,
        clearConversation,
        regenerateResponse
    };
}
