import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { checkTeacherSession } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
  matricula: string;
  email: string;
  password: string;
  salon: string;
  semester: string;
}

export default function StudentAccounts() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (!checkTeacherSession()) {
        navigate('/teacher-login');
        return;
      }
      await fetchStudents();
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/teacher-login');
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .order('salon', { ascending: true });

      if (fetchError) throw fetchError;

      // Group students by salon
      const studentsBySalon = (data || []).reduce((acc, student) => {
        const salon = student.salon || 'Unknown';
        if (!acc[salon]) {
          acc[salon] = [];
        }
        acc[salon].push(student);
        return acc;
      }, {} as Record<string, Student[]>);

      // Sort students within each salon by semester and name
      Object.values(studentsBySalon).forEach(salonStudents => {
        salonStudents.sort((a, b) => {
          // First sort by semester
          const semesterA = parseInt(a.semester);
          const semesterB = parseInt(b.semester);
          if (semesterA !== semesterB) {
            return semesterA - semesterB;
          }
          // Then by name
          return a.name.localeCompare(b.name);
        });
      });

      setStudents(Object.values(studentsBySalon).flat());
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (studentId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleDelete = (student: Student) => {
    setStudentToDelete(student);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    try {
      // Delete auth record
      const { error: authError } = await supabase.auth.admin.deleteUser(
        studentToDelete.id
      );

      if (authError) throw authError;

      // Delete student record
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id);

      if (deleteError) throw deleteError;

      setStudents(students.filter(s => s.id !== studentToDelete.id));
      setShowDeleteConfirm(false);
      setStudentToDelete(null);
    } catch (err) {
      console.error('Error deleting student:', err);
      setError('Failed to delete student account');
    }
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: editingStudent.name,
          salon: editingStudent.salon,
          semester: editingStudent.semester
        })
        .eq('id', editingStudent.id);

      if (error) throw error;

      setStudents(students.map(s => 
        s.id === editingStudent.id ? editingStudent : s
      ));
      setShowEditModal(false);
      setEditingStudent(null);
    } catch (err) {
      console.error('Error updating student:', err);
      setError('Failed to update student information');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group students by semester
  const studentsBySemester = students.reduce((acc, student) => {
    const sem = student.semester;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <h1 className="text-xl font-bold text-gray-900">Student Accounts</h1>
                <p className="text-sm text-gray-500">Manage student information and access</p>
              </div>
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
              onClick={fetchStudents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">No student accounts registered yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group students by salon */}
            {Object.entries(
              students.reduce((acc, student) => {
                const salon = student.salon;
                if (!acc[salon]) acc[salon] = [];
                acc[salon].push(student);
                return acc;
              }, {} as Record<string, Student[]>)
            ).sort(([a], [b]) => a.localeCompare(b)).map(([salon, salonStudents]) => (
                <div key={salon} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Salon {salon}
                      <span className="ml-2 text-sm text-gray-500">
                        ({salonStudents.length} students)
                      </span>
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricula</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salon</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {salonStudents.sort((a, b) => 
                          // First sort by semester
                          parseInt(a.semester) - parseInt(b.semester) || 
                          // Then by name
                          a.name.localeCompare(b.name)
                        ).map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-xs text-gray-500">Semester {student.semester}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{student.matricula}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 font-mono">
                                  {visiblePasswords[student.id] ? student.password : '••••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(student.id)}
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  {visiblePasswords[student.id] ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{student.salon}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(student)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(student)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Student</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salon
                </label>
                <input
                  type="text"
                  value={editingStudent.salon}
                  onChange={(e) => setEditingStudent({ ...editingStudent, salon: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <input
                  type="text"
                  value={editingStudent.semester}
                  onChange={(e) => setEditingStudent({ ...editingStudent, semester: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingStudent(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStudent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && studentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Delete Student Account</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this student account?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {studentToDelete.name} ({studentToDelete.matricula})
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setStudentToDelete(null);
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
