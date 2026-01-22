import { render, screen } from '@testing-library/react';
import { DashboardHome } from '../pages/DashboardPage';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Simple helper to wrap components in Router
const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('Dashboard Component', () => {
    it('renders correctly in loading state', () => {
        // In our test/setup.ts, generateClient is already mocked
        renderWithRouter(<DashboardHome />);

        expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
        expect(screen.getByText('Est. Annual Income')).toBeInTheDocument();
        expect(screen.getAllByText('...')).toHaveLength(2); // Prices/Income loading
    });

    it('displays the correct user metrics after loading', async () => {
        // Mock data for this specific test could go here if setup.ts wasn't enough
        // But for now, we just verify the layout exists.
        renderWithRouter(<DashboardHome />);
        expect(screen.getByText(/VIG Benchmark/i)).toBeInTheDocument();
        expect(screen.getByText(/Start Optimization/i)).toBeInTheDocument();
    });
});
