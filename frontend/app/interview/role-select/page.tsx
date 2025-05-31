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

const RoleSelectPage = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleStartInterview = () => {
    console.log('Start Interview button clicked');
    console.log('Selected role:', selectedRole);
    console.log('Selected language:', selectedLanguage);

    if (!selectedRole) {
      console.log('Role not selected, setting error');
      setError('Please select a role');
      return;
    }

    const role = roles.find(r => r.id === selectedRole);
    console.log('Found role details:', role);

    if (role?.isTechnical && !selectedLanguage) {
      console.log('Technical role selected, but language is missing, setting error');
      setError('Please select a programming language');
      return;
    }

    console.log('Validation passed, preparing to store data and navigate');
    // Store the selections in localStorage with the correct key
    const roleData = {
      role: selectedRole,
      programmingLanguage: role?.isTechnical ? selectedLanguage : undefined
    };
    console.log('Storing role data:', roleData);
    localStorage.setItem('selectedRole', JSON.stringify(roleData));

    // Navigate to the interview page
    console.log('Navigating to /interview');
    router.push('/interview');
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            Select Your Interview Role
          </h1>
          <p className="mt-3 text-xl text-gray-300">
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
              className={`relative rounded-lg border p-6 cursor-pointer transition-colors ${
                selectedRole === role.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
              }`}
              onClick={() => setSelectedRole(role.id)}
            >
              <h3 className="text-lg font-medium text-white">{role.title}</h3>
              <p className="mt-2 text-sm text-gray-300">{role.description}</p>
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
            <label htmlFor="language" className="block text-sm font-medium text-gray-300">
              Select Programming Language
            </label>
            <select
              id="language"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-800 text-white"
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

        <div className="mt-8">
          <button
            onClick={handleStartInterview}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectPage; 