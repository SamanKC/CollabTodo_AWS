import { Routes, Route, Link, Navigate } from "react-router-dom";
import LoginCallback from "./pages/LoginCallback";
import Dashboard from "./pages/Dashboard";
import { login, isAuthenticated, logout } from "./lib/auth";

export default function App() {
  const loggedIn = isAuthenticated();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="p-4 border-b bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold">
            Collaborative To-Do
          </Link>
          
        </div>
      </header>
      <main className="p-4">
        <div className="max-w-5xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/callback" element={<LoginCallback />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
