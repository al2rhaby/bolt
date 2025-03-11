import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { saveUnitExamResults, createUnitExamResultsTable } from '../lib/models/unitExamResults';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: string;
}

export default function DatabaseTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [fixApplied, setFixApplied] = useState(false);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    setResults([]);
    const testResults: TestResult[] = [];

    // Test 1: Check database connection
    try {
      const { data, error } = await supabase.from('tests').select('count(*)', { count: 'exact' });
      
      if (error) throw error;
      
      testResults.push({
        name: 'Database Connection',
        success: true,
        message: 'Successfully connected to database'
      });
    } catch (err) {
      testResults.push({
        name: 'Database Connection',
        success: false,
        message: 'Failed to connect to database',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // Test 2: Check run_sql function
    try {
      const { data, error } = await supabase.rpc('run_sql', { 
        query: 'SELECT current_timestamp as time' 
      });
      
      if (error) throw error;
      
      testResults.push({
        name: 'run_sql Function',
        success: true,
        message: 'run_sql function is working properly'
      });
    } catch (err) {
      testResults.push({
        name: 'run_sql Function',
        success: false,
        message: 'run_sql function is not working',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // Test 3: Check unit_exam_results table
    try {
      const { data, error } = await supabase.from('unit_exam_results').select('count(*)', { count: 'exact' });
      
      if (error) throw error;
      
      testResults.push({
        name: 'unit_exam_results Table',
        success: true,
        message: 'unit_exam_results table exists and is accessible'
      });
    } catch (err) {
      testResults.push({
        name: 'unit_exam_results Table',
        success: false,
        message: 'unit_exam_results table is not accessible',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // Test 4: Test saving a unit exam result
    try {
      // Get a valid student_id first
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .limit(1);

      if (studentsError) throw studentsError;
      
      if (!students || students.length === 0) {
        throw new Error('No students found to test with');
      }

      // Get a valid test_id
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('id')
        .eq('type', 'Unit')
        .limit(1);

      if (testsError) throw testsError;
      
      if (!tests || tests.length === 0) {
        throw new Error('No unit tests found to test with');
      }

      // Create a dummy exam schedule
      const { data: examData, error: examError } = await supabase
        .from('exam_schedule')
        .insert([{
          test_id: tests[0].id,
          date: new Date().toISOString().split('T')[0],
          time: '12:00:00',
          duration: 60,
          status: 'upcoming'
        }])
        .select()
        .single();

      if (examError) throw examError;

      // Now try to save a test result
      const result = await saveUnitExamResults({
        student_id: students[0].id,
        test_id: tests[0].id,
        exam_id: examData.id,
        total_points: 10,
        total_score: 8,
        status: 'completed',
        completion_time: new Date().toISOString(),
        answers: JSON.stringify({ "1": 0, "2": 1 })
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save exam result');
      }

      testResults.push({
        name: 'Save Exam Result',
        success: true,
        message: result.fallback 
          ? `Saved exam result using fallback method: ${result.fallback}` 
          : 'Successfully saved exam result'
      });
    } catch (err) {
      testResults.push({
        name: 'Save Exam Result',
        success: false,
        message: 'Failed to save exam result',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    setResults(testResults);
    setLoading(false);
  };

  const applyFixes = async () => {
    setLoading(true);
    try {
      // Create the unit_exam_results table if it doesn't exist
      const result = await createUnitExamResultsTable();
      
      if (!result.success) {
        throw new Error('Failed to create unit_exam_results table');
      }
      
      // Apply migration fix using direct SQL
      const fixScript = `
      -- Fix 1: Create or replace the run_sql function
      CREATE OR REPLACE FUNCTION public.run_sql(query text)
      RETURNS JSONB AS $$
      BEGIN
          RETURN (SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM query_to_json($1)) t);
      EXCEPTION
          WHEN OTHERS THEN
              RAISE EXCEPTION 'SQL Error: %', SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Helper function for run_sql
      CREATE OR REPLACE FUNCTION public.query_to_json(query_text text)
      RETURNS TABLE (result jsonb) AS $$
      BEGIN
          RETURN QUERY EXECUTE query_text;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE EXCEPTION 'Query execution error: %', SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Fix 3: Fix constraints with proper ON DELETE handling
      ALTER TABLE unit_exam_results 
        DROP CONSTRAINT IF EXISTS unit_exam_results_test_id_fkey,
        DROP CONSTRAINT IF EXISTS unit_exam_results_student_id_fkey,
        DROP CONSTRAINT IF EXISTS unit_exam_results_exam_id_fkey;

      -- Re-add constraints with proper ON DELETE behavior
      ALTER TABLE unit_exam_results
        ADD CONSTRAINT unit_exam_results_student_id_fkey
          FOREIGN KEY (student_id)
          REFERENCES students(id)
          ON DELETE CASCADE;

      ALTER TABLE unit_exam_results
        ADD CONSTRAINT unit_exam_results_test_id_fkey
          FOREIGN KEY (test_id)
          REFERENCES tests(id)
          ON DELETE SET NULL;

      ALTER TABLE unit_exam_results
        ADD CONSTRAINT unit_exam_results_exam_id_fkey
          FOREIGN KEY (exam_id)
          REFERENCES exam_schedule(id)
          ON DELETE SET NULL;
      `;
      
      try {
        await supabase.rpc('run_sql', { query: fixScript });
      } catch (error) {
        console.error('Error applying fix script:', error);
      }
      
      setFixApplied(true);
      
      // Re-run tests after applying fixes
      runTests();
    } catch (err) {
      console.error('Error applying fixes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Database Test</h1>
              <p className="text-sm text-gray-500">Identify and fix database issues</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Database Tests</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={runTests}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running...
                  </div>
                ) : (
                  'Run Tests'
                )}
              </button>
              <button
                onClick={applyFixes}
                disabled={loading || fixApplied}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Apply Fixes
              </button>
            </div>
          </div>

          {fixApplied && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-700">Database fixes have been applied.</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success 
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{result.name}</h3>
                    <p className="text-sm text-gray-600">{result.message}</p>
                    {result.details && (
                      <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                        <pre className="text-xs text-white overflow-auto">{result.details}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && results.length === 0 && (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-500">Running database tests...</p>
                </div>
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="text-center p-12">
                <p className="text-gray-500">No tests have been run yet. Click "Run Tests" to begin.</p>
              </div>
            )}
          </div>

          {results.some(r => !r.success) && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800">Some tests failed</h3>
                  <p className="text-sm text-yellow-700 mt-1">Click the "Apply Fixes" button to attempt to fix these issues automatically.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}