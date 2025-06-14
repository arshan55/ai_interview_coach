'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

interface Interview {
  _id: string;
  role: string;
  programmingLanguage?: string;
  date: string;
  overallScore?: number;
}

const ProfilePage = () => {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the environment variable directly for all backend calls
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        if (!backendUrl) {
          setError('Backend URL is not configured.');
          setLoading(false);
          return;
        }

        const userDataResponse = await fetch(`${backendUrl}/api/auth`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!userDataResponse.ok) {
          if (userDataResponse.status === 401) {
            localStorage.removeItem('token');
            router.push('/login');
            return;
          }
          const errorData = await userDataResponse.json();
          throw new Error(errorData.error || 'Failed to fetch user profile');
        }

        const user = await userDataResponse.json();
        setUserProfile(user);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [router, backendUrl]); // Add backendUrl to dependency array

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white">
        <p className="text-xl">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white">
        <p className="text-red-500 text-xl mb-4">Error: {error}</p>
          <button
          onClick={handleLogout}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
          Logout
          </button>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 text-white">
        <p className="text-yellow-500 text-xl mb-4">User profile not found. Please login again.</p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome, {userProfile.name}!</h1>
            <button
              onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">User Details</h2>
          <p className="text-lg">Email: {userProfile.email}</p>
          {userProfile.profilePicture && (
            <img src={userProfile.profilePicture} alt="Profile" className="w-24 h-24 rounded-full mt-4" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;