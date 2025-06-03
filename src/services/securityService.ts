/**
 * Security Service - Quản lý bảo mật và xác thực admin
 */

import { StorageService } from '../config/storageKeys';

export interface AdminAction {
  action: string;
  details?: Record<string, unknown>;
  timestamp: string;
  userAgent: string;
  sessionId: string | null;
}

export interface SecurityEvent {
  event: string;
  details?: Record<string, unknown>;
  timestamp: string;
  userAgent: string;
  url: string;
}

export class SecurityService {
  private static readonly ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'admin123';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_LOGS = 100;
  
  /**
   * Verify admin credentials
   */
  static verifyAdmin(adminCode: string): boolean {
    if (!adminCode || typeof adminCode !== 'string') {
      this.logSecurityEvent('INVALID_ADMIN_ATTEMPT', { reason: 'Empty or invalid code' });
      return false;
    }
    
    const isValid = adminCode.trim() === this.ADMIN_CODE;
    
    if (!isValid) {
      this.logSecurityEvent('FAILED_ADMIN_LOGIN', { 
        attemptedCode: adminCode.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });
    } else {
      this.logSecurityEvent('SUCCESSFUL_ADMIN_LOGIN', {
        timestamp: new Date().toISOString()
      });
    }
    
    return isValid;
  }
  
  /**
   * Check if current session is admin
   */
  static isCurrentSessionAdmin(): boolean {
    const adminStatus = StorageService.getItem('ADMIN_STATUS');
    const adminAuthTime = StorageService.getItem('ADMIN_AUTH_TIME');

    if (adminStatus !== 'true' || !adminAuthTime) {
      return false;
    }

    // Check if session is still valid
    const authTime = parseInt(adminAuthTime);
    const currentTime = Date.now();

    if (currentTime - authTime >= this.SESSION_DURATION) {
      // Session expired, clear localStorage
      this.clearAdminSession();
      this.logSecurityEvent('SESSION_EXPIRED', {
        expiredAt: new Date().toISOString(),
        sessionDuration: this.SESSION_DURATION
      });
      return false;
    }

    return true;
  }
  
  /**
   * Set admin session
   */
  static setAdminSession(): void {
    const timestamp = Date.now().toString();
    StorageService.setItem('ADMIN_STATUS', 'true');
    StorageService.setItem('ADMIN_AUTH_TIME', timestamp);

    this.logAdminAction('SESSION_CREATED', {
      sessionId: timestamp,
      expiresAt: new Date(Date.now() + this.SESSION_DURATION).toISOString()
    });
  }
  
  /**
   * Clear admin session
   */
  static clearAdminSession(): void {
    const sessionId = StorageService.getItem('ADMIN_AUTH_TIME');
    StorageService.removeItem('ADMIN_STATUS');
    StorageService.removeItem('ADMIN_AUTH_TIME');

    this.logAdminAction('SESSION_CLEARED', {
      sessionId,
      clearedAt: new Date().toISOString()
    });
  }
  
  /**
   * Validate admin action before execution
   */
  static validateAdminAction(actionName: string): boolean {
    if (!this.isCurrentSessionAdmin()) {
      this.logSecurityEvent('UNAUTHORIZED_ADMIN_ACTION', {
        action: actionName,
        timestamp: new Date().toISOString(),
        reason: 'No valid admin session'
      });
      throw new Error('🚨 Unauthorized: Admin authentication required');
    }
    
    return true;
  }

  /**
   * Verify admin code (for password confirmation)
   */
  static verifyAdminCode(inputCode: string): boolean {
    const adminCode = import.meta.env.VITE_ADMIN_CODE || 'admin123';
    return inputCode === adminCode;
  }

  /**
   * Log admin actions for security monitoring
   */
  static logAdminAction(action: string, details?: Record<string, unknown>): void {
    const logEntry: AdminAction = {
      action,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: StorageService.getItem('ADMIN_AUTH_TIME')
    };

    console.log('🔐 Admin Action:', logEntry);

    // Store in localStorage for debugging
    const logs = this.getAdminLogs();
    logs.push(logEntry);

    // Keep only last MAX_LOGS logs
    if (logs.length > this.MAX_LOGS) {
      logs.splice(0, logs.length - this.MAX_LOGS);
    }

    StorageService.setItem('ADMIN_LOGS', JSON.stringify(logs));

    // Also save to Firebase (async, don't wait)
    this.saveToFirebase('admin', logEntry);
  }
  
  /**
   * Log security events
   */
  static logSecurityEvent(event: string, details?: Record<string, unknown>): void {
    const logEntry: SecurityEvent = {
      event,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.warn('🚨 Security Event:', logEntry);

    // Store security events separately
    const securityLogs = this.getSecurityLogs();
    securityLogs.push(logEntry);

    // Keep only last MAX_LOGS security events
    if (securityLogs.length > this.MAX_LOGS) {
      securityLogs.splice(0, securityLogs.length - this.MAX_LOGS);
    }

    StorageService.setItem('SECURITY_LOGS', JSON.stringify(securityLogs));

    // Also save to Firebase (async, don't wait)
    this.saveToFirebase('security', logEntry);
  }

  /**
   * Save logs to Firebase (async, non-blocking)
   */
  private static async saveToFirebase(type: 'admin' | 'security', logEntry: AdminAction | SecurityEvent): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency
      const { FirestoreService } = await import('./firestoreService');

      if (type === 'admin') {
        await FirestoreService.saveAdminLog(logEntry as AdminAction);
      } else {
        await FirestoreService.saveSecurityLog(logEntry as SecurityEvent);
      }
    } catch (error) {
      console.error('Failed to save log to Firebase:', error);
      // Don't throw error to prevent breaking the main functionality
    }
  }
  
  /**
   * Get admin logs
   */
  static getAdminLogs(): AdminAction[] {
    try {
      return JSON.parse(StorageService.getItem('ADMIN_LOGS') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Get security logs
   */
  static getSecurityLogs(): SecurityEvent[] {
    try {
      return JSON.parse(StorageService.getItem('SECURITY_LOGS') || '[]');
    } catch {
      return [];
    }
  }
  
  /**
   * Clear all logs (admin only)
   */
  static clearLogs(): void {
    this.validateAdminAction('CLEAR_LOGS');

    StorageService.removeItem('ADMIN_LOGS');
    StorageService.removeItem('SECURITY_LOGS');

    this.logAdminAction('LOGS_CLEARED', {
      clearedAt: new Date().toISOString()
    });
  }
  
  /**
   * Get security summary
   */
  static getSecuritySummary(): Record<string, unknown> {
    const adminLogs = this.getAdminLogs();
    const securityLogs = this.getSecurityLogs();
    const isAdmin = this.isCurrentSessionAdmin();
    
    return {
      isAdmin,
      sessionValid: isAdmin,
      totalAdminActions: adminLogs.length,
      totalSecurityEvents: securityLogs.length,
      lastAdminAction: adminLogs[adminLogs.length - 1]?.timestamp || null,
      lastSecurityEvent: securityLogs[securityLogs.length - 1]?.timestamp || null,
      sessionExpiry: isAdmin ?
        new Date(parseInt(StorageService.getItem('ADMIN_AUTH_TIME') || '0') + this.SESSION_DURATION).toISOString() :
        null
    };
  }
}
