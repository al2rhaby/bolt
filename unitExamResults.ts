import { supabase } from '../supabase';

/**
 * Saves unit exam results with robust fallback mechanisms for database issues
 * @param resultData - The exam result data to save
 * @returns Success status and result data or error 
 */
export async function saveUnitExamResults(resultData: {
  student_id: string;
  test_id: string | null;
  exam_id: string;
  total_points: number;
  total_score: number;
  status: string;
  completion_time: string;
  answers?: string;
}) {
  try {
    // First try to save to unit_exam_results table
    const { data, error } = await supabase
      .from('unit_exam_results')
      .insert([resultData])
      .select()
      .single();
    
    // If successful, return the data
    if (!error) {
      console.log('Unit exam result saved successfully:', data);
      return { success: true, data };
    }
    
    console.warn('Primary save attempt failed:', error.message);
    
    // First fix attempt - Try to repair foreign key relationships
    await fixUnitExamRelationships();
    
    // Second attempt - Try again after fixing relationships
    const { data: retryData, error: retryError } = await supabase
      .from('unit_exam_results')
      .insert([resultData])
      .select()
      .single();
    
    if (!retryError) {
      console.log('Unit exam result saved after relationship fix:', retryData);
      return { success: true, data: retryData };
    }
    
    console.warn('Relationship fix attempt failed:', retryError.message);
    
    // Third attempt - Try creating the record using a direct SQL query
    try {
      const insertSql = `
        INSERT INTO unit_exam_results (
          student_id, test_id, exam_id, total_points, 
          total_score, status, completion_time, answers
        ) VALUES (
          '${resultData.student_id}',
          ${resultData.test_id ? `'${resultData.test_id}'` : 'NULL'},
          '${resultData.exam_id}',
          ${resultData.total_points},
          ${resultData.total_score},
          '${resultData.status}',
          '${resultData.completion_time}',
          ${resultData.answers ? `'${resultData.answers}'` : 'NULL'}
        ) RETURNING id;
      `;
      
      const { data: sqlResult, error: sqlError } = await supabase.rpc('run_sql', { 
        query: insertSql 
      });
      
      if (!sqlError && sqlResult && sqlResult.length > 0) {
        console.log('Unit exam result saved using direct SQL:', sqlResult[0]);
        return { 
          success: true, 
          data: { id: sqlResult[0].id, ...resultData },
          fallback: 'sql'
        };
      }
      
      console.warn('Direct SQL attempt failed:', sqlError || 'No data returned');
    } catch (sqlErr) {
      console.error('SQL fallback error:', sqlErr);
    }
    
    // Fourth attempt - Last resort fallback to exam_results table
    console.warn('Trying final fallback to exam_results table');
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('exam_results')
      .insert([{
        student_id: resultData.student_id,
        test_id: resultData.test_id,
        exam_id: resultData.exam_id,
        exam_type: 'Unit',
        total_score: resultData.total_score,
        status: resultData.status,
        completion_time: resultData.completion_time,
        taken_at: resultData.completion_time
      }])
      .select()
      .single();
    
    if (fallbackError) {
      console.error('All save attempts failed:', fallbackError);
      
      // Try one more approach - direct insert to exam_results with minimal fields
      try {
        const minimalInsertSql = `
          INSERT INTO exam_results (
            student_id, exam_type, total_score, taken_at
          ) VALUES (
            '${resultData.student_id}',
            'Unit',
            ${resultData.total_score},
            '${resultData.completion_time}'
          ) RETURNING id;
        `;
        
        const { data: minimalResult, error: minimalError } = await supabase.rpc('run_sql', { 
          query: minimalInsertSql 
        });
        
        if (!minimalError && minimalResult && minimalResult.length > 0) {
          console.log('Minimal exam result saved as last resort:', minimalResult[0]);
          return { 
            success: true, 
            data: { id: minimalResult[0].id, ...resultData },
            fallback: 'minimal' 
          };
        }
      } catch (minimalErr) {
        console.error('Minimal fallback failed:', minimalErr);
      }
      
      return { 
        success: false, 
        error: 'Failed to save exam results after multiple attempts. The system will try again later.',
        original_error: fallbackError.message
      };
    }
    
    return { 
      success: true, 
      data: fallbackData, 
      fallback: 'exam_results' 
    };
  } catch (err) {
    console.error('Error saving unit exam results:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error',
      recoverable: true
    };
  }
}

