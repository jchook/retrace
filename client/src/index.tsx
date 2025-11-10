import '@mantine/core/styles.css';
import './styles.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'
import { createTheme, MantineProvider } from '@mantine/core';

const theme = createTheme({
  /** Put your mantine theme override here */
});

const rootEl = document.getElementById('root')

if (rootEl) {
  const root = ReactDOM.createRoot(rootEl)
  root.render(
    <React.StrictMode>
      <MantineProvider theme={theme}>
        <App />
      </MantineProvider>
    </React.StrictMode>,
  )
}

// Dev-only: confirm HMR runtime is present in the browser
if (import.meta.env?.DEV) {
  // Rspack/webpack exposes HMR on import.meta.webpackHot
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // biome-ignore lint/suspicious/noConsole: debug helper for dev only
  console.debug("[dev] HMR available:", Boolean((import.meta as any).webpackHot))
}
