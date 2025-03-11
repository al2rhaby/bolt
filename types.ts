// Types for the TOEFL Student Exam

export interface Question {
  id: string;
  text: string;
  type: string;
  choices?: string[];
  leftItems?: string[];
  rightItems?: string[];
  isTrue?: boolean;
  audio_url?: string;
  passage_title?: string;
  passage_content?: string;
  underlined_words?: any;
}

export interface Section {
  id: string;
  title: string;
  type: string;
  questions: Question[];
  audio_url?: string;
  duration?: number;
}

export interface Answer {
  questionId: string;
  answer: string;
  timestamp: string;
}

export interface SectionConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  duration: string;
  bgColor: string;
  iconBgColor: string;
  borderColor: string;
  hoverEffect: string;
  boxShadow: string;
  textColor: string;
  descriptionColor: string;
}

export interface ExamData {
  id: string;
  title: string;
  sections: Section[];
  duration: number;
}

export type SectionType = 'listening' | 'structure' | 'reading';

export interface ExamProgress {
  completedSections: string[];
  currentSection: string | null;
  answers: Answer[];
}
