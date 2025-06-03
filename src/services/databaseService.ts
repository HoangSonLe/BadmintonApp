import type { AppSettings, WeeklyRegistration } from '../types';
import { FirestoreService } from './firestoreService';
import { StorageService, STORAGE_KEYS } from '../config/storageKeys';

// Database structure interface
export interface DatabaseSchema {
  settings: AppSettings;
  registrations: WeeklyRegistration[];
  metadata: {
    version: string;
    createdAt: string;
    lastUpdated: string;
    totalRegistrations: number;
    totalPlayers: number;
  };
}

// Local storage key for our JSON database (now managed by StorageService)
// const DB_KEY = 'badminton_json_database'; // Legacy key - now using STORAGE_KEYS.DATABASE

// Default database structure
const DEFAULT_DATABASE: DatabaseSchema = {
  settings: {
    courtsCount: 2,
    playersPerCourt: 4,
    extraCourtFee: 100000,
    registrationEnabled: true,
    courtName: 'Sân Cầu Lông ABC',
    courtAddress: 'Số 123 Đường ABC, Quận XYZ, TP.HCM'
  },
  registrations: [],
  metadata: {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalRegistrations: 0,
    totalPlayers: 0
  }
};

/**
 * Database Service - Sử dụng Cloud Firestore với fallback localStorage
 */
export class DatabaseService {

  // Flag để tạm thời disable Firestore (set true để chỉ dùng localStorage)
  private static readonly DISABLE_FIRESTORE = !import.meta.env.VITE_FIREBASE_API_KEY;

  /**
   * Khởi tạo database nếu chưa tồn tại
   */
  static async initializeDatabase(): Promise<void> {
    // Migrate legacy data if exists
    if (StorageService.hasLegacyData()) {
      StorageService.migrateLegacyData();
    }

    if (this.DISABLE_FIRESTORE) {
      console.log('🔄 Firestore disabled, using localStorage only');
      const existingDb = StorageService.getItem('DATABASE');
      if (!existingDb) {
        StorageService.setItem('DATABASE', JSON.stringify(DEFAULT_DATABASE));
      }
      return;
    }

    try {
      await FirestoreService.initializeDatabase();
      console.log('🔥 Firestore initialized successfully');
    } catch (error) {
      console.error('⚠️ Error initializing Firestore, falling back to localStorage:', error);
      // Fallback to localStorage if Firestore fails
      const existingDb = StorageService.getItem('DATABASE');
      if (!existingDb) {
        StorageService.setItem('DATABASE', JSON.stringify(DEFAULT_DATABASE));
      }
    }
  }

  /**
   * Đọc toàn bộ database
   */
  static readDatabase(): DatabaseSchema {
    const dbString = StorageService.getItem('DATABASE');
    if (!dbString) {
      this.initializeDatabase();
      return DEFAULT_DATABASE;
    }

    try {
      const db = JSON.parse(dbString);
      // Convert date strings back to Date objects for registrations
      if (db.registrations) {
        db.registrations = db.registrations.map((reg: any) => ({
          ...reg,
          weekStart: new Date(reg.weekStart),
          weekEnd: new Date(reg.weekEnd),
          players: reg.players.map((player: any) => ({
            ...player,
            registeredAt: new Date(player.registeredAt)
          }))
        }));
      }
      return db;
    } catch (error) {
      console.error('Error reading database:', error);
      this.initializeDatabase();
      return DEFAULT_DATABASE;
    }
  }

  /**
   * Ghi toàn bộ database
   */
  static writeDatabase(database: DatabaseSchema): void {
    try {
      // Update metadata
      database.metadata.lastUpdated = new Date().toISOString();
      database.metadata.totalRegistrations = database.registrations.length;
      database.metadata.totalPlayers = database.registrations.reduce(
        (total, reg) => total + reg.players.length, 0
      );

      StorageService.setItem('DATABASE', JSON.stringify(database));
    } catch (error) {
      console.error('Error writing database:', error);
      throw new Error('Không thể lưu dữ liệu vào database');
    }
  }

  /**
   * Lấy settings
   */
  static async getSettings(): Promise<AppSettings> {
    if (this.DISABLE_FIRESTORE) {
      const db = this.readDatabase();
      return db.settings;
    }

    try {
      return await FirestoreService.getSettings();
    } catch (error) {
      console.error('Error getting settings from Firestore, falling back to localStorage:', error);
      const db = this.readDatabase();
      return db.settings;
    }
  }

