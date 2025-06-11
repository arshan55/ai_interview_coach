'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const Navigation = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for token in localStorage to determine login status
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token); // Set isLoggedIn to true if token exists

    // Listen for changes in localStorage (e.g., login/logout)
    const handleStorageChange = () => {
      const updatedToken = localStorage.getItem('token');
      console.log('Storage change detected. Token:', updatedToken);
      setIsLoggedIn(!!updatedToken);
      console.log('isLoggedIn after storage change:', !!updatedToken);
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    // Redirect to login page after logout
    router.push('/login');
  };

  // Don't render on interview page - Adjusted condition
  if (pathname.startsWith('/interview/')) { // Only hide on actual interview detail pages
    return null;
  }

  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
            AI Interview Coach
        </Link>
        <div>
          {isLoggedIn ? (
            // Show Home, Profile, and Logout when logged in
            <div className="flex space-x-4">
              <Link href="/" className="hover:underline">
                  Home
              </Link>
              <Link href="/profile" className="hover:underline">
                  Profile
              </Link>
              <button onClick={handleLogout} className="hover:underline">
                Logout
              </button>
            </div>
          ) : (
            // Show Login and Register when not logged in
            <div className="flex space-x-4">
              <Link href="/login" className="hover:underline">
                  Login
              </Link>
              <Link href="/register" className="hover:underline">
                  Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 