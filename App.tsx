import type { Session } from "@supabase/supabase-js";
import {
    ArrowRight,
    Monitor,
    Moon,
    QrCode,
    ScanLine,
    Smartphone,
    Sun,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { LoadingScreen } from "@minute-menus/ui";
import { devMenuSlug, devSkipOwnerLogin } from "./lib/devFlags";
import { useRestaurantSlugRoute } from "./hooks/useRestaurantSlugRoute";
import { CustomerApp } from "./pages/CustomerApp";
import { LoginPage } from "./pages/LoginPage";
import { OwnerDashboard } from "./pages/OwnerDashboard";
import { AppMode } from "@minute-menus/types";

const App: React.FC = () => {
    const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
    const [session, setSession] = useState<Session | null>(null);
    const [targetMode, setTargetMode] = useState<AppMode | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isDarkTheme, setIsDarkTheme] = useState(true);

    const slugRoute = useRestaurantSlugRoute();
    const restaurantSlug = slugRoute.slug;
    const restaurantId = slugRoute.id;
    const restaurantName = slugRoute.name;
    const restaurantCurrency = slugRoute.currency;
    const slugLoading = slugRoute.loading;
    const slugError = slugRoute.error;

    const toggleTheme = () => setIsDarkTheme((prev) => !prev);

    const skipOwnerLogin = devSkipOwnerLogin();

    useEffect(() => {
        const useThemedShell = mode === AppMode.CUSTOMER || mode === AppMode.OWNER;
        document.body.className = useThemedShell && !isDarkTheme
            ? "bg-white text-black overflow-hidden"
            : "bg-gray-900 text-white overflow-hidden";
    }, [isDarkTheme, mode]);

    useEffect(() => {
        if (slugRoute.slug) setMode(AppMode.CUSTOMER);
    }, [slugRoute.slug]);

    useEffect(() => {
        if (skipOwnerLogin && !slugRoute.slug && mode === AppMode.LANDING) {
            setMode(AppMode.OWNER);
        }
    }, [skipOwnerLogin, slugRoute.slug, mode]);

    // Restore session on mount and listen for auth state changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setAuthLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                setSession(newSession);
                // Auto-redirect to dashboard after OAuth callback
                if (newSession && mode === AppMode.LOGIN) {
                    setMode(targetMode ?? AppMode.OWNER);
                    setTargetMode(null);
                }
            },
        );

        return () => listener.subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isAuthenticated = session !== null || skipOwnerLogin;

    const handleModeSelect = (selectedMode: AppMode) => {
        if (selectedMode === AppMode.CUSTOMER) {
            setMode(AppMode.CUSTOMER);
        } else if (selectedMode === AppMode.OWNER) {
            if (isAuthenticated) {
                setMode(AppMode.OWNER);
            } else {
                setTargetMode(AppMode.OWNER);
                setMode(AppMode.LOGIN);
            }
        }
    };

    const handleLoginSuccess = () => {
        setMode(targetMode ?? AppMode.OWNER);
        setTargetMode(null);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setMode(AppMode.LANDING);
    };

    if (authLoading) {
        return <LoadingScreen />;
    }

    if (slugLoading) {
        return <LoadingScreen label="Loading restaurant..." />;
    }

    // Error state for invalid restaurant slug
    if (slugError) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <QrCode size={32} className="text-zinc-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Restaurant Not Found</h1>
                    <p className="text-zinc-400 mb-6">{slugError}</p>
                    <button
                        onClick={() => {
                            slugRoute.resetRestaurantContext();
                            window.history.pushState({}, "", "/");
                            setMode(AppMode.LANDING);
                        }}
                        className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition-colors"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (mode === AppMode.LOGIN && targetMode && !skipOwnerLogin) {
        return (
            <LoginPage onLoginSuccess={handleLoginSuccess} targetMode={targetMode} />
        );
    }

    if (mode === AppMode.CUSTOMER) {
        return (
            <CustomerApp
                onNavigateToDashboard={() => {
                    slugRoute.resetRestaurantContext();
                    window.history.pushState({}, "", "/");
                    setMode(AppMode.LANDING);
                }}
                isDarkTheme={isDarkTheme}
                onToggleTheme={toggleTheme}
                restaurantSlug={restaurantSlug}
                restaurantId={restaurantId}
                restaurantName={restaurantName}
                currency={restaurantCurrency}
            />
        );
    }

    if (mode === AppMode.OWNER) {
        return (
            <OwnerDashboard
                onNavigateToCustomer={() => setMode(AppMode.CUSTOMER)}
                onSignOut={handleLogout}
                isDarkTheme={isDarkTheme}
                onToggleTheme={toggleTheme}
            />
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden selection:bg-white selection:text-black">
            {/* Subtle Gradient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-50" />

            <div className="max-w-4xl w-full relative z-10">
                <div className="text-center mb-10 md:mb-20">
                    <div className="inline-block mb-6 relative">
                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white tracking-tighter relative z-10">
                            MINUTE<span className="font-light text-zinc-500">MENUS</span>
                        </h1>
                        {isAuthenticated && (
                            <div className="absolute -top-4 -right-4 bg-white text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg rotate-12">
                                LOGGED IN
                            </div>
                        )}
                    </div>

                    <div className="h-[1px] w-24 bg-white mx-auto mb-6"></div>
                    <p className="text-lg text-zinc-400 max-w-xl mx-auto font-light leading-relaxed">
                        The high-velocity visual ordering platform.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Customer Card - Simulates QR Scan */}
                    <button
                        onClick={() => handleModeSelect(AppMode.CUSTOMER)}
                        className="group relative bg-black border border-zinc-800 p-6 md:p-10 text-left hover:bg-zinc-900 transition-all duration-500 hover:border-white/50 flex flex-col items-center text-center"
                    >
                        <div className="w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform">
                            <QrCode size={32} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-medium text-white mb-2">
                            Scan QR Code
                        </h2>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                            Launch the camera to view the menu instantly.
                        </p>
                        <div className="mt-auto bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-full group-hover:bg-white group-hover:text-black transition-colors">
                            SIMULATE SCAN
                        </div>
                    </button>

                    {/* Owner Card - Business Login */}
                    <button
                        onClick={() => handleModeSelect(AppMode.OWNER)}
                        className="group relative bg-zinc-900/50 border border-zinc-800 p-6 md:p-10 text-left hover:bg-black transition-all duration-500 hover:border-white/50 flex flex-col items-center text-center"
                    >
                        <div className="w-16 h-16 bg-zinc-800 text-white rounded-2xl flex items-center justify-center mb-6 border border-zinc-700 group-hover:bg-zinc-800 transition-colors">
                            <Monitor size={32} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-medium text-white mb-2">
                            Business Login
                        </h2>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                            Manage your menu and view analytics.
                        </p>
                        <div className="mt-auto border border-zinc-700 text-zinc-400 text-xs font-bold px-4 py-2 rounded-full group-hover:border-white group-hover:text-white transition-colors">
                            ACCESS DASHBOARD
                        </div>
                    </button>
                </div>

                <div className="mt-10 md:mt-24 flex flex-col items-center gap-4">
                    <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em]">
                        System Version 1.0.5
                    </p>
                    {isAuthenticated && (
                        <button
                            onClick={handleLogout}
                            className="text-xs text-zinc-500 hover:text-white underline"
                        >
                            Sign Out
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
