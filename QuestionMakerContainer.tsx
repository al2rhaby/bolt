import React, { useState } from 'react';
import UnderlineQuestion from './UnderlineQuestion';

interface UnderlineWord {
  text: string;
  letter: 'A' | 'B' | 'C' | 'D' | null;
  start: number;
  end: number;
}

interface SavedQuestion {
  id: string;
  text: string;
  underlinedWords: UnderlineWord[];
  incorrectLetter: 'A' | 'B' | 'C' | 'D' | null;
}

export default function QuestionMaker() {
  const [currentText, setCurrentText] = useState<string>("The quick brown fox jumped over the lazy dog and chased the cat.");
  const [currentWords, setCurrentWords] = useState<UnderlineWord[]>([]);
  const [incorrectLetter, setIncorrectLetter] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  const [viewingQuestionId, setViewingQuestionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle saving selected words
  const handleSaveWords = (words: UnderlineWord[]) => {
    setCurrentWords(words);
  };

  // Handle marking a letter as incorrect
  const handleMarkIncorrect = (letter: 'A' | 'B' | 'C' | 'D') => {
    setIncorrectLetter(letter);
  };

  // Function to add a new question
  const addNewQuestion = () => {
    // Validate that all letters A, B, C, D are used
    const usedLetters = new Set(currentWords.map(word => word.letter));
    const requiredLetters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    const missingLetters = requiredLetters.filter(letter => !usedLetters.has(letter));
    
    if (missingLetters.length > 0) {
      setError(`Please mark words with all required letters: ${missingLetters.join(', ')}`);
      return;
    }
    
    // Validate that an incorrect letter is selected
    if (!incorrectLetter) {
      setError('Please select which letter is incorrect');
      return;
    }
    
    // Create new question
    const newQuestion: SavedQuestion = {
      id: Date.now().toString(),
      text: currentText,
      underlinedWords: currentWords,
      incorrectLetter: incorrectLetter
    };
    
    // Save the question
    setSavedQuestions(prev => [...prev, newQuestion]);
    
    // Reset form
    setCurrentText('');
    setCurrentWords([]);
    setIncorrectLetter(null);
    setError(null);
  };

  // Function to view a saved question
  const viewQuestion = (questionId: string) => {
    setViewingQuestionId(questionId);
  };

  // Function to edit a question
  const editQuestion = (question: SavedQuestion) => {
    setCurrentText(question.text);
    setCurrentWords(question.underlinedWords);
    setIncorrectLetter(question.incorrectLetter);
    setViewingQuestionId(null);
    setSavedQuestions(prev => prev.filter(q => q.id !== question.id));
  };

  // Function to delete a question
  const deleteQuestion = (questionId: string) => {
    setSavedQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  // Function to start a new question
  const startNewQuestion = () => {
    setCurrentText('');
    setCurrentWords([]);
    setIncorrectLetter(null);
    setViewingQuestionId(null);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Question Maker</h1>
      
      {/* Editor Section */}
      {!viewingQuestionId && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-2">
              Question Text
            </label>
            <textarea
              id="questionText"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Enter the question text here..."
            />
          </div>
          
          {currentText && (
            <UnderlineQuestion
              text={currentText}
              onSave={handleSaveWords}
              onMarkIncorrect={handleMarkIncorrect}
              initialWords={currentWords}
              incorrectLetter={incorrectLetter}
            />
          )}
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={addNewQuestion}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Question
            </button>
            
            {currentText && (
              <button
                onClick={startNewQuestion}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear & Start New
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* View mode - showing a specific question */}
      {viewingQuestionId && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Question Preview</h2>
            <button
              onClick={() => setViewingQuestionId(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              Back to Editor
            </button>
          </div>
          
          {savedQuestions
            .filter(q => q.id === viewingQuestionId)
            .map(question => (
              <div key={question.id} className="bg-white p-6 rounded-lg shadow">
                <UnderlineQuestion
                  text={question.text}
                  onSave={() => {}}
                  initialWords={question.underlinedWords}
                  readOnly={true}
                  incorrectLetter={question.incorrectLetter}
                />
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Incorrect answer: <span className="font-medium text-red-600">{question.incorrectLetter}</span>
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
      
      {/* List of saved questions */}
      {savedQuestions.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Saved Questions ({savedQuestions.length})</h2>
          <div className="space-y-4">
            {savedQuestions.map(question => (
              <div key={question.id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                <div className="truncate flex-grow">
                  <p className="font-medium">{question.text.substring(0, 60)}{question.text.length > 60 ? '...' : ''}</p>
                  <p className="text-sm text-gray-500">Incorrect: {question.incorrectLetter}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => viewQuestion(question.id)}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    View
                  </button>
                  <button
                    onClick={() => editQuestion(question)}
                    className="px-3 py-1 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteQuestion(question.id)}
                    className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}