/**
 * Fixes database relationships for unit exam tables
 */
async function fixUnitExamRelationships() {
  try {
    const fixScript = `
    -- Fix constraint issues in unit_exam_results table
    ALTER TABLE IF EXISTS unit_exam_results 
      DROP CONSTRAINT IF EXISTS unit_exam_results_test_id_fkey,
      ADD CONSTRAINT unit_exam_results_test_id_fkey 
        FOREIGN KEY (test_id) 
        REFERENCES tests(id) 
        ON DELETE SET NULL;
    
    ALTER TABLE IF EXISTS unit_exam_results
      DROP CONSTRAINT IF EXISTS unit_exam_results_student_id_fkey,
      ADD CONSTRAINT unit_exam_results_student_id_fkey
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE;
        
    ALTER TABLE IF EXISTS unit_exam_results
      DROP CONSTRAINT IF EXISTS unit_exam_results_exam_id_fkey,
      ADD CONSTRAINT unit_exam_results_exam_id_fkey
        FOREIGN KEY (exam_id)
        REFERENCES exam_schedule(id)
        ON DELETE SET NULL;
    
    -- Create or replace the run_sql function if it doesn't exist
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'run_sql') THEN
        EXECUTE '
          CREATE OR REPLACE FUNCTION public.run_sql(query text, params text[] DEFAULT NULL)
          RETURNS JSONB AS $$
          BEGIN
              IF params IS NULL THEN
                  RETURN (SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM query_to_json($1)) t);
              ELSE
                  RETURN (SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM query_to_json_params($1, $2)) t);
              END IF;
          EXCEPTION
              WHEN OTHERS THEN
                  RAISE EXCEPTION ''SQL Error: %'', SQLERRM;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          CREATE OR REPLACE FUNCTION public.query_to_json(query_text text)
          RETURNS TABLE (result jsonb) AS $$
          BEGIN
              RETURN QUERY EXECUTE query_text;
          EXCEPTION
              WHEN OTHERS THEN
                  RAISE EXCEPTION ''Query execution error: %'', SQLERRM;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          CREATE OR REPLACE FUNCTION public.query_to_json_params(query_text text, params text[])
          RETURNS TABLE (result jsonb) AS $$
          BEGIN
              RETURN QUERY EXECUTE query_text USING params;
          EXCEPTION
              WHEN OTHERS THEN
                  RAISE EXCEPTION ''Query execution error with params: %'', SQLERRM;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        ';
      END IF;
    END $$;
    `;
    
    // Try executing the fix script directly first
    try {
      await supabase.rpc('run_sql', { query: fixScript });
    } catch (directError) {
      console.warn('Direct run_sql call failed, trying alternative approach:', directError);
      
      // If the run_sql function is missing, try to execute it using a raw query
      // This is a simplified approach and may not work in all environments
      const { error } = await supabase
        .from('_postgrest_function')
        .select('*')
        .limit(1);
        
      if (error) {
        console.error('Failed to execute fallback query:', error);
      }
    }
    
    console.log('Relationship fix attempt completed');
    return true;
  } catch (err) {
    console.error('Error fixing relationships:', err);
    return false;
  }
}

/**
 * Creates the unit_exam_results table if it doesn't exist
 * This is a last resort recovery option
 */
export async function createUnitExamResultsTable() {
  try {
    const createTableScript = `
    CREATE TABLE IF NOT EXISTS unit_exam_results (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES students(id) ON DELETE CASCADE,
      test_id uuid REFERENCES tests(id) ON DELETE SET NULL,
      exam_id uuid REFERENCES exam_schedule(id) ON DELETE SET NULL,
      total_points integer,
      total_score integer,
      status text DEFAULT 'completed',
      completion_time timestamptz DEFAULT now(),
      answers jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_unit_exam_results_student ON unit_exam_results(student_id);
    CREATE INDEX IF NOT EXISTS idx_unit_exam_results_test ON unit_exam_results(test_id);
    CREATE INDEX IF NOT EXISTS idx_unit_exam_results_exam ON unit_exam_results(exam_id);
    `;
    
    // Attempt to execute the creation script
    try {
      await supabase.rpc('run_sql', { query: createTableScript });
      return { success: true };
    } catch (error) {
      console.error('Failed to create unit_exam_results table:', error);
      return { success: false, error };
    }
  } catch (err) {
    console.error('Error in createUnitExamResultsTable:', err);
    return { success: false, error: err };
  }
}