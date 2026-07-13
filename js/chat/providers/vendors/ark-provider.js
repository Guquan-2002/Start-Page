import { buildArkResponsesRequest } from '../adapters/ark-responses.js';
import { CHAT_PROVIDER_IDS } from '../provider-registry.js';
import { createOpenAiCompatibleProvider } from './openai-provider.js';

export function createArkProvider(options = {}) {
    return createOpenAiCompatibleProvider({
        ...options,
        providerId: CHAT_PROVIDER_IDS.arkResponses,
        buildRequest: buildArkResponsesRequest,
        responsesApi: true
    });
}
