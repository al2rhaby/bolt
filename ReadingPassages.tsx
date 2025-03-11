import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, X, AlertTriangle, BookOpen, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { saveTOEFLTest, getTOEFLQuestions } from '../lib/questions';

interface Passage {
  id: number;
  title: string;
  content: string;
  questions: Question[];
  sequence_number?: number; // Add sequence number
}

interface Question {
  id: number;
  text: string;
  choices: string[];
  correctAnswer: number;
  sequence_number?: number; // Add sequence number
}

interface NewPassage {
  title: string;
  content: string;
  questions: Question[];
}

export default function ReadingPassages() {
  const [showAddPassage, setShowAddPassage] = useState(false);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [newPassage, setNewPassage] = useState<NewPassage>({
    title: '',
    content: '',
    questions: []
  });

  const [showInstructions, setShowInstructions] = useState(false);
  const instructions = {
    description: "The Reading section tests students' comprehension of academic texts. During the exam, students will:",
    points: [
      "Read academic passages on various topics",
      "Answer questions about main ideas and details",
      "Identify key concepts and supporting evidence",
      "Make inferences based on the text"
    ],
    note: "Each passage should be followed by multiple-choice questions that test different aspects of reading comprehension."
  };

  useEffect(() => {
    loadSavedPassages();
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

  const loadSavedPassages = async () => {
    try {
      setLoading(true);
      
      // Check for parent test ID in localStorage
      const testId = localStorage.getItem('currentTOEFLTestId');
      if (!testId) {
        setError('No test selected. Please go back to TOEFL Exam and select a test.');
        setLoading(false);
        return;
      }
      
      console.log("Using test ID:", testId);

      const { success, tests } = await getTOEFLQuestions('Reading');
      if (success && tests && tests.length > 0) {
        const latestTest = tests[0];
        console.log("Loaded test data:", latestTest);
        
        // Group questions by passage
        const passageGroups = latestTest.questions.reduce((acc: any, q: any) => {
          const passageId = q.passage_id || 'default';
          if (!acc[passageId]) {
            acc[passageId] = {
              id: passageId,
              title: q.passage_title || 'Reading Passage',
              content: q.passage_content || '',
              questions: [],
              sequence_number: q.sequence_number || 1
            };
          }
          
          // Add question with sequence number
          acc[passageId].questions.push({
            id: q.id,
            text: q.text,
            choices: q.choices || [],
            correctAnswer: q.correct_answer,
            sequence_number: acc[passageId].questions.length + 1 // Assign sequential number to questions
          });
          
          return acc;
        }, {});

        console.log("Organized passage groups:", passageGroups);

        // Convert object to array and sort by sequence number
        const passagesArray = Object.values(passageGroups);
        
        // Ensure all passages have a sequence number
        const sortedPassages = passagesArray.map((passage: any, index: number) => ({
          ...passage,
          sequence_number: passage.sequence_number || index + 1
        }));
        
        setPassages(sortedPassages);
      } else {
        console.log("No reading passages found");
        setPassages([]);
      }
    } catch (err: any) {
      console.error('Error loading passages:', err);
      setError(`Failed to load passages: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassage = async () => {
    try {
      setLoading(true);
      
      // Validate input
      if (!newPassage.title.trim()) {
        setError('Please enter a passage title');
        setLoading(false);
        return;
      }
      
      if (!newPassage.content.trim()) {
        setError('Please enter passage content');
        setLoading(false);
        return;
      }
      
      if (newPassage.questions.length === 0) {
        setError('Please add at least one question');
        setLoading(false);
        return;
      }

      // Check for parent test ID in localStorage
      const testId = localStorage.getItem('currentTOEFLTestId');
      if (!testId) {
        setError('No test selected. Please go back to TOEFL Exam and select a test.');
        setLoading(false);
        return;
      }

      // Get or create the reading section
      let sectionId;
      
      // First check if section exists
      const { data: sections, error: sectionError } = await supabase
        .from('tests')
        .select('id')
        .eq('parent_test_id', testId)
        .eq('section', 'Reading');

      if (sectionError) throw sectionError;
      
      if (!sections || sections.length === 0) {
        // Need to create a new section
        console.log("Creating new Reading section");
        
        // Get parent test title
        const { data: parentTest, error: parentError } = await supabase
          .from('tests')
          .select('title')
          .eq('id', testId)
          .single();

        if (parentError) throw parentError;
        
        // Create the reading section
        const { data: newSection, error: createError } = await supabase
          .from('tests')
          .insert([{
            title: `${parentTest.title} - Reading Section`,
            type: 'TOEFL',
            profesor: 'mohamed',
            created_by: 'mohamed',
            section: 'Reading',
            parent_test_id: testId
          }])
          .select();

        if (createError) throw createError;
        
        sectionId = newSection[0].id;
      } else {
        sectionId = sections[0].id;
      }
      
      const nextId = crypto.randomUUID();
      
      // Determine sequence number for new or edited passage
      const sequenceNumber = selectedPassage 
        ? selectedPassage.sequence_number 
        : passages.length + 1;
      
      // Add sequence numbers to questions
      const adjustedQuestions = newPassage.questions.map((q, index) => ({
        ...q,
        id: q.id || crypto.randomUUID(),
        type: 'multiple', // Explicitly set question type
        passage_id: selectedPassage ? selectedPassage.id : nextId,
        passage_title: newPassage.title,
        passage_content: newPassage.content,
        sequence_number: index + 1 // Assign sequential number to questions
      }));

      const { success, error } = await saveTOEFLTest('Reading', adjustedQuestions);
      if (!success) {
        console.error('Failed to save passage:', error);
        setError(`Failed to save passage: ${error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      // Reload passages to get the latest state
      await loadSavedPassages();
      
      setNewPassage({
        title: '',
        content: '',
        questions: []
      });
      setSelectedPassage(null);
      setShowAddPassage(false);
      setError(null);
    } catch (err: any) {
      console.error('Error saving passage:', err);
      setError(`Failed to save passage: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePassage = async (passageId: number) => {
    try {
      setLoading(true);
      const updatedPassages = passages.filter(p => p.id !== passageId);
      
      // Resequence remaining passages
      const resequencedPassages = updatedPassages.map((p, index) => ({
        ...p,
        sequence_number: index + 1
      }));
      
      const { success, error } = await saveTOEFLTest('Reading', 
        resequencedPassages.flatMap(p => p.questions.map(q => ({
          ...q,
          passage_id: p.id,
          passage_title: p.title,
          passage_content: p.content,
          sequence_number: q.sequence_number
        })))
      );
      
      if (!success) {
        console.error('Failed to delete passage:', error);
        setError(`Failed to delete passage: ${error || 'Unknown error'}`);
        setLoading(false);
        return;
      }
      
      // Reload passages to get the latest state
      await loadSavedPassages();
      
      setSelectedPassage(null);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      console.error('Error deleting passage:', err);
      setError(`Failed to delete passage: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPassage = (passage: Passage) => {
    setSelectedPassage(passage);
    setNewPassage({
      title: passage.title,
      content: passage.content,
      questions: passage.questions
    });
    setShowAddPassage(true);
  };

  const getTotalQuestionCount = () => {
    return passages.reduce((total, passage) => total + passage.questions.length, 0);
  };

  const handleAddQuestion = () => {
    setNewPassage(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: Date.now(),
          text: '',
          choices: ['', '', '', ''],
          correctAnswer: 0,
          sequence_number: prev.questions.length + 1
        }
      ]
    }));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    setNewPassage(prev => {
      const questions = [...prev.questions];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setNewPassage(prev => {
      const filteredQuestions = prev.questions.filter((_, i) => i !== index);
      
      // Resequence remaining questions
      const resequencedQuestions = filteredQuestions.map((q, i) => ({
        ...q,
        sequence_number: i + 1
      }));
      
      return {
        ...prev,
        questions: resequencedQuestions
      };
    });
  };

  const handleChoiceChange = (questionIndex: number, choiceIndex: number, value: string) => {
    setNewPassage(prev => {
      const questions = [...prev.questions];
      const choices = [...questions[questionIndex].choices];
      choices[choiceIndex] = value;
      questions[questionIndex] = { ...questions[questionIndex], choices };
      return { ...prev, questions };
    });
  };

  const validateBeforeSaving = () => {
    if (!newPassage.title.trim()) {
      setError('Please enter a passage title');
      return false;
    }
    
    if (!newPassage.content.trim()) {
      setError('Please enter passage content');
      return false;
    }
    
    if (newPassage.questions.length === 0) {
      setError('Please add at least one question');
      return false;
    }
    
    // Validate each question
    for (let i = 0; i < newPassage.questions.length; i++) {
      const q = newPassage.questions[i];
      if (!q.text.trim()) {
        setError(`Question ${i+1} is missing text`);
        return false;
      }
      
      // Validate choices
      for (let j = 0; j < q.choices.length; j++) {
        if (!q.choices[j].trim()) {
          setError(`Question ${i+1}, Choice ${String.fromCharCode(65 + j)} is empty`);
          return false;
        }
      }
    }
    
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/toefl-exam"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Reading Passages</h1>
                <p className="text-sm text-gray-500">Manage reading comprehension passages and questions</p>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Info className="w-4 h-4" />
              Instructions
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              setSelectedPassage(null);
              setNewPassage({
                title: '',
                content: '',
                questions: []
              });
              setShowAddPassage(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Passage
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading passages...</p>
          </div>
        ) : passages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">No passages added yet. Click "Add Passage" to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {passages.map((passage) => (
              <div key={passage.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Passage {passage.sequence_number}: {passage.title}</h3>
                  <button
                    onClick={() => {
                      setSelectedPassage(passage);
                      setShowDeleteConfirm(true);
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-800 mb-4 line-clamp-3">{passage.content}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {passage.questions.length} Questions
                  </span>
                  <button
                    onClick={() => handleEditPassage(passage)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Passage Modal */}
      {showAddPassage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {selectedPassage ? 'Edit Reading Passage' : 'Add Reading Passage'}
              </h3>
              <button
                onClick={() => {
                  setShowAddPassage(false);
                  setSelectedPassage(null);
                  setNewPassage({
                    title: '',
                    content: '',
                    questions: []
                  });
                }}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passage Title
                </label>
                <input
                  type="text"
                  value={newPassage.title}
                  onChange={(e) => setNewPassage({ ...newPassage, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter passage title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passage Content
                </label>
                <textarea
                  value={newPassage.content}
                  onChange={(e) => setNewPassage({ ...newPassage, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-40"
                  placeholder="Enter passage content"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-medium text-gray-700">Questions</label>
                  <button
                    onClick={handleAddQuestion}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </button>
                </div>

                <div className="space-y-6">
                  {newPassage.questions.map((question, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                        <button
                          onClick={() => handleRemoveQuestion(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question Text
                          </label>
                          <textarea
                            value={question.text}
                            onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Enter question text"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Answer Choices
                          </label>
                          <div className="space-y-3">
                            {question.choices.map((choice, choiceIndex) => (
                              <div key={choiceIndex} className="flex items-center gap-4">
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-medium">
                                  {String.fromCharCode(65 + choiceIndex)}
                                </span>
                                <input
                                  type="text"
                                  value={choice}
                                  onChange={(e) => handleChoiceChange(index, choiceIndex, e.target.value)}
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder={`Enter choice ${String.fromCharCode(65 + choiceIndex)}`}
                                />
                                <button
                                  onClick={() => handleQuestionChange(index, 'correctAnswer', choiceIndex)}
                                  className={`px-4 py-2 rounded-lg ${
                                    question.correctAnswer === choiceIndex
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
              <button
                onClick={() => {
                  setShowAddPassage(false);
                  setSelectedPassage(null);
                  setNewPassage({
                    title: '',
                    content: '',
                    questions: []
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (validateBeforeSaving()) {
                    handleSavePassage();
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!newPassage.title || !newPassage.content || newPassage.questions.length === 0}
              >
                {selectedPassage ? 'Save Changes' : 'Add Passage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedPassage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Delete Passage</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this passage?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This will also delete all questions associated with this passage.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedPassage(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePassage(selectedPassage.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Passage
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
              <h3 className="text-xl font-semibold">Reading Section Instructions</h3>
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
                  <h4 className="text-blue-700 font-medium mb-2">Passage Guidelines</h4>
                  <ul className="text-blue-600 list-disc list-inside space-y-2">
                    <li>Choose academic texts appropriate for TOEFL level</li>
                    <li>Include passages from various disciplines</li>
                    <li>Aim for 300-450 words per passage</li>
                    <li>Use clear paragraph structure</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="text-green-700 font-medium mb-2">Question Types</h4>
                  <ul className="text-green-600 list-disc list-inside space-y-2">
                    <li>Main idea and purpose questions</li>
                    <li>Detail and fact questions</li>
                    <li>Vocabulary in context</li>
                    <li>Inference questions</li>
                    <li>Reference questions</li>
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