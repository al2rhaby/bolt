import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { supabase, isTeacher, setTeacherSession } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // First check if these are teacher credentials
      if (isTeacher(credentials.email, credentials.password)) {
        // Set teacher session
        setTeacherSession();
        // Navigate to dashboard
        navigate('/dashboard');
        return;
      }

      // Not teacher credentials, try student login
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (signInError) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError('No user found');
        setIsLoading(false);
        return;
      }

      // Verify this is a student account
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', credentials.email)
        .single();

      if (studentError || !studentData) {
        setError('Student account not found');
        // Sign out the user from auth since they don't have a student profile
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Student login successful - redirect to student dashboard
      navigate('/student-dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-500 to-orange-400">
      {/* Header */}
      <header className="py-4 px-4 lg:px-6 flex items-center justify-between bg-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 text-white">
          <BookOpen className="w-6 h-6" />
          <h1 className="text-xl font-semibold hidden sm:block">Multi-Exam System</h1>
          <h1 className="text-xl font-semibold sm:hidden">MES</h1>
        </div>
        <Link to="/" className="text-white hover:text-white/80 transition-colors">
          Home
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 flex flex-col lg:flex-row gap-8">
        {/* Login Form */}
        <div className="flex-1 max-w-md mx-auto lg:mx-0 w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-indigo-100 rounded-full">
                <BookOpen className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Sign in to access your exams
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="text"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <a
                  href="#"
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 max-w-md mx-auto lg:mx-0 w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 lg:p-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Available Exams</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold">TOEFL Exam</h3>
                </div>
                <p className="text-sm text-white/80 mb-4">
                  Test your English proficiency with our comprehensive TOEFL examination
                </p>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Calendar className="w-4 h-4" />
                  <span>Multiple sessions available</span>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold">Unit Exam</h3>
                </div>
                <p className="text-sm text-white/80 mb-4">
                  Regular unit assessments to track your progress
                </p>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Calendar className="w-4 h-4" />
                  <span>Check with your instructor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}