'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const roles = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    description: 'General software engineering and development questions',
    isTechnical: true
  },
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    description: 'Frontend development, UI/UX, and web technologies',
    isTechnical: true
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    description: 'Server-side development, databases, and APIs',
    isTechnical: true
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    description: 'Data analysis, machine learning, and statistics',
    isTechnical: true
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    description: 'Product strategy, user research, and market analysis',
    isTechnical: false
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    description: 'Infrastructure, automation, and deployment',
    isTechnical: true
  }
];

const programmingLanguages = [
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'Ruby',
  'Go',
  'Rust',
  'TypeScript',
  'PHP',
  'C#'
];

const roleColors: Record<string, string> = {
  'software-engineer': 'bg-yellow-200',
  'frontend-developer': 'bg-pink-200',
  'backend-developer': 'bg-green-200',
  'data-scientist': 'bg-purple-200',
  'product-manager': 'bg-orange-200',
  'devops-engineer': 'bg-blue-200',
};

const RoleSelectPage = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleStartInterview = () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    const role = roles.find(r => r.id === selectedRole);

    if (role?.isTechnical && !selectedLanguage) {
      setError('Please select a programming language');
      return;
    }

    // Store the selections in localStorage with the correct key
    const roleData = {
      role: selectedRole,
      programmingLanguage: role?.isTechnical ? selectedLanguage : undefined,
    };
    localStorage.setItem('selectedRole', JSON.stringify(roleData));

    // Navigate to the interview page
    router.push('/interview');
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] relative" style={{ backgroundImage: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 w-full h-full bg-white/70 z-0 pointer-events-none" />
      <div className="relative z-10">
        <div className="max-w-3xl mx-auto min-h-[80vh] flex flex-col justify-start">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-black sm:text-4xl">
              Select Your Interview Role
            </h1>
            <p className="mt-3 text-xl text-gray-800">
              Choose the role you want to practice interviewing for
            </p>
          </div>

          {error && (
            <div className="mt-4 bg-red-500 text-white p-3 rounded-md text-center">
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`relative cursor-pointer transition-transform transform hover:-translate-y-1 hover:shadow-xl
                  rounded-xl shadow-lg border-4 border-black
                  ${roleColors[role.id]} ${selectedRole === role.id ? 'ring-4 ring-blue-400' : ''}
                  p-6`}
                onClick={() => setSelectedRole(role.id)}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{role.title}</h3>
                <p className="text-gray-700">{role.description}</p>
                {selectedRole === role.id && (
                  <div className="absolute top-2 right-2">
                    <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedRole && roles.find(r => r.id === selectedRole)?.isTechnical && (
            <div className="mt-8">
              <label htmlFor="language" className="block text-sm font-medium text-black">
                Select Programming Language
              </label>
              <select
                id="language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-2 border-black shadow-lg rounded-xl bg-white text-black"
              >
                <option value="">Select a language</option>
                {programmingLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-8 mb-8">
            <button
              onClick={handleStartInterview}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Start Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectPage; 