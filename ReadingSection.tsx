import React from 'react';
import { Save } from 'lucide-react';
import { Section } from '../types';
import QuestionRenderer from './QuestionRenderer';

interface ReadingSectionProps {
  section: Section;
  getAnswerForQuestion: (questionId: string) => string | undefined;
  onAnswer: (questionId: string, answer: any) => Promise<void>;
  onComplete: () => void;
}

/**
 * Reading section component
 */
const ReadingSection: React.FC<ReadingSectionProps> = ({
  section,
  getAnswerForQuestion,
  onAnswer,
  onComplete
}) => {
  // Group questions by passage
  const passageGroups = section.questions.reduce((acc, question) => {
    const passageTitle = question.passage_title || 'Reading Passage';
    if (!acc[passageTitle]) {
      acc[passageTitle] = {
        title: passageTitle,
        content: question.passage_content || '',
        questions: []
      };
    }
    acc[passageTitle].questions.push(question);
    return acc;
  }, {} as Record<string, { title: string; content: string; questions: typeof section.questions }>);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Reading Section</h2>
        
        {Object.values(passageGroups).map((passage, passageIndex) => (
          <div key={passageIndex} className="mb-12 last:mb-0">
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">{passage.title}</h3>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                {passage.content.split('\n\n').map((paragraph, pIndex) => (
                  <p key={pIndex} className="mb-4 last:mb-0">{paragraph}</p>
                ))}
              </div>
            </div>
            
            <div className="space-y-8">
              {passage.questions.map((question, questionIndex) => (
                <div key={question.id} className="pb-8 border-b last:border-b-0 last:pb-0">
                  <div className="mb-2 text-sm font-medium text-gray-500">
                    Question {passageIndex + 1}.{questionIndex + 1}
                  </div>
                  <QuestionRenderer 
                    question={question}
                    answer={getAnswerForQuestion(question.id)}
                    onAnswer={onAnswer}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

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

export default ReadingSection;
