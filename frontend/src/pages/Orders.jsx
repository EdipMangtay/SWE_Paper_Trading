// src/pages/Orders.jsx
import { useEffect, useState } from 'react';
import { ListOrdered, X } from 'lucide-react';
import { orderApi } from '../services/api';
import { Spinner, EmptyState, ErrorBox } from '../components/Loading.jsx';
import { fmtUSD, fmtNum } from '../components/format.js';

const STATUS_PILL = {
  PENDING:   'pill-gold',
  FILLED:    'pill-green',
  CANCELLED: 'pill-red',
  EXPIRED:   'pill-mute'
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await orderApi.list(filter || undefined);
      setOrders(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function handleCancel(id) {
    if (!confirm('Cancel this order?')) return;
    try {
      await orderApi.cancel(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Cancel failed');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="text-white/60 text-sm mt-1">All active and past orders</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['', 'PENDING', 'FILLED', 'CANCELLED', 'EXPIRED'].map((f) => (
            <button
              key={f || 'ALL'}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition ${
                filter === f ? 'bg-accent-green text-ink-900' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {f || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {loading ? <Spinner /> : (
        <div className="card overflow-hidden">
          {orders.length === 0 ? (
            <EmptyState icon={ListOrdered} title="No orders yet" hint="Your trades will show up here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50 font-mono">
                  <tr>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Asset</th>
                    <th className="text-right px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Side</th>
                    <th className="text-right px-4 py-3">Qty</th>
                    <th className="text-right px-4 py-3">Price</th>
                    <th className="text-right px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((o) => (
                    <tr key={o._id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white/60 font-mono text-xs">
                        {new Date(o.createdAt).toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.name}</div>
                        <div className="text-xs text-white/40 font-mono">{o.symbol}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="pill-mute">{o.type}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={o.side === 'BUY' ? 'pill-green' : 'pill-red'}>{o.side}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{fmtNum(o.quantity, 8)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {fmtUSD(o.executedPrice || o.price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={STATUS_PILL[o.status] || 'pill-mute'}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === 'PENDING' && (
                          <button onClick={() => handleCancel(o._id)} className="btn-ghost text-xs">
                            <X size={12} className="mr-1" /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
