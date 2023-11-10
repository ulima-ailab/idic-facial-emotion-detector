import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import SimpleLogin from './views/SimpleLogin';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SimpleLogin/>
  </React.StrictMode>
);
