import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Section, ExamData } from '../types';

interface UseExamContentProps {
  examId: string | undefined;
}

interface UseExamContentReturn {
  loading: boolean;
  error: string | null;
  examData: ExamData | null;
  loadedSections: Section[];
}

/**
 * Hook to load and manage exam content
 */
export const useExamContent = ({ examId }: UseExamContentProps): UseExamContentReturn => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loadedSections, setLoadedSections] = useState<Section[]>([]);

  // Load exam content
  const loadExamContent = useCallback(async () => {
    if (!examId) {
      navigate('/student-dashboard');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get exam schedule with basic test info
      const { data: examData, error: examError } = await supabase
        .from('exam_schedule')
        .select(`
          *,
          test:test_id (
            id,
            title,
            type
          )
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      if (!examData) {
        setError('Exam not found. Please return to the dashboard and try again.');
        return;
      }

      // Get TOEFL test sections
      const { data: sections, error: sectionsError } = await supabase
        .from('tests')
        .select(`
          id,
          title,
          type,
          section,
          audio_url,
          section_duration,
          questions (
            id,
            type,
            text,
            choices,
            correct_answer,
            underlined_words,
            passage_title,
            passage_content
          )
        `)
        .eq('parent_test_id', examData.test_id)
        .order('created_at', { ascending: true });

      if (sectionsError) throw sectionsError;

      if (!sections || sections.length === 0) {
        setError('This exam has not been configured yet. Please contact your administrator.');
        return;
      }

      // Format sections data
      const formattedSections = sections.map(section => ({
        id: section.id,
        title: section.section || '',
        type: section.section?.toLowerCase() || '',
        audio_url: section.audio_url,
        duration: section.section_duration || 35,
        questions: section.questions?.map(q => ({
          id: q.id,
          text: q.text || '',
          type: q.type || 'multiple',
          choices: q.choices || [],
          underlined_words: q.underlined_words,
          passage_title: q.passage_title,
          passage_content: q.passage_content,
        })) || []
      }));

      // Prepare the exam data
      const exam: ExamData = {
        id: examId,
        title: examData.test?.title || 'TOEFL Exam',
        sections: formattedSections,
        duration: examData.duration
      };

      setExamData(exam);
      setLoadedSections(formattedSections);
    } catch (err) {
      console.error('Error loading exam:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [examId, navigate]);

  useEffect(() => {
    loadExamContent();
  }, [loadExamContent]);

  return {
    loading,
    error,
    examData,
    loadedSections
  };
};

export default useExamContent;
