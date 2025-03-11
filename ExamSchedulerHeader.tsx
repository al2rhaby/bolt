// File: components/ExamScheduler/ExamSchedulerHeader.tsx

import React from 'react';
import { ArrowLeft, Plus, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ExamSchedulerHeaderProps {
  onNewExam: () => void;
  onStartImmediateExam: () => void;
  isPreselectedTest: boolean;
}

export default function ExamSchedulerHeader({
  onNewExam,
  onStartImmediateExam,
  isPreselectedTest
}: ExamSchedulerHeaderProps) {
  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Exam Schedule</h1>
              <p className="text-sm text-gray-500">Manage and schedule exams</p>
            </div>
          </div>
          {!isPreselectedTest && (
            <div className="flex items-center gap-4">
              <button
                onClick={onStartImmediateExam}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Immediate Exam
              </button>
              <button
                onClick={onNewExam}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Schedule New Exam
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
