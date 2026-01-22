import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

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
                        <Route path="/dashboard/*" element={<DashboardPage />} />
                        {/* Fallback to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </Router>
        </Authenticator.Provider>
    );
}

export default App;
