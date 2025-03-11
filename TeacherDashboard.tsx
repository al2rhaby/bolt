import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LogOut,
  GraduationCap,
  Users,
  Calendar,
  Book,
  ArrowRight,
  BarChart2
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { checkTeacherSession, clearTeacherSession } from '../lib/supabase';

interface Action {
  label: string;
  href: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface Section {
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  actions: Action[];
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  href: string;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    if (!checkTeacherSession()) {
      navigate('/teacher-login');
    }
  }, [navigate]);

  const handleLogout = () => {
    clearTeacherSession();
    navigate('/teacher-login');
  };

  const handleNavigation = (path: string) => {
    if (checkTeacherSession()) {
      navigate(path);
      // Clear any stale state when navigating from dashboard
      localStorage.removeItem('currentTOEFLTestId');
      localStorage.removeItem('currentUnitTestId');
    } else {
      navigate('/teacher-login');
    }
  };

  const mainSections: Section[] = [
    {
      title: 'TOEFL Exam Management',
      description: 'Create and manage TOEFL examinations',
      icon: <GraduationCap className="w-6 h-6 text-purple-600" />,
      bgColor: 'bg-purple-100',
      actions: [
        {
          label: 'Manage Exam',
          href: '/toefl-exam',
          onClick: () => handleNavigation('/toefl-exam'),
          icon: <ArrowRight className="w-4 h-4" />
        },
        {
          label: 'View Statistics',
          href: '/toefl-statistics',
          onClick: () => handleNavigation('/toefl-statistics'),
          icon: <BarChart2 className="w-4 h-4" />
        }
      ]
    },
    {
      title: 'Unit Exam Management',
      description: 'Manage unit tests and assessments',
      icon: <Book className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-100',
      actions: [
        {
          label: 'Manage Tests',
          href: '/unit-exam',
          onClick: () => handleNavigation('/unit-exam'),
          icon: <ArrowRight className="w-4 h-4" />
        },
        {
          label: 'View Statistics',
          href: '/unit-statistics',
          onClick: () => handleNavigation('/unit-statistics'),
          icon: <BarChart2 className="w-4 h-4" />
        }
      ]
    }
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Exam Schedule',
      description: 'Manage examination sessions',
      icon: <Calendar className="w-6 h-6 text-green-600" />,
      bgColor: 'bg-green-100',
      href: '/exam-schedule'
    },
    {
      title: 'Student Accounts',
      description: 'Manage student access',
      icon: <Users className="w-6 h-6 text-orange-600" />,
      bgColor: 'bg-orange-100',
      href: '/student-accounts'
    }
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Teacher Portal</span>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white p-6 lg:p-8 mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome to Teacher Portal</h2>
            <p className="text-blue-100">Access and manage all examination features</p>
          </div>

          {/* Main Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {mainSections.map((section) => (
              <div key={section.title} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 ${section.bgColor} rounded-lg`}>
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {section.actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => handleNavigation(action.href)}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-200 w-full text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${action.bgColor} rounded-lg`}>
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}