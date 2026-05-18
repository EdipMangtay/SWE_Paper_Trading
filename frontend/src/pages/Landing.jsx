// src/pages/Landing.jsx
import { Link } from 'react-router-dom';
import {
  TrendingUp, Wallet, Trophy, Layers, Zap, Shield, ArrowRight
} from 'lucide-react';
import TickerBar from '../components/TickerBar.jsx';

const FEATURES = [
  { icon: TrendingUp, title: 'Real market data',         desc: 'Live crypto prices via Binance — the same source as professional charts.' },
  { icon: Wallet,     title: 'Paper portfolio',          desc: '$100,000 virtual balance. Real strategy, zero financial risk.' },
  { icon: Layers,     title: 'Market & limit orders',    desc: 'Instant fills, or wait for your price with limit orders.' },
  { icon: Trophy,     title: 'Leaderboard',              desc: 'Ranked by portfolio value and return percentage.' },
  { icon: Zap,        title: 'Live P&L',                 desc: 'Mark-to-market profit and loss recomputed every tick.' },
  { icon: Shield,     title: 'Safe to learn',            desc: 'Practice investing without losing a dollar of real money.' }
];

export default function Landing() {
  return (
    <>
      <TickerBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="py-16 sm:py-24 text-center relative">
          <div className="absolute inset-x-0 top-0 -z-10 h-[420px] pointer-events-none"
               style={{ background: 'radial-gradient(ellipse 70% 90% at 50% 0%, rgba(16,185,129,0.18), transparent 60%)' }} />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/10 border border-accent-green/30 text-accent-green text-xs font-mono uppercase tracking-[0.18em] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></span>
            $100,000 paper balance · start in 30 seconds
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-bold leading-[1.05]">
            Trade crypto. <br />
            <span className="shimmer-text">Without risking a cent.</span>
          </h1>

          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto">
            A full exchange experience — TradingView charts, market & limit orders, real-time
            P&L — running on live Binance prices. Sign up, get $100k virtual cash, and prove
            your strategy on the leaderboard.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="btn-primary px-6 py-3 text-base">
              Get started — free <ArrowRight size={16} />
            </Link>
            <Link to="/market" className="btn-ghost px-6 py-3 text-base">
              Explore the market
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-xs font-mono text-white/40">
            <span><span className="text-accent-green">●</span> Live data</span>
            <span><span className="text-accent-blue">●</span> No card needed</span>
            <span><span className="text-accent-gold">●</span> Open-source</span>
          </div>
        </section>

        {/* Feature grid */}
        <section className="py-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card p-6 transition hover:border-accent-green/30 hover:bg-ink-800/85 card-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-10 h-10 rounded-lg bg-accent-green/10 grid place-items-center mb-4 ring-1 ring-accent-green/20">
                <f.icon size={18} className="text-accent-green" />
              </div>
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="text-white/55 text-sm mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Footer CTA */}
        <section className="py-16 text-center">
          <div className="card p-10 relative overflow-hidden card-in">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-green/10 via-transparent to-accent-blue/10 pointer-events-none" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-4xl font-bold">
                Open an account. Place your first order.
              </h2>
              <p className="mt-2 text-white/55">
                Sign up in under a minute and start trading right away.
              </p>
              <Link to="/register" className="btn-primary mt-6 px-6 py-3 text-base">
                Free registration <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
