import { useState } from 'react';
import './WeatherConfig.css';

export function WeatherConfig({ onClose }) {
    const [key, setKey] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        onClose(key);
    };

    return (
        <div className="weather-config-overlay" onClick={() => onClose(key)}>
            <form
                className="weather-config-dialog"
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <h3 className="weather-config-title">心知天气 API Key配置</h3>
                <p className="weather-config-hint">
                    S……
                </p>
                <input
                    className="weather-config-input"
                    type="text"
                    value={key}
                    onChange={(event) => setKey(event.target.value)}
                    placeholder="API Key"
                    autoFocus
                />
                <button type="submit" className="weather-config-save" disabled={!key}>
                    保存
                </button>
            </form>
        </div>
    );
}
