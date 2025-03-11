import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Volume2, Save, X, Play, Pause, AlertTriangle, Upload, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { saveTOEFLTest, getTOEFLQuestions, updateTestAudioUrl, deleteAllQuestions } from '../lib/questions';

interface Question {
  id: number;
  text: string;
  choices: string[];
  correctAnswer: number;
  sequence_number?: number; // Add sequence number
}

function ListeningQuestions() {
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAddAudio, setShowAddAudio] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showDeleteAudioConfirm, setShowDeleteAudioConfirm] = useState(false);
  const [showDeleteQuestionConfirm, setShowDeleteQuestionConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showEditInstructions, setShowEditInstructions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [instructions, setInstructions] = useState({
    description: "The listening section is designed to test students' ability to understand spoken English. During the exam, students will:",
    points: [
      "Listen to the provided audio track",
      "Answer questions based on what they hear",
      "Questions can be asked verbally in the audio and/or provided as written questions",
      "Students should take notes while listening"
    ],
    note: "Make sure to provide clear, high-quality audio. You can optionally add written questions to supplement the verbal questions in the audio."
  });

  const [newQuestion, setNewQuestion] = useState<Omit<Question, 'id'>>({
    text: '',
    choices: ['', '', '', ''],
    correctAnswer: 0
  });

  useEffect(() => {
    loadSavedContent();
  }, []);

  const loadSavedContent = async () => {
    const { success, tests } = await getTOEFLQuestions('Listening');
    if (success && tests && tests.length > 0) {
      const latestTest = tests[0];
      setCurrentTestId(latestTest.id);
      setAudioUrl(latestTest.audio_url || '');
      
      // Add sequence numbers to questions if they don't have them
      const questionsWithSequence = latestTest.questions?.map((q: any, index: number) => ({
        id: q.id,
        text: q.text || '',
        choices: q.choices || ['', '', '', ''],
        correctAnswer: q.correct_answer || 0,
        sequence_number: q.sequence_number || index + 1 // Use existing sequence number or create new one
      })) || [];
      
      setQuestions(questionsWithSequence);
    }
  };

  const handleSaveAudio = async () => {
    if (!audioUrl.trim()) {
      setError('Please enter a valid audio URL');
      return;
    }

    try {
      const { success, test, error: saveError } = await saveTOEFLTest('Listening', questions, audioUrl);
      
      if (!success || !test) {
        setError(saveError as string);
        return;
      }

      setCurrentTestId(test.id);
      setShowAddAudio(false);
      await loadSavedContent();
    } catch (err) {
      setError('Failed to save audio URL');
      console.error('Error saving audio URL:', err);
    }
  };

  const handleDeleteAudio = async () => {
    try {
      if (!currentTestId) {
        setError('No test found to update');
        return;
      }

      const { success, error } = await updateTestAudioUrl(currentTestId, null);
      
      if (!success) {
        setError('Failed to delete audio URL');
        return;
      }

      setAudioUrl('');
      setShowDeleteAudioConfirm(false);
      setError(null);
    } catch (err) {
      setError('Failed to delete audio URL');
      console.error('Error deleting audio URL:', err);
    }
  };

  const handleSaveQuestion = async () => {
    if (!newQuestion.text.trim() || !newQuestion.choices.every(choice => choice.trim())) {
      setError('Please fill in all question fields');
      return;
    }

    // Generate new sequence numbers
    const nextSequence = selectedQuestion 
      ? selectedQuestion.sequence_number // Keep same sequence number when editing
      : questions.length + 1; // New question gets next number
    
    const updatedQuestions = selectedQuestion
      ? questions.map(q => q.id === selectedQuestion.id 
          ? { ...newQuestion, id: q.id, sequence_number: nextSequence } 
          : q)
      : [...questions, { ...newQuestion, id: Date.now(), sequence_number: nextSequence }];

    try {
      const { success, error: saveError } = await saveTOEFLTest('Listening', 
        updatedQuestions.map(q => ({
          ...q,
          correct_answer: q.correctAnswer
        })), 
        audioUrl
      );
      
      if (!success) {
        setError(saveError as string);
        return;
      }

      setQuestions(updatedQuestions);
      setNewQuestion({
        text: '',
        choices: ['', '', '', ''],
        correctAnswer: 0
      });
      setSelectedQuestion(null);
      setShowAddQuestion(false);
      setError(null);
    } catch (err) {
      setError('Failed to save question');
      console.error('Error saving question:', err);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    
    // Resequence remaining questions
    const resequencedQuestions = updatedQuestions.map((q, index) => ({
      ...q,
      sequence_number: index + 1
    }));
    
    try {
      const { success, error } = await saveTOEFLTest('Listening', resequencedQuestions, audioUrl);
      
      if (!success) {
        setError(error as string);
        return;
      }

      setQuestions(resequencedQuestions);
      setShowDeleteQuestionConfirm(false);
      setSelectedQuestion(null);
    } catch (err) {
      setError('Failed to delete question');
      console.error('Error deleting question:', err);
    }
  };

  const handleDeleteAllQuestions = async () => {
    try {
      const { success, error } = await deleteAllQuestions('Listening');
      
      if (!success) {
        setError(error as string);
        return;
      }

      setQuestions([]);
      setShowDeleteAllConfirm(false);
    } catch (err) {
      setError('Failed to delete all questions');
      console.error('Error deleting all questions:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link 
              to="/toefl-exam"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Listening Section</h1>
              <p className="text-sm text-gray-500">Manage audio-based listening assessment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions Section - Now at the top */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Instructions</h2>
            <button
              onClick={() => setShowEditInstructions(true)}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Instructions
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-gray-600">
            <p>{instructions.description}</p>
            <ul className="mt-4 space-y-2">
              {instructions.points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
            <p className="mt-4">{instructions.note}</p>
          </div>
        </div>

        {/* Audio Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Audio Track</h2>
            <div className="flex items-center gap-2">
              {audioUrl && (
                <button
                  onClick={() => setShowDeleteAudioConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete MP3
                </button>
              )}
              <button
                onClick={() => setShowAddAudio(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Set MP3 URL
              </button>
            </div>
          </div>

          {audioUrl ? (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Volume2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Selected Audio Track</h3>
                  <p className="text-sm text-gray-500">{audioUrl}</p>
                </div>
              </div>
              <audio
                src={audioUrl}
                controls
                className="w-full"
              />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500">No audio track selected. Click "Set MP3 URL" to add one.</p>
            </div>
          )}
        </div>

        {/* Optional Questions Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Optional Questions</h2>
            <div className="flex items-center gap-2">
              {questions.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedQuestion(null);
                  setNewQuestion({
                    text: '',
                    choices: ['', '', '', ''],
                    correctAnswer: 0
                  });
                  setShowAddQuestion(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500">No written questions added yet. Questions are optional for the listening section.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Question {question.sequence_number || '?'}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedQuestion(question);
                          setNewQuestion({
                            text: question.text,
                            choices: question.choices,
                            correctAnswer: question.correctAnswer
                          });
                          setShowAddQuestion(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedQuestion(question);
                          setShowDeleteQuestionConfirm(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-800 mb-4">{question.text}</p>

                  <div className="grid grid-cols-2 gap-4">
                    {question.choices.map((choice, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${
                          index === question.correctAnswer
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-sm font-medium">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{choice}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add MP3 Modal */}
        {showAddAudio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Set MP3 Audio URL</h3>
                <button
                  onClick={() => setShowAddAudio(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audio URL
                  </label>
                  <input
                    type="text"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter MP3 URL (e.g., from archive.org)"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Enter a valid MP3 URL. This audio should include the listening material and verbal questions.
                  </p>
                </div>

                {audioUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview Audio
                    </label>
                    <audio
                      src={audioUrl}
                      controls
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    onClick={() => setShowAddAudio(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAudio}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={!audioUrl}
                  >
                    Save Audio URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Question Modal */}
        {showAddQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">
                  {selectedQuestion ? 'Edit Question' : 'Add New Question'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddQuestion(false);
                    setSelectedQuestion(null);
                    setNewQuestion({
                      text: '',
                      choices: ['', '', '', ''],
                      correctAnswer: 0
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <textarea
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter the question text..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Choices
                  </label>
                  <div className="space-y-3">
                    {newQuestion.choices.map((choice, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <input
                          type="text"
                          value={choice}
                          onChange={(e) => {
                            const newChoices = [...newQuestion.choices];
                            newChoices[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, choices: newChoices });
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Enter choice ${String.fromCharCode(65 + index)}`}
                        />
                        <button
                          onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: index })}
                          className={`px-4 py-2 rounded-lg ${
                            newQuestion.correctAnswer === index
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

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowAddQuestion(false);
                      setSelectedQuestion(null);
                      setNewQuestion({
                        text: '',
                        choices: ['', '', '', ''],
                        correctAnswer: 0
                      });
                    }}
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
              </div>
            </div>
          </div>
        )}

        {/* Delete Audio Confirmation Modal */}
        {showDeleteAudioConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-xl font-semibold">Delete Audio</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the audio track? Students won't be able to take the listening test without an audio file.
              </p>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteAudioConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAudio}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Audio
                </button>
              </div>
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

        {/* Delete All Questions Confirmation Modal */}
        {showDeleteAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-xl font-semibold">Delete All Questions</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete all questions? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllQuestions}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Instructions Modal */}
        {showEditInstructions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Edit Instructions</h3>
                <button
                  onClick={() => setShowEditInstructions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={instructions.description}
                    onChange={(e) => setInstructions({ ...instructions, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instruction Points
                  </label>
                  <div className="space-y-3">
                    {instructions.points.map((point, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => {
                            const newPoints = [...instructions.points];
                            newPoints[index] = e.target.value;
                            setInstructions({ ...instructions, points: newPoints });
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => {
                            const newPoints = instructions.points.filter((_, i) => i !== index);
                            setInstructions({ ...instructions, points: newPoints });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setInstructions({
                          ...instructions,
                          points: [...instructions.points, '']
                        });
                      }}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Point
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Note
                  </label>
                  <textarea
                    value={instructions.note}
                    onChange={(e) => setInstructions({ ...instructions, note: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    onClick={() => setShowEditInstructions(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowEditInstructions(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListeningQuestions;