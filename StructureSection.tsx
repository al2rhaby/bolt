import React from 'react';
import { Save } from 'lucide-react';
import { Section } from '../types';
import QuestionRenderer from './QuestionRenderer';

interface StructureSectionProps {
  section: Section;
  getAnswerForQuestion: (questionId: string) => string | undefined;
  onAnswer: (questionId: string, answer: any) => Promise<void>;
  onComplete: () => void;
}

/**
 * Structure section component
 */
const StructureSection: React.FC<StructureSectionProps> = ({
  section,
  getAnswerForQuestion,
  onAnswer,
  onComplete
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Structure Section</h2>
        
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg mb-8">
          <p className="text-emerald-700 text-sm">
            In this section, you will identify errors in sentence structure, grammar, and word usage.
            Pay close attention to the highlighted parts of each sentence.
          </p>
        </div>
        
        <div className="space-y-8">
          {section.questions.map((question, questionIndex) => (
            <div key={question.id} className="pb-8 border-b last:border-b-0 last:pb-0">
              <div className="mb-2 text-sm font-medium text-gray-500">
                Question {questionIndex + 1}
              </div>
              <QuestionRenderer 
                question={question}
                answer={getAnswerForQuestion(question.id)}
                onAnswer={onAnswer}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Complete Section
          </button>
        </div>
      </div>
    </div>
  );
};

export default StructureSection;
