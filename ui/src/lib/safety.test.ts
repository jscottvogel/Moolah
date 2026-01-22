import { describe, it, expect } from 'vitest';

// Simple mockup of the safety logic (Phase 4)
function checkSafety(ticker: string, debtToEquity: number, payoutRatio: number) {
    const issues = [];
    if (debtToEquity > 2.0) {
        issues.push({ ticker, type: 'LEVERAGE', message: 'High leverage' });
    }
    if (payoutRatio > 80) {
        issues.push({ ticker, type: 'YIELD_TRAP', message: 'High payout ratio' });
    }
    return issues;
}

describe('Safety Gate Logic (Phase 4)', () => {
    it('should flag high leverage companies', () => {
        const result = checkSafety('MSFT', 2.5, 30);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('LEVERAGE');
    });

    it('should flag yield traps', () => {
        const result = checkSafety('T', 1.5, 95);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('YIELD_TRAP');
    });

    it('should pass healthy companies', () => {
        const result = checkSafety('JNJ', 0.5, 50);
        expect(result).toHaveLength(0);
    });
});
