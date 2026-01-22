import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { Plus, Trash2, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export default function HoldingsPage() {
    const [holdings, setHoldings] = useState<Array<Schema['Holding']['type']>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Fetch and Subscribe to Holdings
    useEffect(() => {
        const sub = client.models.Holding.observeQuery().subscribe({
            next: ({ items }) => {
                setHoldings([...items]);
                setIsLoading(false);
            },
            error: (err) => console.error(err),
        });
        return () => sub.unsubscribe();
    }, []);

    // Add a holding (Simple version for MVP)
    const addTicker = async () => {
        const ticker = window.prompt("Enter Ticker (e.g. MSFT):");
        if (!ticker) return;

        const sharesStr = window.prompt("Enter Number of Shares:");
        const shares = parseFloat(sharesStr || "0");
        if (isNaN(shares) || shares <= 0) return;

        setIsAdding(true);
        try {
            await client.models.Holding.create({
                ticker: ticker.toUpperCase(),
                shares: shares,
                costBasis: 0, // In real app, we'd ask for this
            });
        } catch (err) {
            console.error("Error adding holding:", err);
            alert("Failed to add holding. Check console for details.");
        } finally {
            setIsAdding(false);
        }
    };

    // Delete a holding
    const deleteHolding = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this holding?")) return;
        try {
            await client.models.Holding.delete({ id });
        } catch (err) {
            console.error("Error deleting holding:", err);
        }
    };

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
                    <Button
                        onClick={addTicker}
                        disabled={isAdding}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 transition-all active:scale-95"
                    >
                        {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Ticker
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-900/30 border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            <p>Loading your portfolio...</p>
                        </div>
                    ) : (
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
                                        <td className="px-6 py-4 text-right text-slate-300 font-mono">${(holding.costBasis || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right text-slate-100 font-bold font-mono">${(holding.shares * (holding.costBasis || 0)).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteHolding(holding.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {!isLoading && holdings.length === 0 && (
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
                        {holdings.length > 0 ? (
                            <div className="p-3 bg-slate-800/20 border border-white/5 rounded-lg text-xs text-slate-500">
                                No critical safety gates tripped for currently tracked holdings.
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600 italic">Add holdings to run safety checks.</p>
                        )}
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
