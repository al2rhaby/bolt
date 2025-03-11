import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BarChart2,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase, checkTeacherSession } from '../../lib/supabase';
import * as XLSX from 'xlsx';

interface ToeflResult {
  id: string;
  student_id: string;
  student: {
    name: string;
    matricula: string;
    salon: string;
  };
  exam_type: string;
  total_score: number;
  listening_score: number;
  structure_score: number;
  reading_score: number;
  taken_at: string;
  updated_at: string;
  status?: string;
}

interface SalonGroup {
  [key: string]: {
    students: ToeflResult[];
    averageScore: number;
    highestScore: number;
  };
}

export default function ToeflStatistics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ToeflResult[]>([]);
  const [salonGroups, setSalonGroups] = useState<SalonGroup>({});
  const [isRealtime, setIsRealtime] = useState(true);
  const [pollInterval, setPollInterval] = useState(5000); // 5 seconds default
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!checkTeacherSession()) {
      navigate('/teacher-login');
      return;
    }
    
    loadStatistics();
    
    // Start polling for real-time updates
    if (isRealtime) {
      startPolling();
    }
    
    // Clean up polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [navigate, isRealtime, pollInterval]);

  const startPolling = () => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Set up new polling interval
    pollingRef.current = setInterval(() => {
      loadStatistics(false); // false means don't show loading indicator
    }, pollInterval);
  };

  const loadStatistics = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const { data: results, error: resultsError } = await supabase
        .from('exam_results')
        .select(`
          *,
          student:student_id (
            name,
            matricula,
            salon
          )
        `)
        .eq('exam_type', 'TOEFL')
        .order('updated_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Group results by salon
      const groupedResults = (results || []).reduce((acc, result) => {
        const salon = result.student?.salon || 'Unknown';
        
        if (!acc[salon]) {
          acc[salon] = {
            students: [],
            averageScore: 0,
            highestScore: 0
          };
        }
        
        acc[salon].students.push(result);
        
        // Update salon statistics
        const scores = acc[salon].students.map(s => s.total_score || 0);
        acc[salon].averageScore = Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
        acc[salon].highestScore = Math.max(...scores);
        
        return acc;
      }, {} as SalonGroup);

      setSalonGroups(groupedResults);
      setResults(results || []);
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError('Failed to load exam statistics');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const downloadExcel = () => {
    if (results.length === 0) return;

    try {
      // Prepare data for each salon
      const workbook = XLSX.utils.book_new();
      
      Object.entries(salonGroups).forEach(([salon, data]) => {
        // Create worksheet data for this salon
        const wsData = [
          ['TOEFL Results - ' + salon],
          [],
          ['Summary'],
          ['Total Students:', data.students.length],
          ['Average Score:', data.averageScore],
          ['Highest Score:', data.highestScore],
          [],
          ['Student Details'],
          ['Name', 'Matricula', 'Listening', 'Structure', 'Reading', 'Total Score', 'Date Taken']
        ];

        // Add student data
        data.students.forEach(student => {
          wsData.push([
            student.student?.name || 'Unknown',
            student.student?.matricula || 'Unknown',
            student.listening_score || 0,
            student.structure_score || 0,
            student.reading_score || 0,
            student.total_score || 0,
            new Date(student.taken_at).toLocaleDateString()
          ]);
        });

        // Create worksheet and add to workbook
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(workbook, ws, `Salon ${salon}`);
      });
      
      // Generate Excel file
      XLSX.writeFile(workbook, 'TOEFL_Results_by_Salon.xlsx');
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      setError("Failed to export Excel. Please try again.");
    }
  };

  const handleSetRealtimeMode = (enabled: boolean) => {
    setIsRealtime(enabled);
    if (enabled) {
      startPolling();
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleSetPollInterval = (seconds: number) => {
    const ms = seconds * 1000;
    setPollInterval(ms);
    // Restart polling with new interval
    if (isRealtime) {
      startPolling();
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 550) return 'bg-green-100 text-green-800';
    if (score >= 450) return 'bg-blue-100 text-blue-800';
    if (score >= 350) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleManualRefresh = () => {
    loadStatistics(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
                <span className="text-gray-600">Back to Dashboard</span>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TOEFL Statistics</h1>
                <p className="text-sm text-gray-500">View TOEFL exam results by salon</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualRefresh}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRealtime}
                    onChange={(e) => handleSetRealtimeMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">Real-time</span>
                </label>
              </div>
              
              {isRealtime && (
                <select
                  value={pollInterval / 1000}
                  onChange={(e) => handleSetPollInterval(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="2">Update every 2s</option>
                  <option value="5">Update every 5s</option>
                  <option value="10">Update every 10s</option>
                  <option value="30">Update every 30s</option>
                </select>
              )}
              
              <button
                onClick={downloadExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                disabled={results.length === 0}
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <p>{error}</p>
            </div>
            <button
              onClick={() => loadStatistics(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : Object.keys(salonGroups).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="mb-4">
              <BarChart2 className="w-12 h-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-500">No TOEFL exam results have been recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Real-time indicator */}
            {isRealtime && (
              <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3 border border-blue-200">
                <div className="relative">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full absolute top-0 animate-ping"></div>
                </div>
                <p className="text-blue-700 font-medium">
                  Real-time updates active. Refreshing every {pollInterval / 1000} seconds.
                </p>
              </div>
            )}

            {/* Results by Salon */}
            {Object.entries(salonGroups).sort(([a], [b]) => a.localeCompare(b)).map(([salon, data]) => (
              <div key={salon} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Salon {salon}
                      <span className="ml-2 text-sm text-gray-500">
                        ({data.students.length} students)
                      </span>
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-gray-500">Average Score: </span>
                        <span className="font-medium text-blue-600">{data.averageScore}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Highest Score: </span>
                        <span className="font-medium text-green-600">{data.highestScore}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Listening
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Structure
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reading
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.students.map((result) => (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.student?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {result.student?.matricula || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.listening_score || 0}/50
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.structure_score || 0}/40
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.reading_score || 0}/50
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getScoreBadgeColor(result.total_score || 0)}`}>
                              {result.total_score || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {result.status === 'active' ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {result.updated_at ? new Date(result.updated_at).toLocaleString() : 'Not recorded'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}