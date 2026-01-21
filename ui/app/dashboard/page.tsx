import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Wallet, DollarSign, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 w-fit">Dashboard</h1>
                <p className="text-muted-foreground">Portfolio overview and key metrics.</p>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$0.00</div>
                        <p className="text-xs text-muted-foreground">+0.0% from last month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Est. Annual Income</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">$0.00</div>
                        <p className="text-xs text-muted-foreground">0.00% Yield on Cost</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">VIG Benchmark</CardTitle>
                        <TrendingUp className="h-4 w-4 text-cyan-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-400">+12.4%</div>
                        <p className="text-xs text-muted-foreground">1 Year Total Return</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rebalance</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Feb 1</div>
                        <p className="text-xs text-muted-foreground">Next scheduled review</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-slate-900/30">
                    <CardHeader>
                        <CardTitle>Portfolio vs Benchmark (Total Return)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[250px] w-full flex items-center justify-center border-2 border-dashed border-slate-700/50 rounded-lg bg-slate-900/20">
                            <div className="text-center">
                                <p className="text-muted-foreground text-sm flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" /> No historical data available
                                </p>
                                <p className="text-xs text-slate-600 mt-2">Charts will appear once you track holdings.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-slate-900/30">
                    <CardHeader>
                        <CardTitle>Action Center</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg transition-colors hover:bg-purple-900/20 group cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-purple-300">Run Optimizer</h4>
                                    <ArrowUpRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Generate a new recommendation packet based on latest market data.
                                </p>
                                <Link href="/dashboard/recommendation">
                                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-500">Run Optimization</Button>
                                </Link>
                            </div>

                            <div className="p-4 bg-slate-800/20 border border-slate-700 rounded-lg">
                                <h4 className="font-medium text-slate-300 mb-1">Update Holdings</h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Sync your current positions via CSV or manual entry.
                                </p>
                                <Link href="/dashboard/holdings">
                                    <Button size="sm" variant="outline" className="w-full">Manage Holdings</Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
