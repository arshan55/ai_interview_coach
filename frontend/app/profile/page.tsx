'use client';

import React, { useEffect, useState } from 'react';
// Navigation is already included in the layout, so do not import or render it here

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalInterviews, setTotalInterviews] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          setUserProfile(null);
          setLoading(false);
          return;
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/auth`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          setUserProfile(null);
        } else {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (err) {
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    // Fetch total interviews
    const fetchTotalInterviews = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/interviews/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setTotalInterviews(Array.isArray(data) ? data.length : (data.total || 0));
        }
      } catch {}
    };
    fetchTotalInterviews();
  }, []);

  useEffect(() => {
    // Set initial avatar from userProfile or localStorage
    if (userProfile) {
      setSelectedAvatar(userProfile.avatar || localStorage.getItem('selectedAvatar') || avatars[0]);
    }
  }, [userProfile]);

  const avatars = [
    '/man (1).png',
    '/man.png',
    '/woman (1).png',
    '/woman.png',
  ];
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('selectedAvatar', avatar);
    setShowAvatarModal(false);
    // Optionally, update backend with new avatar if API allows
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col justify-center items-center">
        <p className="text-xl text-gray-700">Loading profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col justify-center items-center">
        <p className="text-yellow-500 text-xl mb-4">User profile not found. Please login again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] relative" style={{ backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 w-full h-full bg-white/70 z-0 pointer-events-none" />
      <div className="relative z-10">
        <div className="max-w-3xl mx-auto py-8 sm:py-12 lg:py-16 px-4 sm:px-6 flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">
              Welcome, <span className="text-blue-600">{userProfile.name || userProfile.email}</span>!
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-700 mb-6 lg:mb-8">
              Practice interviews anytime, get feedback instantly, and boost your confidence with every session.
            </p>
          </div>
          {userProfile && (
            <>
          <div className="flex-1 flex flex-col items-center bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-slate-200 w-full max-w-sm mx-auto">
              <img
                  src={selectedAvatar || userProfile.avatar || userProfile.profilePicture || '/logoo.png'}
                alt="Profile"
                  className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full mb-3 sm:mb-4 border-4 border-blue-200 shadow cursor-pointer"
                  onClick={() => setShowAvatarModal(true)}
                />
                {showAvatarModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
                    <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-slate-200 relative max-w-sm w-full mx-4">
                      <button
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl sm:text-2xl font-bold"
                        onClick={() => setShowAvatarModal(false)}
                        aria-label="Close"
                      >
                        &times;
                      </button>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 text-center">Choose Your Avatar</h3>
                      <div className="flex gap-3 sm:gap-4 lg:gap-6 justify-center flex-wrap">
                        {avatars.map((avatar) => (
                          <img
                            key={avatar}
                            src={avatar}
                            alt="Avatar"
                            className={`w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full border-4 cursor-pointer transition-all duration-200 ${selectedAvatar === avatar ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                            onClick={() => handleAvatarSelect(avatar)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
            )}
            <div className="text-center">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 text-gray-800">User Details</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-700">Email: {userProfile.email}</p>
                  {typeof totalInterviews === 'number' && (
                    <p className="text-sm sm:text-base lg:text-lg text-gray-700 mt-2">Total Interviews: <span className="font-bold">{totalInterviews}</span></p>
                  )}
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}