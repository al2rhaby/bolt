import React from 'react';
import { sectionConfig } from '../utils/sectionConfig';
import { SectionType } from '../types';

interface SectionSelectorProps {
  completedSections: string[];
  onSelectSection: (sectionId: SectionType) => void;
  sectionTimers: Record<string, number>;
}

/**
 * Grid of section cards to choose from
 */
const SectionSelector: React.FC<SectionSelectorProps> = ({
  completedSections,
  onSelectSection,
  sectionTimers
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {sectionConfig.map((section) => (
        <div
          key={section.id}
          className={`${section.bgColor} rounded-xl border ${section.borderColor} p-8 
            ${section.boxShadow} ${section.hoverEffect}
            ${completedSections.includes(section.id) 
              ? 'opacity-70 cursor-not-allowed' 
              : 'cursor-pointer transform hover:scale-105 transition-all duration-300'
            }`}
          onClick={() => !completedSections.includes(section.id) && onSelectSection(section.id as SectionType)}
        >
          <div className={`${section.iconBgColor} w-16 h-16 rounded-2xl flex items-center justify-center mb-6`}>
            {section.icon}
          </div>
          <h2 className={`text-xl font-bold ${section.textColor} mb-2`}>{section.title}</h2>
          <p className={`${section.descriptionColor} mb-6`}>{section.description}</p>
          
          <div className="flex items-center justify-between">
            <span className={`${section.textColor} text-sm`}>Section Duration</span>
            <span className={`font-medium ${section.textColor}`}>
              {sectionTimers[section.id] || 35} minutes
            </span>
          </div>

          {completedSections.includes(section.id) && (
            <div className="mt-4 py-2 px-4 bg-white/20 backdrop-blur-sm text-white rounded-lg text-center">
              Section Completed
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SectionSelector;
