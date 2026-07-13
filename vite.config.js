import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { handleChatApi } from './src/server/chat-api.js';

function chatApiPlugin() {
    return {
        name: 'startpage-chat-api',
        configureServer(server) {
            server.middlewares.use(handleChatApi);
        }
    };
}

export default defineConfig({
    base: './',
    plugins: [react(), chatApiPlugin()],
    build: {
        target: 'es2022'
    }
});
