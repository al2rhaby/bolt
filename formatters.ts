/**
 * Format time in seconds to a readable format (HH:MM:SS)
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Get the appropriate timer color based on time remaining
 */
export const getTimerColor = (seconds: number): string => {
  return seconds <= 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
};

/**
 * Format date for Mexico City timezone (UTC-6)
 */
export const getMexicoCityDate = (): string => {
  const now = new Date();
  
  // Convert to Mexico City time (UTC-6)
  const mexicoTimeOptions = { timeZone: 'America/Mexico_City' };
  
  // Get date components in Mexico City timezone
  const year = now.toLocaleString('en-US', { ...mexicoTimeOptions, year: 'numeric' });
  const month = now.toLocaleString('en-US', { ...mexicoTimeOptions, month: '2-digit' });
  const day = now.toLocaleString('en-US', { ...mexicoTimeOptions, day: '2-digit' });
  
  // Format as YYYY-MM-DD for HTML inputs
  return `${year}-${month}-${day}`;
};

/**
 * Format time for Mexico City timezone (UTC-6)
 */
export const getMexicoCityTime = (): string => {
  const now = new Date();
  
  // Get time in Mexico City
  const mexicoTimeOptions = { timeZone: 'America/Mexico_City', hour12: false };
  const timeString = now.toLocaleString('en-US', {
    ...mexicoTimeOptions,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Extract hours and minutes from the time string
  const timeParts = timeString.split(':');
  return `${timeParts[0]}:${timeParts[1]}:${timeParts[2]}`;
};
