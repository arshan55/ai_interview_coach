'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

interface User {
  _id: string;
  name: string;
  email: string;
  date: string;
}

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const userDataResponse = await fetch(`${backendUrl}/api/auth`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!userDataResponse.ok) {
          const userDataError = await userDataResponse.json();
          throw new Error(userDataError.msg || 'Failed to fetch user data');
        }

        const userData: User = await userDataResponse.json();
        setUser(userData);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load profile data';
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <p className="text-white text-xl mt-4">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <div className="bg-red-800 p-6 rounded-lg w-full max-w-md text-center">
          <svg className="h-12 w-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-red-300 text-lg font-semibold mb-2">Error</h3>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <p className="text-white text-xl">Please log in to view your profile</p>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Your Profile</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-3xl font-bold">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <p className="text-xl font-semibold mt-4">{user.name}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <p className="text-gray-400 text-sm">Joined: {formatDateTime(user.date)}</p>
            </div>

            <div className="mt-8">
              <button
                onClick={() => router.push('/interview/role-select')}
                className="px-6 py-3 bg-green-600 text-white font-bold text-lg rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Start New Interview
              </button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default ProfilePage;