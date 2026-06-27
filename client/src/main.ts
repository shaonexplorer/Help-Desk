import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { QueryProvider } from './lib/query-client';
import './style.css';

const rootEl = document.getElementById('app');
if (!rootEl) throw new Error('Root element #app not found');

createRoot(rootEl).render(
  React.createElement(
    StrictMode,
    null,
    React.createElement(QueryProvider, null, React.createElement(App, null))
  )
);
