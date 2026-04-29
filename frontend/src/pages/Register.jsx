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
      setError('Şifreler eşleşmiyor');
      return;
    }
    if (form.password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    try {
      await register(form.email, form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.errors?.map((x) => `${x.field}: ${x.msg}`).join(', ');
      setError(detail || data?.message || 'Kayıt başarısız');
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] grid place-items-center px-4">
      <div className="card p-8 w-full max-w-md">
        <h1 className="font-display text-3xl font-bold mb-2">Hesap oluştur</h1>
        <p className="text-white/60 text-sm mb-6">Sıfırdan başla, $100.000 sanal bakiyeyi al.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Kullanıcı adı</label>
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
            <label className="label">E-posta</label>
            <input
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="label">Şifre</label>
            <input
              type="password"
              className="input"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="En az 6 karakter"
            />
          </div>

          <div>
            <label className="label">Şifre (tekrar)</label>
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
            {loading ? 'Oluşturuluyor…' : 'Hesabı oluştur'}
          </button>
        </form>

        <div className="mt-6 text-center text-white/60 text-sm">
          Zaten hesabın var mı?{' '}
          <Link to="/login" className="text-accent-green hover:underline">Giriş yap</Link>
        </div>
      </div>
    </div>
  );
}
