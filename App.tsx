
import React, { useState, useEffect } from 'react';
import { CustomerApp } from './pages/CustomerApp';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { LoginPage } from './pages/LoginPage';
import { AppMode } from './types';
import { Smartphone, Monitor, ArrowRight, ScanLine, QrCode } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  // Mock authentication state persistence
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
      return localStorage.getItem('mm_auth') === 'true';
  });
  const [targetMode, setTargetMode] = useState<AppMode | null>(null);

  const handleModeSelect = (selectedMode: AppMode) => {
    if (selectedMode === AppMode.CUSTOMER) {
        // Customer flow does not require login in this design
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
      setIsAuthenticated(true);
      localStorage.setItem('mm_auth', 'true');
      if (targetMode) {
          setMode(targetMode);
          setTargetMode(null);
      } else {
          setMode(AppMode.OWNER);
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('mm_auth');
      setMode(AppMode.LANDING);
  }

  if (mode === AppMode.LOGIN && targetMode) {
      return <LoginPage onLoginSuccess={handleLoginSuccess} targetMode={targetMode} />;
  }

  if (mode === AppMode.CUSTOMER) {
    return <CustomerApp onNavigateToDashboard={() => setMode(AppMode.LANDING)} />;
  }

  if (mode === AppMode.OWNER) {
    return <OwnerDashboard onNavigateToCustomer={() => setMode(AppMode.CUSTOMER)} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden selection:bg-white selection:text-black">
      
      {/* Subtle Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-50" />

      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-20">
            <div className="inline-block mb-6 relative">
                <h1 className="text-7xl font-bold text-white tracking-tighter relative z-10">
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
                className="group relative bg-black border border-zinc-800 p-10 text-left hover:bg-zinc-900 transition-all duration-500 hover:border-white/50 flex flex-col items-center text-center"
            >
                <div className="w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform">
                     <QrCode size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-medium text-white mb-2">Scan QR Code</h2>
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
                className="group relative bg-zinc-900/50 border border-zinc-800 p-10 text-left hover:bg-black transition-all duration-500 hover:border-white/50 flex flex-col items-center text-center"
            >
                <div className="w-16 h-16 bg-zinc-800 text-white rounded-2xl flex items-center justify-center mb-6 border border-zinc-700 group-hover:bg-zinc-800 transition-colors">
                     <Monitor size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-medium text-white mb-2">Business Login</h2>
                <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                    Manage your menu and view analytics.
                </p>
                <div className="mt-auto border border-zinc-700 text-zinc-400 text-xs font-bold px-4 py-2 rounded-full group-hover:border-white group-hover:text-white transition-colors">
                    ACCESS DASHBOARD
                </div>
            </button>
        </div>

        <div className="mt-24 flex flex-col items-center gap-4">
            <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em]">System Version 1.0.5</p>
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
