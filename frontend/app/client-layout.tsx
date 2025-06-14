'use client';

import Navigation from '../components/Navigation';
import { AuthProvider } from '../contexts/AuthContext';
import { InterviewProvider } from '../contexts/InterviewContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <InterviewProvider>
        <Navigation />
        {children}
      </InterviewProvider>
    </AuthProvider>
  );
} 