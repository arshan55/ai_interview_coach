'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function InterviewTopBar({ title }: { title?: string }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-3 mb-4 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit interview
        </Link>
        {title && <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>}
      </div>
    </div>
  );
}
