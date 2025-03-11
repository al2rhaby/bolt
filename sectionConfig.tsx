import React from 'react';
import { Headphones, LayoutGrid, BookOpen } from 'lucide-react';
import { SectionConfig } from '../types';

// Section configuration for UI display and behavior
export const sectionConfig: SectionConfig[] = [
  {
    id: 'listening',
    title: 'Listening Questions',
    icon: <Headphones className="w-8 h-8 text-white" />,
    description: 'Audio-based comprehension assessments',
    duration: '35 minutes',
    bgColor: 'bg-gradient-to-br from-sky-400 to-blue-500',
    iconBgColor: 'bg-blue-500',
    borderColor: 'border-blue-400',
    hoverEffect: 'hover:shadow-lg hover:shadow-blue-300/50 transition-all duration-300',
    boxShadow: 'shadow-md shadow-blue-300/50',
    textColor: 'text-white',
    descriptionColor: 'text-blue-50'
  },
  {
    id: 'structure',
    title: 'Structure Questions',
    icon: <LayoutGrid className="w-8 h-8 text-white" />,
    description: 'Grammar and language structure tests',
    duration: '40 minutes',
    bgColor: 'bg-gradient-to-br from-emerald-400 to-green-500',
    iconBgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    hoverEffect: 'hover:shadow-lg hover:shadow-emerald-300/50 transition-all duration-300',
    boxShadow: 'shadow-md shadow-emerald-300/50',
    textColor: 'text-white',
    descriptionColor: 'text-emerald-50'
  },
  {
    id: 'reading',
    title: 'Reading Passages',
    icon: <BookOpen className="w-8 h-8 text-white" />,
    description: 'Comprehensive reading comprehension tests',
    duration: '40 minutes',
    bgColor: 'bg-gradient-to-br from-fuchsia-400 to-purple-500',
    iconBgColor: 'bg-purple-500',
    borderColor: 'border-purple-400',
    hoverEffect: 'hover:shadow-lg hover:shadow-purple-300/50 transition-all duration-300',
    boxShadow: 'shadow-md shadow-purple-300/50',
    textColor: 'text-white',
    descriptionColor: 'text-purple-50'
  }
];

// Helper to find a section config by ID
export const getSectionConfig = (sectionId: string): SectionConfig | undefined => {
  return sectionConfig.find(section => section.id === sectionId);
};