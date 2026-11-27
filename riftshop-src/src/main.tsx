import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startLoop } from './store';
import './styles.css';

startLoop();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
