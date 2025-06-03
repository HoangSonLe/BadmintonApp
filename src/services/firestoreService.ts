import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AppSettings, WeeklyRegistration } from '../types';
import { SecurityService } from './securityService';

// Firestore collection names
const COLLECTIONS = {
  SETTINGS: 'settings',
  REGISTRATIONS: 'registrations',
  METADATA: 'metadata',
  ADMIN_LOGS: 'admin_logs',
  SECURITY_LOGS: 'security_logs',
  PASSWORD_ADMIN: 'passwordAdmin'
} as const;

// Document IDs
const DOCUMENT_IDS = {
  APP_SETTINGS: 'app_settings',
  APP_METADATA: 'app_metadata',
  PASSWORD_ADMIN: 'passwordAdmin'
} as const;

// Firestore data interfaces
interface FirestorePlayer {
  id: string;
  name: string;
  registeredAt: Timestamp;
}

export interface AdminConfig {
  passwordHash: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  version: string;
}

interface FirestoreRegistration {
  id: string;
  weekStart: Timestamp;
  weekEnd: Timestamp;
  players: FirestorePlayer[];
  settings: AppSettings;
}

interface FirestoreMetadata {
  version: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  totalRegistrations: number;
  totalPlayers: number;
}

/**
 * Firestore Service - Quản lý dữ liệu trên Cloud Firestore
 */
export class FirestoreService {

  /**
   * Hash password using SHA-256 with obfuscated salt
   */
  private static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    // Obfuscated salt - harder to identify in minified code
    const saltParts = ['badminton', 'admin', 'salt', '2024'];
    const salt = saltParts.join('_');
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Khởi tạo dữ liệu mặc định nếu chưa tồn tại
   */
  static async initializeDatabase(): Promise<void> {
    try {
      // Kiểm tra và tạo settings mặc định
      const settingsDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, DOCUMENT_IDS.APP_SETTINGS));
      if (!settingsDoc.exists()) {
        const defaultSettings: AppSettings = {
          courtsCount: 2,
          playersPerCourt: 4,
          extraCourtFee: 100000,
          registrationEnabled: true
        };
        await setDoc(doc(db, COLLECTIONS.SETTINGS, DOCUMENT_IDS.APP_SETTINGS), defaultSettings);
      }

      // Kiểm tra và tạo metadata mặc định
      const metadataDoc = await getDoc(doc(db, COLLECTIONS.METADATA, DOCUMENT_IDS.APP_METADATA));
      if (!metadataDoc.exists()) {
        const defaultMetadata: FirestoreMetadata = {
          version: '1.0.0',
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
          totalRegistrations: 0,
          totalPlayers: 0
        };
        await setDoc(doc(db, COLLECTIONS.METADATA, DOCUMENT_IDS.APP_METADATA), defaultMetadata);
      }

      // Kiểm tra và tạo admin config mặc định
      const adminConfigDoc = await getDoc(doc(db, COLLECTIONS.PASSWORD_ADMIN, DOCUMENT_IDS.PASSWORD_ADMIN));
      if (!adminConfigDoc.exists()) {
        const defaultPassword = import.meta.env.VITE_ADMIN_CODE || 'admin123';
        const defaultPasswordHash = await this.hashPassword(defaultPassword);

        const defaultAdminConfig: AdminConfig = {
          passwordHash: defaultPasswordHash,
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
          version: '1.0.0'
        };
        await setDoc(doc(db, COLLECTIONS.PASSWORD_ADMIN, DOCUMENT_IDS.PASSWORD_ADMIN), defaultAdminConfig);
      }

