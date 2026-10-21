import React from 'react';
import { createRoot } from 'react-dom/client';
import { Page } from './app/page';
import './app/globals.css';

const el = document.getElementById('root');
if (!el) throw new Error('#root element not found in index.html');

createRoot(el).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);
