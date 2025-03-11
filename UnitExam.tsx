import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  X, 
  AlertTriangle, 
  BookOpen, 
  Calendar,
  FolderPlus,
  Folder,
  Eye,
  Edit,
  List
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface TestInfo {
  title: string;
  type: 'Unit';
  level: 'Basic' | 'Intermedio' | 'Advanced';
  carrera: string;
  semestre: string;
  grupo: string;
  profesor: string;
  salons: string[];
  parent_test_id?: string;
}

interface SavedTest {
  id: string;
  title: string;
  type: 'Unit';
  level?: string;
  carrera?: string;
  semestre?: string;
  grupo?: string;
  profesor: string;
  salons?: string[];
  parent_test_id?: string;
  created_at: string;
}

export default function UnitExam() {
  const navigate = useNavigate();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showSavedTests, setShowSavedTests] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTest, setSelectedTest] = useState<SavedTest | null>(null);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [showQuestions, setShowQuestions] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showDeleteQuestionConfirm, setShowDeleteQuestionConfirm] = useState(false);
  const [showDeleteOldExamsConfirm, setShowDeleteOldExamsConfirm] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [scheduledExams, setScheduledExams] = useState<any[]>([]);

  useEffect(() => {
    loadSavedTests();
    loadScheduledExams();
  }, []);

  const loadScheduledExams = async () => {
    try {
      const { data: exams, error: examsError } = await supabase
        .from('exam_schedule').select(`
          *,
          test:test_id (
            id,
            title,
            type,
            level,
            carrera,
            semestre,
            grupo,
            profesor,
            salons
          )
        `)
        .eq('test.type', 'Unit')
        .order('date', { ascending: true });

      if (examsError) throw examsError;
      setScheduledExams(exams || []);
    } catch (err) {
      console.error('Error loading scheduled exams:', err);
      setError('Failed to load scheduled exams');
    }
  };

  const handleDeleteOldExams = async () => {
    try {
      const now = new Date();
      
      // First get IDs of old Unit exams
      const { data: oldExams, error: fetchError } = await supabase
        .from('exam_schedule')
        .select(`
          id,
          test:test_id (
            type
          )
        `)
        .lt('date', now.toISOString().split('T')[0])
        .eq('test.type', 'Unit');

      if (fetchError) throw fetchError;
      
      if (!oldExams || oldExams.length === 0) {
        setError('No old exams found to delete');
        return;
      }

      // Delete the old exams
      const { error: deleteError } = await supabase
        .from('exam_schedule')
        .delete()
        .in('id', oldExams.map(exam => exam.id));

      if (deleteError) throw deleteError;

      await loadScheduledExams();
      setShowDeleteOldExamsConfirm(false);
      setError(null);
    } catch (err) {
      console.error('Error deleting old exams:', err);
      setError('Failed to delete old exams');
    }
  };

  const loadQuestions = async (testId: string) => {
    try {
      setLoading(true);
      const { data: questionData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionData || []);
      setShowQuestions(testId);
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (deleteError) throw deleteError;

      setQuestions(questions.filter(q => q.id !== questionId));
      setShowDeleteQuestionConfirm(false);
      setSelectedQuestion(null);
    } catch (err) {
      console.error('Error deleting question:', err);
      setError('Failed to delete question');
    }
  };

  const loadSavedTests = async () => {
    try {
      setLoading(true);
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('type', 'Unit')
        .is('parent_test_id', null) // Only get parent folders
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;
      setSavedTests(tests || []);
    } catch (err) {
      console.error('Error loading tests:', err);
      setError('Failed to load saved tests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setError('Please enter a folder name');
      return;
    }

    try {
      // Create parent folder
      const { data: folder, error: folderError } = await supabase
        .from('tests')
        .insert([{
          title: folderName,
          type: 'Unit',
          profesor: 'mohamed',
          created_by: 'mohamed'
        }])
        .select()
        .single();

      if (folderError) throw folderError;

      await loadSavedTests();
      setShowCreateFolder(false);
      setFolderName('');
    } catch (err) {
      console.error('Error creating folder:', err);
      setError('Failed to create folder');
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      // Delete all child sections first
      const { error: sectionsError } = await supabase
        .from('tests')
        .delete()
        .eq('parent_test_id', id);

      if (sectionsError) throw sectionsError;

      // Delete the parent folder
      const { error: deleteError } = await supabase
        .from('tests')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await loadSavedTests();
      setShowDeleteConfirm(false);
      setSelectedTest(null);
    } catch (err) {
      console.error('Error deleting test:', err);
      setError('Failed to delete test');
    }
  };

  const handleScheduleTest = (test: SavedTest) => {
    navigate('/exam-schedule', { state: { test } });
  };

  const handleSelectFolder = (test: SavedTest) => {
    // Get questions for this test
    const loadQuestions = async () => {
      try {
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', test.id)
          .order('created_at', { ascending: true });

        if (questionsError) throw questionsError;

        // Navigate with both folder and questions data
        navigate('/create-unit-test', { 
          state: { 
            folder: {
              ...test,
              questions: questions || []
            }
          }
        });
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Failed to load test questions');
      }
    };

    loadQuestions();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Unit Exam Management</h1>
                <p className="text-sm text-gray-500">Create and manage unit exams</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowCreateFolder(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                Create New Folder
              </button>
              <button 
                onClick={() => setShowSavedTests(true)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Folder className="w-4 h-4" />
                Saved Tests
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading saved tests...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <p>{error}</p>
            </div>
            <button
              onClick={loadSavedTests}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : savedTests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="mb-4">
              <Folder className="w-12 h-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Unit Exam Folders</h3>
            <p className="text-gray-500">Create a new folder to get started with unit exams.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Scheduled Exams Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Scheduled Exams</h2>
              {scheduledExams.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No exams are currently scheduled</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowDeleteOldExamsConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Old Exams
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {scheduledExams.map((exam) => (
                      <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{exam.test?.title || 'Untitled Test'}</h3>
                              <p className="text-sm text-gray-500">
                                {new Date(exam.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>Time: {exam.time}</p>
                          <p>Duration: {exam.duration} minutes</p>
                          <p>Level: {exam.test?.level || 'Not specified'}</p>
                          <p>{exam.test?.carrera || 'All Programs'} - Semester {exam.test?.semestre || 'All'} - Group {exam.test?.grupo || 'All'}</p>
                          <p>Salons: {exam.test?.salons?.join(', ') || 'All Salons'}</p>
                        </div>
                        <button
                          onClick={() => exam.test_id && loadQuestions(exam.test_id)}
                          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          disabled={!exam.test_id}
                        >
                          View Questions
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Test Folders Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Test Folders</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedTests.map((test) => (
                  <div key={test.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Folder className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{test.title}</h3>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(test.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleScheduleTest(test)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Schedule Test"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => loadQuestions(test.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Questions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTest(test);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Test"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Created: {new Date(test.created_at).toLocaleDateString()}</p>
                      {test.level && (
                        <p>Level: {test.level}</p>
                      )}
                      {test.carrera && test.semestre && test.grupo && (
                        <p>{test.carrera} - Semester {test.semestre} - Group {test.grupo}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleSelectFolder(test)}
                      className="w-full mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Select Folder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Create New Unit Exam Folder</h3>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter folder name..."
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  onClick={() => setShowCreateFolder(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions Modal */}
      {showQuestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Test Questions</h3>
              <button
                onClick={() => {
                  setShowQuestions(null);
                  setQuestions([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8">
                <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Questions Added</h4>
                <p className="text-gray-500">This test doesn't have any questions yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                        <p className="text-sm text-gray-500">{question.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectFolder(savedTests.find(t => t.id === showQuestions))}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedQuestion(question);
                            setShowDeleteQuestionConfirm(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-gray-800">{question.text}</p>

                      {question.type === 'multiple' && (
                        <div className="grid grid-cols-2 gap-4">
                          {question.choices?.map((choice: string, choiceIndex: number) => (
                            <div
                              key={choiceIndex}
                              className={`p-3 rounded-lg ${
                                choiceIndex === question.correct_answer
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-white border border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-sm font-medium border">
                                  {String.fromCharCode(65 + choiceIndex)}
                                </span>
                                <span>{choice}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'matching' && (
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                            {question.left_items?.map((item: string, itemIndex: number) => (
                              <div key={itemIndex} className="p-3 bg-white rounded-lg border border-gray-200">
                                {item}
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            {question.right_items?.map((item: string, itemIndex: number) => (
                              <div key={itemIndex} className="p-3 bg-white rounded-lg border border-gray-200">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {question.type === 'truefalse' && (
                        <div className="flex gap-4">
                          <div className={`flex-1 p-3 rounded-lg ${
                            question.isTrue ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'
                          }`}>
                            True
                          </div>
                          <div className={`flex-1 p-3 rounded-lg ${
                            !question.isTrue ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'
                          }`}>
                            False
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Question Confirmation Modal */}
      {showDeleteQuestionConfirm && selectedQuestion && (
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
                onClick={() => {
                  setShowDeleteQuestionConfirm(false);
                  setSelectedQuestion(null);
                }}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Delete Folder</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this folder?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This will delete all tests within this folder. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedTest(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTest(selectedTest.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Old Exams Confirmation Modal */}
      {showDeleteOldExamsConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Delete Old Exams</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete all past exams?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete all exams scheduled before today. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteOldExamsConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOldExams}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Old Exams
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}