  /**
   * Cập nhật settings
   */
  static async updateSettings(newSettings: AppSettings): Promise<void> {
    if (this.DISABLE_FIRESTORE) {
      const db = this.readDatabase();
      db.settings = newSettings;
      this.writeDatabase(db);
      return;
    }

    try {
      await FirestoreService.updateSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings in Firestore, falling back to localStorage:', error);
      const db = this.readDatabase();
      db.settings = newSettings;
      this.writeDatabase(db);
    }
  }

  /**
   * Lấy tất cả registrations
   */
  static async getRegistrations(): Promise<WeeklyRegistration[]> {
    try {
      return await FirestoreService.getRegistrations();
    } catch (error) {
      console.error('Error getting registrations from Firestore, falling back to localStorage:', error);
      const db = this.readDatabase();
      return db.registrations;
    }
  }

  /**
   * Thêm registration mới
   */
  static async addRegistration(registration: WeeklyRegistration): Promise<void> {
    try {
      await FirestoreService.addRegistration(registration);
    } catch (error) {
      console.error('Error adding registration to Firestore, falling back to localStorage:', error);
      const db = this.readDatabase();
      db.registrations.push(registration);
      this.writeDatabase(db);
    }
  }

  /**
   * Xóa registration theo ID
   */
  static async deleteRegistration(id: string): Promise<void> {
    try {
      await FirestoreService.deleteRegistration(id);
    } catch (error) {
      console.error('Error deleting registration from Firestore, falling back to localStorage:', error);
      const db = this.readDatabase();
      db.registrations = db.registrations.filter(reg => reg.id !== id);
      this.writeDatabase(db);
    }
  }

  /**
   * Tìm registration theo ID
   */
  static findRegistrationById(id: string): WeeklyRegistration | null {
    const db = this.readDatabase();
    return db.registrations.find(reg => reg.id === id) || null;
  }

  /**
   * Cập nhật registration
   */
  static async updateRegistration(id: string, updatedRegistration: WeeklyRegistration): Promise<void> {
    try {
      await FirestoreService.updateRegistration(id, updatedRegistration);
    } catch (error) {
      console.error('Error updating registration in Firestore, falling back to localStorage:', error);
      const db = this.readDatabase();
      const index = db.registrations.findIndex(reg => reg.id === id);
      if (index !== -1) {
        db.registrations[index] = updatedRegistration;
        this.writeDatabase(db);
      }
    }
  }

  /**
   * Lấy metadata
   */
  static async getMetadata(): Promise<any> {
    try {
      return await FirestoreService.getMetadata();
    } catch (error) {
      console.error('Error getting metadata from Firestore, falling back to localStorage:', error);
      const db = this.readDatabase();
      return db.metadata;
    }
  }

