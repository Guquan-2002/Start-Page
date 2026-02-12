/**
 * Returns whether an HTTP status code should trigger retry logic.
 */
function shouldRetryStatus(statusCode) {
    return statusCode === 401 || statusCode === 403 || statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

/**
 * Trims and normalizes API URL by removing trailing slashes.
 */
function normalizeApiUrl(apiUrl) {
    const trimmed = (apiUrl || '').trim().replace(/\/+$/, '');
    return trimmed || null;
}

/**
 * Extracts plain text content from Gemini response parts.
 */
function parseGeminiText(responseData) {
    const parts = responseData?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return '';

    return parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('');
}

/**
 * Collects unique web sources from Gemini grounding metadata.
 */
function collectGroundingLinks(responseData) {
    const chunks = responseData?.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!Array.isArray(chunks)) return [];

    const unique = new Map();
    chunks.forEach((chunk) => {
        const web = chunk?.web;
        const uri = web?.uri || web?.url;
        if (!uri || unique.has(uri)) return;

        unique.set(uri, {
            title: web?.title || uri,
            uri
        });
    });

    return Array.from(unique.values());
}

/**
 * Converts grounding links into markdown list appended to assistant output.
 */
function buildGroundingMarkdown(responseData) {
    const links = collectGroundingLinks(responseData);
    if (!links.length) return '';

    const list = links
        .map((link, index) => `${index + 1}. [${link.title}](${link.uri})`)
        .join('\n');

    return `\n\n---\n**Sources**\n${list}`;
}

/**
 * Builds Gemini request payload from chat history and runtime config.
 */
function buildGeminiRequestBody(conversationHistory, config) {
    const body = {
        contents: conversationHistory
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .map((message) => ({
                role: message.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: message.content }]
            }))
    };

    if (config.systemPrompt) {
        body.systemInstruction = {
            parts: [{ text: config.systemPrompt }]
        };
    }

    if (config.searchMode === 'gemini_google_search') {
        body.tools = [{ google_search: {} }];
    }

    if (Number.isFinite(config.thinkingBudget) && config.thinkingBudget > 0) {
        body.generationConfig = {
            thinkingConfig: {
                thinkingBudget: config.thinkingBudget
            }
        };
    }

    return body;
}

/**
 * Reads error details from Gemini response, preferring structured JSON message.
 */
async function readErrorDetails(response) {
    try {
        const errorPayload = await response.json();
        if (errorPayload?.error?.message) {
            return errorPayload.error.message;
        }

        return JSON.stringify(errorPayload);
    } catch {
        try {
            return await response.text();
        } catch {
            return 'Unknown Gemini API error';
        }
    }
}

