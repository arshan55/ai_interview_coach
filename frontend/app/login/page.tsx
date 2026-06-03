'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isDevLoginEnabled } from '@/lib/devAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      if (!data.token) {
        throw new Error('No token received');
      }
      localStorage.setItem('token', data.token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDevLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/dev-login', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Dev login failed');
      }
      if (!data.token) {
        throw new Error('No token received');
      }
      localStorage.setItem('token', data.token);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ 
      background: "url('/background.jpg')", 
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/70" />
      
      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center justify-center">
          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
              <p className="text-gray-600 text-sm">Sign in to your account</p>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 text-sm font-medium">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2 text-sm font-medium">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              <span className="font-medium">Continue with Google</span>
            </button>

            {isDevLoginEnabled && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-amber-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-amber-700 font-medium">Development only</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDevLogin}
                  disabled={loading}
                  className={`w-full border-2 border-dashed border-amber-400 bg-amber-50 text-amber-900 py-3 rounded-lg font-semibold hover:bg-amber-100 transition-all duration-200 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Signing in...' : 'Dev login (skip auth)'}
                </button>
                <p className="text-xs text-amber-700/80 text-center mt-2">
                  Not included in production — set ENABLE_DEV_LOGIN only locally.
                </p>
              </>
            )}
            
            <div className="text-center mt-6 text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                Sign up now
              </a>
            </div>
          </div>
          
          {/* Illustration - Hidden on mobile, shown on larger screens */}
          <div className="hidden lg:flex bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl items-center justify-center p-8 min-w-[400px]">
            <div className="text-center">
              <img
                src="/logoo.png"
                alt="Login Illustration"
                className="max-w-[300px] w-full mx-auto"
              />
              <h3 className="text-xl font-semibold text-gray-800 mt-4">AI Interview Coach</h3>
              <p className="text-gray-600 mt-2">Practice makes perfect</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 