  /**
   * Export database ra file JSON
   */
  static exportToFile(): void {
    const db = this.readDatabase();
    const jsonString = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `badminton-database-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Import database từ file JSON
   */
  static async importFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const importedDb = JSON.parse(jsonString) as DatabaseSchema;
          
          // Validate structure
          if (!importedDb.settings || !importedDb.registrations || !importedDb.metadata) {
            throw new Error('Invalid database structure');
          }
          
          // Write to localStorage
          this.writeDatabase(importedDb);
          resolve();
        } catch (error) {
          reject(new Error('Invalid JSON file: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Reset database về trạng thái mặc định
   */
  static async resetDatabase(): Promise<void> {
    try {
      await FirestoreService.resetDatabase();
    } catch (error) {
      console.error('Error resetting Firestore database, falling back to localStorage:', error);
      localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DATABASE));
    }
  }

  /**
   * Tạo dữ liệu mock để demo
   */
  static async createMockData(): Promise<void> {
    const mockRegistrations: WeeklyRegistration[] = [
      // Tuần 1 - Tuần này
      {
        id: 'mock-1',
        weekStart: new Date(),
        weekEnd: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        players: [
          { id: 'p1', name: 'Nguyễn Văn An', registeredAt: new Date() },
          { id: 'p2', name: 'Trần Thị Bình', registeredAt: new Date() },
          { id: 'p3', name: 'Lê Văn Cường', registeredAt: new Date() },
          { id: 'p4', name: 'Phạm Thị Dung', registeredAt: new Date() },
          { id: 'p5', name: 'Hoàng Văn Em', registeredAt: new Date() },
          { id: 'p6', name: 'Vũ Thị Phương', registeredAt: new Date() },
          { id: 'p7', name: 'Đặng Văn Giang', registeredAt: new Date() },
          { id: 'p8', name: 'Bùi Thị Hoa', registeredAt: new Date() },
          { id: 'p9', name: 'Ngô Văn Inh', registeredAt: new Date() }
        ],
        settings: {
          courtsCount: 2,
          playersPerCourt: 4,
          extraCourtFee: 100000,
          registrationEnabled: true,
          courtName: 'Sân Cầu Lông ABC',
          courtAddress: 'Số 123 Đường ABC, Quận XYZ, TP.HCM'
        }
      },
      // Tuần 2 - Tuần trước
      {
        id: 'mock-2',
        weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        players: [
          { id: 'p10', name: 'Trịnh Văn Khang', registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { id: 'p11', name: 'Lý Thị Lan', registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { id: 'p12', name: 'Võ Văn Minh', registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { id: 'p13', name: 'Đinh Thị Nga', registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { id: 'p14', name: 'Tô Văn Oanh', registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { id: 'p15', name: 'Dương Thị Phúc', registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        ],
        settings: {
          courtsCount: 2,
          playersPerCourt: 4,
          extraCourtFee: 100000,
          registrationEnabled: true,
          courtName: 'Sân Cầu Lông ABC',
          courtAddress: 'Số 123 Đường ABC, Quận XYZ, TP.HCM'
        }
      },
      // Tuần 3 - 2 tuần trước
      {
        id: 'mock-3',
        weekStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        players: [
          { id: 'p16', name: 'Cao Văn Quang', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p17', name: 'Phan Thị Rạng', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p18', name: 'Lưu Văn Sơn', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p19', name: 'Mai Thị Tuyết', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p20', name: 'Hồ Văn Uy', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p21', name: 'Chu Thị Vân', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p22', name: 'Đỗ Văn Xuân', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p23', name: 'Lại Thị Yến', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p24', name: 'Kiều Văn Zung', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p25', name: 'Ông Thị Ánh', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { id: 'p26', name: 'Từ Văn Bảo', registeredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
        ],
        settings: {
          courtsCount: 2,
          playersPerCourt: 4,
          extraCourtFee: 100000,
          registrationEnabled: true,
          courtName: 'Sân Cầu Lông ABC',
          courtAddress: 'Số 123 Đường ABC, Quận XYZ, TP.HCM'
        }
      },
      // Tuần 4 - Tháng trước
      {
        id: 'mock-4',
        weekStart: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        players: [
          { id: 'p27', name: 'Thái Văn Cảnh', registeredAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
          { id: 'p28', name: 'Ưng Thị Diệu', registeredAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
          { id: 'p29', name: 'Yên Văn Ế', registeredAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) },
          { id: 'p30', name: 'Âu Thị Phương', registeredAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) }
        ],
        settings: {
          courtsCount: 2,
          playersPerCourt: 4,
          extraCourtFee: 100000,
          registrationEnabled: true,
          courtName: 'Sân Cầu Lông ABC',
          courtAddress: 'Số 123 Đường ABC, Quận XYZ, TP.HCM'
        }
      },
      // Tuần 5 - Tháng trước
      {
        id: 'mock-5',
        weekStart: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
        players: [
          { id: 'p31', name: 'Gia Văn Hạnh', registeredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
          { id: 'p32', name: 'Ỉn Thị Khanh', registeredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
          { id: 'p33', name: 'Ơ Văn Lâm', registeredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
          { id: 'p34', name: 'Ư Thị Minh', registeredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
          { id: 'p35', name: 'Ă Văn Nhân', registeredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
          { id: 'p36', name: 'Â Thị Oanh', registeredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
          { id: 'p37', name: 'Ê Văn Phúc', registeredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
          { id: 'p38', name: 'Ô Thị Quỳnh', registeredAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) }
        ],
        settings: {
          courtsCount: 2,
          playersPerCourt: 4,
          extraCourtFee: 100000,
          registrationEnabled: true,
          courtName: 'Sân Cầu Lông ABC',
          courtAddress: 'Số 123 Đường ABC, Quận XYZ, TP.HCM'
        }
      }
    ];

    // Reset database và thêm mock data
    await this.resetDatabase();

    // Thêm từng registration
    for (const registration of mockRegistrations) {
      await this.addRegistration(registration);
    }
  }

  /**
   * Lấy thống kê database
   */
  static async getStats(): Promise<any> {
    try {
      return await FirestoreService.getStats();
    } catch (error) {
      console.error('Error getting stats from Firestore, falling back to localStorage:', error);
      const db = this.readDatabase();
      return {
        totalRegistrations: db.registrations.length,
        totalPlayers: db.registrations.reduce((total, reg) => total + reg.players.length, 0),
        lastUpdated: db.metadata.lastUpdated,
        databaseSize: JSON.stringify(db).length
      };
    }
  }
}
