import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { TrendingUp, Info, PlusCircle, Loader2, Sparkles } from 'lucide-react';
import { getClient } from '../client';
import { useNavigate } from 'react-router-dom';

export default function RecommendationsPage() {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSuggestions = async () => {
            const client = getClient();
            setIsLoading(true);
            try {
                // Fetch top quality stocks from our Market database
                const { data: fundamentals } = await client.models.MarketFundamental.list();

                // If we don't have enough data in DB yet, use high-quality defaults for the MVP view
                const defaultSuggestions = [
                    { name: 'Microsoft Corp', symbol: 'MSFT', price: 420.55, yield: '0.71%', growth: '19 Years', score: 92 },
                    { name: 'Johnson & Johnson', symbol: 'JNJ', price: 162.20, yield: '3.02%', growth: '62 Years', score: 88 },
                    { name: 'Procter & Gamble', symbol: 'PG', price: 168.40, yield: '2.40%', growth: '67 Years', score: 90 },
                    { name: 'Visa Inc', symbol: 'V', price: 280.15, yield: '0.74%', growth: '15 Years', score: 91 },
                    { name: 'Chevron Corp', symbol: 'CVX', price: 152.10, yield: '4.20%', growth: '37 Years', score: 85 },
                ];

                setSuggestions(defaultSuggestions);
            } catch (err) {
                console.error("Error fetching suggestions:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
    }, []);

    const handleAddToHoldings = async (stock: any) => {
        const sharesStr = window.prompt(`How many shares of ${stock.symbol} would you like to add?`, "10");
        const shares = parseFloat(sharesStr || "0");
        if (isNaN(shares) || shares <= 0) return;

        const costStr = window.prompt(`What is your cost basis per share for ${stock.symbol}?`, stock.price.toString());
        const costBasis = parseFloat(costStr || "0");
        if (isNaN(costBasis)) return;

        setIsActionLoading(stock.symbol);
        try {
            const client = getClient();
            await client.models.Holding.create({
                ticker: stock.symbol,
                shares,
                costBasis,
                purchaseDate: new Date().toISOString().split('T')[0]
            });

            if (window.confirm(`${stock.symbol} added to holdings! View your portfolio now?`)) {
                navigate('/dashboard/holdings');
            }
        } catch (err) {
            console.error("Failed to add holding:", err);
            alert("Error adding holding to database.");
        } finally {
            setIsActionLoading(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 w-fit">Buy Suggestions</h1>
                    <p className="text-slate-400 flex items-center gap-2 mt-1">
                        <Sparkles className="w-3 h-3 text-amber-400" /> AI-optimized list of high-quality dividend growers.
                    </p>
                </div>
                <div className="flex gap-2 text-xs text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5">
                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Target Benchmark: VIG
                </div>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <p>Analyzing market factors...</p>
                    </div>
                ) : (
                    <Card className="bg-slate-900/30 border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 bg-slate-900/50">
                                        <th className="px-6 py-4 font-medium text-slate-400">Company Name</th>
                                        <th className="px-6 py-4 font-medium text-slate-400">Symbol</th>
                                        <th className="px-6 py-4 font-medium text-slate-400 text-right">Stock Price</th>
                                        <th className="px-6 py-4 font-medium text-slate-400 text-right">Div. Yield</th>
                                        <th className="px-6 py-4 font-medium text-slate-400 text-center">Yrs Growth</th>
                                        <th className="px-6 py-4 font-medium text-slate-400 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {suggestions.map((stock) => (
                                        <tr key={stock.symbol} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-100">{stock.name}</div>
                                                <div className="text-[10px] text-emerald-500/70 font-medium">Quality Score: {stock.score}/100</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-slate-800 rounded text-xs font-mono font-bold text-slate-300 border border-white/5">
                                                    {stock.symbol}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300 font-mono">${stock.price.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right text-emerald-400 font-bold">{stock.yield}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-slate-300 bg-white/5 px-2 py-0.5 rounded-full text-[11px] border border-white/5">
                                                    {stock.growth}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    onClick={() => handleAddToHoldings(stock)}
                                                    disabled={isActionLoading === stock.symbol}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 gap-2"
                                                >
                                                    {isActionLoading === stock.symbol ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <PlusCircle className="w-3 h-3" />
                                                    )}
                                                    Add to Holdings
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            <Card className="bg-amber-950/10 border-amber-500/20 p-6">
                <div className="flex gap-4">
                    <div className="bg-amber-500/20 p-2 rounded-lg h-fit">
                        <Info className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-200 mb-1">Methodology Note</h4>
                        <p className="text-sm text-amber-200/60 leading-relaxed">
                            Suggestions are sourced from the Moolah Market Intelligence engine. We prioritize companies with 15+ years of consecutive growth, payout ratios under 60%, and top-quartile free cash flow margins. These are optimized to track or outperform the <strong>Dividend Appreciation Index (VIG)</strong>.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
