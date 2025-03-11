import React, { useState } from 'react';
import { Timer, AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface TimerSettingsProps {
  title?: string;
  duration: number;
  onDurationChange: (duration: number) => void;
  showWarning?: boolean;
  warningTime?: number;
  onWarningTimeChange?: (time: number) => void;
  useGlobalTimer?: boolean;
  globalDuration?: number;
  onGlobalDurationChange?: (duration: number) => void;
  globalWarningTime?: number;
  onGlobalWarningTimeChange?: (time: number) => void;
  onToggleGlobalTimer?: (useGlobal: boolean) => void;
}

export default function TimerSettings({
  title,
  duration,
  onDurationChange,
  showWarning = false,
  warningTime = 5,
  onWarningTimeChange,
  useGlobalTimer,
  globalDuration,
  onGlobalDurationChange,
  globalWarningTime,
  onGlobalWarningTimeChange,
  onToggleGlobalTimer
}: TimerSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">
              {title ? `${title} Timer` : 'Timer Settings'}
            </h3>
            <p className="text-sm text-gray-500">
              {useGlobalTimer !== undefined
                ? useGlobalTimer
                  ? `${globalDuration} minutes total`
                  : `${duration} minutes per question`
                : `${duration} minutes per question`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-6 border-t border-gray-200 space-y-6">
          {onToggleGlobalTimer && (
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useGlobalTimer}
                  onChange={(e) => onToggleGlobalTimer(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Use Global Timer
                </span>
              </label>
            </div>
          )}

          {useGlobalTimer ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Exam Duration (minutes)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={globalDuration}
                    onChange={(e) => onGlobalDurationChange?.(Number(e.target.value))}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <span className="text-sm text-gray-500">minutes for entire exam</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warning Time
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max={globalDuration}
                    value={globalWarningTime}
                    onChange={(e) => onGlobalWarningTimeChange?.(Number(e.target.value))}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <span className="text-sm text-gray-500">minutes before exam ends</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Duration (minutes)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={duration}
                    onChange={(e) => onDurationChange(Number(e.target.value))}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <span className="text-sm text-gray-500">minutes per question</span>
                </div>
              </div>

              {showWarning && onWarningTimeChange && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <label className="block text-sm font-medium text-gray-700">
                      Warning Time
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max={duration}
                      value={warningTime}
                      onChange={(e) => onWarningTimeChange(Number(e.target.value))}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <span className="text-sm text-gray-500">minutes before time is up</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">Timer Behavior</p>
                {useGlobalTimer ? (
                  <ul className="list-disc list-inside space-y-1 text-gray-500">
                    <li>Timer starts when the exam begins</li>
                    <li>All questions must be completed within the total time limit</li>
                    <li>A warning notification will appear {globalWarningTime} minutes before the exam ends</li>
                    <li>Exam auto-submits when time runs out</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-gray-500">
                    <li>Timer starts when the student begins the question</li>
                    <li>A warning notification will appear at the specified time</li>
                    <li>Question auto-submits when time runs out</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}