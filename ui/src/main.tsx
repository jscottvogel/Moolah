import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ConfigureAmplify from './components/ConfigureAmplify';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ConfigureAmplify />
        <App />
    </React.StrictMode>
);
