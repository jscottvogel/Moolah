'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // Need Badge or simulate

export default function RecommendationPage() {
    const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle');

    const runOptimization = async () => {
        setStatus('running');
        // Simulate API call
        setTimeout(() => setStatus('complete'), 2500);
    };

    if (status === 'complete') {
        return <RecommendationResults onReset={() => setStatus('idle')} />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in duration-500">
            <div className="space-y-4 max-w-2xl">
                <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)]">
                    <RefreshCw className={`w-10 h-10 text-white ${status === 'running' ? 'animate-spin' : ''}`} />
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Portfolio Optimizer</h1>
                <p className="text-lg text-muted-foreground">
                    Generate a tax-efficient, dividend-focused portfolio based on your latest settings and
                    <span className="text-cyan-400"> real-time market data</span>.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl text-left">
                <InfoCard title="Data-Driven" desc="Analyzes 200+ tickers against quality & safety factors." />
                <InfoCard title="Tax-Aware" desc="Estimates tax drag and suggests efficient moves." />
                <InfoCard title="Agentic Explanation" desc="Provides a clear, reasoned explanation for every trade." />
            </div>

            <div className="pt-8 w-full max-w-sm">
                <Button size="lg" onClick={runOptimization} disabled={status === 'running'} className="w-full text-lg h-12 bg-gradient-to-r from-purple-600 to-cyan-600 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
                    {status === 'running' ? 'Running Analysis...' : 'Run Analysis'}
                </Button>
                <p className="mt-4 text-xs text-muted-foreground">
                    This will generate a new recommendation packet. No trades are executed automatically.
                </p>
            </div>
        </div>
    )
}

function InfoCard({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="p-4 rounded-xl border bg-card/50 backdrop-blur text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-1 text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        </div>
    )
}

function RecommendationResults({ onReset }: { onReset: () => void }) {
    // Mock Result
    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Recommendation Packet</h1>
                    <p className="text-muted-foreground text-sm">Generated just now • Benchmark: VIG</p>
                </div>
                <Button variant="outline" onClick={onReset}>Start Over</Button>
            </div>

            {/* AI Explanation Section */}
            <Card className="border-purple-500/30 bg-purple-900/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-300">
                        <CheckCircle2 className="w-5 h-5" /> AI Strategy Explanation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-relaxed text-slate-300">
                    <p className="font-semibold text-white">Summary</p>
                    <p>The optimizer recommends rotating out of Consumer Discretionary (due to valuation concerns) into Healthcare and Technology sectors which show better dividend growth potential. The total portfolio yield is projected to increase from 2.1% to 2.8% while maintaining a beta of 0.85 relative to the VIG benchmark.</p>

                    <p className="font-semibold text-white mt-4">Key Risks to Watch</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400">
                        <li>Interest rate sensitivity in optional Utilities holdings.</li>
                        <li>Upcoming earnings volatility for 3 holdings.</li>
                    </ul>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Target Allocation</CardTitle>
                        <CardDescription>Top 5 Holdings by Weight</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Ticker</TableHead><TableHead className="text-right">Weight</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow><TableCell>MSFT</TableCell><TableCell className="text-right">5.2%</TableCell></TableRow>
                                <TableRow><TableCell>JNJ</TableCell><TableCell className="text-right">4.8%</TableCell></TableRow>
                                <TableRow><TableCell>PG</TableCell><TableCell className="text-right">4.1%</TableCell></TableRow>
                                <TableRow><TableCell>HD</TableCell><TableCell className="text-right">3.9%</TableCell></TableRow>
                                <TableRow><TableCell>AVGO</TableCell><TableCell className="text-right">3.5%</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Suggested Trades</CardTitle>
                        <CardDescription>To align with target</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Action</TableHead><TableHead>Ticker</TableHead><TableHead className="text-right">Est. Value</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="text-emerald-400"><TableCell>BUY</TableCell><TableCell>JNJ</TableCell><TableCell className="text-right">$1,200</TableCell></TableRow>
                                <TableRow className="text-emerald-400"><TableCell>BUY</TableCell><TableCell>AVGO</TableCell><TableCell className="text-right">$850</TableCell></TableRow>
                                <TableRow className="text-red-400"><TableCell>SELL</TableCell><TableCell>TGT</TableCell><TableCell className="text-right">$900</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
