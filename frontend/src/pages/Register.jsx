// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBox } from '../components/Loading.jsx';

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await register(form.email, form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.errors?.map((x) => `${x.field}: ${x.msg}`).join(', ');
      setError(detail || data?.message || 'Registration failed');
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] grid place-items-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="font-display text-3xl font-bold mb-2">Create account</h1>
        <p className="text-white/60 text-sm mb-6">Start fresh with $100,000 in paper balance.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              required
              minLength={3}
              maxLength={30}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="trader_42"
            />
          </div>

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
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="label">Confirm password</label>
            <input
              type="password"
              className="input"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center text-white/60 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-green hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
