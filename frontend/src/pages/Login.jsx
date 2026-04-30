// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Loading.jsx';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed');
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] grid place-items-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="font-display text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-white/60 text-sm mb-6">Sign in to access your paper portfolio.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center text-white/60 text-sm">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-accent-green hover:underline">Register</Link>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 text-xs text-white/40 font-mono">
          Demo: <span className="text-white/60">alice@example.com / alice123</span>
        </div>
      </div>
    </div>
  );
}