      // Run migration to remove password fields from existing documents
      await this.migrateRemovePasswordField();
    } catch (error) {
      console.error('Error initializing Firestore database:', error);
      throw new Error('Không thể khởi tạo database Firestore');
    }
  }

  /**
   * Lấy settings
   */
  static async getSettings(): Promise<AppSettings> {
    try {
      const settingsDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, DOCUMENT_IDS.APP_SETTINGS));
      
      if (!settingsDoc.exists()) {
        await this.initializeDatabase();
        return {
          courtsCount: 2,
          playersPerCourt: 4,
          extraCourtFee: 100000,
          registrationEnabled: true
        };
      }

      return settingsDoc.data() as AppSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw new Error('Không thể lấy cài đặt từ Firestore');
    }
  }

  /**
   * Cập nhật settings (Admin only)
   */
  static async updateSettings(newSettings: AppSettings): Promise<void> {
    // Validate admin permission
    SecurityService.validateAdminAction('UPDATE_SETTINGS');

    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, DOCUMENT_IDS.APP_SETTINGS), newSettings);
      await this.updateMetadata();

      SecurityService.logAdminAction('SETTINGS_UPDATED', {
        newSettings,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      SecurityService.logAdminAction('SETTINGS_UPDATE_FAILED', {
        error: (error as Error).message,
        newSettings
      });
      throw new Error('Không thể cập nhật cài đặt trong Firestore');
    }
  }

  /**
   * Chuyển đổi Date thành Timestamp cho Firestore
   */
  private static convertToFirestoreRegistration(registration: WeeklyRegistration): FirestoreRegistration {
    return {
      ...registration,
      weekStart: Timestamp.fromDate(registration.weekStart),
      weekEnd: Timestamp.fromDate(registration.weekEnd),
      players: registration.players.map(player => ({
        ...player,
        registeredAt: Timestamp.fromDate(player.registeredAt)
      }))
    };
  }

  /**
   * Chuyển đổi Timestamp thành Date từ Firestore
   */
  private static convertFromFirestoreRegistration(firestoreReg: any): WeeklyRegistration {
    return {
      ...firestoreReg,
      weekStart: firestoreReg.weekStart && firestoreReg.weekStart.toDate ?
        firestoreReg.weekStart.toDate() :
        new Date(),
      weekEnd: firestoreReg.weekEnd && firestoreReg.weekEnd.toDate ?
        firestoreReg.weekEnd.toDate() :
        new Date(),
      players: firestoreReg.players.map((player: any) => ({
        ...player,
        registeredAt: player.registeredAt && player.registeredAt.toDate ?
          player.registeredAt.toDate() :
          new Date()
      }))
    };
  }

  /**
   * Lấy tất cả registrations
   */
  static async getRegistrations(): Promise<WeeklyRegistration[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.REGISTRATIONS),
        orderBy('weekStart', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const registrations: WeeklyRegistration[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        registrations.push(this.convertFromFirestoreRegistration(data));
      });

      return registrations;
    } catch (error) {
      console.error('Error getting registrations:', error);
      throw new Error('Không thể lấy danh sách đăng ký từ Firestore');
    }
  }

  /**
   * Thêm registration mới
   */
  static async addRegistration(registration: WeeklyRegistration): Promise<void> {
    try {
      const firestoreReg = this.convertToFirestoreRegistration(registration);
      await setDoc(doc(db, COLLECTIONS.REGISTRATIONS, registration.id), firestoreReg);
      await this.updateMetadata();
    } catch (error) {
      console.error('Error adding registration:', error);
      throw new Error('Không thể thêm đăng ký vào Firestore');
    }
  }

  /**
   * Cập nhật registration theo ID
   */
  static async updateRegistration(id: string, updatedRegistration: WeeklyRegistration): Promise<void> {
    try {
      const firestoreReg = this.convertToFirestoreRegistration(updatedRegistration);
      await setDoc(doc(db, COLLECTIONS.REGISTRATIONS, id), firestoreReg);
      await this.updateMetadata();
    } catch (error) {
      console.error('Error updating registration:', error);
      throw new Error('Không thể cập nhật đăng ký trong Firestore');
    }
  }

  /**
   * Xóa registration theo ID (Admin only)
   */
  static async deleteRegistration(id: string): Promise<void> {
    // Validate admin permission
    SecurityService.validateAdminAction('DELETE_REGISTRATION');

    try {
      // Get registration data before deletion for logging
      const registrationDoc = await getDoc(doc(db, COLLECTIONS.REGISTRATIONS, id));
      const registrationData = registrationDoc.exists() ? registrationDoc.data() : null;

      await deleteDoc(doc(db, COLLECTIONS.REGISTRATIONS, id));
      await this.updateMetadata();

      SecurityService.logAdminAction('REGISTRATION_DELETED', {
        registrationId: id,
        deletedData: registrationData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting registration:', error);
      SecurityService.logAdminAction('REGISTRATION_DELETE_FAILED', {
        registrationId: id,
        error: (error as Error).message
      });
      throw new Error('Không thể xóa đăng ký từ Firestore');
    }
  }

  /**
   * Cập nhật metadata
   */
  private static async updateMetadata(): Promise<void> {
    try {
      const registrations = await this.getRegistrations();
      const totalPlayers = registrations.reduce((total, reg) => total + reg.players.length, 0);

      const metadata: FirestoreMetadata = {
        version: '1.0.0',
        createdAt: Timestamp.now(), // Sẽ được ghi đè nếu đã tồn tại
        lastUpdated: Timestamp.now(),
        totalRegistrations: registrations.length,
        totalPlayers
      };

      // Giữ nguyên createdAt nếu đã tồn tại
      const existingMetadata = await getDoc(doc(db, COLLECTIONS.METADATA, DOCUMENT_IDS.APP_METADATA));
      if (existingMetadata.exists()) {
        metadata.createdAt = existingMetadata.data().createdAt;
      }

      await setDoc(doc(db, COLLECTIONS.METADATA, DOCUMENT_IDS.APP_METADATA), metadata);
    } catch (error) {
      console.error('Error updating metadata:', error);
      // Không throw error vì đây là operation phụ
    }
  }

  /**
   * Lấy metadata
   */
  static async getMetadata(): Promise<any> {
    try {
      const metadataDoc = await getDoc(doc(db, COLLECTIONS.METADATA, DOCUMENT_IDS.APP_METADATA));
      
      if (!metadataDoc.exists()) {
        await this.initializeDatabase();
        return {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          totalRegistrations: 0,
          totalPlayers: 0
        };
      }

      const data = metadataDoc.data() as FirestoreMetadata;
      return {
        version: data.version,
        createdAt: data.createdAt && data.createdAt.toDate ?
          data.createdAt.toDate().toISOString() :
          new Date().toISOString(),
        lastUpdated: data.lastUpdated && data.lastUpdated.toDate ?
          data.lastUpdated.toDate().toISOString() :
          new Date().toISOString(),
        totalRegistrations: data.totalRegistrations,
        totalPlayers: data.totalPlayers
      };
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw new Error('Không thể lấy metadata từ Firestore');
    }
  }

  /**
   * Reset database (xóa tất cả dữ liệu) - Admin only
   */
  static async resetDatabase(): Promise<void> {
    // Validate admin permission
    SecurityService.validateAdminAction('RESET_DATABASE');

    try {
      // Get current data for logging before deletion
      const currentRegistrations = await this.getRegistrations();
      const currentSettings = await this.getSettings();

      const batch = writeBatch(db);

      // Xóa tất cả registrations
      const registrationsSnapshot = await getDocs(collection(db, COLLECTIONS.REGISTRATIONS));
      registrationsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Reset settings về mặc định
      const defaultSettings: AppSettings = {
        courtsCount: 2,
        playersPerCourt: 4,
        extraCourtFee: 100000,
        registrationEnabled: true
      };
      batch.set(doc(db, COLLECTIONS.SETTINGS, DOCUMENT_IDS.APP_SETTINGS), defaultSettings);

      // Reset metadata
      const defaultMetadata: FirestoreMetadata = {
        version: '1.0.0',
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        totalRegistrations: 0,
        totalPlayers: 0
      };
      batch.set(doc(db, COLLECTIONS.METADATA, DOCUMENT_IDS.APP_METADATA), defaultMetadata);

      await batch.commit();

      SecurityService.logAdminAction('DATABASE_RESET', {
        previousData: {
          registrationsCount: currentRegistrations.length,
          totalPlayers: currentRegistrations.reduce((sum, reg) => sum + reg.players.length, 0),
          previousSettings: currentSettings
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error resetting database:', error);
      SecurityService.logAdminAction('DATABASE_RESET_FAILED', {
        error: (error as Error).message
      });
      throw new Error('Không thể reset database Firestore');
    }
  }

  /**
   * Lấy thống kê database
   */
  static async getStats(): Promise<any> {
    try {
      const metadata = await this.getMetadata();
      const registrations = await this.getRegistrations();

      return {
        totalRegistrations: registrations.length,
        totalPlayers: registrations.reduce((total, reg) => total + reg.players.length, 0),
        lastUpdated: metadata.lastUpdated,
        databaseSize: JSON.stringify({ registrations, metadata }).length // Ước tính
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw new Error('Không thể lấy thống kê từ Firestore');
    }
  }

  /**
   * Lưu admin log lên Firebase
   */
  static async saveAdminLog(logData: {
    action: string;
    details?: Record<string, unknown>;
    timestamp: string;
    userAgent: string;
    sessionId: string | null;
  }): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTIONS.ADMIN_LOGS), {
        ...logData,
        createdAt: Timestamp.now(),
        type: 'admin_action'
      });
    } catch (error) {
      console.error('Error saving admin log to Firebase:', error);
      // Don't throw error to prevent breaking the main functionality
    }
  }

  /**
   * Lưu security log lên Firebase
   */
  static async saveSecurityLog(logData: {
    event: string;
    details?: Record<string, unknown>;
    timestamp: string;
    userAgent: string;
    url: string;
  }): Promise<void> {
    try {
      await addDoc(collection(db, COLLECTIONS.SECURITY_LOGS), {
        ...logData,
        createdAt: Timestamp.now(),
        type: 'security_event'
      });
    } catch (error) {
      console.error('Error saving security log to Firebase:', error);
      // Don't throw error to prevent breaking the main functionality
    }
  }

  /**
   * Lấy admin logs từ Firebase
   */
  static async getAdminLogsFromFirebase(): Promise<any[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ADMIN_LOGS),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting admin logs from Firebase:', error);
      return [];
    }
  }

  /**
   * Lấy security logs từ Firebase
   */
  static async getSecurityLogsFromFirebase(): Promise<any[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.SECURITY_LOGS),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting security logs from Firebase:', error);
      return [];
    }
  }

  /**
   * Xóa tất cả logs từ Firebase (Admin only)
   */
  static async clearAllLogsFromFirebase(): Promise<void> {
    // Validate admin permission
    SecurityService.validateAdminAction('CLEAR_FIREBASE_LOGS');

    try {
      const batch = writeBatch(db);

      // Delete all admin logs
      const adminLogsSnapshot = await getDocs(collection(db, COLLECTIONS.ADMIN_LOGS));
      adminLogsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete all security logs
      const securityLogsSnapshot = await getDocs(collection(db, COLLECTIONS.SECURITY_LOGS));
      securityLogsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      SecurityService.logAdminAction('FIREBASE_LOGS_CLEARED', {
        adminLogsCount: adminLogsSnapshot.size,
        securityLogsCount: securityLogsSnapshot.size,
        clearedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error clearing logs from Firebase:', error);
      SecurityService.logAdminAction('FIREBASE_LOGS_CLEAR_FAILED', {
        error: (error as Error).message
      });
      throw new Error('Không thể xóa logs từ Firebase');
    }
  }

  /**
   * Lấy admin configuration từ Firebase
   */
  static async getAdminConfig(): Promise<AdminConfig> {
    try {
      const adminConfigDoc = await getDoc(doc(db, COLLECTIONS.PASSWORD_ADMIN, DOCUMENT_IDS.PASSWORD_ADMIN));

      if (!adminConfigDoc.exists()) {
        // Tạo config mặc định nếu chưa tồn tại
        await this.initializeDatabase();
        const defaultPassword = import.meta.env.VITE_ADMIN_CODE || 'admin123';
        const defaultPasswordHash = await this.hashPassword(defaultPassword);

        const defaultConfig: AdminConfig = {
          passwordHash: defaultPasswordHash,
          createdAt: Timestamp.now(),
          lastUpdated: Timestamp.now(),
          version: '1.0.0'
        };

        // Lưu config mặc định vào Firebase
        await setDoc(doc(db, COLLECTIONS.PASSWORD_ADMIN, DOCUMENT_IDS.PASSWORD_ADMIN), defaultConfig);
        return defaultConfig;
      }

      const data = adminConfigDoc.data() as AdminConfig;

      // Đảm bảo các trường timestamp tồn tại
      if (!data.createdAt || !data.lastUpdated) {
        const now = Timestamp.now();
        const updatedData: AdminConfig = {
          ...data,
          createdAt: data.createdAt || now,
          lastUpdated: data.lastUpdated || now
        };

        // Cập nhật document với các trường bị thiếu
        await setDoc(doc(db, COLLECTIONS.PASSWORD_ADMIN, DOCUMENT_IDS.PASSWORD_ADMIN), updatedData);
        return updatedData;
      }

      return data;
    } catch (error) {
      console.error('Error getting admin config:', error);
      throw new Error('Không thể lấy cấu hình admin từ Firestore');
    }
  }

  /**
   * Cập nhật admin configuration (Admin only)
   */
  static async updateAdminConfig(newConfig: Partial<AdminConfig>): Promise<void> {
    // Validate admin permission
    SecurityService.validateAdminAction('UPDATE_ADMIN_CONFIG');

    try {
      const currentConfig = await this.getAdminConfig();
      const updatedConfig: AdminConfig = {
        ...currentConfig,
        ...newConfig,
        lastUpdated: Timestamp.now()
      };

      await setDoc(doc(db, COLLECTIONS.PASSWORD_ADMIN, DOCUMENT_IDS.PASSWORD_ADMIN), updatedConfig);

      SecurityService.logAdminAction('ADMIN_CONFIG_UPDATED', {
        updatedFields: Object.keys(newConfig),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating admin config:', error);
      SecurityService.logAdminAction('ADMIN_CONFIG_UPDATE_FAILED', {
        error: (error as Error).message,
        newConfig
      });
      throw new Error('Không thể cập nhật cấu hình admin trong Firestore');
    }
  }

  /**
   * Lấy admin password từ Firebase (deprecated - chỉ dùng cho fallback)
   */
  static async getAdminPassword(): Promise<string> {
    try {
      // Không còn lưu password trong Firebase, chỉ fallback to environment variable
      console.warn('getAdminPassword is deprecated - plain text passwords are no longer stored in Firebase');
      return import.meta.env.VITE_ADMIN_CODE || 'admin123';
    } catch (error) {
      console.error('Error getting admin password:', error);
      // Fallback to environment variable if Firebase fails
      return import.meta.env.VITE_ADMIN_CODE || 'admin123';
    }
  }

  /**
   * Lấy admin password hash từ Firebase
   */
  static async getAdminPasswordHash(): Promise<string> {
    try {
      const adminConfig = await this.getAdminConfig();
      return adminConfig.passwordHash;
    } catch (error) {
      console.error('Error getting admin password hash:', error);
      // Fallback to hashing environment variable if Firebase fails
      const fallbackPassword = import.meta.env.VITE_ADMIN_CODE || 'admin123';
      return await this.hashPassword(fallbackPassword);
    }
  }

  /**
   * Cập nhật admin password (Admin only)
   */
  static async updateAdminPassword(newPassword: string): Promise<void> {
    // Validate admin permission
    SecurityService.validateAdminAction('UPDATE_ADMIN_PASSWORD');

    try {
      const newPasswordHash = await this.hashPassword(newPassword);
      await this.updateAdminConfig({
        passwordHash: newPasswordHash
      });

      SecurityService.logAdminAction('ADMIN_PASSWORD_UPDATED', {
        timestamp: new Date().toISOString(),
        passwordLength: newPassword.length
      });
    } catch (error) {
      console.error('Error updating admin password:', error);
      throw new Error('Không thể cập nhật mật khẩu admin');
    }
  }

  /**
   * Migration function: Remove password field from existing admin config documents
   */
  static async migrateRemovePasswordField(): Promise<void> {
    try {
      const adminConfigDoc = await getDoc(doc(db, COLLECTIONS.PASSWORD_ADMIN, DOCUMENT_IDS.PASSWORD_ADMIN));

      if (adminConfigDoc.exists()) {
        const data = adminConfigDoc.data();

        // Check if password field exists
        if (data && 'password' in data) {
          console.log('🔄 Migrating admin config: removing password field...');

          // Create new config without password field
          const migratedConfig: AdminConfig = {
            passwordHash: data.passwordHash || await this.hashPassword(data.password || 'admin123'),
            createdAt: data.createdAt || Timestamp.now(),
            lastUpdated: Timestamp.now(),
            version: data.version || '1.0.0'
          };

          // Update document with migrated config
          await setDoc(doc(db, COLLECTIONS.PASSWORD_ADMIN, DOCUMENT_IDS.PASSWORD_ADMIN), migratedConfig);

          console.log('✅ Admin config migration completed: password field removed');

          SecurityService.logAdminAction('ADMIN_CONFIG_MIGRATED', {
            action: 'REMOVE_PASSWORD_FIELD',
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('✅ Admin config already migrated: no password field found');
        }
      }
    } catch (error) {
      console.error('Error migrating admin config:', error);
      throw new Error('Không thể migration cấu hình admin');
    }
  }
}
