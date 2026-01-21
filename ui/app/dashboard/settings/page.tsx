'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import { useState } from 'react';

type SettingsFormValues = {
    maxHoldings: number;
    maxPositionSize: number;
    sectorCap: number;
    taxOrdinary: number;
    taxLTCG: number;
    taxSTCG: number;
};

export default function SettingsPage() {
    const { register, handleSubmit, formState: { isDirty } } = useForm<SettingsFormValues>({
        defaultValues: {
            maxHoldings: 40,
            maxPositionSize: 6.0,
            sectorCap: 25.0,
            taxOrdinary: 32.0,
            taxLTCG: 15.0,
            taxSTCG: 32.0,
        }
    });

    const [isSaving, setIsSaving] = useState(false);

    const onSubmit = async (data: SettingsFormValues) => {
        setIsSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        console.log(data);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Strategy Settings</h1>
                <p className="text-muted-foreground">Configure your optimizer constraints and tax profile.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Portfolio Constraints</CardTitle>
                        <CardDescription>Rules that the optimizer must follow.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="maxHoldings">Max Holdings (Count)</Label>
                            <Input id="maxHoldings" type="number" {...register('maxHoldings')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxPositionSize">Max Position Size (%)</Label>
                            <Input id="maxPositionSize" type="number" step="0.1" {...register('maxPositionSize')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sectorCap">Max Sector Weight (%)</Label>
                            <Input id="sectorCap" type="number" step="1" {...register('sectorCap')} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tax Profile</CardTitle>
                        <CardDescription>Estimated rates used for tax drag calculations. Consult a tax pro.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="taxOrdinary">Ordinary Income (%)</Label>
                            <Input id="taxOrdinary" type="number" step="0.1" {...register('taxOrdinary')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taxSTCG">Short Term Gains (%)</Label>
                            <Input id="taxSTCG" type="number" step="0.1" {...register('taxSTCG')} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taxLTCG">Long Term Gains (%)</Label>
                            <Input id="taxLTCG" type="number" step="0.1" {...register('taxLTCG')} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                    </Button>
                </div>
            </form>
        </div>
    )
}
