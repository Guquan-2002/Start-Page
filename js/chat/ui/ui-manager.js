// Chat UI manager: renders messages and controls chat interaction states.
export function createUiManager({
    elements,
    renderMarkdown,
    maxRenderedMessages,
    onRetryRequested = null,
    isRetryBlocked = null
}) {
    const {
        messagesEl,
        chatInput,
        attachBtn = null,
        sendBtn,
        stopBtn,
        sessionActionButtons = []
    } = elements;

    const handleRetryRequested = typeof onRetryRequested === 'function'
        ? onRetryRequested
        : () => {};
    const retryBlocked = typeof isRetryBlocked === 'function'
        ? isRetryBlocked
        : () => false;

    function scrollToBottom(smooth = true) {
        messagesEl.scrollTo({
            top: messagesEl.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    function addCopyButtons(container) {
        container.querySelectorAll('pre').forEach((pre) => {
            if (pre.querySelector('.code-copy-btn')) return;

            const button = document.createElement('button');
            button.className = 'code-copy-btn';
            button.innerHTML = '<i class="fas fa-copy"></i>';
            button.title = 'Copy code';

            button.addEventListener('click', () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent || '';
                navigator.clipboard.writeText(code)
                    .then(() => {
                        button.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => {
                            button.innerHTML = '<i class="fas fa-copy"></i>';
                        }, 1500);
                    })
                    .catch(() => {
                        // Ignore clipboard failures.
                    });
            });

            pre.appendChild(button);
        });
    }

    function pruneOldMessages() {
        while (messagesEl.children.length > maxRenderedMessages) {
            messagesEl.removeChild(messagesEl.firstChild);
        }
    }

    function clearMessages() {
        messagesEl.innerHTML = '';
    }

    function buildMessageElement(role, displayRole, identifiers = {}) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-msg ${displayRole || role}`;

        const messageId = typeof identifiers?.messageId === 'string' ? identifiers.messageId : '';
        const turnId = typeof identifiers?.turnId === 'string' ? identifiers.turnId : '';

        if (messageId) {
            messageElement.dataset.messageId = messageId;
        }

        if (turnId) {
            messageElement.dataset.turnId = turnId;
        }

        return messageElement;
    }

    function appendMessageElement(messageElement) {
        messagesEl.appendChild(messageElement);
        pruneOldMessages();
        scrollToBottom(false);
        return messageElement;
    }

    function appendUserImageParts(messageElement, meta) {
        const parts = Array.isArray(meta?.parts) ? meta.parts : [];
        const imageParts = parts.filter((part) => part?.type === 'image' && typeof part?.image?.value === 'string');
        if (imageParts.length === 0) {
            return;
        }

        const imageList = document.createElement('div');
        imageList.className = 'chat-user-images';

        imageParts.forEach((part, index) => {
            const image = document.createElement('img');
            image.className = 'chat-user-image';
            image.src = part.image.value;
            image.alt = `uploaded-image-${index + 1}`;
            image.loading = 'lazy';
            imageList.appendChild(image);
        });

        messageElement.appendChild(imageList);
    }

    function addMessage(role, text, meta = null, identifiers = {}) {
        const displayRole = typeof meta?.displayRole === 'string' ? meta.displayRole : role;
        const shouldShowRetry = role === 'user' && displayRole === 'user' && !meta?.isPrefixMessage;
        const messageElement = buildMessageElement(role, displayRole, identifiers);

        if (displayRole === 'assistant' && text) {
            messageElement.innerHTML = renderMarkdown(text);
            addCopyButtons(messageElement);
        } else {
            messageElement.textContent = text;
        }

        if (role === 'user' && displayRole === 'user') {
            appendUserImageParts(messageElement, meta);
        }

        if (shouldShowRetry && identifiers?.turnId) {
            const retryButton = document.createElement('button');
            retryButton.className = 'msg-retry-btn';
            retryButton.innerHTML = '<i class="fas fa-redo"></i>';
            retryButton.title = 'Retry from this message';

            retryButton.addEventListener('click', () => {
                if (retryBlocked()) {
                    return;
                }

                handleRetryRequested({
                    turnId: identifiers.turnId,
                    messageId: identifiers.messageId,
                    content: text
                });
            });

            messageElement.appendChild(retryButton);
        }

        return appendMessageElement(messageElement);
    }

    function addLoadingMessage() {
        const loadingMessage = addMessage('assistant', '');
        loadingMessage.innerHTML = '<span class="chat-loading"><span></span><span></span><span></span></span>';
        loadingMessage.classList.add('typing');
        return loadingMessage;
    }

    function createAssistantStreamingMessage(identifiers = {}) {
        const messageElement = buildMessageElement('assistant', 'assistant', identifiers);
        messageElement.classList.add('is-streaming');
        messageElement.textContent = '';
        return appendMessageElement(messageElement);
    }

    function updateAssistantStreamingMessage(messageElement, text) {
        if (!messageElement || !messageElement.isConnected) {
            return;
        }

        messageElement.textContent = text;
        scrollToBottom(false);
    }

    function finalizeAssistantStreamingMessage(messageElement, text, { interrupted = false } = {}) {
        if (!messageElement || !messageElement.isConnected) {
            return;
        }

        messageElement.classList.remove('is-streaming');

        if (interrupted) {
            messageElement.classList.add('is-interrupted');
        } else {
            messageElement.classList.remove('is-interrupted');
        }

        if (!text) {
            messageElement.remove();
            return;
        }

        messageElement.innerHTML = renderMarkdown(text);
        addCopyButtons(messageElement);
        scrollToBottom(false);
    }

    function addErrorMessage({
        title,
        detail = '',
        actionLabel = '',
        onAction = null
    }) {
        const messageElement = buildMessageElement('error', 'error');

        const titleElement = document.createElement('div');
        titleElement.className = 'chat-error-title';
        titleElement.textContent = title;
        messageElement.appendChild(titleElement);

        if (detail) {
            const detailElement = document.createElement('div');
            detailElement.className = 'chat-error-detail';
            detailElement.textContent = detail;
            messageElement.appendChild(detailElement);
        }

        if (actionLabel && typeof onAction === 'function') {
            const actionButton = document.createElement('button');
            actionButton.type = 'button';
            actionButton.className = 'chat-error-action';
            actionButton.textContent = actionLabel;
            actionButton.addEventListener('click', onAction);
            messageElement.appendChild(actionButton);
        }

        return appendMessageElement(messageElement);
    }

    function renderConversation(messages, resolveDisplayContent) {
        clearMessages();

        messages.forEach((message) => {
            const displayContent = typeof resolveDisplayContent === 'function'
                ? resolveDisplayContent(message)
                : message.content;

            addMessage(message.role, displayContent, message.meta, {
                messageId: message.id,
                turnId: message.turnId
            });
        });
    }

    function setInputEnabled(enabled) {
        chatInput.disabled = !enabled;
        if (attachBtn && 'disabled' in attachBtn) {
            attachBtn.disabled = !enabled;
        }
        sendBtn.disabled = !enabled;
    }

    function setSessionActionsEnabled(enabled) {
        sessionActionButtons.forEach((button) => {
            if (button && 'disabled' in button) {
                button.disabled = !enabled;
            }
        });
    }

    function setStreamingUI(streaming) {
        if (streaming) {
            stopBtn.style.display = '';
            sendBtn.style.display = 'none';
            setInputEnabled(false);
            setSessionActionsEnabled(false);
            return;
        }

        stopBtn.style.display = 'none';
        sendBtn.style.display = '';
        setInputEnabled(true);
        setSessionActionsEnabled(true);
    }

    function addSystemNotice(text, removeAfterMs = 0) {
        const notice = document.createElement('div');
        notice.className = 'chat-msg system';
        notice.textContent = text;
        messagesEl.appendChild(notice);
        scrollToBottom(false);

        if (removeAfterMs > 0) {
            setTimeout(() => notice.remove(), removeAfterMs);
        }

        return notice;
    }

    function showRetryNotice(attempt, maxRetries, delayMs) {
        const seconds = (delayMs / 1000).toFixed(1);
        addSystemNotice(`Request failed. Retrying in ${seconds}s (${attempt}/${maxRetries})...`, delayMs + 500);
    }

    function showBackupKeyNotice() {
        addSystemNotice('Primary API key failed. Switching to backup key...', 3000);
    }

    return {
        addCopyButtons,
        addErrorMessage,
        addLoadingMessage,
        addMessage,
        addSystemNotice,
        clearMessages,
        createAssistantStreamingMessage,
        finalizeAssistantStreamingMessage,
        renderConversation,
        scrollToBottom,
        setStreamingUI,
        showRetryNotice,
        showBackupKeyNotice,
        updateAssistantStreamingMessage
    };
}
