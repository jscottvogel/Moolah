import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, cn } from '@/components/ui';
import { Plus, Trash2, Upload, Search, AlertCircle } from 'lucide-react';

export default function HoldingsPage() {
    const [holdings, setHoldings] = useState([
        { id: '1', ticker: 'MSFT', shares: 10, costBasis: 420.50 },
        { id: '2', ticker: 'JNJ', shares: 50, costBasis: 155.20 },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 w-fit">Manage Holdings</h1>
                    <p className="text-slate-400">Track your current portfolio positions.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-white/10 text-slate-300 gap-2">
                        <Upload className="w-4 h-4" /> Import CSV
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                        <Plus className="w-4 h-4" /> Add Ticker
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-900/30 border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/5 bg-slate-900/50">
                                <th className="px-6 py-4 font-medium text-slate-400">Ticker</th>
                                <th className="px-6 py-4 font-medium text-slate-400 text-right">Shares</th>
                                <th className="px-6 py-4 font-medium text-slate-400 text-right">Cost Basis</th>
                                <th className="px-6 py-4 font-medium text-slate-400 text-right">Total Value</th>
                                <th className="px-6 py-4 font-medium text-slate-400">Status</th>
                                <th className="px-6 py-4 font-medium text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {holdings.map((holding) => (
                                <tr key={holding.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-100">{holding.ticker}</td>
                                    <td className="px-6 py-4 text-right text-slate-300 font-mono">{holding.shares}</td>
                                    <td className="px-6 py-4 text-right text-slate-300 font-mono">${holding.costBasis.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right text-slate-100 font-bold font-mono">${(holding.shares * holding.costBasis).toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Synced
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {holdings.length === 0 && (
                    <div className="py-20 text-center">
                        <Database className="w-12 h-12 mx-auto text-slate-800 mb-4" />
                        <p className="text-slate-500">No holdings found. Start by adding your first ticker.</p>
                    </div>
                )}
            </Card>

            <section className="grid md:grid-cols-2 gap-6">
                <Card className="bg-slate-900/30 border-white/5 p-6">
                    <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-400" /> Gating & Warnings
                    </h3>
                    <div className="space-y-3">
                        <div className="p-3 bg-amber-900/10 border border-amber-500/20 rounded-lg text-xs text-amber-200 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold mb-0.5">Yield Trap Alert (JNJ)</p>
                                <p className="text-amber-500/70">Payout ratio exceeding 80%. Dividend safety is being monitored.</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
}

function Database(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
    )
}
