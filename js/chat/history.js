const DEFAULT_SESSION_TITLE = 'New chat';

function buildSessionTitle(messages) {
    const firstUserMessage = messages.find((message) => message.role === 'user');
    if (!firstUserMessage) return DEFAULT_SESSION_TITLE;

    const plainText = firstUserMessage.content.trim();
    if (!plainText) return DEFAULT_SESSION_TITLE;

    return plainText.length > 30 ? `${plainText.slice(0, 30)}...` : plainText;
}

export function createHistoryManager({
    state,
    elements,
    addMessage,
    historyKey
}) {
    const { messagesEl, historyDiv, historyList } = elements;

    function loadChatHistory() {
        try {
            const rawHistory = localStorage.getItem(historyKey);
            if (rawHistory) {
                state.chatSessions = JSON.parse(rawHistory);
            }
        } catch {
            state.chatSessions = {};
        }
    }

    function saveChatHistory() {
        try {
            localStorage.setItem(historyKey, JSON.stringify(state.chatSessions));
        } catch {
            // Ignore storage failures.
        }
    }

    function createNewSession() {
        const sessionId = Date.now().toString();
        state.currentSessionId = sessionId;
        state.conversationHistory = [];

        state.chatSessions[sessionId] = {
            title: DEFAULT_SESSION_TITLE,
            messages: [],
            timestamp: Date.now()
        };

        saveChatHistory();
        messagesEl.innerHTML = '';
        return sessionId;
    }

    function saveCurrentSession() {
        if (!state.currentSessionId) return;

        state.chatSessions[state.currentSessionId] = {
            title: buildSessionTitle(state.conversationHistory),
            messages: [...state.conversationHistory],
            timestamp: Date.now()
        };

        saveChatHistory();
    }

    function loadSession(sessionId) {
        const session = state.chatSessions[sessionId];
        if (!session) return;

        state.currentSessionId = sessionId;
        state.conversationHistory = [...session.messages];

        messagesEl.innerHTML = '';
        state.conversationHistory.forEach((message) => {
            addMessage(message.role, message.content);
        });
    }

    function deleteSession(sessionId) {
        delete state.chatSessions[sessionId];
        saveChatHistory();

        if (state.currentSessionId === sessionId) {
            createNewSession();
        }

        renderHistoryList();
    }

    function clearAllSessions() {
        if (Object.keys(state.chatSessions).length === 0) return;

        const confirmed = confirm('Delete all chat sessions? This action cannot be undone.');
        if (!confirmed) return;

        state.chatSessions = {};
        saveChatHistory();
        createNewSession();
        renderHistoryList();
    }

    function editSessionTitle(sessionId, nextTitle) {
        const session = state.chatSessions[sessionId];
        if (!session) return;

        session.title = nextTitle.trim() || DEFAULT_SESSION_TITLE;
        session.timestamp = Date.now();
        saveChatHistory();
        renderHistoryList();
    }

    function renderHistoryList() {
        historyList.innerHTML = '';

        const sortedSessions = Object.entries(state.chatSessions)
            .sort(([, sessionA], [, sessionB]) => sessionB.timestamp - sessionA.timestamp);

        sortedSessions.forEach(([sessionId, session]) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            if (sessionId === state.currentSessionId) {
                item.classList.add('active');
            }

            const title = document.createElement('span');
            title.className = 'history-item-title';
            title.textContent = session.title;
            title.addEventListener('click', () => {
                loadSession(sessionId);
                historyDiv.classList.add('chat-history-hidden');
                renderHistoryList();
            });

            const actions = document.createElement('div');
            actions.className = 'history-item-actions';

            const editButton = document.createElement('button');
            editButton.className = 'history-item-edit';
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.title = 'Rename';
            editButton.addEventListener('click', (event) => {
                event.stopPropagation();

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'history-item-title-input';
                input.value = session.title;

                item.replaceChild(input, title);
                actions.style.display = 'none';
                input.focus();
                input.select();

                const saveEdit = () => {
                    const trimmedTitle = input.value.trim();
                    if (trimmedTitle && trimmedTitle !== session.title) {
                        editSessionTitle(sessionId, trimmedTitle);
                    } else {
                        renderHistoryList();
                    }
                };

                input.addEventListener('blur', saveEdit);
                input.addEventListener('keydown', (keyEvent) => {
                    if (keyEvent.key === 'Enter') {
                        saveEdit();
                    } else if (keyEvent.key === 'Escape') {
                        renderHistoryList();
                    }
                });
            });

            const deleteButton = document.createElement('button');
            deleteButton.className = 'history-item-delete';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.title = 'Delete';
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const confirmed = confirm('Delete this chat session?');
                if (confirmed) {
                    deleteSession(sessionId);
                }
            });

            actions.append(editButton, deleteButton);
            item.append(title, actions);
            historyList.appendChild(item);
        });
    }

    return {
        loadChatHistory,
        saveChatHistory,
        createNewSession,
        saveCurrentSession,
        loadSession,
        clearAllSessions,
        renderHistoryList
    };
}
