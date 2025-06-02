import type { AppSettings, WeeklyRegistration } from '../types';

// Interface for the complete app data structure
export interface AppData {
  settings: AppSettings;
  registrations: WeeklyRegistration[];
  exportedAt: string;
  version: string;
}

/**
 * Export app data to JSON file
 */
export const exportDataToJSON = (
  settings: AppSettings,
  registrations: WeeklyRegistration[]
): void => {
  const appData: AppData = {
    settings,
    registrations,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  const jsonString = JSON.stringify(appData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `badminton-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
};

/**
 * Auto-save data to JSON file after each registration
 */
export const autoSaveToJSON = (
  settings: AppSettings,
  registrations: WeeklyRegistration[]
): void => {
  const appData: AppData = {
    settings,
    registrations,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  const jsonString = JSON.stringify(appData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create download link with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `badminton-registration-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
};

/**
 * Import app data from JSON file
 */
export const importDataFromJSON = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const data = JSON.parse(jsonString) as AppData;
        
        // Validate data structure
        if (!data.settings || !data.registrations) {
          throw new Error('Invalid data format');
        }
        
        // Convert date strings back to Date objects
        const registrationsWithDates = data.registrations.map(reg => ({
          ...reg,
          weekStart: new Date(reg.weekStart),
          weekEnd: new Date(reg.weekEnd),
          players: reg.players.map(player => ({
            ...player,
            registeredAt: new Date(player.registeredAt)
          }))
        }));
        
        resolve({
          ...data,
          registrations: registrationsWithDates
        });
      } catch (error) {
        reject(new Error('Failed to parse JSON file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Validate JSON file before import
 */
export const validateJSONFile = (file: File): boolean => {
  // Check file type
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    return false;
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }
  
  return true;
};

/**
 * Create a backup of current data
 */
export const createBackup = (
  settings: AppSettings,
  registrations: WeeklyRegistration[]
): string => {
  const backupData: AppData = {
    settings,
    registrations,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  return JSON.stringify(backupData);
};

/**
 * Restore data from backup string
 */
export const restoreFromBackup = (backupString: string): AppData => {
  const data = JSON.parse(backupString) as AppData;
  
  // Convert date strings back to Date objects
  const registrationsWithDates = data.registrations.map(reg => ({
    ...reg,
    weekStart: new Date(reg.weekStart),
    weekEnd: new Date(reg.weekEnd),
    players: reg.players.map(player => ({
      ...player,
      registeredAt: new Date(player.registeredAt)
    }))
  }));
  
  return {
    ...data,
    registrations: registrationsWithDates
  };
};
