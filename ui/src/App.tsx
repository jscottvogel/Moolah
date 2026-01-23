import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage, { DashboardHome } from './pages/DashboardPage';
import HoldingsPage from './pages/HoldingsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import BackendTestPage from './pages/BackendTestPage';


// Placeholder Settings Page
function SettingsPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 w-fit">Settings</h1>
                <p className="text-slate-400">Manage your account preferences and constraints.</p>
            </div>
            <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20 text-center text-slate-500">
                Settings module is coming soon in Phase 4.
            </div>
        </div>
    );
}

// Placeholder Layout
function Layout({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen font-sans">{children}</div>;
}

function App() {
    return (
        <Authenticator.Provider>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/dashboard" element={<DashboardPage />}>
                            <Route index element={<Navigate to="/dashboard/home" replace />} />
                            <Route path="home" element={<DashboardHome />} />
                            <Route path="holdings" element={<HoldingsPage />} />
                            <Route path="recommendations" element={<RecommendationsPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                            <Route path="debug" element={<BackendTestPage />} />

                        </Route>
                        {/* Fallback to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </Router>
        </Authenticator.Provider>
    );
}

export default App;
