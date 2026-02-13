function normalizeProviderId(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function createProviderRouter(providers = []) {
    const providerMap = new Map();

    for (const provider of providers) {
        if (!provider || typeof provider.id !== 'string') {
            continue;
        }

        const providerId = normalizeProviderId(provider.id);
        if (!providerId) {
            continue;
        }

        providerMap.set(providerId, provider);
    }

    if (providerMap.size === 0) {
        throw new Error('At least one provider is required.');
    }

    function resolveProvider(config) {
        const configuredProviderId = normalizeProviderId(config?.provider);
        if (configuredProviderId && providerMap.has(configuredProviderId)) {
            return providerMap.get(configuredProviderId);
        }

        if (providerMap.has('gemini')) {
            return providerMap.get('gemini');
        }

        return providerMap.values().next().value;
    }

    return {
        id: 'provider-router',
        getSupportedProviderIds() {
            return Array.from(providerMap.keys());
        },
        async generate(params) {
            const provider = resolveProvider(params?.config);
            return provider.generate(params);
        },
        async *generateStream(params) {
            const provider = resolveProvider(params?.config);
            if (typeof provider.generateStream !== 'function') {
                throw new Error(`Provider "${provider.id}" does not support streaming.`);
            }

            yield* provider.generateStream(params);
        }
    };
}
