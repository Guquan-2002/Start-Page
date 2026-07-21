import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { handleProviderApi } from './src/assistant/server/provider-api.js';
import { handleDashboardApi } from './src/server/dashboard/dashboard.js';

export default defineConfig({
    base: './',
    plugins: [
        react(),
        {
            name: 'startpage-api',
            configureServer(server) {
                server.middlewares.use(handleDashboardApi);
                server.middlewares.use(handleProviderApi);
            }
        }
    ],
    build: {
        target: 'es2022'
    }
});
