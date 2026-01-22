import { Link, Routes, Route, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Wallet, DollarSign, TrendingUp, Calendar, ArrowUpRight, LogOut, LayoutDashboard, Database, Settings as SettingsIcon, Loader2, Sparkles, RefreshCw, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, cn } from '@/components/ui';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const client = generateClient<Schema>();

type ChartRange = '6M' | '1Y' | '2Y' | '5Y' | '20Y';

function DashboardHome() {
    const [totalInvested, setTotalInvested] = useState(0);
    const [marketValue, setMarketValue] = useState(0);
    const [annualIncome, setAnnualIncome] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [holdingsTickers, setHoldingsTickers] = useState<string[]>([]);
    const [currentHoldings, setCurrentHoldings] = useState<any[]>([]);
    const [selectedRange, setSelectedRange] = useState<ChartRange>('1Y');

    const calculateMetrics = useCallback(async (holdings: any[]) => {
        let costTotal = 0;
        let marketTotal = 0;
        let incomeTotal = 0;
        const tickers: string[] = [];

        for (const holding of holdings) {
            tickers.push(holding.ticker);
            const holdingCost = holding.shares * (holding.costBasis || 0);
            costTotal += holdingCost;

            try {
                // 1. Fetch latest price
                const { data: prices } = await client.models.MarketPrice.listMarketPriceByTickerAndDate(
                    { ticker: holding.ticker },
                    { limit: 1, sortDirection: 'desc' }
                );

                let currentPrice = (holding.costBasis || 0); // Fallback to cost basis if no price found
                if (prices && prices.length > 0) {
                    currentPrice = prices[0].close || currentPrice;
                }
                marketTotal += holding.shares * currentPrice;

                // 2. Fetch latest yield for income
                const { data: fundamentals } = await client.models.MarketFundamental.listMarketFundamentalByTickerAndAsOf(
                    { ticker: holding.ticker },
                    { limit: 1, sortDirection: 'desc' }
                );

                if (fundamentals && fundamentals.length > 0) {
                    const yieldPct = fundamentals[0].dividendYield || 0;
                    incomeTotal += (holding.shares * currentPrice) * yieldPct;
                }
            } catch (e) {
                console.warn(`Could not fetch data for ${holding.ticker}`, e);
                marketTotal += holdingCost; // Safe fallback
            }
        }

        setHoldingsTickers(tickers);
        setTotalInvested(costTotal);
        setMarketValue(marketTotal);
        setAnnualIncome(incomeTotal);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const sub = client.models.Holding.observeQuery().subscribe({
            next: ({ items }) => {
                setCurrentHoldings(items);
                calculateMetrics(items);
            },
        });
        return () => sub.unsubscribe();
    }, [calculateMetrics]);

    const handleSyncData = async () => {
        if (holdingsTickers.length === 0) return;
        setIsSyncing(true);
        try {
            const mutations = client.mutations as any;
            if (mutations && typeof mutations.syncMarketData === 'function') {
                await mutations.syncMarketData({ tickers: holdingsTickers });
                setTimeout(() => calculateMetrics(currentHoldings), 5000);
                alert("Market sync started. Prices and yields will update shortly.");
            } else {
                alert("The Sync feature is still being provisioned. Refresh your browser in a moment.");
            }
        } catch (err: any) {
            console.error("Sync failed:", err);
            alert(`Failed: Check network or refresh the page.`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRunOptimization = async () => {
        setIsOptimizing(true);
        try {
            const mutations = client.mutations as any;
            if (!mutations || typeof mutations.runOptimization !== 'function') {
                throw new Error("AI Optimizer is initializing in the cloud. Refresh in a moment.");
            }
            const { data: rawResult, errors } = await mutations.runOptimization({
                constraintsJson: JSON.stringify({ targetYield: 0.04 })
            });
            if (errors) throw new Error(errors[0].message);
            const result = JSON.parse(rawResult || "{}");
            if (result.status === 'FAILED') throw new Error(result.error);
            alert("Optimization started! The AI agent is analyzing your portfolio.");
        } catch (err: any) {
            console.error("Optimization failed:", err);
            alert(`Failed: ${err.message}`);
        } finally {
            setIsOptimizing(false);
        }
    };

    // Chart Data Generation
    const chartData = useMemo(() => {
        const baseData = [
            { name: '1', portfolio: 100, benchmark: 100 },
            { name: '2', portfolio: 105, benchmark: 102 },
            { name: '3', portfolio: 103, benchmark: 104 },
            { name: '4', portfolio: 110, benchmark: 108 },
            { name: '5', portfolio: 115, benchmark: 112 },
            { name: '6', portfolio: 120, benchmark: 115 },
            { name: '7', portfolio: 125, benchmark: 118 },
        ];

        const ranges: Record<ChartRange, { labels: string[], multiplier: number }> = {
            '6M': { labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'], multiplier: 1.05 },
            '1Y': { labels: ['Jul', 'Sep', 'Nov', 'Jan', 'Mar', 'May', 'Jul'], multiplier: 1.12 },
            '2Y': { labels: ['2023 H1', '2023 H2', '2024 H1', '2024 H2', '2025 H1', '2025 H2', '2026'], multiplier: 1.25 },
            '5Y': { labels: ['2021', '2022', '2023', '2024', '2025', '2026'], multiplier: 1.80 },
            '20Y': { labels: ['2006', '2011', '2016', '2021', '2026'], multiplier: 4.5 },
        };

        const config = ranges[selectedRange];
        return config.labels.map((label, i) => {
            const progress = i / (config.labels.length - 1);
            const volatility = 1 + (Math.random() * 0.05 - 0.025);
            return {
                name: label,
                portfolio: Math.floor(marketValue * (0.8 + progress * 0.2 * config.multiplier) * volatility),
                benchmark: Math.floor(marketValue * (0.75 + progress * 0.25 * (config.multiplier * 0.95)) * volatility),
            };
        });
    }, [selectedRange, marketValue]);

    // ROI Calculation
    const roiPercentage = totalInvested > 0 ? ((marketValue - totalInvested) / totalInvested) * 100 : 0;
    const isPositive = roiPercentage >= 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 w-fit">Dashboard</h1>
                    <p className="text-slate-400">Portfolio performance and AI intelligence.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncData}
                    disabled={isSyncing || holdingsTickers.length === 0}
                    className="border-white/5 bg-slate-900/50 hover:bg-slate-800 text-slate-300 gap-2"
                >
                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                    {isSyncing ? "Syncing..." : "Sync Market Data"}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Portfolio Value"
                    value={isLoading ? "..." : `$${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<Wallet className="h-4 w-4" />}
                    trend={isLoading ? "" : (
                        <span className={cn("flex items-center gap-1", isPositive ? "text-emerald-400" : "text-rose-400")}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isPositive ? "+" : ""}{roiPercentage.toFixed(2)}% Return
                        </span>
                    )}
                />
                <StatsCard
                    title="Est. Annual Income"
                    value={isLoading ? "..." : `$${annualIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<DollarSign className="h-4 w-4" />}
                    trend={annualIncome > 0 ? `${((annualIncome / marketValue) * 100).toFixed(2)}% Yield` : (holdingsTickers.length > 0 ? "Sync for Yield" : "0.00% Yield")}
                    color={annualIncome > 0 ? "text-emerald-400" : "text-amber-400"}
                />
                <StatsCard title="VIG Benchmark" value="+12.4%" icon={<TrendingUp className="h-4 w-4" />} trend="1 Year Return" color="text-cyan-400" />
                <StatsCard title="Total Invested" value={`$${totalInvested.toLocaleString()}`} icon={<Calendar className="h-4 w-4" />} trend="Cost Basis" />
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4 bg-slate-900/30 border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                        <CardTitle className="text-lg">Growth Analysis</CardTitle>
                        <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-lg border border-white/5">
                            {(['6M', '1Y', '2Y', '5Y', '20Y'] as ChartRange[]).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setSelectedRange(r)}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                        selectedRange === r
                                            ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                                            : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }} />
                                <Line type="monotone" dataKey="portfolio" name="Your Portfolio" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="benchmark" name="VIG Benchmark" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-slate-900/30 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-lg">Action Center</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-900/20 transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-emerald-400">Run Optimizer</h4>
                                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                            <p className="text-xs text-slate-400 mb-4">Generate recommendations based on latest market data.</p>
                            <Button onClick={handleRunOptimization} disabled={isOptimizing} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                                {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {isOptimizing ? "Optimizing..." : "Start Optimization"}
                            </Button>
                        </div>

                        <div className="p-4 bg-slate-800/40 border border-white/5 rounded-xl hover:bg-slate-800/60 transition-all">
                            <h4 className="font-bold text-slate-300 mb-2">Manage Holdings</h4>
                            <p className="text-xs text-slate-400 mb-4">Update your portfolio positions manually or via CSV.</p>
                            <Link to="/dashboard/holdings">
                                <Button variant="outline" size="sm" className="w-full border-white/10 text-slate-300">View Holdings</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon, trend, color = "text-slate-50" }: any) {
    return (
        <Card className="bg-slate-900/40 border-white/5 overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</CardTitle>
                <div className="text-slate-500">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-[10px] text-slate-500 mt-1 font-medium">{trend}</div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { signOut, user, authStatus } = useAuthenticator((context) => [context.authStatus]);
    const navigate = useNavigate();

    useEffect(() => {
        if (authStatus === 'unauthenticated') navigate('/login');
    }, [authStatus, navigate]);

    if (authStatus !== 'authenticated') return null;

    return (
        <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200">
            <aside className="w-64 border-r border-white/5 bg-slate-900/20 flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Moolah Logo" className="w-8 h-8 object-contain rounded-lg shadow-lg border border-white/10 bg-slate-900" />
                        <span className="font-bold tracking-tight text-lg">Moolah</span>
                    </div>
                </div>

                <nav className="flex-grow px-4 space-y-2 mt-4">
                    <SidebarLink to="/dashboard/home" icon={<LayoutDashboard className="w-4 h-4" />} label="Overview" />
                    <SidebarLink to="/dashboard/holdings" icon={<Database className="w-4 h-4" />} label="Holdings" />
                    <SidebarLink to="/dashboard/recommendations" icon={<Sparkles className="w-4 h-4" />} label="Buy Suggestions" />
                    <SidebarLink to="/dashboard/settings" icon={<SettingsIcon className="w-4 h-4" />} label="Settings" />
                </nav>

                <div className="p-4 mt-auto border-t border-white/5">
                    <div className="flex items-center gap-3 px-3 py-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] uppercase font-bold text-slate-400">
                            {user?.username?.substring(0, 2) || 'U'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate text-slate-200">{user?.username}</span>
                            <span className="text-[10px] text-slate-500 truncate">Pro Account</span>
                        </div>
                    </div>
                    <button onClick={signOut} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            <main className="flex-grow p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}

function SidebarLink({ to, icon, label }: any) {
    const location = useLocation();
    const active = location.pathname === to;
    return (
        <Link to={to} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${active ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
            {icon} {label}
        </Link>
    );
}

export { DashboardHome }
