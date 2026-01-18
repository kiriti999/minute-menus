
import React, { useState } from 'react';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
  targetMode: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, targetMode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setError('');
    // Simulate Google OAuth latency and popup behavior
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 1500);
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
       setError('Password must be at least 6 characters.');
       return;
    }

    setIsLoading(true);
    
    // Simulate API Request
    setTimeout(() => {
      setIsLoading(false);
      // Mock validation: simplistic check
      if (email.includes('@')) {
         onLoginSuccess();
      } else {
         setError('Please enter a valid email address.');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-black to-black opacity-50" />
      
      <div className="relative z-10 w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white rounded-lg mx-auto flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
             <span className="font-bold text-black text-xl">M</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {isSignUp ? 'Get started with ' : 'Sign in to '} 
            <span className="text-white font-medium">{targetMode === 'CUSTOMER' ? 'Digital Menu' : 'Owner Dashboard'}</span>
          </p>
        </div>

        {/* Error Message */}
        {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
             {/* Email Input */}
             <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-black/50 border border-zinc-700 text-white pl-10 pr-4 py-3 rounded-lg outline-none focus:border-white transition-all placeholder-zinc-600 text-sm"
                />
             </div>

             {/* Password Input */}
             <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-black/50 border border-zinc-700 text-white pl-10 pr-10 py-3 rounded-lg outline-none focus:border-white transition-all placeholder-zinc-600 text-sm"
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
             </div>

             {/* Login Button */}
             <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
             >
                {isLoading ? (
                   <Loader2 className="animate-spin mx-auto" size={20} />
                ) : (
                   isSignUp ? 'Sign Up' : 'Log In'
                )}
             </button>
        </form>

        {/* Forgot Password (Login Mode Only) */}
        {!isSignUp && (
             <div className="text-center mt-4">
                <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                    Forgot your password?
                </button>
             </div>
        )}

        {/* Divider */}
        <div className="relative py-6">
             <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
             </div>
             <div className="relative flex justify-center">
                <span className="bg-zinc-900 px-3 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Or continue with</span>
             </div>
        </div>

        {/* Google Button */}
        <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-black/50 border border-zinc-700 hover:bg-zinc-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
        >
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
             </svg>
             <span>Google</span>
        </button>

        {/* Switch Mode */}
        <div className="text-center mt-8 pt-4 border-t border-zinc-800/50">
             <p className="text-sm text-zinc-500">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
                <button 
                    onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError('');
                    }}
                    className="text-white font-bold hover:underline"
                >
                    {isSignUp ? "Log In" : "Sign Up"}
                </button>
             </p>
        </div>
      </div>
    </div>
  );
};
