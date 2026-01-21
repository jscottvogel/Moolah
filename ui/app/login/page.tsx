'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Authenticator, useAuthenticator, View } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// Separate component to use hooks inside Provider
function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialScreen = searchParams.get('screen') === 'signup' ? 'signUp' : 'signIn';
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);

    useEffect(() => {
        if (authStatus === 'authenticated') {
            router.push('/dashboard');
        }
    }, [authStatus, router]);

    return (
        <div className="w-full max-w-md glass-card p-6 rounded-2xl animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
                    Moolah
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                    {initialScreen === 'signUp' ? 'Create your account' : 'Sign in to your account'}
                </p>
            </div>
            <Authenticator
                initialState={initialScreen}
                socialProviders={[]}
                hideSignUp={false}
            >
                {/* We handle redirection via effect, so this might flash briefly or not render if redirected fast */}
                {() => (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="text-emerald-400 font-medium">Successfully verified!</div>
                        <div className="text-sm text-slate-400">Redirecting to dashboard...</div>
                    </div>
                )}
            </Authenticator>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
            <div className="absolute top-[-50%] left-[-20%] w-[100%] h-[100%] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none"></div>

            <Authenticator.Provider>
                <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
                    <LoginContent />
                </Suspense>
            </Authenticator.Provider>
        </div>
    );
}
