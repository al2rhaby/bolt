// File: components/ExamScheduler/ExamList.tsx

import React from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { ScheduledExam } from './types';
import { formatDate, getStatusColor } from './utils';

interface ExamListProps {
  exams: ScheduledExam[];
  loading: boolean;
  error: string | null;
  onRetryLoad: () => void;
  onEditExam: (exam: ScheduledExam) => void;
}

export default function ExamList({
  exams,
  loading,
  error,
  onRetryLoad,
  onEditExam
}: ExamListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading scheduled exams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <p>{error}</p>
        </div>
        <button
          onClick={onRetryLoad}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="mb-4">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Scheduled</h3>
        <p className="text-gray-500">Click "Schedule New Exam" to create your first exam schedule.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exams.map((exam) => (
        <div key={exam.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
              <p className="text-sm text-gray-500">
                {exam.type === 'TOEFL' ? 'TOEFL Exam - All Students' : `${exam.carrera} - Semester ${exam.semestre} - Group ${exam.grupo}`}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(exam.status)}`}>
              {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium text-gray-900">
                {formatDate(exam.date)} at {exam.time}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium text-gray-900">{exam.duration} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Salons</p>
              <p className="font-medium text-gray-900">
                {exam.type === 'TOEFL' ? 'All Salons' : (exam.salons?.join(', ') || 'No salons assigned')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Professor</p>
              <p className="font-medium text-gray-900">{exam.profesor}</p>
              <button
                onClick={() => onEditExam(exam)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Edit Schedule
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
