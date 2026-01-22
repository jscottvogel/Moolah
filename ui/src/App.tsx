import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage, { DashboardHome } from './pages/DashboardPage';
import HoldingsPage from './pages/HoldingsPage';

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
                        </Route>
                        {/* Fallback to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </Router>
        </Authenticator.Provider>
    );
}

// Extracting DashboardHome out of DashboardPage.tsx for better route management helper...


export default App;
