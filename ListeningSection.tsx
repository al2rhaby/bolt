import React, { useState } from 'react';
import { Play, Pause, Save } from 'lucide-react';
import { Section } from '../types';
import QuestionRenderer from './QuestionRenderer';

interface ListeningSectionProps {
  section: Section;
  getAnswerForQuestion: (questionId: string) => string | undefined;
  onAnswer: (questionId: string, answer: any) => Promise<void>;
  onComplete: () => void;
}

/**
 * Listening section component
 */
const ListeningSection: React.FC<ListeningSectionProps> = ({
  section,
  getAnswerForQuestion,
  onAnswer,
  onComplete
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);

  const handleAudioPlay = (audioUrl: string) => {
    if (!audioUrl) {
      console.error("No audio URL provided");
      return;
    }

    const audio = document.querySelector(`audio[src="${audioUrl}"]`) as HTMLAudioElement;
    if (!audio) {
      console.error("Audio element not found");
      return;
    }
    
    if (currentAudio !== audioUrl) {
      const currentAudioElement = document.querySelector(`audio[src="${currentAudio}"]`) as HTMLAudioElement;
      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
      }
      setCurrentAudio(audioUrl);
    }
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => {
        console.error("Error playing audio:", e);
      });
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Listening Section</h2>
        
        {section.audio_url && (
          <div className="mb-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Listening Audio</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleAudioPlay(section.audio_url!)}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <audio
                src={section.audio_url}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                controls
                className="w-full"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Listen carefully to the audio before answering the questions below.
            </p>
          </div>
        )}
        
        <div className="space-y-8">
          {section.questions.map((question, questionIndex) => (
            <div key={question.id} className="pb-8 border-b last:border-b-0 last:pb-0">
              <div className="mb-2 text-sm font-medium text-gray-500">
                Question {questionIndex + 1}
              </div>
              <QuestionRenderer 
                question={question}
                answer={getAnswerForQuestion(question.id)}
                onAnswer={onAnswer}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Complete Section
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListeningSection;