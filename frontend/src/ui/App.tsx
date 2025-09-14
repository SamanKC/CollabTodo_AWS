import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <header style={{ padding: 8, background: '#e6f0ff' }}>
        <b>Collab To-Do</b>
        <nav style={{ float: 'right' }}>
          <Link to="/">Home</Link>
        </nav>
      </header>
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
