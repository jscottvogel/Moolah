'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Plus, Trash2 } from 'lucide-react';

export default function HoldingsPage() {
    // Mock data for display
    const holdings = [
        { ticker: 'AAPL', shares: 50, costBasis: 145.00, value: 9250.00 },
        { ticker: 'MSFT', shares: 20, costBasis: 280.00, value: 7800.00 },
        { ticker: 'SCHD', shares: 100, costBasis: 72.50, value: 7600.00 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Holdings</h1>
                    <p className="text-muted-foreground">Manage your current stock positions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2"><Upload className="w-4 h-4" /> Import CSV</Button>
                    <Button className="gap-2"><Plus className="w-4 h-4" /> Add Position</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Current Portfolio</CardTitle>
                    <CardDescription>
                        {holdings.length} positions tracked.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ticker</TableHead>
                                <TableHead>Shares</TableHead>
                                <TableHead>Avg Cost</TableHead>
                                <TableHead>Current Value</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holdings.map((h) => (
                                <TableRow key={h.ticker}>
                                    <TableCell className="font-medium">{h.ticker}</TableCell>
                                    <TableCell>{h.shares}</TableCell>
                                    <TableCell>${h.costBasis.toFixed(2)}</TableCell>
                                    <TableCell>${h.value.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-900/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
