import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../index.css';

// Suppress localhost:5000 connection errors from wallet extensions
// These are false alarms - wallets work fine but try to connect to local dev server
const originalError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  // Suppress localhost:5000 fetch errors from wallet extensions
  if (message.includes('localhost:5000') ||
      message.includes('ERR_CONNECTION_REFUSED') ||
      (message.includes('Failed to fetch') && args[0]?.stack?.includes('inpage.js'))) {
    return; // Suppress these specific errors
  }
  originalError.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
