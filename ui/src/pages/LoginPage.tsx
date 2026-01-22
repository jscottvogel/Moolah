import { Authenticator, useTheme, View, Image, Text, Heading, useAuthenticator, Button } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const components = {
    Header() {
        return (
            <View textAlign="center" padding="large">
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl">M</div>
                    <Heading level={3} color="white">Moolah</Heading>
                </div>
            </View>
        );
    },
    Footer() {
        return (
            <View textAlign="center" padding="large">
                <Text color="gray">&copy; {new Date().getFullYear()} Moolah Inc.</Text>
            </View>
        );
    },
};

export default function LoginPage() {
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (authStatus === 'authenticated') {
            navigate('/dashboard', { replace: true });
        }
    }, [authStatus, navigate]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950">
            <Authenticator components={components}>
                {({ signOut, user }) => (
                    <main>
                        <h1>Hello {user?.username}</h1>
                        <button onClick={signOut}>Sign out</button>
                    </main>
                )}
            </Authenticator>
        </div>
    );
}
