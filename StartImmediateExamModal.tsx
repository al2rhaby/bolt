// File: components/ExamScheduler/modals/StartImmediateExamModal.tsx

import React from 'react';
import { X } from 'lucide-react';
import { SavedTest } from '../types';

interface StartImmediateExamModalProps {
  onClose: () => void;
  onStart: () => void;
  immediateExam: SavedTest | null;
  setImmediateExam: React.Dispatch<React.SetStateAction<SavedTest | null>>;
  newExam: {
    date: string;
    time: string;
    duration: string;
    examName: string;
  };
  setNewExam: React.Dispatch<React.SetStateAction<{
    date: string;
    time: string;
    duration: string;
    examName: string;
  }>>;
  savedTests: SavedTest[];
  error: string | null;
}

export default function StartImmediateExamModal({
  onClose,
  onStart,
  immediateExam,
  setImmediateExam,
  newExam,
  setNewExam,
  savedTests,
  error
}: StartImmediateExamModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Start Immediate Exam</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Test
            </label>
            <select
              value={immediateExam?.id || ''}
              onChange={(e) => {
                const test = savedTests.find(t => t.id === e.target.value);
                setImmediateExam(test || null);
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Name
            </label>
            <input
              type="text"
              value={newExam.examName}
              onChange={(e) => setNewExam({ ...newExam, examName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter exam name"
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
              onClick={onStart}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Start Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
