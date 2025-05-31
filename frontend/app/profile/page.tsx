'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  name: string;
  email: string;
  date: string;
  interviews: Interview[];
}

interface Interview {
  _id: string;
  questions: Question[];
  date: string;
  role?: string;
  programmingLanguage?: string;
}

interface Question {
  questionText: string;
  answerText: string | null;
  feedback: string | null;
  score: number | null;
  codeAnswer?: string | null;
  programmingLanguage?: string | null;
  codeFeedback?: string | null;
  codeScore?: number | null;
}

// Delete Confirmation Modal Component
const DeleteModal = ({ isOpen, onClose, onConfirm, interviewRole }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  interviewRole?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-4">Delete Interview</h3>
        <p className="text-gray-300 mb-6">
          Are you sure you want to delete this {interviewRole ? interviewRole.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : ''} interview? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<{ id: string; role?: string } | null>(null);
  const router = useRouter();

  // Calculate average score for an interview
  const calculateAverageScore = (interview: Interview) => {
    const scores = interview.questions
      .map(q => q.score !== null ? q.score : 0)
      .filter(score => score > 0);
    
    if (scores.length === 0) return 0;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

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

  const handleDeleteClick = (interview: Interview) => {
    setInterviewToDelete({ id: interview._id, role: interview.role });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!interviewToDelete) return;

    try {
      setDeletingId(interviewToDelete.id);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/interviews/${interviewToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete interview');
      }

      // Update the user state to remove the deleted interview
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          interviews: prev.interviews.filter(i => i._id !== interviewToDelete.id)
        };
      });
    } catch (err) {
      console.error('Error deleting interview:', err);
      alert('Failed to delete interview. Please try again.');
    } finally {
      setDeletingId(null);
      setDeleteModalOpen(false);
      setInterviewToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setInterviewToDelete(null);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.msg || 'Failed to fetch user data');
        }

        const data = await response.json();
        setUser(data);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <p className="text-white text-xl">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <p className="text-red-500 text-xl">Error: {error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
        <p className="text-white text-xl">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Your Profile</h1>

        {/* User Info */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          <h2 className="text-2xl font-semibold mb-4">Welcome, {user.name}!</h2>
          <p className="text-gray-300 mb-4">Email: {user.email}</p>

          {/* Start New Interview Button */}
          <button
            onClick={() => router.push('/interview/role-select')}
            className="mt-4 px-6 py-3 bg-blue-600 text-white font-bold text-lg rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start New Interview
          </button>

        </div>

        {/* Past Interviews */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold mb-4">Your Past Interviews</h2>

          {user.interviews && user.interviews.length > 0 ? (
            <ul className="space-y-4">
              {user.interviews.map(interview => (
                <li key={interview._id} className="bg-gray-700 p-4 rounded-md flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold">{interview.role?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                    {interview.programmingLanguage && (
                      <p className="text-sm text-gray-400">Language: {interview.programmingLanguage}</p>
                    )}
                    <p className="text-sm text-gray-400">{formatDateTime(interview.date)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                     {/* View Details button */}
                     <button
                       onClick={() => router.push(`/interview/${interview._id}`)}
                       className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                     >
                        View Details
                     </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteClick(interview)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
                      disabled={deletingId === interview._id}
                    >
                      {deletingId === interview._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">You haven't completed any interviews yet.</p>
          )}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      <DeleteModal 
         isOpen={deleteModalOpen} 
         onClose={handleDeleteCancel} 
         onConfirm={handleDeleteConfirm}
         interviewRole={interviewToDelete?.role}
      />
    </div>
  );
};

export default ProfilePage;