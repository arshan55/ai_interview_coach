'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, User } from 'lucide-react';
import Image from 'next/image';

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
      setIsLoggedIn(!!updatedToken);
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

  const handleSmoothScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavScroll = (sectionId: string) => {
    if (pathname === '/') {
      // Already on home, smooth scroll
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Not on home, set flag and navigate
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('scrollToSection', sectionId);
      }
      router.push('/');
    }
  };

  // Don't render on interview page - Adjusted condition
  if (pathname.startsWith('/interview/')) { // Only hide on actual interview detail pages
    return null;
  }

  return (
    <nav className="relative z-10 flex justify-between items-center p-3 bg-[#D9E2EC] border-b border-slate-300">
      <div className="flex items-center space-x-3">
        <a href="/">
          <Image
            src="/Group1.png"
            alt="Logo"
            width={250}
            height={250}
            className="rounded-full"
          />
        </a>
      </div>
      <div className="flex items-center space-x-8">
        <Link href="/" className="px-4 py-2 bg-white rounded-lg text-slate-700 hover:text-teal-700 hover:bg-teal-50 font-medium transition-colors shadow-sm">
          Home
        </Link>
        <button
          type="button"
          className="px-4 py-2 bg-white rounded-lg text-slate-700 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer shadow-sm"
          onClick={() => handleNavScroll('features')}
        >
          Features
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-white rounded-lg text-slate-700 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer shadow-sm"
          onClick={() => handleNavScroll('about-footer')}
        >
          About Us
        </button>
        {isLoggedIn ? (
          <>
            <Link href="/profile" className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center hover:bg-teal-200 transition-colors" title="Profile">
              <User className="w-5 h-5 text-teal-700" />
            </Link>
            <button 
              onClick={handleLogout}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-teal-600" />
            </div>
            <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors font-medium ml-2">
              Sign In
            </Link>
            <Link href="/register" className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:text-teal-700 hover:bg-blue-50 transition-colors font-medium ml-2">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 