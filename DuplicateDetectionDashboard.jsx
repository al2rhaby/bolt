import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Calendar,
  User,
  Eye,
  FileText,
  Trash2,
  Download
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

/**
 * DuplicateDetectionDashboard component
 * Provides admin interface to detect and manage duplicate exam submissions
 */
const DuplicateDetectionDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [daysBack, setDaysBack] = useState(7);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [detailedView, setDetailedView] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    checkTeacherAccess();
    detectDuplicates();
  }, [daysBack]);

  const checkTeacherAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.email !== 'mohamed') {
      navigate('/teacher-login');
    }
  };

  const detectDuplicates = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try the stored function if available
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_student_exam_duplicates', 
          { p_days_back: daysBack }
        );

        if (!rpcError && rpcData) {
          setDuplicates(rpcData);
          return;
        }
      } catch (rpcErr) {
        console.log('RPC approach failed, using direct query:', rpcErr);
      }

      // If RPC fails, use a direct query approach
      const { data: rawData, error: rawError } = await supabase.from('student_answer_analysis')
        .select('*')
        .gte('submission_time', new Date(Date.now() - daysBack * 86400000).toISOString());
      
      if (rawError) throw rawError;

      // Process duplicate submissions manually
      const submissionMap = {};
      
      rawData.forEach(item => {
        const key = `${item.student_id}_${item.test_id}`;
        if (!submissionMap[key]) {
          submissionMap[key] = [];
        }
        submissionMap[key].push(item);
      });

      // Filter for duplicates (more than 1 submission)
      const duplicateEntries = Object.entries(submissionMap)
        .filter(([_, submissions]) => submissions.length > 1)
        .map(([key, submissions]) => {
          // Sort by submission time descending
          submissions.sort((a, b) => 
            new Date(b.submission_time).getTime() - new Date(a.submission_time).getTime()
          );
          
          const [studentId, testId] = key.split('_');
          const latest = submissions[0];
          const earliest = submissions[submissions.length - 1];
          
          return {
            student_id: studentId,
            student_name: latest.student_name,
            student_matricula: latest.student_matricula,
            test_id: testId,
            test_title: latest.test_title,
            submission_count: submissions.length,
            latest_submission: latest.submission_time,
            earliest_submission: earliest.submission_time,
            time_between_submissions: 
              (new Date(latest.submission_time).getTime() - new Date(earliest.submission_time).getTime()) / 1000,
            all_submissions: submissions
          };
        });

      // Sort by time between submissions
      duplicateEntries.sort((a, b) => a.time_between_submissions - b.time_between_submissions);
      
      setDuplicates(duplicateEntries);
    } catch (err) {
      console.error('Error detecting duplicates:', err);
      setError('Failed to detect duplicate submissions: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDuplicate = async (student) => {
    try {
      setLoading(true);
      
      // Get all submissions for this student/test
      const { data: submissions, error: fetchError } = await supabase
        .from('unit_exam_results')
        .select('id, created_at')
        .eq('student_id', student.student_id)
        .eq('test_id', student.test_id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      if (!submissions || submissions.length <= 1) {
        throw new Error('No duplicate submissions found to delete');
      }
      
      // Keep the most recent submission, delete the rest
      const idsToDelete = submissions.slice(1).map(s => s.id);
      
      const { error: deleteError } = await supabase
        .from('unit_exam_results')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) throw deleteError;
      
      // Success - refresh the list
      setConfirmDelete(null);
      await detectDuplicates();
      
    } catch (err) {
      console.error('Error deleting duplicates:', err);
      setError('Failed to delete duplicate submissions: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const formatTimeBetween = (seconds) => {
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)} minutes`;
    } else if (seconds < 86400) {
      return `${Math.round(seconds / 3600)} hours`;
    } else {
      return `${Math.round(seconds / 86400)} days`;
    }
  };

  const viewStudentAnswers = (student, submissionId) => {
    navigate(`/student-answers/${student.student_id}/${submissionId}`);
  };

  const exportToExcel = () => {
    try {
      if (!duplicates || duplicates.length === 0) return;
      
      // Prepare data for export
      const wsData = [
        ['Duplicate Exam Submissions Report'],
        ['Generated On', new Date().toLocaleString()],
        ['Time Period', `Last ${daysBack} days`],
        [''],
        ['Student Name', 'Matricula', 'Test', 'Submissions', 'Latest Submission', 'Earliest Submission', 'Time Between']
      ];
      
      duplicates.forEach(duplicate => {
        wsData.push([
          duplicate.student_name,
          duplicate.student_matricula,
          duplicate.test_title,
          duplicate.submission_count,
          new Date(duplicate.latest_submission).toLocaleString(),
          new Date(duplicate.earliest_submission).toLocaleString(),
          formatTimeBetween(duplicate.time_between_submissions)
        ]);
      });
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      const colWidths = [
        { wch: 25 }, // Student Name
        { wch: 15 }, // Matricula
        { wch: 30 }, // Test
        { wch: 12 }, // Submissions
        { wch: 22 }, // Latest Submission
        { wch: 22 }, // Earliest Submission
        { wch: 15 }, // Time Between
      ];
      
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Duplicate Submissions');
      
      // Save file
      XLSX.writeFile(wb, `duplicate_submissions_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export report to Excel. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Duplicate Exam Detection</h1>
                <p className="text-sm text-gray-500">Find and manage multiple exam submissions</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={daysBack}
                onChange={(e) => setDaysBack(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 3 months</option>
              </select>
              
              <button
                onClick={detectDuplicates}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                disabled={duplicates.length === 0}
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Scanning for duplicate submissions...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <p>{error}</p>
            </div>
            <button
              onClick={detectDuplicates}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="mb-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Duplicate Submissions</h3>
            <p className="text-gray-500">No duplicate exam submissions detected in the selected time period.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Detected Duplicate Submissions</h2>
                <p className="text-sm text-gray-500">
                  Found {duplicates.length} students with multiple submissions
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Between
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {duplicates.map((duplicate) => (
                      <React.Fragment key={`${duplicate.student_id}_${duplicate.test_id}`}>
                        <tr className={`hover:bg-gray-50 ${expandedStudent === duplicate.student_id ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {duplicate.student_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {duplicate.student_matricula}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{duplicate.test_title}</div>
                            <div className="text-sm text-gray-500">
                              Latest: {new Date(duplicate.latest_submission).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {duplicate.submission_count} submissions
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              duplicate.time_between_submissions < 300 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {formatTimeBetween(duplicate.time_between_submissions)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setExpandedStudent(expandedStudent === duplicate.student_id ? null : duplicate.student_id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Show details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(duplicate)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete duplicates"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {expandedStudent === duplicate.student_id && duplicate.all_submissions && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="px-6 py-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">All Submissions</h4>
                              <div className="space-y-2">
                                {duplicate.all_submissions.map((submission, index) => (
                                  <div key={submission.result_id} className="flex justify-between items-center p-2 border border-gray-200 rounded-md bg-white">
                                    <div>
                                      <span className="text-sm font-medium">{index + 1}.</span>
                                      <span className="ml-2 text-sm text-gray-600">
                                        {new Date(submission.submission_time).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">
                                        {submission.source_table}
                                      </span>
                                      <button
                                        onClick={() => viewStudentAnswers(duplicate, submission.result_id)}
                                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                      >
                                        <FileText className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Delete Duplicate Submissions</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete the duplicate submissions for:
            </p>
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <p className="font-medium">{confirmDelete.student_name}</p>
              <p className="text-sm text-gray-500">Test: {confirmDelete.test_title}</p>
              <p className="text-sm text-gray-500">Submissions: {confirmDelete.submission_count}</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Only the most recent submission will be kept. All others will be permanently deleted.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDuplicate(confirmDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Duplicates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateDetectionDashboard;