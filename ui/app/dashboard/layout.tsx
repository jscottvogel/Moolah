'use client';

import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    Wallet,
    TrendingUp,
    Settings,
    LogOut,
    Menu,
    ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Helper component to consume auth context
function DashboardNav() {
    const { signOut, user } = useAuthenticator((context) => [context.user]);
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/dashboard/holdings', label: 'Holdings', icon: Wallet },
        { href: '/dashboard/recommendation', label: 'Optimizer', icon: TrendingUp },
        { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl fixed h-full z-10">
                <div className="p-6 border-b border-border flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white">M</div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Moolah</span>
                </div>

                <div className="flex-1 py-6 px-4 space-y-2">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className={cn("w-full justify-start gap-3", pathname === item.href && "bg-secondary/50 font-bold text-primary")}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Button>
                        </Link>
                    ))}
                </div>

                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                            {user?.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.signInDetails?.loginId}</p>
                            <p className="text-xs text-muted-foreground">Basic Plan</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full gap-2 border-red-900/20 hover:bg-red-900/10 hover:text-red-400" onClick={signOut}>
                        <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none -z-10" />

                <header className="md:hidden h-16 border-b border-border flex items-center justify-between px-4 sticky top-0 bg-background/80 backdrop-blur z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-md"></div>
                        <span className="font-bold">Moolah</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <Menu className="w-6 h-6" />
                    </Button>
                </header>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed top-16 left-0 w-full bg-background/95 backdrop-blur z-20 border-b border-border p-4 space-y-2 animate-in slide-in-from-top-2">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="ghost" className="w-full justify-start gap-3">
                                    <item.icon className="w-5 h-5" /> {item.label}
                                </Button>
                            </Link>
                        ))}
                        <Button variant="destructive" className="w-full mt-4" onClick={signOut}>Sign Out</Button>
                    </div>
                )}

                <main className="flex-1">
                    {/* Disclaimer Bar */}
                    <div className="bg-yellow-900/20 border-b border-yellow-900/30 px-6 py-2 flex items-center justify-center gap-2 text-xs text-yellow-200/80">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Simulated Moolah MVP Environment. Market data may be mocked. Not financial advice.</span>
                    </div>
                    {/* Page Content */}
                    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
                        {/* Fade in content */}
                        <div className="animate-in fade-in duration-500">
                            {/* Children provided by page.tsx */}
                            {/* 
                     We need to render children here, but we can't pass them directly to DashboardNav 
                     unless we compose it in the parent. 
                     I will just return null here and let the parent handle layout if I wasn't doing this in a component.
                     
                     Wait, `DashboardNav` is returning the whole structure. 
                     I should pass `children` prop to `DashboardNav`.
                 */}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// Composition
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    return (
        <Authenticator.Provider>
            <AuthGuard>
                <DashboardLayoutContent>{children}</DashboardLayoutContent>
            </AuthGuard>
        </Authenticator.Provider>
    );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { authStatus } = useAuthenticator(context => [context.authStatus]);
    const router = useRouter();

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.push('/login');
        }
    }, [authStatus, router]);

    if (authStatus !== 'authenticated') {
        return <div className="h-screen w-full flex items-center justify-center text-slate-500">Authenticating...</div>
    }
    return <>{children}</>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { signOut, user } = useAuthenticator((context) => [context.user]);
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/dashboard/holdings', label: 'Holdings', icon: Wallet },
        { href: '/dashboard/recommendation', label: 'Optimizer', icon: TrendingUp },
        { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl fixed h-full z-10 transition-all top-0 left-0">
                <div className="p-6 border-b border-border flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white">M</div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Moolah</span>
                </div>

                <div className="flex-1 py-6 px-4 space-y-2">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className={cn("w-full justify-start gap-3", pathname === item.href && "bg-secondary/50 font-bold text-primary")}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Button>
                        </Link>
                    ))}
                </div>

                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                            {user?.signInDetails?.loginId?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.signInDetails?.loginId}</p>
                            <p className="text-xs text-muted-foreground">Basic Plan</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full gap-2 border-red-900/20 hover:bg-red-900/10 hover:text-red-400" onClick={signOut}>
                        <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none -z-10" />

                <header className="md:hidden h-16 border-b border-border flex items-center justify-between px-4 sticky top-0 bg-background/80 backdrop-blur z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white">M</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <Menu className="w-6 h-6" />
                    </Button>
                </header>

                {mobileMenuOpen && (
                    <div className="md:hidden fixed top-16 left-0 w-full bg-background/95 backdrop-blur z-20 border-b border-border p-4 space-y-2 animate-in slide-in-from-top-2">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="ghost" className="w-full justify-start gap-3">
                                    <item.icon className="w-5 h-5" /> {item.label}
                                </Button>
                            </Link>
                        ))}
                        <Button variant="destructive" className="w-full mt-4" onClick={signOut}>Sign Out</Button>
                    </div>
                )}

                <main className="flex-1 flex flex-col">
                    <div className="bg-yellow-900/20 border-b border-yellow-900/30 px-6 py-2 flex items-center justify-center gap-2 text-xs text-yellow-200/80">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Simulated Moolah MVP Environment.</span>
                    </div>
                    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex-1">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
