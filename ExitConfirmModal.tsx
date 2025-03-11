import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExit: () => void;
  selectedSection: string | null;
}

/**
 * Modal to confirm exam or section exit
 */
const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onExit,
  selectedSection
}) => {
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

export default ExitConfirmModal;