import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { handleProviderApi } from './src/assistant/server/provider-api.js';
import { handleSystemStatusApi } from './src/dashboard/server/systemStatusApi.js';

export default defineConfig({
    base: './',
    plugins: [
        react(),
        {
            name: 'startpage-api',
            configureServer(server) {
                server.middlewares.use(handleSystemStatusApi);
                server.middlewares.use(handleProviderApi);
            }
        }
    ],
    build: {
        target: 'es2022'
    }
});
