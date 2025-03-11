import React from 'react';
import { ChevronLeft, Clock } from 'lucide-react';
import { formatTime, getTimerColor } from '../utils/formatters';
import { getSectionConfig } from '../utils/sectionConfig';

interface ExamHeaderProps {
  selectedSection: string | null;
  currentTimer: number | null;
  onBack: () => void;
  onExit: () => void;
}

/**
 * Header component showing navigation and timer
 */
const ExamHeader: React.FC<ExamHeaderProps> = ({
  selectedSection,
  currentTimer,
  onBack,
  onExit
}) => {
  const sectionTitle = selectedSection 
    ? getSectionConfig(selectedSection)?.title || 'TOEFL Exam'
    : 'TOEFL Exam';

  return (
    <div className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedSection && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {selectedSection ? `TOEFL Exam - ${sectionTitle}` : 'TOEFL Exam'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {currentTimer !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                getTimerColor(currentTimer)
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-medium">{formatTime(currentTimer)}</span>
              </div>
            )}
            <button
              onClick={onExit}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Exit Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamHeader;
