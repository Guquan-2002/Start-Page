/**
 * API manager message submitter.
 *
 * Responsibility:
 * - Validate user input/config before sending
 * - Build user messages with prefix/timestamp/image parts
 * - Append user messages and trigger assistant response generation
 */
import { createChatMessage, createTurnId } from '../core/message-model.js';
import { applyMessagePrefix, buildNamePrefix, buildTimestampPrefix } from '../core/prefix.js';
import { getProviderLabel } from '../providers/provider-registry.js';
import { formatAttachmentNotice } from './attachment-manager.js';

export function createMessageSubmitter({
    store,
    ui,
    configManager,
    chatInput,
    openSettings,
    attachments,
    generateAssistantResponse,
    onUserMessageAccepted
}) {
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (store.isStreaming()) {
            return;
        }

        const pendingImageParts = attachments.getPendingImageParts();
        const hasImages = pendingImageParts.length > 0;
        if (!text && !hasImages) {
            return;
        }

        const config = configManager.getConfig();
        const providerLabel = getProviderLabel(config.provider);

        if (!config.apiKey && !config.backupApiKey) {
            ui.addMessage('error', `Please set at least one ${providerLabel} API key in settings.`);
            openSettings();
            return;
        }

        if (!config.model) {
            ui.addMessage('error', `Please set a ${providerLabel} model name in settings.`);
            openSettings();
            return;
        }

        onUserMessageAccepted();

        const turnId = createTurnId();

        const timestampPrefix = buildTimestampPrefix(config, Date.now());
        const userNamePrefix = buildNamePrefix(config);
        const userContextText = text
            ? applyMessagePrefix(text, userNamePrefix)
            : (userNamePrefix || '');
        const parts = [];
        if (text) {
            parts.push({
                type: 'text',
                text: userContextText
            });
        }
        if (!text && hasImages && userContextText) {
            parts.push({
                type: 'text',
                text: userContextText
            });
        }
        if (hasImages) {
            parts.push(...pendingImageParts);
        }
        const contentFallback = text || (hasImages ? '[图片]' : '');
        const displayContent = text
            ? userContextText
            : (
                userContextText
                    ? applyMessagePrefix(formatAttachmentNotice(pendingImageParts.length), userContextText)
                    : formatAttachmentNotice(pendingImageParts.length)
            );

        const messagesToAppend = [];

        if (timestampPrefix) {
            messagesToAppend.push(createChatMessage({
                role: 'user',
                content: timestampPrefix,
                turnId,
                metaOptions: {
                    displayContent: timestampPrefix,
                    contextContent: timestampPrefix,
                    displayRole: 'system',
                    isPrefixMessage: true
                }
            }));
        }

        messagesToAppend.push(createChatMessage({
            role: 'user',
            content: contentFallback,
            turnId,
            metaOptions: {
                displayContent,
                contextContent: userContextText || contentFallback,
                parts
            }
        }));

        store.appendMessages(messagesToAppend);
        ui.appendChatMessages(messagesToAppend);

        chatInput.value = '';
        attachments.clearPendingImages();
        ui.resizeInput();

        await generateAssistantResponse(config, turnId, text);
    }

    return {
        sendMessage
    };
}
