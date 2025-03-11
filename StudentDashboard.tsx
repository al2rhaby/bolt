import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  LogOut, 
  Play, 
  Tag, 
  CheckCircle, 
  Clock,
  Calendar,
  AlertTriangle,
  GraduationCap,
  Search,
  Bell,
  BarChart2,
  Filter,
  ChevronDown
} from 'lucide-react';
import { supabase, clearTeacherSession } from '../lib/supabase';
import { format, isToday, isPast, isFuture } from 'date-fns';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  matricula: string;
  salon: string;
  semester: string;
}

interface ScheduledExam {
  id: string;
  test_id: string;
  title: string;
  type: 'TOEFL' | 'Unit';
  date: string;
  time: string;
  duration: string;
  salon: string;
  carrera: string;
  semestre: string;
  grupo: string;
  profesor: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([]);
  const [completedExams, setCompletedExams] = useState<ScheduledExam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Changed default filter from 'all' to 'available'
  const [filterView, setFilterView] = useState('available');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'New Unit Test Available', time: '2 hours ago' },
    { id: 2, title: 'TOEFL Exam Scheduled', time: '1 day ago' },
    { id: 3, title: 'Test Results Published', time: '2 days ago' },
  ]);

  // Generate calendar events from exams
  const calendarEvents = useMemo(() => {
    return scheduledExams.map(exam => ({
      day: new Date(exam.date),
      events: [
        {
          id: parseInt(exam.id),
          name: exam.title,
          time: exam.time,
          datetime: `${exam.date}T${exam.time}`
        }
      ]
    }));
  }, [scheduledExams]);

  const loadStudentProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Get student profile
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (studentError) throw studentError;
      
      setStudent(studentData);

      // Load scheduled exams
      const { data: exams, error: examsError } = await supabase
        .from('exam_schedule')
        .select('*, tests:test_id (*)')
        .order('date', { ascending: true });

      if (examsError) throw examsError;

      console.log("Raw exams data from database:", exams);

      if (exams) {
        const now = new Date();
        const formattedExams = exams.map(exam => {
          // Extract date parts
          const examDate = new Date(exam.date + 'T' + exam.time);
          const examEndTime = new Date(examDate.getTime() + parseInt(exam.duration) * 60000);
          
          // Determine status 
          let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
          
          if (now > examEndTime) {
            status = 'completed';
          } else if (now >= examDate && now <= examEndTime) {
            status = 'ongoing';
          } else {
            status = 'upcoming';
          }
          
          // Log each exam for debugging
          console.log(`Exam ${exam.id}:`, {
            date: exam.date, 
            time: exam.time, 
            status: status,
            now: now.toISOString(),
            examDate: examDate.toISOString(),
            examEndTime: examEndTime.toISOString(),
            isNowAfterEnd: now > examEndTime,
            isNowAfterStart: now >= examDate,
            formattedStatus: status
          });

          return {
            id: exam.id,
            test_id: exam.test_id,
            title: exam.tests?.title || 'Untitled Exam',
            type: exam.tests?.type || 'Unit',
            date: exam.date,
            time: exam.time,
            duration: exam.duration,
            salon: studentData.salon,
            carrera: exam.tests?.carrera || '',
            semestre: exam.tests?.semestre || '',
            grupo: exam.tests?.grupo || '',
            profesor: exam.tests?.profesor || '',
            status: status // Use the calculated status
          };
        });

        console.log("Formatted exams before filtering:", formattedExams);

        // Filter exams to only show those available for the student's salon
        const filteredExams = formattedExams.filter(exam => {
          // For TOEFL exams, show to all students
          if (exam.type === 'TOEFL') return true;
          
          // For Unit exams, check salon match
          // Make sure we check if salons is defined and is an array
          const testSalons = exam.tests?.salons;
          if (!testSalons || !Array.isArray(testSalons)) return true; // If no salons specified, show to all
          
          return testSalons.includes(studentData.salon);
        });

        console.log("Final filtered exams:", filteredExams);
        setScheduledExams(filteredExams);
      }
    } catch (err) {
      console.error('Error loading student profile:', err);
      setError('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const determineExamStatus = (examDate: string, examTime: string, now: Date): ScheduledExam['status'] => {
    const examDateTime = new Date(`${examDate}T${examTime}`);
    const examEndTime = new Date(examDateTime.getTime() + (60 * 60 * 1000)); // Add buffer

    if (now > examEndTime) {
      return 'completed';
    } else if (now >= examDateTime && now <= examEndTime) {
      return 'ongoing';
    }
    return 'upcoming';
  };

  const handleStartExam = (exam: ScheduledExam) => {
    if (exam.type === 'TOEFL') {
      navigate('/toefl-student-exam', { state: { examId: exam.id } });
    } else {
      navigate('/student-exam', { state: { examId: exam.id } });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearTeacherSession(); // Clear any teacher session if exists
      navigate('/login');
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  useEffect(() => {
    loadStudentProfile();
  }, []);

  // Filter exams based on search and filter criteria
  const filteredExams = useMemo(() => {
    let filtered = scheduledExams;
    
    if (searchQuery) {
      filtered = filtered.filter(exam => 
        exam.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterView === 'upcoming') {
      filtered = filtered.filter(exam => exam.status === 'upcoming');
    } else if (filterView === 'available') {
      filtered = filtered.filter(exam => exam.status === 'ongoing');
    }
    
    console.log(`Filter view: ${filterView}, Filtered exams:`, filtered);
    return filtered;
  }, [scheduledExams, searchQuery, filterView]);

  // Group exams by status
  useEffect(() => {
    setCompletedExams(scheduledExams.filter(exam => exam.status === 'completed'));
  }, [scheduledExams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center gap-8">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Student Dashboard</h1>
                  {student && (
                    <p className="text-sm text-gray-500">
                      {student.salon} - Semester {student.semester}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="flex-1 max-w-lg relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exams..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    {notifications.map(notification => (
                      <div key={notification.id} className="px-4 py-3 hover:bg-gray-50">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Completed Exams</p>
                    <p className="text-2xl font-bold text-blue-700">{completedExams.length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Average Score</p>
                    <p className="text-2xl font-bold text-green-700">85%</p>
                  </div>
                  <BarChart2 className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Exams</h2>
              <div className="space-y-4">
                {scheduledExams
                  .filter(exam => exam.status === 'upcoming')
                  .slice(0, 3)
                  .map(exam => (
                    <div key={exam.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                      <div className={`p-2 mt-1 rounded-lg ${
                        exam.type === 'TOEFL' ? 'bg-purple-100' : 'bg-emerald-100'
                      }`}>
                        {exam.type === 'TOEFL' ? (
                          <GraduationCap className="w-4 h-4 text-purple-600" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{exam.title}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(exam.date), 'MMM d, yyyy')} at {exam.time}
                        </p>
                        <p className="text-xs text-gray-500">
                          {exam.duration} minutes • {exam.salon}
                        </p>
                      </div>
                    </div>
                  ))}
                {scheduledExams.filter(exam => exam.status === 'upcoming').length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No upcoming exams</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="lg:col-span-3 h-full">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 h-full">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Calendar</h2>
              <div className="h-[30rem]">
                {/* Custom Calendar Rendering */}
                <div className="bg-white rounded-lg border border-gray-200 h-full overflow-auto">
                  <div className="grid grid-cols-7 text-center border-b">
                    <div className="py-2 font-medium text-gray-500 border-r">Sun</div>
                    <div className="py-2 font-medium text-gray-500 border-r">Mon</div>
                    <div className="py-2 font-medium text-gray-500 border-r">Tue</div>
                    <div className="py-2 font-medium text-gray-500 border-r">Wed</div>
                    <div className="py-2 font-medium text-gray-500 border-r">Thu</div>
                    <div className="py-2 font-medium text-gray-500 border-r">Fri</div>
                    <div className="py-2 font-medium text-gray-500">Sat</div>
                  </div>
                  
                  <div className="grid grid-cols-7 grid-rows-5 h-[calc(100%-2.5rem)]">
                    {/* Generate the exact days shown in the screenshot - starting with Jan 29 */}
                    {[
                      29, 30, 31, 1, 2, 3, 4,       // First week (Jan 29-31, Feb 1-4)
                      5, 6, 7, 8, 9, 10, 11,        // Second week
                      12, 13, 14, 15, 16, 17, 18,   // Third week
                      19, 20, 21, 22, 23, 24, 25,   // Fourth week
                      26, 27, 28, 1, 2, 3, 4        // Fifth week (Feb 26-28, Mar 1-4)
                    ].map((dayNumber, index) => {
                      // Determine month (0-based in JS)
                      let month = 1; // February
                      let year = 2025;
                      
                      if (dayNumber > 28 && index < 3) {
                        month = 0; // January for first 3 days
                      } else if (dayNumber < 10 && index > 27) {
                        month = 2; // March for last few days
                      }
                      
                      const day = new Date(year, month, dayNumber);
                      const isToday = day.getDate() === new Date().getDate() && 
                                    day.getMonth() === new Date().getMonth() && 
                                    day.getFullYear() === new Date().getFullYear();
                      
                      // Find exams for this day from scheduledExams data
                      const dayExams = scheduledExams.filter(exam => {
                        // Parse the exam date and ensure proper time zone handling
                        const examDateStr = exam.date; // '2025-02-25'
                        
                        // Create a date object that ignores time zones by using parts directly
                        const [examYear, examMonth, examDay] = examDateStr.split('-').map(Number);
                        
                        // Match with the current day in the calendar
                        return examDay === dayNumber && 
                               (examMonth - 1) === month && // JS months are 0-based
                               examYear === year;
                      });
                      
                      // Highlight day 25 to match the screenshot (but now with real data)
                      const isHighlighted = dayNumber === 25 && month === 1;
                      
                      return (
                        <div 
                          key={index} 
                          className={`border-r border-b relative p-1 ${
                            isToday ? 'bg-blue-50' : ''
                          } hover:bg-gray-50`}
                        >
                          <div className="flex justify-between">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm ${
                              isHighlighted ? 'bg-blue-500 text-white' : 
                              isToday ? 'bg-blue-500 text-white' : ''
                            }`}>
                              {dayNumber}
                            </span>
                            {dayExams.length > 0 && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-1 rounded">
                                {dayExams.length}
                              </span>
                            )}
                          </div>
                          
                          {/* Event list - using real scheduled exams */}
                          <div className="mt-1">
                            {dayExams.slice(0, 2).map((exam, idx) => (
                              <div 
                                key={idx}
                                className={`text-xs p-1 mb-1 rounded truncate ${
                                  exam.type === 'TOEFL' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                                title={`${exam.title} - ${exam.time}`}
                              >
                                {exam.time.slice(0, 5)} - {exam.title}
                              </div>
                            ))}
                            {dayExams.length > 2 && (
                              <div className="text-xs text-gray-500 pl-1">
                                +{dayExams.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exams Section */}
        <div className="mt-8 space-y-6">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFilterView('all')}
                className={`px-4 py-2 rounded-lg ${
                  filterView === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Exams
              </button>
              <button
                onClick={() => setFilterView('upcoming')}
                className={`px-4 py-2 rounded-lg ${
                  filterView === 'upcoming' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilterView('available')}
                className={`px-4 py-2 rounded-lg ${
                  filterView === 'available' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Available Now
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Filter className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Exams List */}
          <div className="space-y-4">
            {filteredExams.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <p className="text-gray-500">No exams found matching your criteria</p>
              </div>
            ) : (
              filteredExams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        exam.type === 'TOEFL' 
                          ? 'bg-purple-100' 
                          : 'bg-emerald-100'
                      }`}>
                        {exam.type === 'TOEFL' ? (
                          <Tag className="w-6 h-6 text-purple-600" />
                        ) : (
                          <BookOpen className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                        <p className="text-sm text-gray-500">
                          {exam.type === 'TOEFL' ? 'TOEFL Exam' : `${exam.carrera} - Group ${exam.grupo}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        exam.status === 'ongoing'
                          ? 'bg-green-100 text-green-700'
                          : exam.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {exam.status === 'ongoing' ? 'Available Now' : 
                         exam.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                      </div>
                      {exam.status === 'ongoing' && (
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          Start Exam
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {format(new Date(exam.date + 'T' + exam.time), 'PPP')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {exam.duration} minutes
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      {exam.profesor}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}