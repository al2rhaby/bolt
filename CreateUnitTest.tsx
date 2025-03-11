import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TestInfo {
  title: string;
  type: 'Unit';
  level: 'Basic' | 'Intermediate' | 'Advanced';
  carrera: string;
  semestre: string;
  grupo: string;
  profesor: string;
  salons: string[];
}

interface Question {
  type: 'multiple' | 'matching' | 'truefalse';
  text: string;
  choices?: string[];
  leftItems?: string[];
  rightItems?: string[];
  correctAnswer?: number;
  correctPairs?: number[];
  isTrue?: boolean;
}

const salonOptions = [
  'AC1',
  'Aula Diseño',
  'E-3',
  'F-6',
  'F-8',
  'F-9',
  'F-10',
  'F-11'
].sort();

export default function CreateUnitTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const folder = location.state?.folder;

  const [testInfo, setTestInfo] = useState<TestInfo>({
    title: folder?.title || '',
    type: 'Unit',
    level: 'Basic',
    carrera: '',
    semestre: '',
    grupo: '',
    profesor: 'mohamed',
    salons: []
  });

  const [examInstructions] = useState({
    title: "English Grammar Assessment - Unit 3",
    description: "This exam tests your understanding of present perfect and past perfect tenses, passive voice, and conditional statements.",
    requirements: [
      "Complete all questions within the allocated time",
      "Each question has only one correct answer",
      "Read each question carefully before answering",
      "Your answers are saved automatically",
      "The exam will submit automatically when time expires"
    ],
    grading: {
      multipleChoice: 2,
      truefalse: 1,
      matching: 3,
      totalPoints: 50
    },
    specialNotes: "Ensure you have a stable internet connection. If you experience technical issues, contact your instructor immediately."
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<'multiple' | 'matching' | 'truefalse'>('multiple');
  const [newQuestion, setNewQuestion] = useState<Question>({
    type: 'multiple',
    text: '',
    choices: ['', '', '', ''],
    correctAnswer: 0
  });

  const handleSaveTest = async () => {
    if (!folder?.id) {
      setError('No folder selected');
      return;
    }

    if (!testInfo.level || !testInfo.carrera || !testInfo.semestre || !testInfo.grupo || !testInfo.salons.length) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (questions.length < 10) {
      setError('Please add at least 10 questions');
      return;
    }

    try {
      // Update the existing folder with test info
      const { error: updateError } = await supabase
        .from('tests')
        .update({
          level: testInfo.level,
          carrera: testInfo.carrera,
          semestre: testInfo.semestre,
          grupo: testInfo.grupo,
          salons: testInfo.salons,
          updated_at: new Date().toISOString()
        })
        .eq('id', folder.id);

      if (updateError) throw updateError;

      // Format questions based on their type
      const questionsToInsert = questions.map(q => {
        const baseQuestion = {
          test_id: folder.id,
          type: q.type,
          text: q.text
        };

        switch (q.type) {
          case 'multiple':
            return {
              ...baseQuestion,
              choices: q.choices,
              correct_answer: q.correctAnswer
            };
          case 'matching':
            return {
              ...baseQuestion,
              left_items: q.leftItems,
              right_items: q.rightItems,
              correct_pairs: q.correctPairs || [0, 1, 2, 3]
            };
          case 'truefalse':
            return {
              ...baseQuestion,
              choices: q.choices || ['True', 'False'],
              correct_answer: q.isTrue ? 0 : 1
            };
          default:
            return baseQuestion;
        }
      });

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      navigate('/unit-exam');
    } catch (err) {
      console.error('Error saving test:', err);
      setError('Failed to save test');
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestion.text?.trim()) {
      setError('Please enter a question text');
      return;
    }

    let isValid = true;
    let questionToAdd: Question | null = null;

    switch (questionType) {
      case 'multiple':
        if (!newQuestion.choices?.every(choice => choice.trim())) {
          setError('Please fill in all answer choices');
          isValid = false;
        } else {
          questionToAdd = {
            type: 'multiple',
            text: newQuestion.text,
            choices: newQuestion.choices,
            correctAnswer: newQuestion.correctAnswer
          };
        }
        break;

      case 'matching':
        if (!newQuestion.leftItems?.every(item => item.trim()) || !newQuestion.rightItems?.every(item => item.trim())) {
          setError('Please fill in all matching items');
          isValid = false;
        } else {
          questionToAdd = {
            type: 'matching',
            text: newQuestion.text,
            leftItems: newQuestion.leftItems,
            rightItems: newQuestion.rightItems,
            correctPairs: [0, 1, 2, 3]
          };
        }
        break;

      case 'truefalse':
        questionToAdd = {
          type: 'truefalse',
          text: newQuestion.text,
          choices: ['True', 'False'],
          isTrue: newQuestion.isTrue
        };
        break;
    }

    if (isValid && questionToAdd) {
      setQuestions([...questions, questionToAdd]);
      setNewQuestion({
        type: questionType,
        text: '',
        choices: questionType === 'multiple' ? ['', '', '', ''] : undefined,
        leftItems: questionType === 'matching' ? ['', '', '', ''] : undefined,
        rightItems: questionType === 'matching' ? ['', '', '', ''] : undefined,
        isTrue: questionType === 'truefalse' ? false : undefined
      });
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/unit-exam')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create Unit Test</h1>
              <p className="text-sm text-gray-500">
                {folder ? `Creating test in: ${folder.title}` : 'Select a folder first'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          {/* Test Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['Basic', 'Intermediate', 'Advanced'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setTestInfo({ ...testInfo, level: level as TestInfo['level'] })}
                    className={`p-4 rounded-lg border transition-colors ${
                      testInfo.level === level
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-500'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Exam Instructions */}
            <div className="md:col-span-2 bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{examInstructions.title}</h3>
              <p className="text-gray-600 mb-4">{examInstructions.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Requirements:</h4>
                  <ul className="space-y-2">
                    {examInstructions.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Grading Criteria:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>Multiple Choice: {examInstructions.grading.multipleChoice} points each</li>
                    <li>True/False: {examInstructions.grading.truefalse} point each</li>
                    <li>Matching: {examInstructions.grading.matching} points each</li>
                    <li className="font-medium">Total Points: {examInstructions.grading.totalPoints}</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">{examInstructions.specialNotes}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carrera
              </label>
              <input
                type="text"
                value={testInfo.carrera}
                onChange={(e) => setTestInfo({ ...testInfo, carrera: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter carrera"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester
              </label>
              <select
                value={testInfo.semestre}
                onChange={(e) => setTestInfo({ ...testInfo, semestre: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Semester</option>
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Semester {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grupo
              </label>
              <input
                type="text"
                value={testInfo.grupo}
                onChange={(e) => setTestInfo({ ...testInfo, grupo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter grupo"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salons
              </label>
              <select
                multiple
                value={testInfo.salons}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setTestInfo({ ...testInfo, salons: selectedOptions });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                size={5}
              >
                {salonOptions.map((salon) => (
                  <option key={salon} value={salon}>
                    {salon}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Hold Ctrl (Windows) or Command (Mac) to select multiple salons
              </p>
            </div>
          </div>

          {/* Questions Section */}
          <div className="border-t pt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
                <p className="text-sm text-gray-500">{questions.length} questions added</p>
              </div>
            </div>

            {/* Question Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setQuestionType('multiple');
                    setNewQuestion({
                      type: 'multiple',
                      text: '',
                      choices: ['', '', '', ''],
                      correctAnswer: 0
                    });
                  }}
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
                  onClick={() => {
                    setQuestionType('matching');
                    setNewQuestion({
                      type: 'matching',
                      text: '',
                      leftItems: ['', '', '', ''],
                      rightItems: ['', '', '', '']
                    });
                  }}
                  className={`p-4 rounded-lg border transition-colors ${
                    questionType === 'matching'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-purple-500'
                  }`}
                >
                  Matching
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuestionType('truefalse');
                    setNewQuestion({
                      type: 'truefalse',
                      text: '',
                      isTrue: false
                    });
                  }}
                  className={`p-4 rounded-lg border transition-colors ${
                    questionType === 'truefalse'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-500'
                  }`}
                >
                  True/False
                </button>
              </div>
            </div>

            {/* Question Form */}
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text
                </label>
                <textarea
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                  placeholder="Enter your question..."
                />
              </div>

              {questionType === 'multiple' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Choices
                  </label>
                  <div className="space-y-4">
                    {newQuestion.choices?.map((choice, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <input
                          type="text"
                          value={choice}
onChange={(e) => {
                            const choices = [...(newQuestion.choices || [])];
                            choices[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, choices });
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Choice ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: index })}
                          className={`px-4 py-2 rounded-lg border ${
                            newQuestion.correctAnswer === index
                              ? 'bg-green-100 border-green-300 text-green-700'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Correct
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questionType === 'matching' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Left Items
                    </label>
                    <div className="space-y-4">
                      {newQuestion.leftItems?.map((item, index) => (
                        <input
                          key={index}
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const leftItems = [...(newQuestion.leftItems || [])];
                            leftItems[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, leftItems });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Left Item ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Right Items
                    </label>
                    <div className="space-y-4">
                      {newQuestion.rightItems?.map((item, index) => (
                        <input
                          key={index}
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const rightItems = [...(newQuestion.rightItems || [])];
                            rightItems[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, rightItems });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Right Item ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {questionType === 'truefalse' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answer
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setNewQuestion({ ...newQuestion, isTrue: true })}
                      className={`flex-1 px-4 py-2 rounded-lg border ${
                        newQuestion.isTrue === true
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      True
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewQuestion({ ...newQuestion, isTrue: false })}
                      className={`flex-1 px-4 py-2 rounded-lg border ${
                        newQuestion.isTrue === false
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      False
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleAddQuestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      Question {index + 1} - {question.type.charAt(0).toUpperCase() + question.type.slice(1)}
                    </span>
                    <button
                      onClick={() => setQuestions(questions.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-gray-900">{question.text}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-8 flex justify-end border-t pt-6">
              <button
                onClick={handleSaveTest}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={questions.length === 0}
              >
                Save Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}