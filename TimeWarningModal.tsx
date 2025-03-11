import React from 'react';
import { Clock } from 'lucide-react';

interface TimeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal to warn about time running out
 */
const TimeWarningModal: React.FC<TimeWarningModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 text-orange-600 mb-4">
          <Clock className="w-6 h-6" />
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

export default TimeWarningModal;
