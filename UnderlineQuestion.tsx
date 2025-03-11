import React, { useState, useEffect } from 'react';

interface UnderlineWord {
  text: string;
  letter: 'A' | 'B' | 'C' | 'D' | null;
  start?: number;
  end?: number;
}

interface UnderlineQuestionProps {
  text: string;
  onSave: (words: UnderlineWord[]) => void;
  onMarkIncorrect?: (letter: 'A' | 'B' | 'C' | 'D') => void;
  initialWords?: UnderlineWord[];
  readOnly?: boolean;
  incorrectLetter?: 'A' | 'B' | 'C' | 'D' | null;
  onAddQuestion?: () => void; // Function for adding question
}

export default function UnderlineQuestion({
  text: initialText = "The quick brown fox jumped over the lazy dog and chased the cat.",
  onSave,
  onMarkIncorrect,
  initialWords = [],
  readOnly = false,
  incorrectLetter: initialIncorrectLetter = null,
  onAddQuestion
}: UnderlineQuestionProps) {
  // State variables
  const [questionText, setQuestionText] = useState(initialText);
  const [underlinedWords, setUnderlinedWords] = useState<UnderlineWord[]>(initialWords);
  const [currentLetter, setCurrentLetter] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [incorrectAnswer, setIncorrectAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(initialIncorrectLetter);
  const [isValid, setIsValid] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Effect to update state when props change
  useEffect(() => {
    setQuestionText(initialText);
    if (initialWords && initialWords.length > 0) {
      setUnderlinedWords(initialWords);
    }
    if (initialIncorrectLetter) {
      setIncorrectAnswer(initialIncorrectLetter);
    }
  }, [initialText, initialWords, initialIncorrectLetter]);

  // Effect to call onSave when underlinedWords changes
  useEffect(() => {
    if (onSave && !readOnly) {
      onSave(underlinedWords);
    }
    validateQuestion();
  }, [underlinedWords, onSave, readOnly]);

  // Effect to call onMarkIncorrect when incorrectAnswer changes
  useEffect(() => {
    if (onMarkIncorrect && incorrectAnswer && !readOnly) {
      onMarkIncorrect(incorrectAnswer);
    }
    validateQuestion();
  }, [incorrectAnswer, onMarkIncorrect, readOnly]);

  // Function to validate the question
  const validateQuestion = () => {
    setValidationError(null);
    
    // Check if we have words underlined with each required letter
    const usedLetters = new Set(underlinedWords.map(word => word.letter));
    const requiredLetters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    const missingLetters = requiredLetters.filter(letter => !usedLetters.has(letter));
    
    // Debug info
    setDebugInfo(`Used letters: ${Array.from(usedLetters).join(', ')}\n` + 
                `Missing letters: ${missingLetters.join(', ')}\n` +
                `Underlined words: ${JSON.stringify(underlinedWords)}`);
    
    if (missingLetters.length > 0) {
      setValidationError(`Missing letters: ${missingLetters.join(', ')}. All letters A-D must be used.`);
      setIsValid(false);
      return false;
    }
    
    if (!incorrectAnswer) {
      setValidationError('Please select which letter is incorrect.');
      setIsValid(false);
      return false;
    }
    
    setIsValid(true);
    return true;
  };

  // Function to handle underlining text
  const handleUnderline = (letter: 'A' | 'B' | 'C' | 'D') => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') {
      // If nothing is selected, remove this letter's underlines
      setUnderlinedWords(underlinedWords.filter(word => word.letter !== letter));
      return;
    }
    
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    // Remove any existing underlines with this letter
    const filteredWords = underlinedWords.filter(word => word.letter !== letter);
    
    // Add the new underlined word
    const newWord: UnderlineWord = {
      text: selectedText,
      letter: letter
    };
    
    setUnderlinedWords([...filteredWords, newWord]);
    setCurrentLetter(letter);
  };

  // Function to remove all underlines
  const removeAllUnderlines = () => {
    setUnderlinedWords([]);
    setIncorrectAnswer(null);
    validateQuestion();
  };

  // Function to handle adding the question
  const handleAddQuestion = () => {
    // Force validation
    const isValidNow = validateQuestion();
    
    if (isValidNow && onAddQuestion) {
      onAddQuestion();
    }
  };

  // Render preview of the question
  const renderPreview = () => {
    if (!questionText) return null;
    
    // If no words are underlined, just return the raw text
    if (underlinedWords.length === 0) {
      return <span>{questionText}</span>;
    }
    
    // Sort underlined words by their position in the text
    const sortedWords = [...underlinedWords].sort((a, b) => {
      const posA = questionText.indexOf(a.text);
      const posB = questionText.indexOf(b.text);
      return posA - posB;
    });
    
    // Create an array of spans for the preview
    const spans = [];
    let lastIndex = 0;
    
    for (const word of sortedWords) {
      const index = questionText.indexOf(word.text, lastIndex);
      if (index === -1) continue;
      
      // Add non-underlined text before this word
      if (index > lastIndex) {
        spans.push(
          <span key={`text-${lastIndex}`}>
            {questionText.substring(lastIndex, index)}
          </span>
        );
      }
      
      // Add the underlined word
      spans.push(
        <span 
          key={`underline-${index}`}
          className={`border-b-2 border-blue-500 ${word.letter === incorrectAnswer ? 'bg-red-100' : ''}`}
        >
          {word.text}
          <sub className="text-blue-600 ml-1">{word.letter}</sub>
          {!readOnly && (
            <button 
              onClick={() => setUnderlinedWords(underlinedWords.filter(w => w !== word))}
              className="ml-1 text-xs text-red-500 align-top"
              title={`Remove underline ${word.letter}`}
            >
              ✕
            </button>
          )}
        </span>
      );
      
      lastIndex = index + word.text.length;
    }
    
    // Add any remaining text
    if (lastIndex < questionText.length) {
      spans.push(
        <span key={`text-${lastIndex}`}>
          {questionText.substring(lastIndex)}
        </span>
      );
    }
    
    return spans;
  };

  return (
    <div className={`p-6 ${!readOnly ? 'max-w-2xl mx-auto' : ''} bg-white rounded-xl ${!readOnly ? 'shadow-md' : ''}`}>
      {!readOnly && (
        <div className="question-editor">
          {/* Underline controls */}
          <div className="mb-4">
            <label className="block mb-2">Select text to underline, then click a button:</label>
            <div className="flex gap-2 mb-2">
              {(['A', 'B', 'C', 'D'] as const).map(letter => (
                <button
                  key={letter}
                  onClick={() => handleUnderline(letter)}
                  className={`px-3 py-1 rounded ${
                    currentLetter === letter ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  Underline {letter}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <button
                onClick={removeAllUnderlines}
                className="px-3 py-1 rounded bg-red-500 text-white mr-2"
              >
                Remove All Underlines
              </button>
            </div>
          </div>
          
          {/* Select incorrect answer */}
          {onMarkIncorrect && (
            <div className="mb-4">
              <label className="block mb-2">Select the incorrect answer:</label>
              <div className="flex gap-2">
                {(['A', 'B', 'C', 'D'] as const).map(letter => {
                  // Check if this letter is used in any underlined word
                  const isUsed = underlinedWords.some(word => word.letter === letter);
                  
                  return (
                    <button
                      key={letter}
                      onClick={() => {
                        if (isUsed) {
                          setIncorrectAnswer(letter);
                          validateQuestion();
                        }
                      }}
                      disabled={!isUsed}
                      className={`px-3 py-1 rounded ${
                        !isUsed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                        incorrectAnswer === letter ? 'bg-red-500 text-white' : 'bg-gray-200'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation errors */}
          {validationError && (
            <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-600">{validationError}</p>
            </div>
          )}
          
          {/* Debug information - Remove in production */}
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-24">
            <pre>{debugInfo}</pre>
          </div>
        </div>
      )}
      
      {/* Preview */}
      <div className={!readOnly ? "mb-4" : ""}>
        {!readOnly && <h3 className="font-bold mb-2">Preview:</h3>}
        <div className={`${!readOnly ? 'p-4 border rounded' : ''} text-lg`}>
          {renderPreview()}
        </div>
      </div>
      
      {!readOnly && onAddQuestion && (
        <div className="flex justify-end">
          <button
            onClick={handleAddQuestion}
            disabled={!isValid}
            className={`px-4 py-2 ${isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-md text-sm font-medium transition-colors`}
          >
            Add Question
          </button>
        </div>
      )}
    </div>
  );
}