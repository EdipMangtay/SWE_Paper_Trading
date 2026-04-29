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
          Sanal $100.000 ile başlayın
        </div>
        <h1 className="font-display text-5xl sm:text-7xl font-bold leading-tight">
          Risksiz <span className="text-accent-green">trading</span>.
          <br />
          Gerçek <span className="text-accent-blue">piyasa</span> verisi.
        </h1>
        <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto">
          Gerçek zamanlı kripto fiyatlarıyla portföy oluşturun, market ve limit emirleri verin,
          stratejilerinizi liderlik tablosunda kanıtlayın.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="btn-primary">Hemen başla — ücretsiz</Link>
          <Link to="/market" className="btn-ghost">Piyasayı keşfet →</Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, title: 'Gerçek piyasa verisi', desc: 'CoinGecko entegrasyonu ile saniyelik kripto fiyatları' },
          { icon: Wallet,     title: 'Sanal portföy',         desc: '$100.000 sanal bakiye, gerçek strateji' },
          { icon: Layers,     title: 'Market & Limit emir',   desc: 'Anlık alım veya hedef fiyatta otomatik tetikleme' },
          { icon: Trophy,     title: 'Liderlik tablosu',      desc: 'Portföy değeri ve kâr yüzdesine göre sıralama' },
          { icon: Zap,        title: 'Anında geri bildirim',  desc: 'Her işlem sonrası kâr/zarar mark-to-market' },
          { icon: Shield,     title: 'Sıfır risk',            desc: 'Hiç gerçek para kullanmadan yatırım deneyimi' }
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
          <h2 className="font-display text-3xl font-bold">Hesap aç, ilk emrini ver.</h2>
          <p className="mt-2 text-white/60">Kayıt 30 saniye sürer. Anında trading.</p>
          <Link to="/register" className="btn-primary mt-6">Ücretsiz Kayıt</Link>
        </div>
      </section>
    </div>
  );
}
