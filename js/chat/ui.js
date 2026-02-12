function estimateTokenCount(text) {
    const cjkChars = (text.match(/[\u4e00-\u9fff\u3000-\u303f]/g) || []).length;
    const otherChars = text.length - cjkChars;
    return Math.ceil(cjkChars / 1.5 + otherChars / 4);
}

function getConversationTokenCount(messages) {
    return messages.reduce((sum, message) => sum + estimateTokenCount(message.content) + 4, 0);
}

function findLastMessageIndex(messages, role, content) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.role === role && message.content === content) {
            return index;
        }
    }

    return -1;
}

export function createUiManager({
    state,
    elements,
    renderMarkdown,
    maxRenderedMessages,
    maxContextTokens
}) {
    const { messagesEl, chatInput, sendBtn, stopBtn } = elements;

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

    function addMessage(role, text) {
        const message = document.createElement('div');
        message.className = `chat-msg ${role}`;

        if (role === 'assistant' && text) {
            message.innerHTML = renderMarkdown(text);
            addCopyButtons(message);
        } else {
            message.textContent = text;
        }

        if (role === 'user') {
            const retryButton = document.createElement('button');
            retryButton.className = 'msg-retry-btn';
            retryButton.innerHTML = '<i class="fas fa-redo"></i>';
            retryButton.title = 'Retry from this message';

            retryButton.addEventListener('click', () => {
                if (state.isStreaming) return;

                const domMessageIndex = Array.from(messagesEl.children).indexOf(message);
                if (domMessageIndex < 0) return;

                while (messagesEl.children.length > domMessageIndex) {
                    messagesEl.removeChild(messagesEl.lastChild);
                }

                const historyIndex = findLastMessageIndex(state.conversationHistory, 'user', text);
                if (historyIndex !== -1) {
                    state.conversationHistory.splice(historyIndex);
                }

                chatInput.value = text;
                chatInput.style.height = 'auto';
                chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
                chatInput.focus();
            });

            message.appendChild(retryButton);
        }

        messagesEl.appendChild(message);
        pruneOldMessages();
        scrollToBottom(false);
        return message;
    }

    function setInputEnabled(enabled) {
        chatInput.disabled = !enabled;
        sendBtn.disabled = !enabled;
    }

    function setStreamingUI(isStreaming) {
        if (isStreaming) {
            stopBtn.style.display = '';
            sendBtn.style.display = 'none';
            setInputEnabled(false);
            return;
        }

        stopBtn.style.display = 'none';
        sendBtn.style.display = '';
        setInputEnabled(true);
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

    function trimConversationHistory() {
        let trimmed = false;

        while (state.conversationHistory.length > 2 && getConversationTokenCount(state.conversationHistory) > maxContextTokens) {
            state.conversationHistory.shift();
            trimmed = true;
        }

        if (trimmed && !messagesEl.querySelector('.chat-trimmed-notice')) {
            const notice = document.createElement('div');
            notice.className = 'chat-trimmed-notice';
            notice.textContent = 'Older messages were trimmed to fit the model context window.';
            messagesEl.insertBefore(notice, messagesEl.firstChild);
        }
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
        addMessage,
        addSystemNotice,
        scrollToBottom,
        setStreamingUI,
        trimConversationHistory,
        showRetryNotice,
        showBackupKeyNotice
    };
}
