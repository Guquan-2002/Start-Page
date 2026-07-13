import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import '../css/variables.css';
import '../css/base.css';
import '../css/animations.css';
import '../css/components.css';
import '../css/chat.css';
import '../css/mobile.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Missing React root element.');
}

createRoot(rootElement).render(
    <StrictMode>
        <App />
    </StrictMode>
);
