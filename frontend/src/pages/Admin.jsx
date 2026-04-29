// src/pages/Admin.jsx
import { useEffect, useState } from 'react';
import { Users, BarChart3, ListOrdered, DollarSign, Shield, ShieldOff } from 'lucide-react';
import { adminApi } from '../services/api';
import { Spinner } from '../components/Loading.jsx';
import { fmtUSD } from '../components/format.js';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([adminApi.stats(), adminApi.users()]);
      setStats(s);
      setUsers(u);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(id, current) {
    await adminApi.toggleActive(id, !current);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          Admin Paneli <span className="pill-gold">ADMIN</span>
        </h1>
        <p className="text-white/60 text-sm mt-1">Kullanıcılar, istatistikler ve sistem sağlığı</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users}        label="Kullanıcı"     value={stats?.users ?? 0} />
        <Kpi icon={ListOrdered}  label="Emir"          value={stats?.orders ?? 0} />
        <Kpi icon={BarChart3}    label="İşlem"         value={stats?.transactions ?? 0} />
        <Kpi icon={DollarSign}   label="Toplam Hacim"  value={fmtUSD(stats?.totalVolume ?? 0, { digits: 0 })} />
      </div>

      {/* Users */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Users size={16} className="text-accent-blue" />
          <h2 className="font-display text-lg font-semibold">Kullanıcılar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50 font-mono">
              <tr>
                <th className="text-left px-4 py-3">Kullanıcı Adı</th>
                <th className="text-left px-4 py-3">E-posta</th>
                <th className="text-right px-4 py-3">Rol</th>
                <th className="text-right px-4 py-3">Bakiye</th>
                <th className="text-right px-4 py-3">Durum</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-white/60">{u.email}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={u.role === 'admin' ? 'pill-gold' : 'pill-mute'}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmtUSD(u.cashBalance)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={u.isActive ? 'pill-green' : 'pill-red'}>
                      {u.isActive ? 'AKTİF' : 'PASİF'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(u._id, u.isActive)}
                      className="btn-ghost text-xs"
                      title={u.isActive ? 'Devre dışı bırak' : 'Aktifleştir'}
                    >
                      {u.isActive ? <><ShieldOff size={12} className="mr-1" /> Devre dışı</> : <><Shield size={12} className="mr-1" /> Aktifleştir</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-white/50 font-mono">{label}</span>
        <Icon size={16} className="text-white/30" />
      </div>
      <div className="font-display text-2xl font-bold font-mono">{value}</div>
    </div>
  );
}
