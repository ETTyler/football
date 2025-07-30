// Utility functions for MatchHub

/**
 * Format time from hh:mm:ss or hh:mm format to hh:mm
 * @param timeString - Time string in various formats
 * @returns Formatted time as hh:mm
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '';
  
  // Split by colon and take only hours and minutes
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  return timeString;
} 