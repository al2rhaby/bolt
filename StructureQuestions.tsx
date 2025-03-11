import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, X, AlertTriangle, Pencil, Info, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import UnderlineQuestion from './UnderlineQuestion';
import { supabase } from '../lib/supabase';

// Constant for letter options
const LETTERS = ['A', 'B', 'C', 'D'] as const;

interface BaseQuestion {
  id: number;
  text: string;
  type: 'multiple' | 'underline';
  sequence_number?: number; // Add sequence number field
}

interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple';
  choices: string[];
  correctAnswer: number;
}

interface UnderlineWord {
  text: string;
  letter: 'A' | 'B' | 'C' | 'D' | null;
  start: number;
  end: number;
}

interface UnderlineQuestionType extends BaseQuestion {
  type: 'underline';
  text: string;
  underlinedWords: UnderlineWord[];
  incorrectLetter: 'A' | 'B' | 'C' | 'D' | null;
}

type Question = MultipleChoiceQuestion | UnderlineQuestionType;

export default function StructureQuestions() {
  // UI state
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  
  // Questions data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [nextQuestionId, setNextQuestionId] = useState(1);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  
  // Current question being edited
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questionType, setQuestionType] = useState<'multiple' | 'underline'>('multiple');
  const [questionText, setQuestionText] = useState('');
  
  // Multiple choice question state
  const [choices, setChoices] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  
  // Underline question state
  const [underlinedWords, setUnderlinedWords] = useState<UnderlineWord[]>([]);
  const [incorrectLetter, setIncorrectLetter] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  
  // Load saved questions on component mount
  useEffect(() => {
    loadSavedQuestions();
  }, []);

  useEffect(() => {
    if (error) {
      setShowErrorNotification(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Reset form when selected question changes
  useEffect(() => {
    if (selectedQuestion) {
      setQuestionType(selectedQuestion.type);
      setQuestionText(selectedQuestion.text);
      
      if (selectedQuestion.type === 'multiple') {
        const multipleQuestion = selectedQuestion as MultipleChoiceQuestion;
        setChoices(multipleQuestion.choices);
        setCorrectAnswer(multipleQuestion.correctAnswer);
      } else {
        const underlineQuestion = selectedQuestion as UnderlineQuestionType;
        setUnderlinedWords(underlineQuestion.underlinedWords || []);
        setIncorrectLetter(underlineQuestion.incorrectLetter);
      }
    }
  }, [selectedQuestion]);

  // Reset form when question type changes
  useEffect(() => {
    if (!selectedQuestion) {
      if (questionType === 'multiple') {
        setChoices(['', '', '', '']);
        setCorrectAnswer(0);
      } else {
        setUnderlinedWords([]);
        setIncorrectLetter(null);
      }
    }
  }, [questionType, selectedQuestion]);

  const loadSavedQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check for parent test ID in localStorage
      const testId = localStorage.getItem('currentTOEFLTestId');
      if (!testId) {
        setError('No test selected. Please go back to TOEFL Exam and select a test.');
        setLoading(false);
        return;
      }
      
      setCurrentTestId(testId);
      console.log("Using test ID:", testId);

      // First get the section test ID
      const { data: sections, error: sectionError } = await supabase
        .from('tests')
        .select('id')
        .eq('parent_test_id', testId)
        .eq('section', 'Structure');

      if (sectionError) {
        console.error("Section error:", sectionError);
        throw sectionError;
      }
      
      console.log("Found sections:", sections);
      
      if (!sections || sections.length === 0) {
        // No section exists yet, that's okay
        console.log("No existing Structure section found");
        setQuestions([]);
        setLoading(false);
        return;
      }
      
      const sectionId = sections[0].id;
      console.log("Using section ID:", sectionId);

      // Get questions for this section
      const { data: questionData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', sectionId)
        .order('sequence_number', { ascending: true });

      if (questionsError) {
        console.error("Questions error:", questionsError);
        throw questionsError;
      }
      
      console.log('Loaded questions:', questionData);

      if (!questionData || questionData.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }
      
      // Map database questions to component state
      const mappedQuestions: Question[] = questionData.map((q: any, index: number) => {
        if (q.type === 'multiple') {
          return {
            id: q.id,
            type: 'multiple',
            text: q.text || '',
            choices: q.choices || ['', '', '', ''],
            correctAnswer: q.correct_answer || 0,
            sequence_number: q.sequence_number || (index + 1) // Assign sequential number
          };
        } else if (q.type === 'underline') {
          // For underline questions, map underlined_words to underlinedWords
          let underlinedWords: UnderlineWord[] = [];
          
          // Check if underlined_words exists and has the right format
          if (q.underlined_words) {
            if (q.underlined_words.words) {
              // Format is { words: [array] }
              underlinedWords = q.underlined_words.words;
            } else if (Array.isArray(q.underlined_words)) {
              // Format is direct array
              underlinedWords = q.underlined_words;
            }
          }
          
          // Make sure all letters are represented
          LETTERS.forEach(letter => {
            if (!underlinedWords.some(w => w.letter === letter)) {
              // Add a placeholder word for missing letter
              underlinedWords.push({
                text: "placeholder", 
                letter: letter,
                start: 0,
                end: 0
              });
            }
          });

          return {
            id: q.id,
            type: 'underline',
            text: q.text || '',
            underlinedWords: underlinedWords,
            incorrectLetter: LETTERS[q.correct_answer] || null,
            sequence_number: q.sequence_number || (index + 1) // Assign sequential number
          };
        }
        // Default case
        return {
          id: q.id,
          type: 'multiple',
          text: q.text || '',
          choices: q.choices || ['', '', '', ''],
          correctAnswer: 0,
          sequence_number: q.sequence_number || (index + 1) // Assign sequential number
        };
      });
      
      setQuestions(mappedQuestions);
      
      // Set next question ID based on highest existing ID
      if (mappedQuestions.length > 0) {
        const maxId = Math.max(...mappedQuestions.map(q => q.id));
        setNextQuestionId(maxId + 1);
      }
    } catch (err: any) {
      console.error('Error loading questions:', err);
      setError(`Failed to load questions: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionType('multiple');
    setQuestionText('');
    setChoices(['', '', '', '']);
    setCorrectAnswer(0);
    setUnderlinedWords([]);
    setIncorrectLetter(null);
    setSelectedQuestion(null);
    setError(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleSaveQuestion = async () => {
    try {
      // Validate input
      if (!questionText.trim()) {
        setError('Please enter question text');
        return;
      }

      // Get or create the structure section
      let sectionId;
      
      if (!currentTestId) {
        setError('No test selected. Please go back to TOEFL Exam and select a test.');
        return;
      }

      // First check if section exists
      const { data: sections, error: sectionError } = await supabase
        .from('tests')
        .select('id')
        .eq('parent_test_id', currentTestId)
        .eq('section', 'Structure');

      if (sectionError) throw sectionError;
      
      if (!sections || sections.length === 0) {
        // Need to create a new section
        console.log("Creating new Structure section");
        
        // Get parent test title
        const { data: parentTest, error: parentError } = await supabase
          .from('tests')
          .select('title')
          .eq('id', currentTestId)
          .single();

        if (parentError) throw parentError;
        
        // Create the structure section
        const { data: newSection, error: createError } = await supabase
          .from('tests')
          .insert([{
            title: `${parentTest.title} - Structure Section`,
            type: 'TOEFL',
            profesor: 'mohamed',
            created_by: 'mohamed',
            section: 'Structure',
            parent_test_id: currentTestId
          }])
          .select();

        if (createError) throw createError;
        
        sectionId = newSection[0].id;
      } else {
        sectionId = sections[0].id;
      }
      
      // Validate based on question type
      if (questionType === 'multiple') {
        if (choices.some(choice => !choice.trim())) {
          setError('Please fill in all answer choices');
          return;
        }
      } else if (questionType === 'underline') {
        // Validate underline question
        if (!underlinedWords || underlinedWords.length < 4) {
          setError('Please underline at least 4 words (A, B, C, D)');
          return;
        }

        // Check if all required letters (A, B, C, D) are used
        const usedLetters = new Set(underlinedWords.map(word => word.letter));
        const missingLetters = LETTERS.filter(letter => !usedLetters.has(letter));
        
        if (missingLetters.length > 0) {
          setError(`Missing letters: ${missingLetters.join(', ')}. All letters A-D must be used.`);
          return;
        }

        if (!incorrectLetter) {
          setError('Please select which letter is incorrect');
          return;
        }
      }

      // Prepare the question data
      let questionData: any = {
        test_id: sectionId,
        text: questionText,
        type: questionType
      };
      
      if (questionType === 'multiple') {
        questionData.choices = choices;
        questionData.correct_answer = correctAnswer;
      } else {
        // For underline questions, we need to create an object with a 'words' property
        questionData.underlined_words = { words: underlinedWords };
        // Save the incorrect letter as the correct answer index (A=0, B=1, C=2, D=3)
        questionData.correct_answer = LETTERS.indexOf(incorrectLetter as 'A' | 'B' | 'C' | 'D');
      }
      
      // If editing existing question
      if (selectedQuestion) {
        console.log('Updating question:', selectedQuestion.id, questionData);
        const { error: updateError } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', selectedQuestion.id);

        if (updateError) throw updateError;
      } else {
        // Adding new question
        console.log('Adding new question:', questionData);
        const { error: insertError } = await supabase
          .from('questions')
          .insert([questionData]);

        if (insertError) throw insertError;
      }

      // Reload questions to get the latest state
      await loadSavedQuestions();
      
      // Close modal and reset form
      closeAddModal();
      
    } catch (err: any) {
      console.error('Error saving question:', err);
      setError(`Failed to save question: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      // Update UI
      setQuestions(questions.filter(q => q.id !== questionId));
      setShowDeleteConfirm(false);
      setSelectedQuestion(null);
      
      // Reload questions to reset sequence numbers
      await loadSavedQuestions();
    } catch (err: any) {
      console.error('Error deleting question:', err);
      setError(`Failed to delete question: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setShowAddModal(true);
  };

  // Helper to format question type for display
  const formatQuestionType = (type: 'multiple' | 'underline') => {
    return type === 'multiple' ? 'Multiple Choice' : 'Underline';
  };

  const instructions = {
    description: "The Structure section tests students' knowledge of English grammar and sentence structure. During the exam, students will:",
    points: [
      "Identify grammatical errors in sentences",
      "Choose the correct word or phrase to complete sentences",
      "Recognize proper sentence structure",
      "Find incorrect word usage or form"
    ],
    note: "Questions can be either multiple choice or underline format. For underline questions, only one underlined word is incorrect, and students must identify it."
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/toefl-exam"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Structure Questions</h1>
              <p className="text-sm text-gray-500">Manage grammar and structure questions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowInstructions(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Info className="w-4 h-4" />
              Instructions
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        </div>
      </div>

      {/* Error Notification (Fixed position) */}
      {showErrorNotification && error && (
        <div className="fixed top-20 right-4 z-50 max-w-md bg-red-50 border-l-4 border-red-500 p-4 shadow-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
              <button 
                onClick={() => setShowErrorNotification(false)}
                className="mt-2 text-xs text-red-600 font-medium hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading questions...</p>
          </div>
        ) : error && !showAddModal ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <p>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Dismiss
            </button>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 mb-4">No questions added yet. Get started by adding your first question.</p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((question) => (
              <div
                key={question.id}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Question {question.sequence_number || '?'}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditQuestion(question)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Question"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedQuestion(question);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-800 mb-4">{question.text}</p>

                {question.type === 'multiple' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {(question as MultipleChoiceQuestion).choices.map((choice, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${
                          index === (question as MultipleChoiceQuestion).correctAnswer
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-sm font-medium">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{choice}</span>
                          {index === (question as MultipleChoiceQuestion).correctAnswer && (
                            <Check className="w-4 h-4 text-green-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      {question.text.split(' ').map((word, idx) => {
                        const wordObj = (question as UnderlineQuestionType).underlinedWords?.find(
                          uw => uw.text === word
                        );
                        const isIncorrect = wordObj?.letter === (question as UnderlineQuestionType).incorrectLetter;
                        
                        return (
                          <span
                            key={idx}
                            className={`
                              ${wordObj ? 'underline decoration-2' : ''}
                              ${isIncorrect ? 'decoration-red-500' : wordObj ? 'decoration-blue-500' : ''}
                              mx-1
                            `}
                          >
                            {word}
                            {wordObj && (
                              <sub className={`text-xs ml-0.5 ${isIncorrect ? 'text-red-600 font-bold' : 'text-blue-600'}`}>
                                {wordObj.letter}
                              </sub>
                            )}
                          </span>
                        );
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      Incorrect answer: <span className="font-medium text-red-600">{(question as UnderlineQuestionType).incorrectLetter}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {selectedQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Question Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setQuestionType('multiple')}
                    className={`p-4 rounded-lg border transition-colors ${
                      questionType === 'multiple'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-500'
                    }`}
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionType('underline')}
                    className={`p-4 rounded-lg border transition-colors ${
                      questionType === 'underline'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-500'
                    }`}
                  >
                    Underline
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter the question text..."
                />
              </div>

              {/* Question Type Specific Inputs */}
              {questionType === 'multiple' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Choices
                  </label>
                  <div className="space-y-3">
                    {choices.map((choice, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <input
                          type="text"
                          value={choice}
                          onChange={(e) => {
                            const newChoices = [...choices];
                            newChoices[index] = e.target.value;
                            setChoices(newChoices);
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Enter choice ${String.fromCharCode(65 + index)}`}
                        />
                        <button
                          onClick={() => setCorrectAnswer(index)}
                          className={`px-4 py-2 rounded-lg ${
                            correctAnswer === index
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Correct
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Underline Question Component */}
                  {questionText ? (
                    <UnderlineQuestion
                      text={questionText}
                      onSave={setUnderlinedWords}
                      onMarkIncorrect={setIncorrectLetter}
                      initialWords={underlinedWords}
                      incorrectLetter={incorrectLetter}
                      onAddQuestion={handleSaveQuestion}
                    />
                  ) : (
                    <div className="p-4 bg-blue-50 rounded-lg text-blue-600">
                      Please enter question text first to enable the underline editor.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons - Only show for multiple choice questions */}
            {questionType === 'multiple' && (
              <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                <button
                  onClick={closeAddModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedQuestion ? 'Save Changes' : 'Add Question'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Delete Question</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Structure Section Instructions</h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600">{instructions.description}</p>
              <ul className="mt-4 space-y-2">
                {instructions.points.map((point, index) => (
                  <li key={index} className="text-gray-600">{point}</li>
                ))}
              </ul>
              <p className="mt-4 text-gray-600">{instructions.note}</p>

              <div className="mt-8 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-blue-700 font-medium mb-2">Multiple Choice Questions</h4>
                  <ul className="text-blue-600 list-disc list-inside space-y-2">
                    <li>Provide clear, unambiguous questions</li>
                    <li>Include four answer choices</li>
                    <li>Make distractors plausible but clearly incorrect</li>
                    <li>Test one concept per question</li>
                  </ul>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="text-purple-700 font-medium mb-2">Underline Questions</h4>
                  <ul className="text-purple-600 list-disc list-inside space-y-2">
                    <li>Mark words that can be underlined</li>
                    <li>Only one word should be incorrect</li>
                    <li>Focus on common grammatical errors</li>
                    <li>Ensure context makes the error clear</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-6 border-t">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}