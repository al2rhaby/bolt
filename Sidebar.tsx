import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  GraduationCap,
  Users,
  Calendar,
  Book,
  LogOut,
  BookOpen,
  BarChart2
} from 'lucide-react';
import { checkTeacherSession, clearTeacherSession } from '../lib/supabase';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const sidebarLinks: SidebarLink[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="w-5 h-5" />
    },
    {
      label: 'TOEFL Exam',
      href: '/toefl-exam',
      icon: <GraduationCap className="w-5 h-5" />
    },
    {
      label: 'TOEFL Statistics',
      href: '/toefl-statistics',
      icon: <BarChart2 className="w-5 h-5" />
    },
    {
      label: 'Unit Exam',
      href: '/unit-exam',
      icon: <Book className="w-5 h-5" />
    },
    {
      label: 'Unit Statistics',
      href: '/unit-statistics',
      icon: <BarChart2 className="w-5 h-5" />
    },
    {
      label: 'Exam Schedule',
      href: '/exam-schedule',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      label: 'Student Accounts',
      href: '/student-accounts',
      icon: <Users className="w-5 h-5" />
    }
  ];

  const handleNavigation = (path: string) => {
    if (checkTeacherSession()) {
      navigate(path);
      if (window.innerWidth < 768) {
        setOpen(false);
      }
    } else {
      navigate('/teacher-login');
    }
  };

  const handleLogout = () => {
    clearTeacherSession();
    navigate('/teacher-login');
  };

  return (
    <>
      <div 
        className={`
          fixed md:static inset-y-0 left-0 z-30 
          transform md:transform-none transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          w-64 bg-white border-r flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span className="font-semibold text-gray-900">Teacher Portal</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {sidebarLinks.map((link) => (
              <li key={link.href}>
                <button
                  onClick={() => handleNavigation(link.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === link.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {React.cloneElement(link.icon, {
                    className: `w-5 h-5 ${
                      location.pathname === link.href
                        ? 'text-blue-700'
                        : 'text-gray-500'
                    }`
                  })}
                  <span className="font-medium">{link.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}