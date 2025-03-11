import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const floatingVariants = {
  animate: {
    y: [0, 10, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <motion.div
        className="absolute top-10 left-10 w-20 h-20 bg-blue-300 rounded-full opacity-50"
        variants={floatingVariants}
        animate="animate"
      ></motion.div>
      <motion.div
        className="absolute top-40 right-20 w-24 h-24 bg-green-300 rounded-full opacity-50"
        variants={floatingVariants}
        animate="animate"
      ></motion.div>
      <motion.div
        className="absolute bottom-20 left-32 w-16 h-16 bg-purple-300 rounded-full opacity-50"
        variants={floatingVariants}
        animate="animate"
      ></motion.div>

      {/* Teacher Portal Button */}
      <div className="absolute top-6 right-6">
        <Link 
          to="/teacher-login"
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-md"
        >
          Teacher Portal
        </Link>
      </div>
      
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-5xl font-extrabold text-gray-900">English Exam System</h1>
        <p className="text-gray-700 mt-2 text-lg">Enhance your English skills with structured practice tests</p>
      </header>
      
      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Student Login */}
        <div className="bg-white shadow-xl rounded-3xl p-8 text-center transition-transform transform hover:scale-105">
          <h2 className="text-2xl font-bold text-gray-900">Student Login</h2>
          <p className="text-gray-600 mt-2">Already registered? Access your exams here.</p>
          <ul className="text-sm text-gray-500 mt-4 space-y-2">
            <li>✅ Take practice tests</li>
            <li>✅ View your scores</li>
            <li>✅ Track your progress</li>
          </ul>
          <Link
            to="/login"
            className="mt-6 block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md"
          >
            Login Now
          </Link>
        </div>
        
        {/* New Student Registration */}
        <div className="bg-white shadow-xl rounded-3xl p-8 text-center transition-transform transform hover:scale-105">
          <h2 className="text-2xl font-bold text-gray-900">New Student Registration</h2>
          <p className="text-gray-600 mt-2">First time here? Create your account.</p>
          <ul className="text-sm text-gray-500 mt-4 space-y-2">
            <li>✅ Quick and easy registration</li>
            <li>✅ Access all exam sections</li>
            <li>✅ Start practicing immediately</li>
          </ul>
          <Link
            to="/register"
            className="mt-6 block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md"
          >
            Register Now
          </Link>
        </div>
      </div>
      
      {/* Features */}
      <div className="mt-12 grid md:grid-cols-3 gap-8 w-full max-w-4xl text-center">
        <div className="bg-white shadow-xl rounded-3xl p-8 hover:shadow-2xl transition-shadow">
          <span className="text-blue-500 text-5xl">📖</span>
          <h3 className="text-xl font-semibold mt-3">Structure</h3>
          <p className="text-gray-500 text-sm mt-2">Test your grammar and language structure knowledge</p>
        </div>
        <div className="bg-white shadow-xl rounded-3xl p-8 hover:shadow-2xl transition-shadow">
          <span className="text-green-500 text-5xl">📚</span>
          <h3 className="text-xl font-semibold mt-3">Reading</h3>
          <p className="text-gray-500 text-sm mt-2">Improve your reading comprehension skills</p>
        </div>
        <div className="bg-white shadow-xl rounded-3xl p-8 hover:shadow-2xl transition-shadow">
          <span className="text-purple-500 text-5xl">🎧</span>
          <h3 className="text-xl font-semibold mt-3">Listening</h3>
          <p className="text-gray-500 text-sm mt-2">Enhance your listening comprehension abilities</p>
        </div>
      </div>
      
      {/* Online Students Count */}
      <div className="mt-12 bg-green-200 text-green-900 px-6 py-3 rounded-lg shadow-lg text-center w-full max-w-md">
        <p className="text-lg font-semibold">🟢 Students Online: <span className="font-bold text-xl">125</span></p>
      </div>
      
      {/* Footer */}
      <footer className="mt-12 text-gray-600 text-sm">© 2025 English Exam System. All rights reserved.</footer>
    </div>
  );
}