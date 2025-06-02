import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { AppSettings, WeeklyRegistration } from '../types';

// Firestore collection names
const COLLECTIONS = {
  SETTINGS: 'settings',
  REGISTRATIONS: 'registrations',
  METADATA: 'metadata'
} as const;

// Document IDs
const DOCUMENT_IDS = {
  APP_SETTINGS: 'app_settings',
  APP_METADATA: 'app_metadata'
} as const;

// Firestore data interfaces
interface FirestorePlayer {
  id: string;
  name: string;
  registeredAt: Timestamp;
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
          extraCourtFee: 100000
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
          extraCourtFee: 100000
        };
      }

      return settingsDoc.data() as AppSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw new Error('Không thể lấy cài đặt từ Firestore');
    }
  }

  /**
   * Cập nhật settings
   */
  static async updateSettings(newSettings: AppSettings): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, DOCUMENT_IDS.APP_SETTINGS), newSettings);
      await this.updateMetadata();
    } catch (error) {
      console.error('Error updating settings:', error);
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
      weekStart: firestoreReg.weekStart.toDate(),
      weekEnd: firestoreReg.weekEnd.toDate(),
      players: firestoreReg.players.map((player: any) => ({
        ...player,
        registeredAt: player.registeredAt.toDate()
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
   * Xóa registration theo ID
   */
  static async deleteRegistration(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.REGISTRATIONS, id));
      await this.updateMetadata();
    } catch (error) {
      console.error('Error deleting registration:', error);
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
        createdAt: data.createdAt.toDate().toISOString(),
        lastUpdated: data.lastUpdated.toDate().toISOString(),
        totalRegistrations: data.totalRegistrations,
        totalPlayers: data.totalPlayers
      };
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw new Error('Không thể lấy metadata từ Firestore');
    }
  }

  /**
   * Reset database (xóa tất cả dữ liệu)
   */
  static async resetDatabase(): Promise<void> {
    try {
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
        extraCourtFee: 100000
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
    } catch (error) {
      console.error('Error resetting database:', error);
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
}
