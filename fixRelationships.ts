// Add this to your lib folder (e.g., lib/fixRelationships.ts)

import { supabase } from './supabase';

/**
 * Fixes database relationships for unit exam tables
 * This function runs the necessary SQL to fix any issues with foreign keys
 * and creates helper views for statistics display
 */
export async function fixUnitExamRelationships() {
  try {
    const fixScript = `
    -- 1. Fix constraint issues in unit_exam_results table
    ALTER TABLE IF EXISTS unit_exam_results 
      DROP CONSTRAINT IF EXISTS unit_exam_results_test_id_fkey,
      ADD CONSTRAINT unit_exam_results_test_id_fkey 
        FOREIGN KEY (test_id) 
        REFERENCES tests(id) 
        ON DELETE CASCADE;
    
    ALTER TABLE IF EXISTS unit_exam_results
      DROP CONSTRAINT IF EXISTS unit_exam_results_student_id_fkey,
      ADD CONSTRAINT unit_exam_results_student_id_fkey
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE;

    -- 2. Create helper view for unit exam statistics
    CREATE OR REPLACE VIEW unit_exam_stats AS
    SELECT 
      uer.id,
      uer.student_id,
      uer.exam_id,
      uer.test_id,
      uer.total_points,
      uer.total_score,
      uer.completion_time,
      uer.status,
      uer.created_at,
      uer.updated_at,
      s.name AS student_name,
      s.matricula AS student_matricula,
      s.salon AS student_salon,
      t.title AS test_title,
      t.level AS test_level,
      t.carrera AS test_carrera,
      t.semestre AS test_semestre,
      t.grupo AS test_grupo
    FROM 
      unit_exam_results uer
    LEFT JOIN 
      students s ON uer.student_id = s.id
    LEFT JOIN 
      tests t ON uer.test_id = t.id
    ORDER BY 
      uer.completion_time DESC NULLS LAST;

    -- 3. Create a function to retrieve unit exam statistics
    CREATE OR REPLACE FUNCTION get_unit_exam_statistics()
    RETURNS TABLE (
      id uuid,
      student_id uuid,
      test_id uuid,
      exam_id uuid,
      total_score integer,
      total_points integer,
      completion_time timestamptz,
      status text,
      created_at timestamptz,
      updated_at timestamptz,
      student_name text,
      student_matricula text,
      student_salon text,
      test_title text,
      test_level text,
      test_carrera text,
      test_semestre text,
      test_grupo text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT * FROM unit_exam_stats;
    END;
    $$ LANGUAGE plpgsql;

    -- 4. Fix any orphaned records
    UPDATE unit_exam_results SET status = 'completed' WHERE status IS NULL;
    `;
    
    // Execute the fix script
    const { error } = await supabase.rpc('run_sql', { query: fixScript });
    
    if (error) {
      console.error("Error fixing relationships:", error);
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      message: "Database relationships fixed successfully"
    };
  } catch (err) {
    console.error("Error in relationship fix:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error"
    };
  }
}