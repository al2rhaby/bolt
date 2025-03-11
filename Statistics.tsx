import React, { useState } from 'react';
import { ArrowLeft, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { calculateTOEFLScores, formatScoreDisplay } from '../utils/scoreCalculator';

interface Student {
  id: number;
  name: string;
  matricula: string;
  salon: string;
  scores: {
    listening: number;
    structure: number;
    reading: number;
  };
  finalScore: number;
}

interface ClassInfo {
  carrera: string;
  semestre: string;
  grupo: string;
  profesor: string;
}

interface SalonGroup {
  [key: string]: {
    students: Student[];
    classInfo: ClassInfo;
  };
}

export default function Statistics() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<SalonGroup>({});
  const [expandedSalon, setExpandedSalon] = useState<string | null>(null);

  const downloadExcel = (salon: string) => {
    const salonData = students[salon];
    
    // Create worksheet data with headers
    const wsData = [
      ['Carrera:', salonData.classInfo.carrera],
      ['Semestre:', salonData.classInfo.semestre],
      ['Grupo:', salonData.classInfo.grupo],
      ['Profesor:', salonData.classInfo.profesor],
      [], // Empty row for spacing
      ['Matricula', 'Nombre', 'Raw Scores', '', '', 'Converted Scores', '', '', 'TOEFL', 'Final'],
      ['', '', 'Listening', 'Structure', 'Reading', 'Listening', 'Structure', 'Reading', 'Average', 'Score']
    ];

    // Add student data
    salonData.students.forEach(student => {
      const scores = calculateTOEFLScores(student.scores);
      wsData.push([
        student.matricula,
        student.name,
        student.scores.listening,
        student.scores.structure,
        student.scores.reading,
        scores.scores.listening.converted,
        scores.scores.structure.converted,
        scores.scores.reading.converted,
        scores.average.toFixed(2),
        scores.finalScore
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Salon ${salon}`);
    XLSX.writeFile(wb, `TOEFL_Scores_${salon}.xlsx`);
  };

  const downloadPDF = (salon: string) => {
    const doc = new jsPDF();
    const salonData = students[salon];
    
    // Add title
    doc.setFontSize(18);
    doc.text(`TOEFL Scores - Salon ${salon}`, 14, 20);
    
    // Add class info
    doc.setFontSize(12);
    doc.text(`Carrera: ${salonData.classInfo.carrera}`, 14, 35);
    doc.text(`Semestre: ${salonData.classInfo.semestre}`, 14, 45);
    doc.text(`Grupo: ${salonData.classInfo.grupo}`, 14, 55);
    doc.text(`Profesor: ${salonData.classInfo.profesor}`, 14, 65);

    // Prepare table data
    const tableData = salonData.students.map(student => {
      const scores = calculateTOEFLScores(student.scores);
      return [
        student.matricula,
        student.name,
        student.scores.listening,
        student.scores.structure,
        student.scores.reading,
        scores.scores.listening.converted,
        scores.scores.structure.converted,
        scores.scores.reading.converted,
        scores.average.toFixed(2),
        scores.finalScore
      ];
    });

    doc.autoTable({
      startY: 75,
      head: [[
        'Matricula',
        'Nombre',
        'List.',
        'Str.',
        'Read.',
        'List.',
        'Str.',
        'Read.',
        'Avg.',
        'TOEFL'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255]
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 15 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
        7: { cellWidth: 15 },
        8: { cellWidth: 15 },
        9: { cellWidth: 20 }
      }
    });
    
    doc.save(`TOEFL_Scores_${salon}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Statistics</h1>
              <p className="text-sm text-gray-500">View and manage student scores</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {Object.keys(students).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <ChevronDown className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-500">
              Student exam results will appear here once they complete their tests.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(students).map(([salon, { students: salonStudents, classInfo }]) => (
              <div key={salon} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Salon {salon}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {salonStudents.length} students
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => downloadExcel(salon)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Excel
                      </button>
                      <button
                        onClick={() => downloadPDF(salon)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Carrera:</span>
                        <span className="ml-2 text-gray-900">{classInfo.carrera}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Semestre:</span>
                        <span className="ml-2 text-gray-900">{classInfo.semestre}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Grupo:</span>
                        <span className="ml-2 text-gray-900">{classInfo.grupo}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Profesor:</span>
                        <span className="ml-2 text-gray-900">{classInfo.profesor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedSalon(expandedSalon === salon ? null : salon)}
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Student Scores
                    </h2>
                  </div>
                  <div>
                    {expandedSalon === salon ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedSalon === salon && (
                  <div className="border-t border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Matricula
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Listening
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Structure
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reading
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            TOEFL Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {salonStudents.map((student) => {
                          const scores = calculateTOEFLScores(student.scores);
                          return (
                            <tr key={student.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {student.matricula}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatScoreDisplay(student.scores.listening, scores.scores.listening.converted)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatScoreDisplay(student.scores.structure, scores.scores.structure.converted)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatScoreDisplay(student.scores.reading, scores.scores.reading.converted)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {scores.finalScore}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}