/**
 * TOEFL Score Calculator
 * 
 * Formula:
 * 1. Convert raw scores to section scores (out of 140)
 * 2. Add the three section scores
 * 3. Divide by maximum possible (420)
 * 4. Multiply by 677 to get final TOEFL score
 */

interface SectionScore {
  raw: number;
  converted: number;
}

interface TOEFLScoreResult {
  scores: {
    listening: SectionScore;
    structure: SectionScore;
    reading: SectionScore;
  };
  totalConverted: number;
  average: number;
  finalScore: number;
}

/**
 * Calculate TOEFL scores from raw section scores
 * 
 * @param scores - Object containing listening, structure, and reading raw scores
 * @returns Object with section scores, averages and final TOEFL score
 */
export function calculateTOEFLScores(scores: {
  listening: number;
  structure: number;
  reading: number;
}): TOEFLScoreResult {
  // Ensure valid inputs (prevent negative scores)
  const listening = Math.max(0, scores.listening);
  const structure = Math.max(0, scores.structure);
  const reading = Math.max(0, scores.reading);
  
  // Convert raw scores to TOEFL section scores (scaled to 140 points per section)
  // Listening: out of 50 raw points
  // Structure: out of 40 raw points  
  // Reading: out of 50 raw points
  const listeningConverted = Math.round((listening / 50) * 140);
  const structureConverted = Math.round((structure / 40) * 140);
  const readingConverted = Math.round((reading / 50) * 140);
  
  // Calculate total converted score (max 420)
  const totalConverted = listeningConverted + structureConverted + readingConverted;
  
  // Calculate section average (max 140)
  const average = totalConverted / 3;
  
  // Calculate final TOEFL score (scaled to max 677)
  const finalScore = Math.round((totalConverted / 420) * 677);

  return {
    scores: {
      listening: {
        raw: listening,
        converted: listeningConverted
      },
      structure: {
        raw: structure,
        converted: structureConverted
      },
      reading: {
        raw: reading,
        converted: readingConverted
      }
    },
    totalConverted,
    average,
    finalScore
  };
}

/**
 * Format scores for display
 * 
 * @param raw - Raw score value
 * @param converted - Converted score value 
 * @returns Formatted string with raw and converted scores
 */
export function formatScoreDisplay(raw: number, converted: number): string {
  return `${raw} (${converted})`;
}

/**
 * Format detailed TOEFL scores for reporting
 *
 * @param scores - TOEFL score results object
 * @returns Formatted string with all score details
 */
export function formatTOEFLScoreReport(scores: TOEFLScoreResult): string {
  return `
TOEFL Score Breakdown:
---------------------
Listening: ${scores.scores.listening.converted}/140 (Raw: ${scores.scores.listening.raw}/50)
Structure: ${scores.scores.structure.converted}/140 (Raw: ${scores.scores.structure.raw}/40)
Reading: ${scores.scores.reading.converted}/140 (Raw: ${scores.scores.reading.raw}/50)
---------------------
Total Converted: ${scores.totalConverted}/420
Average: ${scores.average.toFixed(2)}/140
Final TOEFL Score: ${scores.finalScore}/677
  `.trim();
}