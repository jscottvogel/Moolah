import Link from 'next/link';
import { ArrowRight, TrendingUp, ShieldCheck, PieChart, BarChart3, Lock, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 rounded-full blur-[120px]" />
      </div>

      <header className="fixed w-full z-50 glass border-b border-white/5">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white">M</div>
            <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
              Moolah
            </div>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#methodology" className="hover:text-white transition-colors">Methodology</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Log In</Link>
            <Link href="/login?screen=signup" className="px-5 py-2 text-sm font-bold bg-white text-slate-900 rounded-full hover:bg-slate-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-32 pb-20">
        {/* Hero */}
        <section className="container mx-auto px-6 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-cyan-400 mb-6">
            <Zap className="w-3 h-3 fill-current" /> New: Tax-Loss Harvesting Estimates
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Smart dividends.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400 animate-gradient-x">
              Agentic Reasoning.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop guessing. Moolah uses advanced AI agents to build, optimize, and explain a tax-efficient dividend portfolio tailored to your goals.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
            <Link href="/login?screen=signup" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
              Run Optimization <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#demo" className="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all w-full sm:w-auto justify-center flex">
              View Live Demo
            </Link>
          </div>

          {/* Stats / Proof */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/5 pt-10">
            <div>
              <div className="text-3xl font-bold text-white mb-1">40+</div>
              <div className="text-sm text-slate-500">Quality factors analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">VIG</div>
              <div className="text-sm text-slate-500">Benchmark comparison</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">0%</div>
              <div className="text-sm text-slate-500">Commissions (DIY)</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-sm text-slate-500">Portfolio Monitoring</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Moolah?</h2>
            <p className="text-slate-400">Institutional-grade tools, simplified for you.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<PieChart className="w-6 h-6 text-purple-400" />}
              title="Smart Diversification"
              description="Automatically balances sector caps and strict holding limits (max 40) to prevent over-concentration."
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
              title="Dividend Growth Focus"
              description="Prioritizes companies with sustainable payout ratios and history of growth, not just yield traps."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6 text-cyan-400" />}
              title="Safety Gates"
              description="Instantly flags dividend cuts, deteriorating fundamentals, or dangerous leverage ratios."
            />
          </div>
        </section>

        <footer className="border-t border-white/5 pt-10 pb-6 text-center text-slate-600 text-sm">
          <div className="container mx-auto px-6">
            <p className="mb-4">
              Moolah is a technology platform, not a registered investment advisor.
              <br />System output is for informational purposes only. Past performance does not guarantee future results.
            </p>
            <p>&copy; {new Date().getFullYear()} Moolah Inc.</p>
          </div>
        </footer>
      </main>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl glass-card hover:bg-white/5 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}
