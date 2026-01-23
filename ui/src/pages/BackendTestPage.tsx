import React, { useState, useEffect } from 'react';
import { getClient } from '../client';
import { useCloudActions } from '../hooks/useCloudActions';
import { Activity, Database, RefreshCw, Sparkles, Plus, Trash2, ChevronRight, Terminal, TrendingUp } from 'lucide-react';

/**
 * BackendTestPage - A diagnostic utility to exercise and verify backend responsiveness.
 * Provides direct interaction with Data Models and Custom Mutations.
 */
const BackendTestPage = () => {
    const [logs, setLogs] = useState<{ type: 'info' | 'error' | 'success' | 'debug', message: string, timestamp: string }[]>([]);
    const [holdings, setHoldings] = useState<any[]>([]);
    const { syncMarketData, runOptimization, isSyncing, isOptimizing } = useCloudActions();
    const client = getClient();

    const addLog = (type: 'info' | 'error' | 'success' | 'debug', message: string) => {
        setLogs(prev => [{ type, message, timestamp: new Date().toLocaleTimeString() }, ...prev]);
    };

    const fetchHoldings = async () => {
        addLog('info', 'Executing: models.Holding.list()');
        try {
            const { data: items } = await client.models.Holding.list();
            setHoldings(items);
            addLog('success', `Response: Received ${items.length} records.`);
        } catch (err: any) {
            console.error(err);
            addLog('error', `Failed: ${err.message || JSON.stringify(err)}`);
        }
    };

    const createDummyHolding = async () => {
        const dummyTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'];
        const randomTicker = dummyTickers[Math.floor(Math.random() * dummyTickers.length)];

        addLog('info', `Executing: models.Holding.create({ ticker: "${randomTicker}" })`);
        try {
            const { data: newHolding, errors } = await client.models.Holding.create({
                ticker: randomTicker,
                shares: Math.floor(Math.random() * 50) + 1,
                costBasis: Math.floor(Math.random() * 200) + 50,
                purchaseDate: new Date().toISOString().split('T')[0]
            });

            if (errors) throw new Error(errors[0].message);
            addLog('success', `Response: Created Record ID ${newHolding.id}`);
            fetchHoldings();
        } catch (err: any) {
            console.error(err);
            addLog('error', `Failed: ${err.message || JSON.stringify(err)}`);
        }
    };

    const deleteHolding = async (id: string) => {
        addLog('info', `Executing: models.Holding.delete({ id: "${id}" })`);
        try {
            await client.models.Holding.delete({ id });
            addLog('success', `Response: Record deleted.`);
            fetchHoldings();
        } catch (err: any) {
            console.error(err);
            addLog('error', `Failed: ${err.message || JSON.stringify(err)}`);
        }
    };

    const handleSync = async () => {
        addLog('info', 'Invoking Mutation: syncMarketData(["MSFT", "AAPL"])');
        try {
            const result = await syncMarketData(['MSFT', 'AAPL']);
            addLog('success', `Result Raw: ${JSON.stringify(result)}`);
            addLog('info', 'Note: Data is processed asynchronously via SQS. Check back in 30-60 seconds.');
        } catch (err: any) {
            addLog('error', `Failed: ${err.message}`);
        }
    };

    const handleOptimize = async () => {
        addLog('info', 'Invoking Mutation: runOptimization(targetYield: 0.05)');
        try {
            const result = await runOptimization(0.05);
            addLog('success', `Result Status: ${result.status || 'OK'}`);
            if (result.explanation) {
                addLog('info', `AI Explanation: ${result.explanation.summary?.substring(0, 100)}...`);
            }
        } catch (err: any) {
            addLog('error', `Failed: ${err.message}`);
        }
    };

    useEffect(() => {
        fetchHoldings();

        // Listen for background work logs (AuditLog)
        // Defensively check if AuditLog exists in the schema to prevent crash
        if (!client.models.AuditLog) {
            console.warn("[DIAG] AuditLog model not found in client schema. Background logs will be disabled.");
            addLog('error', 'Diagnostics: AuditLog model not found. Service logs unavailable.');
            return;
        }

        const sub = client.models.AuditLog.observeQuery().subscribe({
            next: ({ items }: any) => {
                const now = Date.now();
                const recentLogs = items
                    .filter((i: any) => (now - new Date(i.createdAt).getTime()) < 60000) // Last 60 seconds only
                    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                if (recentLogs.length > 0) {
                    setLogs(prev => {
                        // Prevent duplicates by checking existing messages
                        const existingMessages = new Set(prev.map(l => l.message));
                        const newEntries = recentLogs
                            .filter((log: any) => !existingMessages.has(`[SERVICE] ${log.action}: ${log.details}`))
                            .map((log: any) => ({
                                type: 'debug' as const,
                                message: `[SERVICE] ${log.action}: ${log.details}`,
                                timestamp: new Date(log.createdAt).toLocaleTimeString()
                            }));
                        return [...newEntries.reverse(), ...prev];
                    });
                }
            }
        });
        return () => sub.unsubscribe();
    }, [client]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 w-fit">
                    System Diagnostics
                </h1>
                <p className="text-slate-400">Verify backend health and exercise API infrastructure.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Controls - Left Side */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl space-y-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-indigo-400">
                            <Database className="w-5 h-5" />
                            <h2 className="font-bold text-sm uppercase tracking-widest">Data Operations</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={fetchHoldings}
                                className="group flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"
                            >
                                <span className="text-sm font-medium">List Holdings</span>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                            </button>
                            <button
                                onClick={createDummyHolding}
                                className="group flex items-center justify-between px-4 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <Plus className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm font-medium text-indigo-300">Create Random Record</span>
                                </div>
                            </button>
                        </div>
                    </section>

                    <section className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl space-y-4 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-pink-400">
                            <Activity className="w-5 h-5" />
                            <h2 className="font-bold text-sm uppercase tracking-widest">Cloud Functions</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                                <span className="text-sm font-medium">{isSyncing ? 'Syncing...' : 'Test Market Sync'}</span>
                            </button>
                            <button
                                onClick={handleOptimize}
                                disabled={isOptimizing}
                                className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all disabled:opacity-50"
                            >
                                <Sparkles className={`w-4 h-4 text-purple-400 ${isOptimizing ? 'animate-pulse' : ''}`} />
                                <span className="text-sm font-medium">{isOptimizing ? 'Optimizing...' : 'Test AI Optimizer'}</span>
                            </button>
                        </div>
                    </section>
                </div>

                {/* Console - Right Side */}
                <div className="lg:col-span-8 flex flex-col h-[600px] border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0f] shadow-2xl relative">
                    <div className="px-5 py-3 border-b border-white/5 bg-slate-900/40 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Terminal className="w-4 h-4" />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Amplify Diagnostic Stream</span>
                        </div>
                        <button
                            onClick={() => setLogs([])}
                            className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase"
                        >
                            [ Clear ]
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-[11px] leading-relaxed">
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50">
                                <Terminal className="w-12 h-12 stroke-[1px]" />
                                <div className="italic tracking-wide">Await system input...</div>
                            </div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="text-slate-600 flex-shrink-0 tabular-nums">[{log.timestamp}]</span>
                                <span className={
                                    log.type === 'error' ? 'text-rose-500' :
                                        log.type === 'success' ? 'text-emerald-400' :
                                            log.type === 'debug' ? 'text-amber-400' : 'text-blue-400'
                                }>
                                    {log.type.toUpperCase()}
                                </span>
                                <span className="text-slate-300 break-words">{log.message}</span>
                            </div>
                        ))}
                    </div>
                    {/* Shadow indicators */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
                </div>
            </div>

            {/* Live Data Explorer */}
            <section className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Active Records: Holding</h2>
                    <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-slate-500 font-mono">{holdings.length} items</span>
                </div>
                {holdings.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 italic">No records found. Create one to begin.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="text-slate-500 bg-black/20 font-bold">
                                <tr>
                                    <th className="px-6 py-3">TICKER</th>
                                    <th className="px-6 py-3">SHARES</th>
                                    <th className="px-6 py-3">COST BASIS</th>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3 text-right">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {holdings.map(h => (
                                    <tr key={h.id} className="text-slate-300 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-white bg-white/5 px-2 py-1 rounded">{h.ticker}</span>
                                        </td>
                                        <td className="px-6 py-4">{h.shares}</td>
                                        <td className="px-6 py-4 text-emerald-500/80 font-mono">${h.costBasis?.toFixed(2)}</td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-slate-500">{h.id}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteHolding(h.id)}
                                                className="p-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Record"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Market Data Monitor */}
            <section className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-emerald-500/5">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Market Intelligence (Global)</h2>
                    </div>
                    <button
                        onClick={async () => {
                            addLog('info', 'Fetching MarketPrice records...');
                            try {
                                const { data } = await client.models.MarketPrice.list({ limit: 10 });
                                addLog('success', `Found ${data.length} price points.`);
                                // Logic to display could be added here, for now we log keys
                                if (data.length > 0) {
                                    addLog('info', `Latest Tickers: ${[...new Set(data.map((p: any) => p.ticker))].join(', ')}`);
                                }
                            } catch (e: any) {
                                addLog('error', `Market Fetch Failed: ${e.message}`);
                            }
                        }}
                        className="text-[10px] font-bold text-emerald-400 hover:text-white transition-colors"
                    >
                        [ Refresh Market Data ]
                    </button>
                </div>
                <div className="p-6 text-center text-slate-500 text-xs italic">
                    Note: Global market data is shared across all users. Testing sync adds data to this shared pool.
                </div>
            </section>
        </div>
    );
};

export default BackendTestPage;
