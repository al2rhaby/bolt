import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { isTeacher, setTeacherSession } from '../lib/supabase';

export default function TeacherLogin() {
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
      // Check teacher credentials
      const isValidTeacher = isTeacher(credentials.email, credentials.password);

      if (isValidTeacher) {
        // Set teacher session
        setTeacherSession();
        // Explicitly redirect to dashboard
        navigate('/dashboard', { replace: true });
        return;
      }

      setError('Invalid teacher credentials');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-orange-400">
      <header className="py-4 px-4 lg:px-6 flex items-center justify-between bg-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 text-white">
          <BookOpen className="w-6 h-6" />
          <h1 className="text-xl font-semibold hidden sm:block">English Exam System</h1>
          <h1 className="text-xl font-semibold sm:hidden">EES</h1>
        </div>
        <Link to="/" className="text-white hover:text-white/80 transition-colors">
          Home
        </Link>
      </header>

      <div className="max-w-md mx-auto px-4 py-8 lg:py-12">
        <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-purple-100 rounded-full">
              <GraduationCap className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Teacher Portal
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Sign in to manage exams and view results
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
                type="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <Link
              to="/login"
              className="block text-center text-purple-600 hover:text-purple-700 font-medium"
            >
              Student Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}