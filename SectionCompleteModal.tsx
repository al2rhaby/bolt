import React from 'react';
import { CheckCircle } from 'lucide-react';
import { SectionConfig } from '../../types';

interface SectionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionConfig: SectionConfig | undefined;
}

/**
 * Modal shown when a section is successfully completed
 */
const SectionCompleteModal: React.FC<SectionCompleteModalProps> = ({
  isOpen,
  onClose,
  sectionConfig
}) => {
  if (!isOpen || !sectionConfig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3 text-green-600 mb-4">
          <CheckCircle className="w-6 h-6" />
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

export default SectionCompleteModal;
