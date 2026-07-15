import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { handleProviderApi } from './src/assistant/server/provider-api.js';
import { handleNetworkStatusApi } from './src/dashboard/server/network-status-api.js';

export default defineConfig({
    base: './',
    plugins: [
        react(),
        {
            name: 'startpage-api',
            configureServer(server) {
                server.middlewares.use(handleNetworkStatusApi);
                server.middlewares.use(handleProviderApi);
            }
        }
    ],
    build: {
        target: 'es2022'
    }
});
