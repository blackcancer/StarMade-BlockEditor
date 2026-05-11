/**
 * @fileoverview Application entry point.
 *
 * Bootstraps the React application into the `#root` DOM node.
 * React.StrictMode is enabled to surface potential issues during development
 * (double-invoked effects, deprecated API usage, etc.).
 *
 * The global stylesheet is imported here so Vite bundles it with the entry chunk.
 *
 * @author InitSysRev
 * @version 1.0.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './style.css';

// Mount the React tree into the div#root defined in index.html.
// The `!` non-null assertion is safe because index.html always provides #root.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
