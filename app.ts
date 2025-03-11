import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import TeacherLogin from './pages/TeacherLogin';
import StudentLogin from './pages/StudentLogin';
import StudentDashboard from './pages/StudentDashboard';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import StudentExam from './pages/StudentExam';
import UnitExam from './pages/UnitExam';
import ExamScheduler from './pages/ExamScheduler';
import StudentAccounts from './pages/StudentAccounts';
import CreateUnitTest from './pages/CreateUnitTest';
import { checkTeacherSession } from './lib/supabase';

// Note: The ToeflStudentExam import is not present in this file, so no changes are needed

// Protected Route component for teacher routes
const TeacherRoute = ({ children }: { children: React.ReactNode }) => {
  if (!checkTeacherSession()) {
    return <Navigate to="/teacher-login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<StudentLogin />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Student Routes */}
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/student-exam" element={<StudentExam />} />

        {/* Protected Teacher Routes */}
        <Route path="/dashboard" element={
          <TeacherRoute>
            <Dashboard />
          </TeacherRoute>
        } />
        <Route path="/unit-exam" element={
          <TeacherRoute>
            <UnitExam />
          </TeacherRoute>
        } />
        <Route path="/exam-schedule" element={
          <TeacherRoute>
            <ExamScheduler />
          </TeacherRoute>
        } />
        <Route path="/student-accounts" element={
          <TeacherRoute>
            <StudentAccounts />
          </TeacherRoute>
        } />
        <Route path="/create-unit-test" element={
          <TeacherRoute>
            <CreateUnitTest />
          </TeacherRoute>
        } />
      </Routes>
    </Router>
  );
}