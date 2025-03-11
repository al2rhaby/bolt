import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Download, 
  Eye,
  RefreshCw,
  Clock,
  FileText
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

const StudentAnswersViewer = () => {
  const { studentId, examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [examInfo, setExamInfo] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [activeTab, setActiveTab] = useState('answers');
  const [allAttempts, setAllAttempts] = useState([]);
  const [hasMultipleAttempts, setHasMultipleAttempts] = useState(false);

  useEffect(() => {
    loadStudentAnswers();
    checkForMultipleAttempts();
  }, [studentId, examId]);

  const checkForMultipleAttempts = async () => {
    if (!studentId || !examId) return;

    try {
      // Try unit_exam_results first
      let { data: unitResults, error: unitError } = await supabase
        .from('unit_exam_results')
        .select('id, student_id, test_id, created_at, completion_time, total_score')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (!unitError && unitResults && unitResults.length > 1) {
        setAllAttempts(unitResults);
        setHasMultipleAttempts(true);
        return;
      }

      // Try student_answers table grouped by exam
      const { data: saResults, error: saError } = await supabase
        .from('student_answers')
        .select('id, student_id, test_id, exam_id, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (!saError && saResults) {
        // Group by test_id to see if there are multiple attempts
        const groupedByTest = saResults.reduce((acc, item) => {
          const key = item.test_id;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(item);
          return acc;
        }, {});

        // Check if any test has multiple attempts
        const hasMultiple = Object.values(groupedByTest).some(group => group.length > 1);
        if (hasMultiple) {
          // Format attempt data from grouped results
          const attempts = Object.entries(groupedByTest).map(([testId, answers]) => {
            const latestAnswer = answers[0];
            return {
              id: `sa-${testId}`,
              student_id: latestAnswer.student_id,
              test_id: testId,
              created_at: latestAnswer.created_at,
              answer_count: answers.length
            };
          });
          
          setAllAttempts(attempts);
          setHasMultipleAttempts(true);
        }
      }
    } catch (err) {
      console.error('Error checking for multiple attempts:', err);
    }
  };

  const loadStudentAnswers = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try the unit_exam_results approach (newer schema)
      const { data: resultData, error: resultError } = await supabase
        .from('unit_exam_results')
        .select(`
          id,
          total_score,
          total_points,
          answers,
          completion_time,
          created_at,
          updated_at,
          student:student_id (
            id,
            name,
            matricula,
            email,
            salon,
            semester
          ),
          test:test_id (
            id,
            title,
            type,
            level,
            carrera,
            semestre,
            grupo,
            profesor,
            created_at
          )
        `)
        .eq('student_id', studentId)
        .eq('id', examId)
        .single();

      if (!resultError && resultData) {
        // Get the questions for this exam
        const { data: questionData, error: questionError } = await supabase
          .from('unit_questions')
          .select(`
            id,
            question_text,
            question_type,
            points,
            correct_answer,
            choices:unit_choices (
              id,
              choice_text,
              is_correct
            ),
            matching_pairs:unit_matching_pairs (
              id,
              left_item,
              right_item,
              pair_order
            )
          `)
          .eq('exam_id', resultData.test.id)
          .order('created_at', { ascending: true });

        if (questionError) throw questionError;

        setStudentInfo(resultData.student);
        setExamInfo({
          ...resultData.test,
          total_score: resultData.total_score,
          total_points: resultData.total_points,
          completion_time: resultData.completion_time || resultData.updated_at
        });

        // Process questions and answers
        const processedAnswers = questionData.map(question => {
          const studentAnswer = resultData.answers ? resultData.answers[question.id] : null;
          let isCorrect = false;
          let studentAnswerDisplay = 'Not answered';
          let correctAnswerDisplay = 'Unknown';

          if (question.question_type === 'multiple_choice' && studentAnswer) {
            const selectedChoice = question.choices.find(c => c.id === studentAnswer.option_id);
            const correctChoice = question.choices.find(c => c.is_correct);
            
            studentAnswerDisplay = selectedChoice ? selectedChoice.choice_text : 'Invalid selection';
            correctAnswerDisplay = correctChoice ? correctChoice.choice_text : 'Not specified';
            isCorrect = selectedChoice && correctChoice && selectedChoice.id === correctChoice.id;
          } 
          else if (question.question_type === 'true_false' && studentAnswer) {
            studentAnswerDisplay = studentAnswer.is_true ? 'True' : 'False';
            const correctAnswer = question.correct_answer && question.correct_answer.is_true;
            correctAnswerDisplay = correctAnswer ? 'True' : 'False';
            isCorrect = studentAnswer.is_true === correctAnswer;
          }
          else if (question.question_type === 'matching' && studentAnswer) {
            studentAnswerDisplay = 'See details';
            correctAnswerDisplay = 'See details';
            
            // Check if pairs match
            if (studentAnswer.pairs && question.correct_answer && question.correct_answer.pairs) {
              const studentPairs = studentAnswer.pairs;
              const correctPairs = question.correct_answer.pairs;
              
              // Simple check if all pairs match
              isCorrect = JSON.stringify(studentPairs.sort()) === JSON.stringify(correctPairs.sort());
            }
          }

          return {
            id: question.id,
            questionText: question.question_text,
            questionType: question.question_type,
            points: question.points || 1,
            studentAnswer: studentAnswerDisplay,
            correctAnswer: correctAnswerDisplay,
            isCorrect: isCorrect,
            rawStudentAnswer: studentAnswer,
            rawQuestion: question
          };
        });

        setAnswers(processedAnswers);
        return;
      }

      // If unit_exam_results approach failed, try the old student_answers table
      const { data: oldAnswerData, error: oldAnswerError } = await supabase
        .from('student_answers')
        .select(`
          id,
          answer,
          created_at,
          updated_at,
          student:student_id (
            id,
            name,
            matricula,
            email,
            salon,
            semester
          ),
          test:test_id (
            id,
            title,
            type,
            level,
            carrera,
            semestre,
            grupo,
            profesor,
            created_at
          ),
          question:question_id (
            id,
            text,
            type,
            choices,
            correct_answer,
            left_items,
            right_items,
            correct_pairs,
            is_true
          )
        `)
        .eq('student_id', studentId)
        .eq('exam_id', examId);

      if (oldAnswerError) throw oldAnswerError;

      if (oldAnswerData && oldAnswerData.length > 0) {
        // Process old format answers
        setStudentInfo(oldAnswerData[0].student);
        setExamInfo({
          ...oldAnswerData[0].test,
          completion_time: Math.max(...oldAnswerData.map(a => new Date(a.created_at)))
        });

        const processedOldAnswers = oldAnswerData.map(answer => {
          const question = answer.question;
          let isCorrect = false;
          let studentAnswerDisplay = 'Not answered';
          let correctAnswerDisplay = 'Unknown';

          if (question.type === 'multiple' && answer.answer) {
            try {
              const answerIndex = parseInt(answer.answer);
              studentAnswerDisplay = question.choices[answerIndex] || 'Invalid selection';
              const correctIndex = question.correct_answer;
              correctAnswerDisplay = question.choices[correctIndex] || 'Not specified';
              isCorrect = answerIndex === correctIndex;
            } catch (e) {
              console.error('Error parsing multiple choice answer:', e);
            }
          } 
          else if (question.type === 'truefalse') {
            const studentBool = typeof answer.answer === 'boolean' ? answer.answer : 
                               (answer.answer === 'true' || answer.answer === true);
            studentAnswerDisplay = studentBool ? 'True' : 'False';
            
            const correctBool = question.is_true !== null ? question.is_true : 
                               (question.correct_answer === 'true' || question.correct_answer === true);
            correctAnswerDisplay = correctBool ? 'True' : 'False';
            
            isCorrect = studentBool === correctBool;
          }
          else if (question.type === 'matching' && answer.answer) {
            studentAnswerDisplay = 'See details';
            correctAnswerDisplay = 'See details';
            
            try {
              const studentPairs = typeof answer.answer === 'string' ? 
                                  JSON.parse(answer.answer) : answer.answer;
              const correctPairs = question.correct_pairs;
              
              isCorrect = JSON.stringify(studentPairs.sort()) === JSON.stringify(correctPairs.sort());
            } catch (e) {
              console.error('Error parsing matching answer:', e);
            }
          }
          else if (question.type === 'underline' && answer.answer) {
            studentAnswerDisplay = answer.answer;
            correctAnswerDisplay = question.correct_answer;
            isCorrect = answer.answer === question.correct_answer;
          }

          return {
            id: question.id,
            questionText: question.text,
            questionType: question.type,
            points: 1,
            studentAnswer: studentAnswerDisplay,
            correctAnswer: correctAnswerDisplay,
            isCorrect: isCorrect,
            rawStudentAnswer: answer.answer,
            rawQuestion: question
          };
        });

        setAnswers(processedOldAnswers);
        return;
      }

      // If we reach here, no data was found
      setError('No exam data found for this student and exam ID.');
    } catch (err) {
      console.error('Error loading student answers:', err);
      setError('Failed to load student answers: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = () => {
    if (!answers || answers.length === 0) return 0;
    const totalCorrect = answers.filter(a => a.isCorrect).length;
    return Math.round((totalCorrect / answers.length) * 100);
  };

  const downloadAnswersExcel = () => {
    if (!answers || answers.length === 0 || !studentInfo || !examInfo) return;

    try {
      // Create worksheet data
      const wsData = [
        ['Student Name', studentInfo.name || 'Unknown'],
        ['Matricula', studentInfo.matricula || 'Unknown'],
        ['Email', studentInfo.email || 'Unknown'],
        ['Salon', studentInfo.salon || 'Unknown'],
        ['Semester', studentInfo.semester || 'Unknown'],
        [''],
        ['Exam Title', examInfo.title || 'Unknown'],
        ['Exam Type', examInfo.type || 'Unknown'],
        ['Level', examInfo.level || 'Unknown'],
        ['Completion Time', examInfo.completion_time ? new Date(examInfo.completion_time).toLocaleString() : 'Unknown'],
        ['Total Score', `${examInfo.total_score || calculateTotalScore()}%`],
        [''],
        ['Question #', 'Question Type', 'Question Text', 'Student Answer', 'Correct Answer', 'Points', 'Status']
      ];

      // Add answer data
      answers.forEach((answer, index) => {
        wsData.push([
          index + 1,
          answer.questionType,
          answer.questionText,
          answer.studentAnswer,
          answer.correctAnswer,
          answer.points,
          answer.isCorrect ? 'Correct' : 'Incorrect'
        ]);
      });

      // Create workbook and sheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Student Answers');
      
      // Generate file name
      const fileName = `${studentInfo.name.replace(/\s+/g, '_')}_${examInfo.title.replace(/\s+/g, '_')}_answers.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to download Excel file. Please try again.');
    }
  };

  const viewOtherAttempt = (attemptId) => {
    navigate(`/student-answers/${studentId}/${attemptId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Student Exam Answers</h1>
                <p className="text-sm text-gray-500">Review detailed student responses</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={loadStudentAnswers}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={downloadAnswersExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                disabled={!answers || answers.length === 0}
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <p>{error}</p>
            </div>
            <button
              onClick={loadStudentAnswers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Multiple Attempts Warning */}
            {hasMultipleAttempts && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Multiple Exam Attempts Detected</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>This student has multiple submissions for this exam:</p>
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        {allAttempts.slice(0, 5).map((attempt, index) => (
                          <li key={attempt.id} className="flex items-center justify-between">
                            <span>
                              Attempt {index + 1}: {new Date(attempt.created_at).toLocaleString()}
                              {attempt.id === examId && <span className="ml-2 text-green-600 font-medium">(Current)</span>}
                            </span>
                            {attempt.id !== examId && (
                              <button
                                onClick={() => viewOtherAttempt(attempt.id)}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                                title="View this attempt"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Student and Exam Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student Info Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
                {studentInfo && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <span className="ml-2 text-gray-900">{studentInfo.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Matricula:</span>
                      <span className="ml-2 text-gray-900">{studentInfo.matricula}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <span className="ml-2 text-gray-900">{studentInfo.email}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Salon:</span>
                      <span className="ml-2 text-gray-900">{studentInfo.salon}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Semester:</span>
                      <span className="ml-2 text-gray-900">{studentInfo.semester}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Exam Info Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Exam Information</h2>
                {examInfo && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Title:</span>
                      <span className="ml-2 text-gray-900">{examInfo.title}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Type:</span>
                      <span className="ml-2 text-gray-900">{examInfo.type} Exam</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Level:</span>
                      <span className="ml-2 text-gray-900">{examInfo.level}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Score:</span>
                      <span className="ml-2 text-gray-900 font-bold">
                        {examInfo.total_score !== undefined ? examInfo.total_score : calculateTotalScore()}%
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Completed on:</span>
                      <span className="ml-2 text-gray-900">
                        {examInfo.completion_time ? new Date(examInfo.completion_time).toLocaleString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Score Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-blue-600">Total Questions</p>
                  <p className="text-3xl font-bold text-blue-700">{answers.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-green-600">Correct Answers</p>
                  <p className="text-3xl font-bold text-green-700">{answers.filter(a => a.isCorrect).length}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-indigo-600">Score</p>
                  <p className="text-3xl font-bold text-indigo-700">
                    {examInfo?.total_score !== undefined ? examInfo.total_score : calculateTotalScore()}%
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'answers' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('answers')}
                >
                  Question Answers
                </button>
                <button
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'details' 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('details')}
                >
                  Detailed Analysis
                </button>
              </div>

              {activeTab === 'answers' && (
                <div className="p-6">
                  {answers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No answers found for this exam.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {answers.map((answer, index) => (
                        <div key={answer.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                            <div>
                              <h3 className="font-medium text-gray-900">Question {index + 1}</h3>
                              <p className="text-sm text-gray-500 capitalize">{answer.questionType.replace('_', ' ')}</p>
                            </div>
                            <div>
                              {answer.isCorrect ? (
                                <div className="flex items-center text-green-600">
                                  <CheckCircle className="w-5 h-5 mr-1" />
                                  <span>Correct</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-red-600">
                                  <XCircle className="w-5 h-5 mr-1" />
                                  <span>Incorrect</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="px-6 py-4">
                            <p className="mb-4 text-gray-900">{answer.questionText}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className={`p-4 rounded-lg ${answer.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                                <p className="text-sm font-medium mb-2">Student Answer:</p>
                                <p className={`${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                  {answer.studentAnswer}
                                </p>
                              </div>
                              <div className="p-4 rounded-lg bg-blue-50">
                                <p className="text-sm font-medium mb-2">Correct Answer:</p>
                                <p className="text-blue-700">{answer.correctAnswer}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'details' && (
                <div className="p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Performance by Question Type</h3>
                  
                  {/* Group by question type and calculate performance */}
                  {(() => {
                    const questionTypes = {};
                    answers.forEach(answer => {
                      const type = answer.questionType;
                      if (!questionTypes[type]) {
                        questionTypes[type] = { total: 0, correct: 0 };
                      }
                      questionTypes[type].total++;
                      if (answer.isCorrect) {
                        questionTypes[type].correct++;
                      }
                    });

                    return (
                      <div className="space-y-4">
                        {Object.entries(questionTypes).map(([type, data]) => (
                          <div key={type} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium text-gray-900 capitalize">{type.replace('_', ' ')} Questions</h4>
                              <span className="text-sm font-medium text-gray-500">
                                {data.correct} of {data.total} correct ({Math.round((data.correct / data.total) * 100)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="bg-blue-600 h-2.5 rounded-full" 
                                style={{ width: `${(data.correct / data.total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <h3 className="font-medium text-gray-900 mt-8 mb-4">Time Analysis</h3>
                  <p className="text-gray-500 mb-6">
                    This exam was completed on {examInfo?.completion_time ? new Date(examInfo.completion_time).toLocaleString() : 'Unknown date'}.
                  </p>

                  <h3 className="font-medium text-gray-900 mt-8 mb-4">Raw Answer Data</h3>
                  <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                    <pre className="text-xs text-gray-800">
                      {JSON.stringify({ answers: answers.map(a => ({ 
                        question: a.questionText,
                        type: a.questionType,
                        studentAnswer: a.studentAnswer,
                        isCorrect: a.isCorrect
                      })) }, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAnswersViewer;