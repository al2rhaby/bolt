// File: components/ExamScheduler/modals/NewExamModal.tsx

import React from 'react';
import { X } from 'lucide-react';
import { SavedTest } from '../types';

interface NewExamModalProps {
  onClose: () => void;
  onSchedule: () => void;
  newExam: {
    date: string;
    time: string;
    duration: string;
    examName?: string;
  };
  setNewExam: React.Dispatch<React.SetStateAction<{
    date: string;
    time: string;
    duration: string;
    examName: string;
  }>>;
  selectedTest: SavedTest | null;
  setSelectedTest: React.Dispatch<React.SetStateAction<SavedTest | null>>;
  savedTests: SavedTest[];
  error: string | null;
  isPreselectedTest: boolean;
}

export default function NewExamModal({
  onClose,
  onSchedule,
  newExam,
  setNewExam,
  selectedTest,
  setSelectedTest,
  savedTests,
  error,
  isPreselectedTest
}: NewExamModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Schedule New Exam</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {!isPreselectedTest && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Test
              </label>
              <select
                value={selectedTest?.id || ''}
                onChange={(e) => {
                  const test = savedTests.find(t => t.id === e.target.value);
                  setSelectedTest(test || null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a test</option>
                {savedTests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.title} - {test.type}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={newExam.date}
              onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              type="time"
              value={newExam.time}
              onChange={(e) => setNewExam({ ...newExam, time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={newExam.duration}
              onChange={(e) => setNewExam({ ...newExam, duration: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
              step="1"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSchedule}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Schedule Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
