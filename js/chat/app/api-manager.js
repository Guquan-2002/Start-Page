/**
 * Chat API manager entry.
 *
 * Responsibility:
 * - Wire provider/store/ui/config dependencies
 * - Compose message submitter, attachment handling, and assistant response flow
 * - Keep public API stable: createApiManager -> { sendMessage, stopGeneration }
 */
import { createAssistantResponseManager } from './assistant-response.js';
import { createMessageSubmitter } from './message-submitter.js';
import { createAttachmentManager } from './attachment-manager.js';

export function createApiManager({
    store,
    elements,
    ui,
    configManager,
    provider,
    constants,
    openSettings,
    onUserMessageAccepted
}) {
    const { chatInput } = elements;

    const attachmentManager = createAttachmentManager({
        elements,
        ui
    });
    const assistantResponseManager = createAssistantResponseManager({
        store,
        ui,
        providerClient: provider,
        constants,
        chatInput
    });
    const messageSubmitter = createMessageSubmitter({
        store,
        ui,
        configManager,
        chatInput,
        openSettings,
        attachments: attachmentManager,
        generateAssistantResponse: assistantResponseManager.generateAssistantResponse,
        onUserMessageAccepted
    });

    function stopGeneration() {
        store.requestAbort('user');
    }

    return {
        sendMessage: messageSubmitter.sendMessage,
        stopGeneration
    };
}
