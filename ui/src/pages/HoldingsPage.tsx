import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { Plus, Trash2, Upload, AlertCircle, Loader2, Edit3, X, Check } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export default function HoldingsPage() {
    const [holdings, setHoldings] = useState<Array<Schema['Holding']['type']>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Inline editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editShares, setEditShares] = useState<string>("");
    const [editCost, setEditCost] = useState<string>("");

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

    const addTicker = async () => {
        const ticker = window.prompt("Enter Ticker (e.g. MSFT):")?.toUpperCase();
        if (!ticker) return;

        const sharesStr = window.prompt("Enter Number of Shares:", "1");
        const shares = parseFloat(sharesStr || "0");
        if (isNaN(shares) || shares <= 0) return;

        const costStr = window.prompt("Enter Cost Basis per Share (USD):", "0");
        const costBasis = parseFloat(costStr || "0");
        if (isNaN(costBasis)) return;

        setIsSaving(true);
        try {
            await client.models.Holding.create({
                ticker,
                shares,
                costBasis,
            });
        } catch (err) {
            console.error("Error adding holding:", err);
            alert("Failed to add holding.");
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (holding: Schema['Holding']['type']) => {
        setEditingId(holding.id);
        setEditShares(holding.shares.toString());
        setEditCost((holding.costBasis || 0).toString());
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const saveEdit = async (id: string) => {
        const shares = parseFloat(editShares);
        const costBasis = parseFloat(editCost);

        if (isNaN(shares) || isNaN(costBasis)) {
            alert("Please enter valid numbers.");
            return;
        }

        setIsSaving(true);
        try {
            await client.models.Holding.update({
                id,
                shares,
                costBasis,
            });
            setEditingId(null);
        } catch (err) {
            console.error("Update failed:", err);
            alert("Failed to update holding.");
        } finally {
            setIsSaving(false);
        }
    };

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
                    <p className="text-slate-400">Track and edit your portfolio positions.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={addTicker}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 transition-all active:scale-95"
                    >
                        {isSaving && !editingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
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
                                    <th className="px-6 py-4 font-medium text-slate-400 text-right w-32">Shares</th>
                                    <th className="px-6 py-4 font-medium text-slate-400 text-right w-40">Cost Basis (Avg)</th>
                                    <th className="px-6 py-4 font-medium text-slate-400 text-right">Total Cost</th>
                                    <th className="px-6 py-4 font-medium text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {holdings.map((holding) => (
                                    <tr key={holding.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-100">{holding.ticker}</td>

                                        <td className="px-6 py-4 text-right">
                                            {editingId === holding.id ? (
                                                <input
                                                    type="number"
                                                    value={editShares}
                                                    onChange={(e) => setEditShares(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-right text-emerald-400 focus:outline-none focus:border-emerald-500"
                                                />
                                            ) : (
                                                <span className="text-slate-300 font-mono">{holding.shares}</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            {editingId === holding.id ? (
                                                <input
                                                    type="number"
                                                    value={editCost}
                                                    onChange={(e) => setEditCost(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-right text-emerald-400 focus:outline-none focus:border-emerald-500"
                                                />
                                            ) : (
                                                <span className="text-slate-300 font-mono">${(holding.costBasis || 0).toFixed(2)}</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-right text-slate-100 font-bold font-mono">
                                            ${(holding.shares * (holding.costBasis || 0)).toFixed(2)}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {editingId === holding.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => saveEdit(holding.id)}
                                                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="p-1.5 text-slate-500 hover:bg-white/5 rounded transition-all"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => startEditing(holding)}
                                                            className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteHolding(holding.id)}
                                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            <section className="grid md:grid-cols-2 gap-6">
                <Card className="bg-slate-900/30 border-white/5 p-6">
                    <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-400" /> Investment Summary
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm py-2 border-b border-white/5">
                            <span className="text-slate-400">Total Invested</span>
                            <span className="text-slate-100 font-bold font-mono">
                                ${holdings.reduce((sum, h) => sum + (h.shares * (h.costBasis || 0)), 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
}
