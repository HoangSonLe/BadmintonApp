/**
 * Database Security Service - Server-side validation for all admin database operations
 * This service ensures that all critical database operations are properly authenticated
 */

import { SecurityService } from './securityService';
import { DatabaseService } from './databaseService';
import type { AppSettings, WeeklyRegistration } from '../types';

export class DatabaseSecurityService {
  
  /**
   * Secure wrapper for deleting registrations
   */
  static async secureDeleteRegistration(registrationId: string): Promise<void> {
    // Server-side admin validation
    SecurityService.validateAdminAction('DELETE_REGISTRATION');
    
    try {
      await DatabaseService.deleteRegistration(registrationId);
      
      SecurityService.logAdminAction('REGISTRATION_DELETED_SECURELY', {
        registrationId,
        deletedAt: new Date().toISOString(),
        method: 'SECURE_DELETE'
      });
    } catch (error) {
      SecurityService.logSecurityEvent('SECURE_DELETE_FAILED', {
        registrationId,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  /**
   * Secure wrapper for updating registrations
   */
  static async secureUpdateRegistration(registrationId: string, registration: WeeklyRegistration): Promise<void> {
    // Server-side admin validation
    SecurityService.validateAdminAction('UPDATE_REGISTRATION');
    
    try {
      await DatabaseService.updateRegistration(registrationId, registration);
      
      SecurityService.logAdminAction('REGISTRATION_UPDATED_SECURELY', {
        registrationId,
        playersCount: registration.players.length,
        updatedAt: new Date().toISOString(),
        method: 'SECURE_UPDATE'
      });
    } catch (error) {
      SecurityService.logSecurityEvent('SECURE_UPDATE_FAILED', {
        registrationId,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  /**
   * Secure wrapper for updating settings
   */
  static async secureUpdateSettings(settings: AppSettings): Promise<void> {
    // Server-side admin validation
    SecurityService.validateAdminAction('UPDATE_SETTINGS');
    
    try {
      await DatabaseService.updateSettings(settings);
      
      SecurityService.logAdminAction('SETTINGS_UPDATED_SECURELY', {
        courtsCount: settings.courtsCount,
        playersPerCourt: settings.playersPerCourt,
        registrationEnabled: settings.registrationEnabled,
        updatedAt: new Date().toISOString(),
        method: 'SECURE_UPDATE'
      });
    } catch (error) {
      SecurityService.logSecurityEvent('SECURE_SETTINGS_UPDATE_FAILED', {
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  /**
   * Secure wrapper for clearing all data
   */
  static async secureClearAllData(): Promise<void> {
    // Server-side admin validation with extra security
    SecurityService.validateAdminAction('CLEAR_ALL_DATA');
    
    // Additional confirmation required for destructive operations
    const confirmationToken = SecurityService.generateDestructiveOperationToken();
    
    try {
      await DatabaseService.clearAllData();
      
      SecurityService.logAdminAction('ALL_DATA_CLEARED_SECURELY', {
        confirmationToken,
        clearedAt: new Date().toISOString(),
        method: 'SECURE_CLEAR_ALL',
        warning: 'DESTRUCTIVE_OPERATION_COMPLETED'
      });
    } catch (error) {
      SecurityService.logSecurityEvent('SECURE_CLEAR_ALL_FAILED', {
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
        confirmationToken
      });
      throw error;
    }
  }
  
  /**
   * Validate that user has admin privileges for read operations
   */
  static validateReadAccess(operation: string): boolean {
    try {
      return SecurityService.isCurrentSessionAdmin();
    } catch (error) {
      SecurityService.logSecurityEvent('UNAUTHORIZED_READ_ACCESS', {
        operation,
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
      return false;
    }
  }
  
  /**
   * Validate that user has admin privileges for write operations
   */
  static validateWriteAccess(operation: string): boolean {
    try {
      SecurityService.validateAdminAction(operation);
      return true;
    } catch (error) {
      SecurityService.logSecurityEvent('UNAUTHORIZED_WRITE_ACCESS', {
        operation,
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
      throw error;
    }
  }
  
  /**
   * Check if current user can perform admin operations
   */
  static canPerformAdminOperations(): boolean {
    return SecurityService.isCurrentSessionAdmin();
  }
  
  /**
   * Get security status for UI components
   */
  static getSecurityStatus(): {
    isAdmin: boolean;
    canDelete: boolean;
    canModify: boolean;
    canViewAdminTabs: boolean;
  } {
    const isAdmin = SecurityService.isCurrentSessionAdmin();
    
    return {
      isAdmin,
      canDelete: isAdmin,
      canModify: isAdmin,
      canViewAdminTabs: isAdmin
    };
  }
}
