import React from 'react';
import { Question } from '../types';

interface QuestionRendererProps {
  question: Question;
  answer: string | undefined;
  onAnswer: (questionId: string, answer: any) => void;
}

/**
 * Component to render different types of questions
 */
const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  answer,
  onAnswer
}) => {
  // Render different question types
  switch (question.type) {
    case 'underline':
      return (
        <div className="mb-6">
          <p className="text-lg font-medium text-gray-900 mb-4">
            {question.text?.split(' ').map((word, idx) => {
              // Handle both object with words array and direct array format
              const words = question.underlined_words?.words || question.underlined_words || [];
              const underlineData = Array.isArray(words) ? 
                words.find((uw: any) => uw.text === word) : null;
              
              return (
                <span
                  key={idx}
                  className={`${
                    underlineData ? 'underline decoration-2' : ''
                  } mr-1`}
                >
                  {word}
                  {underlineData?.letter && (
                    <sub className="text-xs font-medium ml-0.5">
                      {underlineData.letter}
                    </sub>
                  )}
                </span>
              );
            })}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['A', 'B', 'C', 'D'].map((letter) => (
              <label
                key={letter}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  answer === letter
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answer === letter}
                  onChange={() => onAnswer(question.id, letter)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3">{letter}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case 'multiple':
      return (
        <div className="mb-6">
          <p className="text-lg font-medium text-gray-900 mb-4">
            {question.text}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {question.choices?.map((choice, index) => (
              <label
                key={index}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  answer === index.toString()
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answer === index.toString()}
                  onChange={() => onAnswer(question.id, index)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3">{choice}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case 'matching':
      return (
        <div className="mb-6">
          <p className="text-lg font-medium text-gray-900 mb-4">
            {question.text}
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              {question.leftItems?.map((item, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {question.rightItems?.map((item, index) => (
                <select
                  key={index}
                  value={answer ? JSON.parse(answer)?.[index] || '' : ''}
                  onChange={(e) => {
                    const newMatches = { ...(answer ? JSON.parse(answer) || {} : {}) };
                    newMatches[index] = parseInt(e.target.value);
                    onAnswer(question.id, JSON.stringify(newMatches));
                  }}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select matching word</option>
                  {question.leftItems?.map((_, idx) => (
                    <option key={idx} value={idx}>
                      {question.leftItems?.[idx]}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </div>
      );

    case 'truefalse':
      return (
        <div className="mb-6">
          <p className="text-lg font-medium text-gray-900 mb-4">
            {question.text}
          </p>
          <div className="flex gap-4">
            <label
              className={`flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                answer === 'true' || answer === 'True'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                checked={answer === 'true' || answer === 'True'}
                onChange={() => onAnswer(question.id, true)}
                className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
              />
              <span className="ml-3">True</span>
            </label>
            <label
              className={`flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                answer === 'false' || answer === 'False'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                checked={answer === 'false' || answer === 'False'}
                onChange={() => onAnswer(question.id, false)}
                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
              />
              <span className="ml-3">False</span>
            </label>
          </div>
        </div>
      );
      
    default:
      return <p>Unsupported question type: {question.type}</p>;
  }
};

export default QuestionRenderer;
