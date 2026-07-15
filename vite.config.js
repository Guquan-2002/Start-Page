import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { handleChatApi } from './src/server/chat-api.js';

export default defineConfig({
    base: './',
    plugins: [
        react(),
        {
        name: 'startpage-chat-api',
        configureServer(server) {
            server.middlewares.use(handleChatApi);
        }
        }
    ],
    build: {
        target: 'es2022'
    }
});
