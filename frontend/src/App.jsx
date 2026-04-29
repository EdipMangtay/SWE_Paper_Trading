// src/App.jsx
// Top-level router. Routes are gated by ProtectedRoute / AdminRoute.

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Navbar         from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login          from './pages/Login.jsx';
import Register       from './pages/Register.jsx';
import Landing        from './pages/Landing.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import Market         from './pages/Market.jsx';
import MarketDetail   from './pages/MarketDetail.jsx';
import Trade          from './pages/Trade.jsx';
import Portfolio      from './pages/Portfolio.jsx';
import Orders         from './pages/Orders.jsx';
import Leaderboard    from './pages/Leaderboard.jsx';
import Profile        from './pages/Profile.jsx';
import Admin          from './pages/Admin.jsx';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

          <Route path="/dashboard"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/market"           element={<Market />} />
          <Route path="/market/:coinId"   element={<MarketDetail />} />
          <Route path="/trade/:coinId"    element={<ProtectedRoute><Trade /></ProtectedRoute>} />
          <Route path="/portfolio"        element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/orders"           element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/leaderboard"      element={<Leaderboard />} />
          <Route path="/profile"          element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin"            element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="border-t border-white/5 py-6 text-center text-white/40 text-sm">
        Paper Trading · Software Architecture · Layered Architecture + REST API
      </footer>
    </div>
  );
}
