import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, AlertCircle, ChevronRight, ChevronLeft, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { saveUnitExamResults } from '../lib/models/unitExamResults';

function usePreventCopyAndScreenshots() {
  useEffect(() => {
    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts and key combinations
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl + P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl + Shift + I (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl + Shift + C (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl + S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl + C (Copy)
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        return false;
      }

      // Prevent Ctrl + Shift + J (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
    };

    // Prevent copy and paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent selection
    const handleSelect = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('selectstart', handleSelect);

    // Add CSS to prevent selection
    const style = document.createElement('style');
    style.innerHTML = `
      .exam-content {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('selectstart', handleSelect);
      document.head.removeChild(style);
    };
  }, []);
}

interface Question {
  id: number;
  text: string;
  type: 'multiple' | 'matching' | 'truefalse';
  choices?: string[];
  leftItems?: string[];
  rightItems?: string[];
  isTrue?: boolean;
}

export default function StudentExam() {
  usePreventCopyAndScreenshots();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: any }>({});
  const [timeLeft, setTimeLeft] = useState(7200); // Will be updated from exam duration
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const examId = location.state?.examId;
  const [examToEdit, setExamToEdit] = useState<any | null>(null);

  useEffect(() => {
    if (!examId) {
      navigate('/student-dashboard');
      return;
    }
    loadExamContent();
  }, [examId]);

  const loadExamContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get exam schedule with test and questions
      const { data: examData, error: examError } = await supabase
        .from('exam_schedule')
        .select(`
          *,
          test:test_id (
            id,
            title,
            type,
            questions (
              id,
              type,
              text,
              choices,
              correct_answer,
              left_items,
              right_items,
              is_true
            )
          )
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      if (!examData) {
        setError('Exam not found. Please return to the dashboard and try again.');
        return;
      }

      // Check if test exists and has questions
      if (!examData.test) {
        setError('Test not found. Please contact your administrator.');
        return;
      }

      if (!examData.test.questions || examData.test.questions.length === 0) {
        setError('This exam has no questions configured. Please contact your administrator.');
        return;
      }

      // Set exam data for later use when submitting
      setExamToEdit(examData);

      // Set timer based on exam duration
      setTimeLeft(examData.duration * 60);

      // Format questions
      const formattedQuestions = examData.test.questions.map(q => ({
        id: q.id,
        type: q.type,
        text: q.text || '',
        choices: q.choices || [],
        correctAnswer: q.correct_answer,
        leftItems: q.left_items || [],
        rightItems: q.right_items || [],
        isTrue: q.is_true
      }));

      setExamQuestions(formattedQuestions);
      
      // Load any existing answers
      loadStudentAnswers();
    } catch (err) {
      console.error('Error loading exam:', err);
      setError('Failed to load exam content. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadStudentAnswers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userAnswers, error } = await supabase
        .from('student_answers')
        .select('*')
        .eq('student_id', user.id)
        .eq('exam_id', examId);
        
      if (error) throw error;
      
      if (userAnswers && userAnswers.length > 0) {
        // Format the answers into the expected state format
        const formattedAnswers = {};
        userAnswers.forEach(ans => {
          formattedAnswers[ans.question_id] = ans.answer;
        });
        
        setAnswers(formattedAnswers);
      }
    } catch (err) {
      console.error('Error loading student answers:', err);
      // Don't set an error message as this is not critical
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 300 && !showTimeWarning) { // Show warning at 5 minutes
          setShowTimeWarning(true);
        }
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswer = async (questionId: number, answer: any) => {
    // First update local state for immediate UI feedback
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        return;
      }

      // Convert answer to string to ensure consistent storage
      const answerString = answer?.toString() || '';
      
      // Try delete then insert approach (this is more reliable than upsert for some Postgres configs)
      try {
        // First try to delete any existing answer
        await supabase
          .from('student_answers')
          .delete()
          .eq('student_id', user.id)
          .eq('question_id', questionId)
          .eq('exam_id', examId);
          
        // Then insert the new answer
        const { error: insertError } = await supabase
          .from('student_answers')
          .insert({
            student_id: user.id,
            question_id: questionId,
            exam_id: examId,
            answer: answerString,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error("Error inserting answer:", insertError);
        }
      } catch (err) {
        console.error("Error with delete-then-insert strategy:", err);
        
        // Fallback method if delete-then-insert fails
        const { data: existingAnswer } = await supabase
          .from('student_answers')
          .select('id')
          .eq('student_id', user.id)
          .eq('question_id', questionId)
          .eq('exam_id', examId)
          .maybeSingle();
          
        if (existingAnswer) {
          // Update existing answer
          await supabase
            .from('student_answers')
            .update({ 
              answer: answerString,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAnswer.id);
        } else {
          // Insert new answer
          await supabase
            .from('student_answers')
            .insert({
              student_id: user.id,
              question_id: questionId,
              exam_id: examId,
              answer: answerString,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      }
    } catch (err) {
      console.error('Error in answer handling:', err);
      // Allow the user to continue taking the exam even if there are database errors
    }
  };

  const handleNext = () => {
    if (currentQuestion < examQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('User not authenticated. Please log in again.');
        return;
      }

      // Calculate score
      const totalQuestions = examQuestions.length;
      const answeredQuestions = Object.keys(answers).length;
      const scorePercentage = Math.round((answeredQuestions / totalQuestions) * 100);
      
      // Prepare result data
      const resultData = {
        student_id: user.id,
        test_id: examToEdit?.test_id || null,
        exam_id: examId,
        total_points: answeredQuestions,
        total_score: scorePercentage,
        status: 'completed',
        completion_time: new Date().toISOString(),
        answers: JSON.stringify(answers)
      };
      
      // Use our improved save function with built-in fallbacks
      const { success, error, fallback } = await saveUnitExamResults(resultData);
      
      if (!success) {
        console.error('Error saving exam result:', error);
        setError('Failed to save exam result. Please try again.');
        return;
      }
      
      if (fallback) {
        console.log('Exam result saved using fallback method');
      }
      
      // Update exam status to completed in exam_schedule
      try {
        const { error: scheduleError } = await supabase
          .from('exam_schedule')
          .update({ status: 'completed' })
          .eq('id', examId);
          
        if (scheduleError) {
          console.error('Error updating exam schedule:', scheduleError);
        }
      } catch (scheduleErr) {
        console.error('Schedule update error:', scheduleErr);
      }
      
      // Navigate back to dashboard
      navigate('/student-dashboard');
    } catch (err) {
      console.error('Error submitting exam:', err);
      setError('Failed to submit exam. Please try again.');
    }
  };

  const renderQuestion = () => {
    const question = examQuestions[currentQuestion];
    if (!question) return null;

    switch (question.type) {
      case 'multiple':
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium text-gray-900 mb-6">{question.text}</p>
            <div className="space-y-3">
              {question.choices?.map((choice, index) => (
                <label
                  key={index}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    answers[question.id] === index.toString() || answers[question.id] === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={answers[question.id] === index.toString() || answers[question.id] === index}
                    onChange={() => handleAnswer(question.id, index)}
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
          <div className="space-y-6">
            <p className="text-lg font-medium text-gray-900 mb-6">{question.text}</p>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                {question.leftItems?.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {question.rightItems?.map((item, index) => (
                  <select
                    key={index}
                    value={answers[question.id]?.[index] ?? ''}
                    onChange={(e) => {
                      const newMatches = { ...(answers[question.id] || {}) };
                      newMatches[index] = parseInt(e.target.value);
                      handleAnswer(question.id, newMatches);
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
          <div className="space-y-6">
            <p className="text-lg font-medium text-gray-900 mb-6">{question.text}</p>
            <div className="flex gap-4">
              <label
                className={`flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  answers[question.id] === 'true' || answers[question.id] === true
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answers[question.id] === 'true' || answers[question.id] === true}
                  onChange={() => handleAnswer(question.id, true)}
                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                <span className="ml-3">True</span>
              </label>
              <label
                className={`flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  answers[question.id] === 'false' || answers[question.id] === false
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answers[question.id] === 'false' || answers[question.id] === false}
                  onChange={() => handleAnswer(question.id, false)}
                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="ml-3">False</span>
              </label>
            </div>
          </div>
        );
        
      default:
        return <p>Question type not supported.</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Unit Exam</h1>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeLeft <= 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </div>
              <button
                onClick={() => setShowExitConfirm(true)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Exit Exam
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="text-red-600 mb-6">
              <AlertCircle className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Error Loading Exam</h3>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={() => navigate('/student-dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="exam-content bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>Question {currentQuestion + 1} of {examQuestions.length}</span>
                <span>{Math.round(((currentQuestion + 1) / examQuestions.length) * 100)}% Complete</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / examQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            {renderQuestion()}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentQuestion === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              {currentQuestion === examQuestions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Submit Exam
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Exit Exam?</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to exit? Your progress will be lost.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('/student-dashboard')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Exit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Warning Modal */}
      {showTimeWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-orange-600 mb-4">
              <Clock className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Time Warning</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              You have 5 minutes remaining to complete the exam.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setShowTimeWarning(false)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}