import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Answer, ExamProgress, SectionType } from '../types';
import { updateRealtimeToeflScore } from '../../../utils/realtimeScoreCalculator';

interface UseExamProgressProps {
  examId: string | undefined;
}

interface UseExamProgressReturn {
  answers: Answer[];
  completedSections: string[];
  selectedSection: string | null;
  setSelectedSection: (section: string | null) => void;
  handleAnswer: (questionId: string, answer: any) => Promise<void>;
  handleSectionComplete: (sectionId: string) => Promise<void>;
  handleExitExam: () => Promise<void>;
  getAnswerForQuestion: (questionId: string) => string | undefined;
}

/**
 * Hook to manage exam progress and user answers
 */
export const useExamProgress = ({ examId }: UseExamProgressProps): UseExamProgressReturn => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Load student progress from the database
  const loadStudentProgress = useCallback(async () => {
    if (!examId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      // First check if exam is already completed
      const { data: examResult } = await supabase
        .from('exam_results')
        .select('*')
        .eq('student_id', user.id)
        .eq('exam_id', examId)
        .eq('status', 'completed')
        .maybeSingle();

      if (examResult) {
        navigate('/student-dashboard');
        return;
      }

      // Load progress
      const { data: progress, error: progressError } = await supabase
        .from('student_progress')
        .select('sections_completed')
        .eq('student_id', user.id)
        .eq('exam_id', examId)
        .maybeSingle();

      if (progressError) throw progressError;
        
      if (progress?.sections_completed) {
        setCompletedSections(progress.sections_completed);
      }
      
      // Load existing answers
      const { data: existingAnswers, error: answersError } = await supabase
        .from('student_answers')
        .select('*')
        .eq('student_id', user.id)
        .eq('exam_id', examId);

      if (answersError) throw answersError;
        
      if (existingAnswers && existingAnswers.length > 0) {
        const formattedAnswers = existingAnswers.map(ans => ({
          questionId: ans.question_id,
          answer: ans.answer,
          timestamp: ans.updated_at || ans.created_at
        }));
        
        setAnswers(formattedAnswers);
      }
    } catch (err) {
      console.error("Error loading student progress:", err);
    }
  }, [examId, navigate]);

  // Initial load of progress
  useEffect(() => {
    loadStudentProgress();
  }, [loadStudentProgress]);

  // Handle answering a question
  const handleAnswer = useCallback(async (questionId: string, answer: any) => {
    if (!examId) return;

    // Ensure answer is properly formatted
    const formattedAnswer = answer?.toString() || '';
    
    // Update local state first for immediate UI feedback
    const newAnswer = {
      questionId,
      answer: formattedAnswer,
      timestamp: new Date().toISOString()
    };

    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === questionId);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        return;
      }

      // Create or update exam result to show activity
      const { data: existingResult, error: checkError } = await supabase
        .from('exam_results')
        .select('*')
        .eq('student_id', user.id)
        .eq('exam_id', examId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking exam results:', checkError);
        return;
      }

      // If result exists, update it
      if (existingResult?.id) {
        const { error: updateError } = await supabase
          .from('exam_results')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResult.id);

        if (updateError) {
          console.error('Error updating exam result:', updateError);
        }
      } else {
        // Create new result
        const { error: insertError } = await supabase
          .from('exam_results')
          .insert({
            student_id: user.id,
            exam_id: examId,
            exam_type: 'TOEFL',
            status: 'active',
            listening_score: 0,
            structure_score: 0,
            reading_score: 0,
            total_score: 0,
            taken_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating exam result:', insertError);
        }
      }

      // Save the answer
      try {
        // First try to delete any existing answer for this question
        await supabase
          .from('student_answers')
          .delete()
          .eq('student_id', user.id)
          .eq('question_id', questionId)
          .eq('exam_id', examId);
          
        // Then insert the new answer
        const { error: insertError } = await supabase
          .from('student_answers')
          .insert({
            student_id: user.id,
            test_id: examId,
            question_id: questionId,
            exam_id: examId,
            answer: formattedAnswer,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error("Error inserting answer:", insertError);
        }
      } catch (err) {
        console.error("Error saving answer:", err);
      }

      // Update real-time TOEFL scores
      updateRealtimeToeflScore(user.id, examId, questionId, formattedAnswer);
    } catch (err) {
      console.error('Error in answer handling:', err);
    }
  }, [examId]);

  // Handle completing a section
  const handleSectionComplete = useCallback(async (sectionId: SectionType) => {
    if (!examId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Update local state
      setCompletedSections(prev => {
        if (prev.includes(sectionId)) {
          return prev;
        }
        return [...prev, sectionId];
      });
      
      setSelectedSection(null);

      // Check if progress record exists
      const { data: existingProgress } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('exam_id', examId)
        .maybeSingle();

      // Update or create progress record
      if (existingProgress) {
        // Don't add duplicate section entries
        if (!existingProgress.sections_completed.includes(sectionId)) {
          const updatedSections = [...existingProgress.sections_completed, sectionId];
          
          await supabase
            .from('student_progress')
            .update({
              sections_completed: updatedSections,
              last_activity: new Date().toISOString()
            })
            .eq('id', existingProgress.id);
        }
      } else {
        // Create new progress record
        await supabase
          .from('student_progress')
          .insert({
            student_id: user.id,
            exam_id: examId,
            sections_completed: [sectionId],
            last_activity: new Date().toISOString()
          });
      }

      // Check if all sections are completed
      const allSections = ['listening', 'structure', 'reading'];
      const updatedCompletedSections = [...completedSections];
      if (!updatedCompletedSections.includes(sectionId)) {
        updatedCompletedSections.push(sectionId);
      }
      
      const isComplete = allSections.every(section => 
        updatedCompletedSections.includes(section)
      );

      if (isComplete) {
        // Calculate final scores and save result
        const { data: answers } = await supabase
          .from('student_answers')
          .select(`
            *,
            questions!inner (
              id,
              type,
              correct_answer,
              tests!inner (
                section
              )
            )
          `)
          .eq('student_id', user.id)
          .eq('exam_id', examId);

        let listeningScore = 0, structureScore = 0, readingScore = 0;
        let listeningTotal = 0, structureTotal = 0, readingTotal = 0;

        answers?.forEach(answer => {
          const section = answer.questions?.tests?.section?.toLowerCase();
          if (!section || !answer.questions?.correct_answer) return;

          let isCorrect = false;
          
          // Handle different question types
          if (answer.questions?.type === 'underline') {
            isCorrect = answer.answer === answer.questions.correct_answer.toString();
          } else {
            isCorrect = answer.answer === answer.questions.correct_answer.toString();
          }

          switch (section) {
            case 'listening':
              listeningTotal++;
              if (isCorrect) listeningScore++;
              break;
            case 'structure':
              structureTotal++;
              if (isCorrect) structureScore++;
              break;
            case 'reading':
              readingTotal++;
              if (isCorrect) readingScore++;
              break;
          }
        });

        // Convert to percentages
        const normalizedListening = Math.round((listeningScore / Math.max(listeningTotal, 1)) * 50);
        const normalizedStructure = Math.round((structureScore / Math.max(structureTotal, 1)) * 40);
        const normalizedReading = Math.round((readingScore / Math.max(readingTotal, 1)) * 50);
        const totalScore = normalizedListening + normalizedStructure + normalizedReading;

        // First check if a result already exists for this exam
        const { data: existingResult, error: checkError } = await supabase
          .from('exam_results')
          .select('id')
          .eq('student_id', user.id)
          .eq('exam_id', examId)
          .eq('exam_type', 'TOEFL')
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingResult) {
          // Update existing result
          const { error: updateError } = await supabase
            .from('exam_results')
            .update({
              listening_score: normalizedListening,
              structure_score: normalizedStructure,
              reading_score: normalizedReading,
              total_score: totalScore,
              status: 'completed',
              completion_time: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingResult.id);

          if (updateError) throw updateError;
        } else {
          // Insert new result
          const { error: insertError } = await supabase
            .from('exam_results')
            .insert({
              exam_id: examId,
              student_id: user.id,
              exam_type: 'TOEFL',
              listening_score: normalizedListening,
              structure_score: normalizedStructure,
              reading_score: normalizedReading,
              total_score: totalScore,
              status: 'completed',
              completion_time: new Date().toISOString(),
              taken_at: new Date().toISOString()
            });

          if (insertError) throw insertError;
        }
        
        // Update exam schedule status
        const { error: scheduleError } = await supabase
          .from('exam_schedule')
          .update({ status: 'completed' })
          .eq('id', examId);

        if (scheduleError) {
          console.error('Error updating exam schedule:', scheduleError);
          throw scheduleError;
        }
        
        // Clear local storage
        localStorage.removeItem('currentTOEFLTestId');

        navigate('/student-dashboard');
        return;
      }

      // Show completion message
      alert('Section completed successfully!');
    } catch (err) {
      console.error('Error completing section:', err);
      alert('An error occurred. Please try again.');
    }
  }, [examId, navigate, completedSections]);

  // Handle exiting the exam
  const handleExitExam = useCallback(async () => {
    if (!examId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Update exam result to inactive status
      const { data: existingResult } = await supabase
        .from('exam_results')
        .select('id')
        .eq('student_id', user.id)
        .eq('exam_id', examId)
        .maybeSingle();

      if (existingResult) {
        await supabase
          .from('exam_results')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResult.id);
      } else {
        await supabase
          .from('exam_results')
          .insert({
            exam_id: examId,
            student_id: user.id,
            exam_type: 'TOEFL',
            status: 'inactive',
            listening_score: 0,
            structure_score: 0,
            reading_score: 0,
            total_score: 0,
            taken_at: new Date().toISOString()
          });
      }

      navigate('/student-dashboard');
    } catch (err) {
      console.error('Error exiting exam:', err);
      navigate('/student-dashboard');
    }
  }, [examId, navigate]);

  // Helper to get an answer for a specific question
  const getAnswerForQuestion = useCallback((questionId: string) => {
    return answers.find(a => a.questionId === questionId)?.answer;
  }, [answers]);

  return {
    answers,
    completedSections,
    selectedSection,
    setSelectedSection,
    handleAnswer,
    handleSectionComplete,
    handleExitExam,
    getAnswerForQuestion
  };
};

export default useExamProgress;