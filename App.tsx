import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Component Imports
import Home from './components/Home';
import Register from './components/Register';
import Login from './components/Login';
import TeacherLogin from './components/TeacherLogin';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import StudentExam from './components/StudentExam';
import ToeflStudentExam from './components/ToeflStudentExam'; // Updated import path
import ToeflExam from './components/ToeflExam';
import ListeningQuestions from './components/ListeningQuestions';
import StructureQuestions from './components/StructureQuestions';
import ReadingPassages from './components/ReadingPassages';
import UnitExam from './components/UnitExam';
import CreateUnitTest from './components/CreateUnitTest';
import ExamScheduler from './components/ExamScheduler'; // This import stays the same
import StudentAccounts from './components/StudentAccounts';
import Statistics from './components/Statistics';
import ToeflStatistics from './components/Statistics/ToeflStatistics';
import UnitStatistics from './components/Statistics/UnitStatistics';

// Authentication Import
import { supabase, checkTeacherSession } from './lib/supabase';

// Protected Route Component for Teacher Access
const TeacherRoute = ({ children }: { children: React.ReactNode }) => {
  if (!checkTeacherSession()) {
    return <Navigate to="/teacher-login" replace />;
  }
  return <>{children}</>;
};

// Protected Route Component for Student Access
const StudentRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />

        {/* Student Routes */}
        <Route path="/student-dashboard" element={<StudentRoute><StudentDashboard /></StudentRoute>} />
        <Route path="/student-exam" element={<StudentRoute><StudentExam /></StudentRoute>} />
        <Route path="/toefl-student-exam" element={<StudentRoute><ToeflStudentExam /></StudentRoute>} />

        {/* Protected Teacher Routes */}
        <Route path="/dashboard" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />

        {/* TOEFL Management Routes */}
        <Route path="/toefl-exam" element={<TeacherRoute><ToeflExam /></TeacherRoute>} />
        <Route path="/toefl-statistics" element={<TeacherRoute><ToeflStatistics /></TeacherRoute>} />
        <Route path="/listening-questions" element={<TeacherRoute><ListeningQuestions /></TeacherRoute>} />
        <Route path="/structure-questions" element={<TeacherRoute><StructureQuestions /></TeacherRoute>} />
        <Route path="/reading-passages" element={<TeacherRoute><ReadingPassages /></TeacherRoute>} />

        {/* Unit Exam Management Routes */}
        <Route path="/unit-exam" element={<TeacherRoute><UnitExam /></TeacherRoute>} />
        <Route path="/unit-statistics" element={<TeacherRoute><UnitStatistics /></TeacherRoute>} />
        <Route path="/create-unit-test" element={<TeacherRoute><CreateUnitTest /></TeacherRoute>} />

        {/* Administrative Routes */}
        <Route path="/exam-schedule" element={<TeacherRoute><ExamScheduler /></TeacherRoute>} />
        <Route path="/statistics" element={<TeacherRoute><Statistics /></TeacherRoute>} />
        <Route path="/student-accounts" element={<TeacherRoute><StudentAccounts /></TeacherRoute>} />

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;