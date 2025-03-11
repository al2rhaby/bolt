// src/utils/realtimeScoreCalculator.ts

import { supabase } from '../lib/supabase';
import { calculateTOEFLScores } from './scoreCalculator';

/**
 * Updates TOEFL scores in real-time when a student submits an answer
 * 
 * @param studentId - The student's ID
 * @param examId - The exam ID
 * @param questionId - The question that was just answered
 * @param answer - The student's answer
 */
export async function updateRealtimeToeflScore(
  studentId: string,
  examId: string,
  questionId: string,
  answer: string
): Promise<void> {
  try {
    // 1. First, determine which section this question belongs to
    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .select(`
        id,
        test_id,
        type,
        correct_answer,
        tests:test_id (
          section
        )
      `)
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;
    
    if (!questionData) {
      console.error('Question not found');
      return;
    }

    const sectionType = questionData.tests?.section?.toLowerCase() || '';
    
    // Skip if not a TOEFL section
    if (!['listening', 'structure', 'reading'].includes(sectionType)) {
      return;
    }

    // 2. Check if we already have statistics for this student/exam
    const { data: statsData, error: statsError } = await supabase
      .from('exam_results')
      .select('*')
      .eq('student_id', studentId)
      .eq('exam_id', examId)
      .eq('exam_type', 'TOEFL')
      .maybeSingle();

    if (statsError) throw statsError;

    // 3. Get all student answers for this exam to calculate current scores
    const { data: allAnswers, error: answersError } = await supabase
      .from('student_answers')
      .select(`
        question_id,
        answer,
        questions:question_id (
          id,
          test_id,
          type, 
          correct_answer,
          tests:test_id (
            section
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('exam_id', examId);

    if (answersError) throw answersError;

    // Initialize section scores
    let listeningCorrect = 0;
    let listeningTotal = 0;
    let structureCorrect = 0;
    let structureTotal = 0;
    let readingCorrect = 0;
    let readingTotal = 0;

    // Calculate section scores based on current answers
    allAnswers?.forEach(ans => {
      const question = ans.questions;
      if (!question || !question.tests) return;
      
      const section = question.tests.section?.toLowerCase();
      const isCorrect = ans.answer == question.correct_answer.toString();
      
      switch (section) {
        case 'listening':
          listeningTotal++;
          if (isCorrect) listeningCorrect++;
          break;
        case 'structure':
          structureTotal++;
          if (isCorrect) structureCorrect++;
          break;
        case 'reading':
          readingTotal++;
          if (isCorrect) readingCorrect++;
          break;
      }
    });

    // Calculate raw scores (as percentages of total possible points in each section)
    const listeningScore = Math.round((listeningCorrect / Math.max(listeningTotal, 1)) * 50); // Max 50 points
    const structureScore = Math.round((structureCorrect / Math.max(structureTotal, 1)) * 40); // Max 40 points
    const readingScore = Math.round((readingCorrect / Math.max(readingTotal, 1)) * 50); // Max 50 points

    // Calculate TOEFL scores using the official conversion formula
    const toeflScores = calculateTOEFLScores({
      listening: listeningScore,
      structure: structureScore,
      reading: readingScore
    });

    // Update statistics data - remove status field which doesn't exist in the table
    const statsToUpsert = {
      student_id: studentId,
      exam_id: examId,
      exam_type: 'TOEFL',
      listening_score: listeningScore,
      structure_score: structureScore,
      reading_score: readingScore,
      total_score: toeflScores.finalScore,
      taken_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // If we already have stats, update them; otherwise insert new record
    if (statsData) {
      const { error: updateError } = await supabase
        .from('exam_results')
        .update(statsToUpsert)
        .eq('id', statsData.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('exam_results')
        .insert([statsToUpsert]);

      if (insertError) throw insertError;
    }

    console.log('Real-time TOEFL statistics updated successfully');
  } catch (error) {
    console.error('Error updating real-time TOEFL statistics:', error);
    // Non-blocking - we don't want to prevent the student from continuing if stats update fails
  }
}