// src/pages/Landing.jsx
import { Link } from 'react-router-dom';
import { TrendingUp, Wallet, Trophy, Layers, Zap, Shield } from 'lucide-react';

export default function Landing() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      {/* Hero */}
      <section className="py-16 sm:py-24 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/10 border border-accent-green/30 text-accent-green text-xs font-mono uppercase tracking-wider mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></span>
          Start with $100,000 paper money
        </div>
        <h1 className="font-display text-5xl sm:text-7xl font-bold leading-tight">
          Risk-free <span className="text-accent-green">trading</span>.
          <br />
          Real <span className="text-accent-blue">market</span> data.
        </h1>
        <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto">
          Build a portfolio with live crypto prices, place market and limit orders,
          and prove your strategies on the leaderboard.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="btn-primary">Get started — free</Link>
          <Link to="/market" className="btn-ghost">Explore the market →</Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, title: 'Real market data', desc: 'CoinGecko integration with up-to-date crypto prices' },
          { icon: Wallet,     title: 'Paper portfolio',   desc: '$100,000 virtual balance, real strategy' },
          { icon: Layers,     title: 'Market & limit orders', desc: 'Instant fills or automatic execution at your price' },
          { icon: Trophy,     title: 'Leaderboard',      desc: 'Ranked by portfolio value and return percentage' },
          { icon: Zap,        title: 'Instant feedback', desc: 'Mark-to-market P&L after every trade' },
          { icon: Shield,     title: 'Zero risk',        desc: 'Practice investing without real money' }
        ].map((f, i) => (
          <div key={i} className="card p-6 hover:border-accent-green/30 transition">
            <div className="w-10 h-10 rounded-lg bg-accent-green/10 grid place-items-center mb-4">
              <f.icon size={18} className="text-accent-green" />
            </div>
            <h3 className="font-display font-semibold text-lg">{f.title}</h3>
            <p className="text-white/60 text-sm mt-1">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section className="py-16 text-center">
        <div className="card p-10">
          <h2 className="font-display text-3xl font-bold">Open an account, place your first order.</h2>
          <p className="mt-2 text-white/60">Sign up in under a minute. Start trading right away.</p>
          <Link to="/register" className="btn-primary mt-6">Free registration</Link>
        </div>
      </section>
    </div>
  );
}
