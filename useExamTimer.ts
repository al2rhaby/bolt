import { useState, useEffect, useCallback } from 'react';
import { SectionType } from '../types';

interface UseExamTimerProps {
  sectionTimers: Record<string, number>;
  onTimeExpired: (section: string) => void;
}

interface UseExamTimerReturn {
  currentTimer: number | null;
  startSectionTimer: (section: SectionType) => void;
  stopTimer: () => void;
  showTimeWarning: boolean;
  setShowTimeWarning: (show: boolean) => void;
}

/**
 * Hook to manage exam section timers
 */
export const useExamTimer = ({
  sectionTimers,
  onTimeExpired
}: UseExamTimerProps): UseExamTimerReturn => {
  const [currentTimer, setCurrentTimer] = useState<number | null>(null);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // Handle timer countdown
  useEffect(() => {
    if (currentTimer && currentTimer > 0 && currentSection) {
      const timer = setInterval(() => {
        setCurrentTimer((prev) => {
          if (!prev) return null;
          
          // Show warning when 5 minutes are left
          if (prev <= 300 && !showTimeWarning) {
            setShowTimeWarning(true);
          }
          
          // Time expired
          if (prev <= 1) {
            clearInterval(timer);
            onTimeExpired(currentSection);
            return 0;
          }
          
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentTimer, currentSection, showTimeWarning, onTimeExpired]);

  // Start timer for a specific section
  const startSectionTimer = useCallback((section: SectionType) => {
    const duration = sectionTimers[section] || 35;
    setCurrentTimer(duration * 60);
    setCurrentSection(section);
    setShowTimeWarning(false);
  }, [sectionTimers]);

  // Stop the current timer
  const stopTimer = useCallback(() => {
    setCurrentTimer(null);
    setCurrentSection(null);
  }, []);

  return {
    currentTimer,
    startSectionTimer,
    stopTimer,
    showTimeWarning,
    setShowTimeWarning
  };
};

export default useExamTimer;
