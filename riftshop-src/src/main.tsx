import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { act, startLoop, useStore } from './store';
import { advance } from './game/sim';
import './styles.css';

startLoop();
if (new URLSearchParams(location.search).has('debug')) {
  // Test hooks for browser checks.
  const w = window as unknown as Record<string, unknown>;
  w.__store = useStore;
  w.__advance = (hours: number) => act((g) => advance(g, hours));
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
