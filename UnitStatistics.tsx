import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BarChart2,
  AlertTriangle,
  Download,
  RefreshCw,
  FileText,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Filter,
  Trash2,
  Info
} from 'lucide-react';
// Import supabase from your project's location
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

const UnitStatistics: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<any[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterParams, setFilterParams] = useState<{
    salon?: string;
    score?: string;
  }>({});
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [resultToDelete, setResultToDelete] = useState<any | null>(null);
  const [recalculationStatus, setRecalculationStatus] = useState<string>('');
  const [uniqueStudentCount, setUniqueStudentCount] = useState<number>(0);

  useEffect(() => {
    loadStatistics();
  }, []);

  // Helper function to get all unique IDs in an array
  const getUniqueIds = (array: any[], key: string): any[] => {
    return [...new Set(array.map(item => item[key]))];
  };

  // Helper function to calculate the correct score
  const calculateCorrectScore = (answers: any[]): number => {
    if (!answers || answers.length === 0) return 0;
    const totalCorrect = answers.filter(a => a.isCorrect).length;
    return Math.round((totalCorrect / answers.length) * 100);
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      setRecalculationStatus('');

      // First try the separate queries approach to avoid relationship issues
      const { data: examResults, error: resultsError } = await supabase
        .from('unit_exam_results')
        .select(`
          id,
          student_id,
          test_id,
          exam_id,
          total_score,
          total_points,
          answers,
          completion_time,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (resultsError) throw resultsError;
      
      if (examResults && examResults.length > 0) {
        // Get all unique IDs
        const studentIds = [...new Set(examResults.map(r => r.student_id))];
        const testIds = [...new Set(examResults.map(r => r.test_id))];
        
        // Get student data
        const { data: students } = await supabase
          .from('students')
          .select('*')
          .in('id', studentIds);
          
        // Get test data
        const { data: tests } = await supabase
          .from('tests')
          .select('*')
          .in('id', testIds);
          
        // Create lookup maps
        const studentMap: Record<string, any> = {};
        const testMap: Record<string, any> = {};
        
        if (students) {
          students.forEach(student => {
            studentMap[student.id] = student;
          });
        }
        
        if (tests) {
          tests.forEach(test => {
            testMap[test.id] = test;
          });
        }
        
        // Join the data manually
        const combinedResults = examResults.map(result => ({
          ...result,
          student: studentMap[result.student_id] || null,
          test: testMap[result.test_id] || null
        }));
        
        setResults(combinedResults);
        setUniqueStudentCount(studentIds.length);
        return;
      }

      // If no unit_exam_results, try with combined_exam_results
      const { data: combinedResults, error: combinedError } = await supabase
        .from('combined_exam_results')
        .select(`
          id,
          student_id,
          test_id,
          exam_id,
          total_score,
          total_points,
          answers,
          completion_time,
          created_at,
          updated_at
        `)
        .eq('exam_type', 'Unit')
        .order('created_at', { ascending: false });

      if (combinedError) {
        throw combinedError;
      }

      if (combinedResults && combinedResults.length > 0) {
        // Get all unique IDs
        const studentIds = [...new Set(combinedResults.map(r => r.student_id))];
        const testIds = [...new Set(combinedResults.map(r => r.test_id))];
        
        // Get student data
        const { data: students } = await supabase
          .from('students')
          .select('*')
          .in('id', studentIds);
          
        // Get test data
        const { data: tests } = await supabase
          .from('tests')
          .select('*')
          .in('id', testIds);
          
        // Create lookup maps
        const studentMap: Record<string, any> = {};
        const testMap: Record<string, any> = {};
        
        if (students) {
          students.forEach(student => {
            studentMap[student.id] = student;
          });
        }
        
        if (tests) {
          tests.forEach(test => {
            testMap[test.id] = test;
          });
        }
        
        // Join the data manually
        const processedResults = combinedResults.map(result => ({
          ...result,
          student: studentMap[result.student_id] || null,
          test: testMap[result.test_id] || null
        }));
        
        setResults(processedResults);
        setUniqueStudentCount(studentIds.length);
        return;
      }

      // Last resort - try student_answers directly and group by student/test
      const { data: answersData, error: answersError } = await supabase
        .from('student_answers')
        .select(`
          id,
          student_id,
          test_id,
          exam_id,
          question_id,
          answer,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (answersError) {
        throw answersError;
      }

      if (answersData && answersData.length > 0) {
        // Get all unique IDs
        const studentIds = [...new Set(answersData.map(r => r.student_id))];
        const testIds = [...new Set(answersData.map(r => r.test_id))] as string[];
        
        // Get student data
        const { data: students } = await supabase
          .from('students')
          .select('*')
          .in('id', studentIds);
          
        // Get test data
        const { data: tests } = await supabase
          .from('tests')
          .select('*')
          .in('id', testIds.filter(id => id !== null));
          
        // Create lookup maps
        const studentMap: Record<string, any> = {};
        const testMap: Record<string, any> = {};
        
        if (students) {
          students.forEach(student => {
            studentMap[student.id] = student;
          });
        }
        
        if (tests) {
          tests.forEach(test => {
            testMap[test.id] = test;
          });
        }

        // Group by student_id and test_id
        const groupedData: Record<string, any> = {};
        for (const answer of answersData) {
          const key = `${answer.student_id || 'unknown'}_${answer.test_id || answer.exam_id || 'unknown'}`;
          if (!groupedData[key]) {
            groupedData[key] = {
              id: key,
              student_id: answer.student_id,
              test_id: answer.test_id,
              exam_id: answer.exam_id,
              created_at: answer.created_at,
              updated_at: answer.updated_at,
              student: studentMap[answer.student_id] || null,
              test: testMap[answer.test_id] || null,
              answers: []
            };
          }
          groupedData[key].answers.push(answer);
          // Update created_at to most recent
          if (new Date(answer.created_at) > new Date(groupedData[key].created_at)) {
            groupedData[key].created_at = answer.created_at;
          }
        }
        
        const processedResults = Object.values(groupedData);
        setResults(processedResults);
        setUniqueStudentCount(getUniqueIds(processedResults, 'student_id').length);
        return;
      }

      setResults([]);
    } catch (err: any) {
      console.error('Error loading statistics:', err);
      setError('Failed to load exam statistics: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const loadStudentAnswers = async (result: any) => {
    try {
      setLoadingAnswers(true);
      setSelectedResult(result);
      setStudentAnswers([]);

      if (!result.test_id) {
        setError('No test data available for this exam');
        return;
      }

      // Get questions for this test
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          text,
          type,
          correct_answer,
          choices,
          left_items,
          right_items,
          correct_pairs
        `)
        .eq('test_id', result.test_id)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;

      if (!questions || questions.length === 0) {
        // Try unit_questions instead
        const { data: unitQuestions, error: unitQuestionsError } = await supabase
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
            )
          `)
          .eq('exam_id', result.test_id)
          .order('created_at', { ascending: true });

        if (unitQuestionsError) throw unitQuestionsError;

        if (!unitQuestions || unitQuestions.length === 0) {
          setError('No questions found for this test');
          return;
        }

        // Process answers from unit_exam_results
        if (result.answers) {
          const processedAnswers = unitQuestions.map(question => {
            const questionId = question.id;
            const studentAnswer = result.answers[questionId] || null;
            let isCorrect = false;
            let studentAnswerDisplay = 'Not answered';
            let correctAnswerDisplay = 'Unknown';

            // Check answer based on question type
            if (question.question_type === 'multiple_choice' && studentAnswer) {
              const selectedChoice = question.choices?.find(c => c.id === studentAnswer.option_id);
              const correctChoice = question.choices?.find(c => c.is_correct);
              
              studentAnswerDisplay = selectedChoice 
                ? selectedChoice.choice_text 
                : `Invalid selection (${studentAnswer.option_id})`;
              
              correctAnswerDisplay = correctChoice 
                ? correctChoice.choice_text 
                : 'Not specified';
              
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
              
              // Complex check for matching answers
              if (studentAnswer.pairs && question.correct_answer && question.correct_answer.pairs) {
                const studentPairs = studentAnswer.pairs;
                const correctPairs = question.correct_answer.pairs;
                
                // Check if all pairs match
                let matchCount = 0;
                for (const pair of studentPairs) {
                  if (correctPairs.some(cp => cp[0] === pair[0] && cp[1] === pair[1])) {
                    matchCount++;
                  }
                }
                
                isCorrect = matchCount === correctPairs.length;
                studentAnswerDisplay = `${matchCount}/${correctPairs.length} pairs correct`;
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

          setStudentAnswers(processedAnswers);
          return;
        }

        // No directly stored answers, need to look them up from student_answers
        const { data: studentAnswersData, error: saError } = await supabase
          .from('student_answers')
          .select(`
            id,
            question_id,
            answer,
            created_at
          `)
          .eq('student_id', result.student_id)
          .eq('test_id', result.test_id)
          .order('created_at', { ascending: true });

        if (saError) throw saError;

        if (!studentAnswersData || studentAnswersData.length === 0) {
          setError('No answers found for this student/test combination');
          return;
        }

        // Create a map of question ID to answer
        const answerMap: Record<string, any> = {};
        for (const answer of studentAnswersData) {
          answerMap[answer.question_id] = answer.answer;
        }

        // Process answers
        const processedAnswers = unitQuestions.map(question => {
          const questionId = question.id;
          const studentAnswer = answerMap[questionId];
          let isCorrect = false;
          let studentAnswerDisplay = 'Not answered';
          let correctAnswerDisplay = 'Unknown';

          // Map unit_questions to standard question types
          const questionType = question.question_type === 'multiple_choice' ? 'multiple' : 
                              question.question_type === 'true_false' ? 'truefalse' : 
                              question.question_type;

          // Determine correctness based on question type
          if (questionType === 'multiple' && studentAnswer) {
            const choices = question.choices || [];
            const correctChoiceIndex = choices.findIndex(c => c.is_correct);
            
            try {
              const answerIndex = parseInt(studentAnswer);
              const selectedChoice = choices[answerIndex];
              
              studentAnswerDisplay = selectedChoice ? selectedChoice.choice_text : `Option ${answerIndex + 1}`;
              correctAnswerDisplay = correctChoiceIndex >= 0 ? 
                choices[correctChoiceIndex].choice_text : 'Unknown';
              
              isCorrect = answerIndex === correctChoiceIndex;
            } catch (e) {
              studentAnswerDisplay = `Invalid (${studentAnswer})`;
            }
          } 
          else if (questionType === 'truefalse' && studentAnswer !== undefined) {
            const isTrue = studentAnswer === 'true' || studentAnswer === true;
            studentAnswerDisplay = isTrue ? 'True' : 'False';
            
            const correctAnswer = question.correct_answer?.is_true === true;
            correctAnswerDisplay = correctAnswer ? 'True' : 'False';
            
            isCorrect = isTrue === correctAnswer;
          }

          return {
            id: question.id,
            questionText: question.question_text,
            questionType: questionType,
            points: question.points || 1,
            studentAnswer: studentAnswerDisplay,
            correctAnswer: correctAnswerDisplay,
            isCorrect: isCorrect,
            rawStudentAnswer: studentAnswer,
            rawQuestion: question
          };
        });

        setStudentAnswers(processedAnswers);
        return;
      }

      // We have standard questions, now get the student's answers
      const { data: studentAnswersData, error: answerError } = await supabase
        .from('student_answers')
        .select(`
          id,
          question_id,
          answer,
          created_at
        `)
        .eq('student_id', result.student_id)
        .eq('test_id', result.test_id)
        .order('created_at', { ascending: true });

      if (answerError) throw answerError;

      if (!studentAnswersData || studentAnswersData.length === 0) {
        setError('No answers found for this student/test combination');
        return;
      }

      // Create a map of question ID to answer
      const answerMap: Record<string, any> = {};
      for (const answer of studentAnswersData) {
        answerMap[answer.question_id] = answer.answer;
      }

      // Process answers
      const processedAnswers = questions.map(question => {
        const questionId = question.id;
        const studentAnswer = answerMap[questionId];
        let isCorrect = false;
        let studentAnswerDisplay = 'Not answered';
        let correctAnswerDisplay = 'Unknown';

        // Check correctness based on question type
        if (question.type === 'multiple' && studentAnswer !== undefined) {
          try {
            const answerIndex = parseInt(studentAnswer);
            const correctIndex = parseInt(question.correct_answer);
            const choices = Array.isArray(question.choices) ? question.choices : [];
            
            studentAnswerDisplay = answerIndex < choices.length ? 
              choices[answerIndex] : `Option ${answerIndex + 1}`;
            
            correctAnswerDisplay = correctIndex < choices.length ? 
              choices[correctIndex] : `Option ${correctIndex + 1}`;
            
            isCorrect = answerIndex === correctIndex;
          } catch (e) {
            studentAnswerDisplay = `Invalid (${studentAnswer})`;
          }
        } 
        else if (question.type === 'truefalse' && studentAnswer !== undefined) {
          const isTrue = studentAnswer === 'true' || studentAnswer === true;
          studentAnswerDisplay = isTrue ? 'True' : 'False';
          
          const correctIsTrue = question.correct_answer === 'true' || question.correct_answer === true;
          correctAnswerDisplay = correctIsTrue ? 'True' : 'False';
          
          isCorrect = isTrue === correctIsTrue;
        }
        else if (question.type === 'matching' && studentAnswer) {
          studentAnswerDisplay = 'Matching pairs';
          correctAnswerDisplay = 'See details';
          
          try {
            // Parse student answer and correct answer as JSON if needed
            const studentPairs = typeof studentAnswer === 'string' ? 
              JSON.parse(studentAnswer) : studentAnswer;
            
            const correctPairs = typeof question.correct_pairs === 'string' ? 
              JSON.parse(question.correct_pairs) : question.correct_pairs;
            
            // Compare pairs
            isCorrect = JSON.stringify(studentPairs.sort()) === JSON.stringify(correctPairs.sort());
            
            studentAnswerDisplay = isCorrect ? 'All pairs correct' : 'Some pairs incorrect';
          } catch (e) {
            studentAnswerDisplay = 'Invalid matching answer';
          }
        }
        else if (studentAnswer !== undefined) {
          // For any other type, simple string comparison
          studentAnswerDisplay = String(studentAnswer);
          correctAnswerDisplay = String(question.correct_answer || '');
          isCorrect = studentAnswerDisplay === correctAnswerDisplay;
        }

        return {
          id: question.id,
          questionText: question.text,
          questionType: question.type,
          points: 1, // Default point value
          studentAnswer: studentAnswerDisplay,
          correctAnswer: correctAnswerDisplay,
          isCorrect: isCorrect,
          rawStudentAnswer: studentAnswer,
          rawQuestion: question
        };
      });

      setStudentAnswers(processedAnswers);
    } catch (err: any) {
      console.error('Error loading student answers:', err);
      setError('Failed to load student answers: ' + (err.message || err));
    } finally {
      setLoadingAnswers(false);
    }
  };

  const recalculateAllScores = async () => {
    try {
      setRecalculationStatus('Recalculating scores...');
      let processedCount = 0;
      
      // Process each result separately
      for (const result of results) {
        await loadStudentAnswers(result);
        
        // Wait for studentAnswers to be populated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Calculate the correct score
        if (studentAnswers.length > 0) {
          const correctScore = calculateCorrectScore(studentAnswers);
          
          // Update the result in the database
          const { error: updateError } = await supabase
            .from('unit_exam_results')
            .update({ total_score: correctScore })
            .eq('id', result.id);
          
          if (updateError) {
            console.error('Error updating score:', updateError);
          } else {
            processedCount++;
          }
        }
      }
      
      // Reload the data
      await loadStatistics();
      setRecalculationStatus(`Successfully recalculated ${processedCount} out of ${results.length} scores.`);
    } catch (err: any) {
      console.error('Error recalculating scores:', err);
      setRecalculationStatus('Error: ' + (err.message || err));
    }
  };

  const handleDeleteResult = async () => {
    if (!resultToDelete) return;
    
    try {
      setLoading(true);
      
      // Delete from unit_exam_results
      const { error: deleteError } = await supabase
        .from('unit_exam_results')
        .delete()
        .eq('id', resultToDelete.id);
      
      if (deleteError) throw deleteError;
      
      // Reload data and reset state
      await loadStatistics();
      setShowDeleteConfirm(false);
      setResultToDelete(null);
    } catch (err: any) {
      console.error('Error deleting result:', err);
      setError('Failed to delete result: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (results.length === 0) return;

    try {
      // Prepare data for export
      const wsData = [
        ['Unit Exam Results'],
        ['Generated on', new Date().toLocaleString()],
        [''],
        ['Student Name', 'Matricula', 'Salon', 'Test', 'Score', 'Date', 'Raw Score', 'Questions Answered', 'ID']
      ];

      results.forEach(result => {
        wsData.push([
          result.student?.name || 'Unknown',
          result.student?.matricula || 'Unknown',
          result.student?.salon || 'Unknown',
          result.test?.title || 'Unknown Test',
          `${result.total_score || 0}%`,
          new Date(result.completion_time || result.created_at).toLocaleString(),
          result.total_points || 'N/A',
          result.answers ? Object.keys(result.answers).length : 'N/A',
          result.id
        ]);
      });

      // Create workbook and sheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Exam Results');
      
      // Save file
      XLSX.writeFile(wb, `unit_exam_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err: any) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export data to Excel. Please try again.');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilterParams({});
    setSearchQuery('');
  };

  const filteredResults = results.filter(result => {
    // Apply search query
    const matchesSearch = 
      searchQuery === '' ||
      result.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.student?.matricula?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.student?.salon?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.test?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply salon filter
    const matchesSalon = 
      !filterParams.salon || 
      result.student?.salon === filterParams.salon;
    
    // Apply score filter
    const matchesScore = !filterParams.score || 
      (filterParams.score === '100' && result.total_score === 100) ||
      (filterParams.score === '0' && result.total_score === 0) ||
      (filterParams.score === 'other' && result.total_score !== 100 && result.total_score !== 0);
    
    return matchesSearch && matchesSalon && matchesScore;
  });

  // Extract unique salons for filter dropdown
  const uniqueSalons = [...new Set(results
    .filter(r => r.student?.salon)
    .map(r => r.student.salon))];

  if (loading && results.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Unit Exam Statistics</h1>
                <p className="text-sm text-gray-500">View and analyze student exam responses</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Filter results"
              >
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => loadStatistics()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                disabled={results.length === 0}
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
              onClick={() => {
                setError(null);
                loadStatistics();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="mb-4">
              <BarChart2 className="w-12 h-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-500">No unit exam results have been recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Analytics Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Total Students</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {uniqueStudentCount}
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Average Score</h3>
                <p className="text-3xl font-bold text-indigo-600">
                  {results.length > 0 
                    ? Math.round(results.reduce((sum, r) => sum + (r.total_score || 0), 0) / results.length) 
                    : 0}%
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium mb-2">Total Exams</h3>
                <p className="text-3xl font-bold text-green-600">
                  {results.length}
                </p>
              </div>
            </div>
            
            {/* Recalculate Scores Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Score Calculation</h3>
                  <p className="text-sm text-gray-500">Recalculate all scores based on correct answers</p>
                </div>
                <button
                  onClick={recalculateAllScores}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={loading || results.length === 0}
                >
                  Recalculate All Scores
                </button>
              </div>
              
              {recalculationStatus && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">{recalculationStatus}</p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start">
                <Info className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-yellow-700">
                    If you're seeing many students with the same score (e.g., 15%), this might indicate a scoring calculation issue. Use this feature to recalculate scores based on the actual answers given.
                  </p>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Filter Results</h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear filters
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salon</label>
                    <select
                      value={filterParams.salon || ''}
                      onChange={(e) => handleFilterChange('salon', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Salons</option>
                      {uniqueSalons.map((salon) => (
                        <option key={salon} value={salon}>{salon}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                    <select
                      value={filterParams.score || ''}
                      onChange={(e) => handleFilterChange('score', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Scores</option>
                      <option value="100">100% - Perfect Scores</option>
                      <option value="0">0% - Zero Scores</option>
                      <option value="other">Other Scores</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by student name, matricula, salon or test name..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            {/* Results Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Unit Test Results</h2>
                <p className="text-sm text-gray-500">
                  Showing {filteredResults.length} of {results.length} total results
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredResults.map((result) => (
                      <React.Fragment key={result.id}>
                        <tr 
                          className={`hover:bg-gray-50 ${expandedStudent === result.id ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            const newExpandedId = expandedStudent === result.id ? null : result.id;
                            setExpandedStudent(newExpandedId);
                            if (newExpandedId) {
                              loadStudentAnswers(result);
                            }
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.student?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {result.student?.matricula || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Salon: {result.student?.salon || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.test?.title || 'Unknown Test'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {result.test?.carrera || 'Not specified'} - Semester {result.test?.semestre || 'Not specified'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Level: {result.test?.level || 'Not specified'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.total_score || 0}%
                            </div>
                            <div className="text-sm text-gray-500">
                              {result.total_points || 0} points
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(result.completion_time || result.created_at).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button 
                                className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newExpandedId = expandedStudent === result.id ? null : result.id;
                                  setExpandedStudent(newExpandedId);
                                  if (newExpandedId) {
                                    loadStudentAnswers(result);
                                  }
                                }}
                              >
                                {expandedStudent === result.id ? 
                                  <ChevronUp className="w-5 h-5" /> : 
                                  <ChevronDown className="w-5 h-5" />
                                }
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setResultToDelete(result);
                                  setShowDeleteConfirm(true);
                                }}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Answer View */}
                        {expandedStudent === result.id && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-gray-50">
                              {loadingAnswers ? (
                                <div className="flex justify-center items-center p-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                              ) : studentAnswers.length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-gray-500">No answer data available for this exam.</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-medium text-gray-900">Student Answers</h3>
                                    <div className="text-sm text-gray-500">
                                      <span className="font-medium">Correct Score: </span>
                                      {studentAnswers.filter(a => a.isCorrect).length} correct of {studentAnswers.length} questions (
                                        {Math.round((studentAnswers.filter(a => a.isCorrect).length / studentAnswers.length) * 100)}%
                                      )
                                      
                                      {result.total_score && result.total_score !== Math.round((studentAnswers.filter(a => a.isCorrect).length / studentAnswers.length) * 100) && (
                                        <span className="ml-2 text-red-600">
                                          (Stored: {result.total_score}%)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {studentAnswers.map((answer, index) => (
                                    <div key={answer.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                      <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                                        <div className="flex items-center">
                                          <span className="font-medium text-gray-700 mr-2">Question {index + 1}</span>
                                          <span className="text-xs text-gray-500">({answer.questionType})</span>
                                        </div>
                                        {answer.isCorrect ? (
                                          <span className="flex items-center text-green-600">
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            Correct
                                          </span>
                                        ) : (
                                          <span className="flex items-center text-red-600">
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Incorrect
                                          </span>
                                        )}
                                      </div>
                                      <div className="p-4">
                                        <p className="text-sm text-gray-800 mb-2">{answer.questionText}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                          <div className={`p-3 rounded-lg ${answer.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <p className="text-xs font-medium mb-1">Student Answer:</p>
                                            <p className={`text-sm ${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                              {answer.studentAnswer}
                                            </p>
                                          </div>
                                          <div className="p-3 rounded-lg bg-blue-50">
                                            <p className="text-xs font-medium mb-1">Correct Answer:</p>
                                            <p className="text-sm text-blue-700">{answer.correctAnswer}</p>
                                          </div>
                                        </div>
                                        
                                        {/* Option details for multiple choice */}
                                        {answer.questionType === 'multiple' && answer.rawQuestion.choices && (
                                          <div className="mt-3 border-t border-gray-200 pt-3">
                                            <p className="text-xs font-medium mb-2">All Options:</p>
                                            <div className="space-y-1">
                                              {Array.isArray(answer.rawQuestion.choices) && answer.rawQuestion.choices.map((choice: string, idx: number) => {
                                                const isCorrect = parseInt(answer.rawQuestion.correct_answer) === idx;
                                                const isSelected = answer.rawStudentAnswer === String(idx);
                                                
                                                return (
                                                  <div 
                                                    key={idx} 
                                                    className={`text-sm p-2 rounded-md ${
                                                      isCorrect ? 'bg-green-50 border border-green-200' : 
                                                      (isSelected && !isCorrect) ? 'bg-red-50 border border-red-200' : 
                                                      'bg-gray-50 border border-gray-200'
                                                    }`}
                                                  >
                                                    {choice}
                                                    {isCorrect && <span className="ml-2 text-green-600 text-xs">(Correct)</span>}
                                                    {(isSelected && !isCorrect) && 
                                                      <span className="ml-2 text-red-600 text-xs">(Selected)</span>}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* For multiple_choice questions */}
                                        {answer.questionType === 'multiple_choice' && answer.rawQuestion.choices && (
                                          <div className="mt-3 border-t border-gray-200 pt-3">
                                            <p className="text-xs font-medium mb-2">All Options:</p>
                                            <div className="space-y-1">
                                              {answer.rawQuestion.choices.map((choice: any) => {
                                                const isCorrect = choice.is_correct;
                                                const isSelected = answer.rawStudentAnswer && 
                                                  choice.id === answer.rawStudentAnswer.option_id;
                                                
                                                return (
                                                  <div 
                                                    key={choice.id} 
                                                    className={`text-sm p-2 rounded-md ${
                                                      isCorrect ? 'bg-green-50 border border-green-200' : 
                                                      (isSelected && !isCorrect) ? 'bg-red-50 border border-red-200' : 
                                                      'bg-gray-50 border border-gray-200'
                                                    }`}
                                                  >
                                                    {choice.choice_text}
                                                    {isCorrect && <span className="ml-2 text-green-600 text-xs">(Correct)</span>}
                                                    {(isSelected && !isCorrect) && 
                                                      <span className="ml-2 text-red-600 text-xs">(Selected)</span>}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && resultToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Delete Exam Result</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this exam result?
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p><span className="font-medium">Student:</span> {resultToDelete.student?.name}</p>
              <p><span className="font-medium">Test:</span> {resultToDelete.test?.title}</p>
              <p><span className="font-medium">Score:</span> {resultToDelete.total_score}%</p>
              <p><span className="font-medium">Date:</span> {new Date(resultToDelete.completion_time || resultToDelete.created_at).toLocaleString()}</p>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setResultToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteResult}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitStatistics;