import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Headphones, 
  ChevronRight, 
  LayoutGrid, 
  ArrowLeft, 
  Timer, 
  Play, 
  X,
  Edit,
  Trash2,
  AlertTriangle,
  Plus,
  Calendar,
  FolderPlus,
  Folder
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TimerSettings from './TimerSettings';
import { getTests, deleteTest, createTest } from '../lib/questions';

interface SavedTest {
  id: string;
  title: string;
  type: 'TOEFL' | 'Unit';
  sections?: Array<{
    name: string;
    questions: any[];
  }>;
  created_at: string;
}

function ToeflExam() {
  const navigate = useNavigate();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showSavedTests, setShowSavedTests] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTest, setSelectedTest] = useState<SavedTest | null>(null);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  
  const [sectionTimers, setSectionTimers] = useState({
    listening: 35,
    structure: 40,
    reading: 40
  });

  const [timerConfig, setTimerConfig] = useState({
    listening: {
      duration: 35,
      warningTime: 5
    },
    structure: {
      duration: 40,
      warningTime: 5
    },
    reading: {
      duration: 40,
      warningTime: 5
    }
  });

  useEffect(() => {
    loadSavedTests();
  }, []);

  const loadSavedTests = async () => {
    try {
      setLoading(true);
      const { success, tests, groupedTests } = await getTests();
      if (success && groupedTests) {
        setSavedTests(groupedTests);
      } else {
        setError('Failed to load saved tests');
      }
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
      const testInfo = {
        title: folderName,
        type: 'TOEFL' as const,
        profesor: 'mohamed'
      };

      const { success, error } = await createTest(testInfo, []);
      
      if (success) {
        await loadSavedTests();
        setShowCreateFolder(false);
        setFolderName('');
      } else {
        setError(error as string);
      }
    } catch (err) {
      setError('Failed to create folder');
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      const { success, error } = await deleteTest(id);
      if (success) {
        await loadSavedTests();
        setShowDeleteConfirm(false);
        setSelectedTest(null);
      } else {
        setError(error as string);
      }
    } catch (err) {
      setError('Failed to delete test');
    }
  };

  const handleDeleteAllTests = async () => {
    try {
      // Delete all tests sequentially
      for (const test of savedTests) {
        await deleteTest(test.id);
      }
      await loadSavedTests();
      setShowDeleteAllConfirm(false);
    } catch (err) {
      setError('Failed to delete all tests');
    }
  };

  const handleScheduleTest = (test: any) => {
    setSelectedTest(test);
    navigate('/exam-schedule', { state: { test } });
  };

  const handleSelectFolder = (test: SavedTest) => {
    // Store the selected folder ID in localStorage
    localStorage.setItem('currentTOEFLTestId', test.id);
    
    // Instead of reloading the page, explicitly navigate to the sections
    // Navigate to the listening section (or whatever section you prefer to show first)
    navigate('/listening-questions');
  };

  const handleUpdateTimer = (section: string, duration: number) => {
    setSectionTimers(prev => ({
      ...prev,
      [section]: duration
    }));

    // Save timer settings to database
    const saveTimer = async () => {
      try {
        const { error } = await supabase
          .from('tests')
          .update({ 
            section_duration: duration
          })
          .eq('section', section)
          .eq('parent_test_id', selectedTest?.id);

        if (error) throw error;
      } catch (err) {
        console.error('Error saving timer:', err);
        setError('Failed to save timer settings');
      }
    };

    saveTimer();
  };

  const sections = [
    {
      title: 'Listening Questions',
      icon: <Headphones className="w-7 h-7 text-blue-600" />,
      description: 'Audio-based comprehension assessments',
      duration: sectionTimers.listening,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      hoverBorder: 'hover:border-blue-300',
      path: '/listening-questions',
      timerKey: 'listening' as const
    },
    {
      title: 'Structure Questions',
      icon: <LayoutGrid className="w-7 h-7 text-emerald-600" />,
      description: 'Grammar and language structure tests',
      duration: sectionTimers.structure,
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      hoverBorder: 'hover:border-emerald-300',
      path: '/structure-questions',
      timerKey: 'structure' as const
    },
    {
      title: 'Reading Passages',
      icon: <BookOpen className="w-7 h-7 text-purple-600" />,
      description: 'Comprehensive reading comprehension tests',
      duration: sectionTimers.reading,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      hoverBorder: 'hover:border-purple-300',
      path: '/reading-passages',
      timerKey: 'reading' as const
    }
  ];

  // Get the current folder name from localStorage
  const currentFolderId = localStorage.getItem('currentTOEFLTestId');
  const currentFolder = savedTests.find(test => test.id === currentFolderId);

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
                <h1 className="text-xl font-bold text-gray-900">TOEFL Exam Management</h1>
                <p className="text-sm text-gray-500">
                  {currentFolder 
                    ? `Working on: ${currentFolder.title}`
                    : 'Create and manage TOEFL test content'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowCreateFolder(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                Create New Folder
              </button>
              <button 
                onClick={() => setShowSavedTests(true)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
              >
                <Folder className="w-4 h-4" />
                Saved Tests
              </button>
              <button 
                onClick={() => setShowDeleteAllConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentFolder ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Folder className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Folder Selected</h3>
            <p className="text-gray-500 mb-4">
              Please create a new folder or select an existing one to manage TOEFL test content.
            </p>
            <button
              onClick={() => setShowSavedTests(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Folder className="w-4 h-4" />
              Select Folder
            </button>
          </div>
        ) : (
          <>
            {/* Section Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {sections.map((section) => (
                <div
                  key={section.title}
                  onClick={() => navigate(section.path)}
                  className={`bg-white rounded-xl border ${section.borderColor} ${section.hoverBorder} transition-all duration-200 hover:shadow-lg group cursor-pointer`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className={`p-3 ${section.bgColor} rounded-xl`}>
                        {section.icon}
                      </div>
                      <ChevronRight className={`w-5 h-5 ${section.textColor} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
                    </div>
                    
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {section.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {section.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Section Duration</span>
                        <span className="font-medium text-gray-900">
                          {timerConfig[section.timerKey].duration} minutes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Timer Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sections.map((section) => (
                <TimerSettings
                  key={section.timerKey}
                  title={section.title}
                  duration={timerConfig[section.timerKey].duration}
                  onDurationChange={(duration) => 
                    setTimerConfig(prev => ({
                      ...prev,
                      [section.timerKey]: { ...prev[section.timerKey], duration }
                    }))
                  }
                  showWarning={true}
                  warningTime={timerConfig[section.timerKey].warningTime}
                  onWarningTimeChange={(warningTime) =>
                    setTimerConfig(prev => ({
                      ...prev,
                      [section.timerKey]: { ...prev[section.timerKey], warningTime }
                    }))
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Create New TOEFL Test</h3>
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
                  Test Name
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter test name..."
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
                  Create Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Tests Modal */}
      {showSavedTests && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-3xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Saved TOEFL Tests</h3>
              <button
                onClick={() => setShowSavedTests(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading saved tests...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <p>{error}</p>
              </div>
            ) : savedTests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No saved TOEFL tests found</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {savedTests.map((test) => (
                  <div key={test.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Folder className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{test.title}</h4>
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
                    </div>
                    <div className="p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Sections:</h5>
                      <div className="space-y-2">
                        {sections.map((section, index) => {
                          const savedSection = test.sections?.find(s => s.name === section.title.split(' ')[0]);
                          return (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {section.icon}
                                <span className="text-gray-600">{section.title}</span>
                              </div>
                              <span className="text-gray-500">
                                {savedSection ? `${savedSection.questions.length} questions` : 'Empty'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => {
                          handleSelectFolder(test);
                          setShowSavedTests(false);
                        }}
                        className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Select Folder
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6 pt-6 border-t">
              <button
                onClick={() => setShowSavedTests(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
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
              <h3 className="text-xl font-semibold">Delete Test</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this test?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {selectedTest.title}
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
                Delete Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Delete All Tests</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete all TOEFL tests?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone and will remove all saved tests.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllTests}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete All Tests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ToeflExam;