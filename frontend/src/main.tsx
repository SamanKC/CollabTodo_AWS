import React from 'react';
import { createRoot } from 'react-dom/client';

const App = () => <div>Frontend scaffold</div>;

const el = document.getElementById('root')!;
createRoot(el).render(<App />);
