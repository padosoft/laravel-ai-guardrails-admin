import React from 'react';
import { createRoot } from 'react-dom/client';
import '../css/panel.css';
import { AiGuardrailsAdminApp } from './App';
import { runtimeConfig } from './config';

const root = document.getElementById('agr-root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AiGuardrailsAdminApp config={runtimeConfig()} />
    </React.StrictMode>,
  );
}

export { AiGuardrailsAdminApp };
export type { AiGuardrailsAdminAppProps, AiGuardrailsAdminRuntimeConfig } from './config';
