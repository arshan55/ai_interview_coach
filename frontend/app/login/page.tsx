'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  return (
    <div className="min-h-screen relative flex items-center justify-center" style={{ background: "url('/background.jpg'), linear-gradient(135deg, #e0e7ef 0%, #f8fafc 100%)", backgroundBlendMode: 'overlay', backgroundSize: 'cover' }}>
      <div className="absolute inset-0 bg-white/70 z-0" />
      <div className="relative z-10 flex justify-center items-center min-h-[80vh] w-full">
        <div className="flex flex-col md:flex-row gap-8 bg-transparent p-4 rounded-xl">
          {/* Login Card */}
          <div className="bg-white/90 rounded-xl shadow-2xl p-8 w-[350px] flex flex-col justify-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">Welcome Back</h2>
            {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-2 text-center text-sm">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1">Login</label>
                <input
                  type="text"
                  placeholder="Email or phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-blue-600" />
                  Remember me
                </label>
                <a href="#" className="text-blue-600 hover:underline">Forgot password?</a>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full mt-4 flex items-center justify-center gap-2 border border-gray-300 py-2 rounded hover:bg-gray-100 transition"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
            <div className="text-center mt-4 text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-blue-600 hover:underline">Sign up now</a>
            </div>
          </div>
          {/* Illustration */}
          <div className="bg-white/90 rounded-xl shadow-2xl flex items-center justify-center p-8 min-w-[350px]">
            <img
              src="/logoo.png"
              alt="Login Illustration"
              className="max-w-[260px] w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 