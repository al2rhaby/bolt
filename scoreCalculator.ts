// src/utils/scoreCalculator.ts

/**
 * Calculates TOEFL scores based on section scores
 * 
 * @param scores - Object containing listening, structure, and reading scores
 * @returns Object with section scores and final score
 */
export function calculateTOEFLScores(scores: {
  listening: number;
  structure: number;
  reading: number;
}) {
  // Scale individual section scores to TOEFL scale (scaled to 140 pts maximum)
  const listeningScaled = Math.round((scores.listening / 50) * 140);
  const structureScaled = Math.round((scores.structure / 40) * 140);
  const readingScaled = Math.round((scores.reading / 50) * 140);
  
  // Calculate final score (scaled to 677 pts maximum according to TOEFL scale)
  // This is a simplified version - adjust the formula based on your specific needs
  const finalScore = Math.round(
    ((listeningScaled + structureScaled + readingScaled) / 420) * 677
  );
  
  return {
    scores: {
      listening: { raw: scores.listening, converted: listeningScaled },
      structure: { raw: scores.structure, converted: structureScaled },
      reading: { raw: scores.reading, converted: readingScaled }
    },
    average: (listeningScaled + structureScaled + readingScaled) / 3,
    finalScore
  };
}

/**
 * Format raw and converted scores for display
 * 
 * @param raw - Raw score value
 * @param converted - Converted score value
 * @returns Formatted score string
 */
export function formatScoreDisplay(raw: number, converted: number): string {
  return `${raw} (${converted})`;
}