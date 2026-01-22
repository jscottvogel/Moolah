import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { Plus, Trash2, AlertCircle, Loader2, Edit3, X, Check } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

/**
 * HoldingsPage - Provides a granular view of user portfolio positions.
 * Supports inline editing, manual entry, and automated market sync triggers.
 */
export default function HoldingsPage() {
    const [holdings, setHoldings] = useState<Array<Schema['Holding']['type']>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editShares, setEditShares] = useState("");
    const [editCost, setEditCost] = useState("");

    useEffect(() => {
        const sub = client.models.Holding.observeQuery().subscribe({
            next: ({ items }) => {
                setHoldings([...items]);
                setIsLoading(false);
            },
            error: (err) => console.error("[HOLDINGS] Sync failed:", err),
        });
        return () => sub.unsubscribe();
    }, []);

    const handleAdd = async () => {
        const ticker = window.prompt("Ticker (e.g. AAPL):")?.toUpperCase();
        if (!ticker) return;

        const shares = parseFloat(window.prompt("Shares:", "1") || "0");
        const costBasis = parseFloat(window.prompt("Cost per share (USD):", "0") || "0");

        if (isNaN(shares) || shares <= 0) return alert("Invalid shares");

        setIsSaving(true);
        try {
            await client.models.Holding.create({ ticker, shares, costBasis });
            // Direct GraphQL sync trigger
            const syncMutation = `mutation SyncMarketData($t: [String]) { syncMarketData(tickers: $t) }`;
            client.graphql({ query: syncMutation, variables: { t: [ticker] } }).catch(e => console.warn(e));
        } catch (err) {
            alert("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async (id: string) => {
        const shares = parseFloat(editShares);
        const costBasis = parseFloat(editCost);
        if (isNaN(shares) || isNaN(costBasis)) return alert("Invalid inputs");

        setIsSaving(true);
        try {
            await client.models.Holding.update({ id, shares, costBasis });
            setEditingId(null);
        } catch (err) {
            alert("Update failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Remove this holding?")) return;
        await client.models.Holding.delete({ id }).catch(e => alert(e.message));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 w-fit">Manage Holdings</h1>
                    <p className="text-slate-400">Track and edit your portfolio positions.</p>
                </div>
                <Button onClick={handleAdd} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                    {isSaving && !editingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Ticker
                </Button>
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
                                    <th className="px-6 py-4 font-medium text-slate-400 uppercase tracking-tighter text-[10px]">Ticker</th>
                                    <th className="px-6 py-4 font-medium text-slate-400 text-right w-32 uppercase tracking-tighter text-[10px]">Shares</th>
                                    <th className="px-6 py-4 font-medium text-slate-400 text-right w-40 uppercase tracking-tighter text-[10px]">Cost Basis</th>
                                    <th className="px-6 py-4 font-medium text-slate-400 text-right uppercase tracking-tighter text-[10px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {holdings.map((h) => (
                                    <tr key={h.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-100">{h.ticker}</td>
                                        <td className="px-6 py-4 text-right">
                                            {editingId === h.id ? (
                                                <input type="number" value={editShares} onChange={e => setEditShares(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-right text-emerald-400" />
                                            ) : <span className="text-slate-300 font-mono">{h.shares}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {editingId === h.id ? (
                                                <input type="number" value={editCost} onChange={e => setEditCost(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-right text-emerald-400" />
                                            ) : <span className="text-slate-300 font-mono">${(h.costBasis || 0).toFixed(2)}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {editingId === h.id ? (
                                                    <>
                                                        <button onClick={() => handleSaveEdit(h.id)} className="p-1 text-emerald-400"><Check className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 text-slate-500"><X className="w-4 h-4" /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => { setEditingId(h.id); setEditShares(h.shares.toString()); setEditCost((h.costBasis || 0).toString()); }} className="p-1 text-slate-500 hover:text-emerald-400"><Edit3 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDelete(h.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
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

            <section className="bg-amber-950/10 border border-amber-500/10 rounded-2xl p-6 flex gap-4">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div className="text-sm text-amber-200/60 leading-relaxed">
                    <strong>Note:</strong> Changes to holdings are saved instantly to the cloud. Total portfolio calculations on the dashboard will refresh automatically as market data syncs complete.
                </div>
            </section>
        </div>
    );
}
