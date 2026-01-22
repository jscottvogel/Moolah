import { Link, Routes, Route, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Wallet, DollarSign, TrendingUp, Calendar, ArrowUpRight, LogOut, LayoutDashboard, Database, Settings as SettingsIcon, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

function DashboardHome() {
    const [totalValue, setTotalValue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);

    useEffect(() => {
        const sub = client.models.Holding.observeQuery().subscribe({
            next: ({ items }) => {
                const total = items.reduce((acc, current) => {
                    return acc + (current.shares * (current.costBasis || 0));
                }, 0);
                setTotalValue(total);
                setIsLoading(false);
            },
        });
        return () => sub.unsubscribe();
    }, []);

    const handleRunOptimization = async () => {
        setIsOptimizing(true);
        try {
            const { data, errors } = await client.mutations.runOptimization({
                constraintsJson: JSON.stringify({ targetYield: 0.04 })
            });
            if (errors) throw errors;
            alert("Optimization started! Check 'Recommendations' in a few moments.");
        } catch (err) {
            console.error("Optimization failed:", err);
            alert("Failed to start optimization.");
        } finally {
            setIsOptimizing(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 w-fit">Dashboard</h1>
                <p className="text-slate-400">Portfolio overview and key metrics.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Value"
                    value={isLoading ? "..." : `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<Wallet className="h-4 w-4" />}
                    trend="+0.0%"
                />
                <StatsCard title="Est. Annual Income" value="$0.00" icon={<DollarSign className="h-4 w-4" />} trend="0.00% YOC" color="text-emerald-400" />
                <StatsCard title="VIG Benchmark" value="+12.4%" icon={<TrendingUp className="h-4 w-4" />} trend="1 Year Return" color="text-cyan-400" />
                <StatsCard title="Next Rebalance" value="Feb 1" icon={<Calendar className="h-4 w-4" />} trend="Scheduled" />
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4 bg-slate-900/30 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-lg">Portfolio vs Benchmark</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                            <div className="text-center text-slate-500">
                                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Charts will appear once you track holdings.</p>
                            </div>
                        </div>
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
                            <Button
                                onClick={handleRunOptimization}
                                disabled={isOptimizing}
                                size="sm"
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {isOptimizing ? "Optimizing..." : "Start Optimization"}
                            </Button>
                        </div>

                        <div className="p-4 bg-slate-800/40 border border-white/5 rounded-xl hover:bg-slate-800/60 transition-all">
                            <h4 className="font-bold text-slate-300 mb-2">Sync Holdings</h4>
                            <p className="text-xs text-slate-400 mb-4">Update your portfolio positions manually or via CSV.</p>
                            <Link to="/dashboard/holdings">
                                <Button variant="outline" size="sm" className="w-full border-white/10 text-slate-300">Manage Holdings</Button>
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
                <p className="text-[10px] text-slate-500 mt-1 font-medium">{trend}</p>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { signOut, user, authStatus } = useAuthenticator((context) => [context.authStatus]);
    const navigate = useNavigate();

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            navigate('/login');
        }
    }, [authStatus, navigate]);

    if (authStatus !== 'authenticated') {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Sidebar */}
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
                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
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
        <Link
            to={to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${active
                ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
        >
            {icon} {label}
        </Link>
    );
}

export { DashboardHome }
