import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

// Custom hooks
import useSecurity from './hooks/useSecurity';
import useExamContent from './hooks/useExamContent';
import useExamProgress from './hooks/useExamProgress';
import useExamTimer from './hooks/useExamTimer';

// Components
import ExamHeader from './components/ExamHeader';
import SectionSelector from './components/SectionSelector';
import ListeningSection from './components/ListeningSection';
import StructureSection from './components/StructureSection';
import ReadingSection from './components/ReadingSection';

// Utils & Config
import { getSectionConfig } from './utils/sectionConfig';
import { SectionType } from './types';

// Create local versions of the Modal components to avoid import issues
const ExitConfirmModal = ({ isOpen, onClose, onExit, selectedSection }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-xl font-semibold">
            {selectedSection ? 'Exit Section?' : 'Exit Exam?'}
          </h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          {selectedSection
            ? 'Are you sure you want to exit this section? Your progress will be saved.'
            : 'Are you sure you want to exit? Your progress will be saved but the exam will end.'
          }
        </p>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {selectedSection ? 'Exit Section' : 'Exit Exam'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TimeWarningModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 text-orange-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-xl font-semibold">Time Warning</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          You have 5 minutes remaining to complete this section.
        </p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionCompleteModal = ({ isOpen, onClose, sectionConfig }) => {
  if (!isOpen || !sectionConfig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 text-green-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-xl font-semibold">
            {sectionConfig.title} Completed
          </h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          You have successfully completed this section. Your answers have been saved.
        </p>
        
        <div className="p-4 bg-green-50 rounded-lg mb-6">
          <p className="text-green-700">
            You can now proceed to another section of the exam.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main TOEFL Student Exam component
 */
const ToeflStudentExam: React.FC = () => {
  // Apply security and anti-cheating measures
  useSecurity();
  
  // Get exam ID from route params
  const location = useLocation();
  const examId = location.state?.examId;
  
  // Component state
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSectionComplete, setShowSectionComplete] = useState(false);
  const [completedSectionId, setCompletedSectionId] = useState<string | null>(null);
  
  // Load exam content
  const { 
    loading, 
    error, 
    loadedSections 
  } = useExamContent({ examId });
  
  // Section timers
  const sectionTimers = loadedSections.reduce((acc, section) => ({
    ...acc,
    [section.type]: section.duration || 35
  }), {});
  
  // Manage exam progress
  const {
    answers,
    completedSections,
    selectedSection,
    setSelectedSection,
    handleAnswer,
    handleSectionComplete,
    handleExitExam,
    getAnswerForQuestion
  } = useExamProgress({ examId });
  
  // Timer management
  const {
    currentTimer,
    startSectionTimer,
    showTimeWarning,
    setShowTimeWarning
  } = useExamTimer({
    sectionTimers,
    onTimeExpired: (sectionId) => {
      handleSectionComplete(sectionId as SectionType);
    }
  });
  
  // Handle section selection
  const handleSelectSection = (sectionId: SectionType) => {
    setSelectedSection(sectionId);
    startSectionTimer(sectionId);
  };
  
  // Handle section completion
  const handleCompleteSection = () => {
    if (selectedSection) {
      setCompletedSectionId(selectedSection);
      handleSectionComplete(selectedSection as SectionType)
        .then(() => {
          setShowSectionComplete(true);
        });
    }
  };
  
  // Get the active section content
  const getActiveSection = () => {
    if (!selectedSection) return null;
    return loadedSections.find(section => section.type.toLowerCase() === selectedSection.toLowerCase());
  };
  
  // Render the appropriate section component
  const renderSection = () => {
    const activeSection = getActiveSection();
    
    if (!activeSection) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Section Not Found</h3>
          <p className="text-gray-500 mb-4">The selected section could not be found.</p>
          <button
            onClick={() => setSelectedSection(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      );
    }
    
    if (!activeSection.questions?.length) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Available</h3>
          <p className="text-gray-500 mb-4">
            This section doesn't have any questions yet. Please contact your teacher.
          </p>
          <button
            onClick={() => setSelectedSection(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      );
    }
    
    switch (activeSection.type) {
      case 'listening':
        return (
          <ListeningSection
            section={activeSection}
            getAnswerForQuestion={getAnswerForQuestion}
            onAnswer={handleAnswer}
            onComplete={handleCompleteSection}
          />
        );
      case 'structure':
        return (
          <StructureSection
            section={activeSection}
            getAnswerForQuestion={getAnswerForQuestion}
            onAnswer={handleAnswer}
            onComplete={handleCompleteSection}
          />
        );
      case 'reading':
        return (
          <ReadingSection
            section={activeSection}
            getAnswerForQuestion={getAnswerForQuestion}
            onAnswer={handleAnswer}
            onComplete={handleCompleteSection}
          />
        );
      default:
        return (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unsupported Section</h3>
            <p className="text-gray-500 mb-4">
              This section type is not supported.
            </p>
            <button
              onClick={() => setSelectedSection(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <ExamHeader
        selectedSection={selectedSection}
        currentTimer={currentTimer}
        onBack={() => setSelectedSection(null)}
        onExit={() => setShowExitConfirm(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Section Selection or Active Section */}
        {!selectedSection ? (
          <SectionSelector
            completedSections={completedSections}
            onSelectSection={handleSelectSection}
            sectionTimers={sectionTimers}
          />
        ) : (
          <div className="exam-content">
            {renderSection()}
          </div>
        )}
      </div>

      {/* Modals */}
      <ExitConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onExit={selectedSection 
          ? () => {
              setSelectedSection(null);
              setShowExitConfirm(false);
            }
          : handleExitExam
        }
        selectedSection={selectedSection}
      />

      <TimeWarningModal
        isOpen={showTimeWarning}
        onClose={() => setShowTimeWarning(false)}
      />

      <SectionCompleteModal
        isOpen={showSectionComplete}
        onClose={() => {
          setShowSectionComplete(false);
          setCompletedSectionId(null);
        }}
        sectionConfig={getSectionConfig(completedSectionId || '')}
      />
    </div>
  );
};

export default ToeflStudentExam;