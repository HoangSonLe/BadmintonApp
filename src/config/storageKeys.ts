/**
 * Centralized localStorage keys configuration
 * Thay đổi các keys này để đổi tên localStorage keys trong toàn bộ ứng dụng
 */

// Prefix cho tất cả localStorage keys để tránh conflict với ứng dụng khác
const APP_PREFIX = 'badminton_v2_';

/**
 * Storage Keys Configuration
 * Thay đổi các giá trị này để đổi localStorage keys
 */
export const STORAGE_KEYS = {
  // Database key - lưu toàn bộ database JSON
  DATABASE: `${APP_PREFIX}database`,
  
  // Admin authentication keys
  ADMIN_STATUS: `${APP_PREFIX}admin_status`,
  ADMIN_AUTH_TIME: `${APP_PREFIX}admin_auth_time`,
  
  // Security logs keys
  ADMIN_LOGS: `${APP_PREFIX}admin_logs`,
  SECURITY_LOGS: `${APP_PREFIX}security_logs`,
  
  // App settings cache (nếu cần)
  SETTINGS_CACHE: `${APP_PREFIX}settings_cache`,
  
  // User preferences (nếu cần)
  USER_PREFERENCES: `${APP_PREFIX}user_prefs`,
} as const;

/**
 * Legacy keys - để migration từ keys cũ sang keys mới
 */
export const LEGACY_KEYS = {
  DATABASE: 'badminton_json_database',
  ADMIN_STATUS: 'isAdmin',
  ADMIN_AUTH_TIME: 'adminAuthTime',
  ADMIN_LOGS: 'adminLogs',
  SECURITY_LOGS: 'securityLogs',
} as const;

/**
 * Storage Service - Wrapper cho localStorage với key management
 */
export class StorageService {
  /**
   * Get item from localStorage
   */
  static getItem(key: keyof typeof STORAGE_KEYS): string | null {
    return localStorage.getItem(STORAGE_KEYS[key]);
  }

  /**
   * Set item to localStorage
   */
  static setItem(key: keyof typeof STORAGE_KEYS, value: string): void {
    localStorage.setItem(STORAGE_KEYS[key], value);
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key: keyof typeof STORAGE_KEYS): void {
    localStorage.removeItem(STORAGE_KEYS[key]);
  }

  /**
   * Clear all app-related localStorage items
   */
  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Migrate data from legacy keys to new keys
   */
  static migrateLegacyData(): void {
    console.log('🔄 Migrating localStorage keys...');
    
    // Migrate database
    const legacyDb = localStorage.getItem(LEGACY_KEYS.DATABASE);
    if (legacyDb && !localStorage.getItem(STORAGE_KEYS.DATABASE)) {
      localStorage.setItem(STORAGE_KEYS.DATABASE, legacyDb);
      localStorage.removeItem(LEGACY_KEYS.DATABASE);
      console.log('✅ Migrated database key');
    }

    // Migrate admin status
    const legacyAdminStatus = localStorage.getItem(LEGACY_KEYS.ADMIN_STATUS);
    if (legacyAdminStatus && !localStorage.getItem(STORAGE_KEYS.ADMIN_STATUS)) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_STATUS, legacyAdminStatus);
      localStorage.removeItem(LEGACY_KEYS.ADMIN_STATUS);
      console.log('✅ Migrated admin status key');
    }

    // Migrate admin auth time
    const legacyAdminAuthTime = localStorage.getItem(LEGACY_KEYS.ADMIN_AUTH_TIME);
    if (legacyAdminAuthTime && !localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH_TIME)) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH_TIME, legacyAdminAuthTime);
      localStorage.removeItem(LEGACY_KEYS.ADMIN_AUTH_TIME);
      console.log('✅ Migrated admin auth time key');
    }

    // Migrate admin logs
    const legacyAdminLogs = localStorage.getItem(LEGACY_KEYS.ADMIN_LOGS);
    if (legacyAdminLogs && !localStorage.getItem(STORAGE_KEYS.ADMIN_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_LOGS, legacyAdminLogs);
      localStorage.removeItem(LEGACY_KEYS.ADMIN_LOGS);
      console.log('✅ Migrated admin logs key');
    }

    // Migrate security logs
    const legacySecurityLogs = localStorage.getItem(LEGACY_KEYS.SECURITY_LOGS);
    if (legacySecurityLogs && !localStorage.getItem(STORAGE_KEYS.SECURITY_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.SECURITY_LOGS, legacySecurityLogs);
      localStorage.removeItem(LEGACY_KEYS.SECURITY_LOGS);
      console.log('✅ Migrated security logs key');
    }

    console.log('🎉 localStorage migration completed!');
  }

  /**
   * Get all app-related localStorage data for debugging
   */
  static getAllAppData(): Record<string, string | null> {
    const data: Record<string, string | null> = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      data[name] = localStorage.getItem(key);
    });
    return data;
  }

  /**
   * Check if legacy data exists
   */
  static hasLegacyData(): boolean {
    return Object.values(LEGACY_KEYS).some(key => localStorage.getItem(key) !== null);
  }
}