export function createApiManager({
    state,
    elements,
    ui,
    configManager,
    historyManager,
    constants,
    renderMarkdown,
    escapeHtml
}) {
    const { chatInput, settingsDiv } = elements;
    const { connectTimeoutMs, maxRetries } = constants;

    /**
     * Executes fetch with exponential backoff retry for retryable failures.
     */
    async function fetchWithRetry(url, options) {
        let lastError = null;

        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            try {
                const response = await fetch(url, options);
                if (shouldRetryStatus(response.status) && attempt < maxRetries) {
                    const delayMs = Math.min(1000 * (2 ** attempt), 8000);
                    ui.showRetryNotice(attempt + 1, maxRetries, delayMs);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                    continue;
                }

                return response;
            } catch (error) {
                lastError = error;

                if (error.name === 'AbortError') {
                    throw error;
                }

                if (attempt >= maxRetries) {
                    throw error;
                }

                const delayMs = Math.min(1000 * (2 ** attempt), 8000);
                ui.showRetryNotice(attempt + 1, maxRetries, delayMs);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        throw lastError || new Error('Request failed after retries');
    }

    /**
     * Sends request to Gemini with primary key, then automatically falls back
     * to backup key when available.
     */
    async function requestGeminiWithFallbackKeys(config, requestBody) {
        const baseUrl = normalizeApiUrl(config.apiUrl);
        if (!baseUrl) {
            throw new Error('Gemini API URL is required.');
        }

        if (!config.model) {
            throw new Error('Gemini model is required.');
        }

        const endpoint = `${baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;
        const apiKeys = [config.apiKey, config.backupApiKey]
            .map((key) => key.trim())
            .filter(Boolean);

        if (!apiKeys.length) {
            throw new Error('At least one API key is required.');
        }

        const hasBackupKey = apiKeys.length > 1;
        let lastError = null;

        for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
            const apiKey = apiKeys[keyIndex];

            try {
                const response = await fetchWithRetry(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    body: JSON.stringify(requestBody),
                    signal: state.abortController.signal
                });

                if (response.ok) {
                    return response.json();
                }

                const details = await readErrorDetails(response);
                lastError = new Error(`HTTP ${response.status}: ${details}`);

                if (keyIndex === 0 && hasBackupKey) {
                    ui.showBackupKeyNotice();
                    continue;
                }

                throw lastError;
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw error;
                }

                lastError = error;
                if (keyIndex === 0 && hasBackupKey) {
                    ui.showBackupKeyNotice();
                    continue;
                }

                throw error;
            }
        }

        throw lastError || new Error('Gemini request failed');
    }

    /**
     * Handles a full assistant generation cycle:
     * 1) update UI/loading state
     * 2) request Gemini response
     * 3) persist successful output
     * 4) map abort/errors to user-facing messages
     */
    async function generateAssistantResponse(config) {
        ui.trimConversationHistory();

        const assistantMessage = ui.addMessage('assistant', '');
        assistantMessage.innerHTML = '<span class="chat-loading"><span></span><span></span><span></span></span>';
        assistantMessage.classList.add('typing');

        state.isStreaming = true;
        state.abortReason = '';
        state.abortController = new AbortController();
        ui.setStreamingUI(true);

        let fullResponse = '';
        const timeoutId = setTimeout(() => {
            if (!state.isStreaming) return;
            state.abortReason = 'connect_timeout';
            state.abortController.abort();
        }, connectTimeoutMs);

        try {
            const requestBody = buildGeminiRequestBody(state.conversationHistory, config);
            const responseData = await requestGeminiWithFallbackKeys(config, requestBody);

            fullResponse = `${parseGeminiText(responseData)}${buildGroundingMarkdown(responseData)}`;
            if (!fullResponse.trim()) {
                fullResponse = '(No response text)';
            }

            assistantMessage.classList.remove('typing');
            assistantMessage.innerHTML = renderMarkdown(fullResponse);
            ui.addCopyButtons(assistantMessage);
            ui.scrollToBottom();

            state.conversationHistory.push({ role: 'assistant', content: fullResponse });
            historyManager.saveCurrentSession();
        } catch (error) {
            if (error.name === 'AbortError') {
                if (state.abortReason === 'connect_timeout' && !fullResponse) {
                    assistantMessage.className = 'chat-msg error';
                    assistantMessage.innerHTML = 'Connection timeout<br><small>Check network status and Gemini API URL.</small>';
                } else if (state.abortReason === 'user') {
                    assistantMessage.remove();
                    ui.addSystemNotice('Generation stopped by user.');
                }
            } else {
                assistantMessage.className = 'chat-msg error';
                const message = error?.message || 'Unknown error';
                assistantMessage.innerHTML = `Request failed<br><small>${escapeHtml(message)}</small>`;
            }
        } finally {
            clearTimeout(timeoutId);
            assistantMessage.classList.remove('typing');
            state.isStreaming = false;
            state.abortController = null;
            state.abortReason = '';
            ui.setStreamingUI(false);
            chatInput.focus();
        }
    }

    /**
     * Validates user input + config, saves user message, and triggers generation.
     */
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || state.isStreaming) return;

        const config = configManager.getConfig();

        if (!config.apiKey && !config.backupApiKey) {
            ui.addMessage('error', 'Please set at least one Gemini API key in settings.');
            settingsDiv.classList.remove('chat-settings-hidden');
            return;
        }

        if (!config.model) {
            ui.addMessage('error', 'Please set a Gemini model name in settings.');
            settingsDiv.classList.remove('chat-settings-hidden');
            return;
        }

        state.conversationHistory.push({ role: 'user', content: text });
        ui.addMessage('user', text);
        historyManager.saveCurrentSession();

        chatInput.value = '';
        chatInput.style.height = 'auto';

        await generateAssistantResponse(config);
    }

    return {
        sendMessage
    };
}
