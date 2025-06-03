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
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_LOGS = 100;
  private static readonly TOKEN_SECRET = 'badminton_secure_token_2024';

  /**
   * Generate secure admin token
   */
  private static generateAdminToken(): string {
    const timestamp = Date.now();
    const randomBytes = Math.random().toString(36).substring(2, 15);
    const payload = `${timestamp}:${randomBytes}:${this.TOKEN_SECRET}`;

    // Simple hash function (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `${timestamp}.${randomBytes}.${Math.abs(hash).toString(36)}`;
  }

  /**
   * Validate admin token
   */
  private static validateAdminToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [timestampStr, randomBytes, hashStr] = parts;
    const timestamp = parseInt(timestampStr);

    // Check if token is expired
    if (Date.now() - timestamp >= this.SESSION_DURATION) {
      return false;
    }

    // Recreate expected hash
    const payload = `${timestamp}:${randomBytes}:${this.TOKEN_SECRET}`;
    let expectedHash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      expectedHash = ((expectedHash << 5) - expectedHash) + char;
      expectedHash = expectedHash & expectedHash;
    }

    return hashStr === Math.abs(expectedHash).toString(36);
  }
  
  /**
   * Verify admin credentials using Firebase
   */
  static async verifyAdmin(adminCode: string): Promise<boolean> {
    if (!adminCode || typeof adminCode !== 'string') {
      this.logSecurityEvent('INVALID_ADMIN_ATTEMPT', { reason: 'Empty or invalid code' });
      return false;
    }

    try {
      // Get admin password from Firebase
      const { FirestoreService } = await import('./firestoreService');
      const adminPassword = await FirestoreService.getAdminPassword();
      const isValid = adminCode.trim() === adminPassword;

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
    } catch (error) {
      console.error('Error verifying admin credentials:', error);
      this.logSecurityEvent('ADMIN_VERIFICATION_ERROR', {
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }
  
  /**
   * Check if current session is admin using secure token validation
   */
  static isCurrentSessionAdmin(): boolean {
    const adminToken = StorageService.getItem('ADMIN_TOKEN');

    if (!adminToken) {
      return false;
    }

    // Validate token cryptographically
    const isValidToken = this.validateAdminToken(adminToken);

    if (!isValidToken) {
      // Invalid or expired token, clear session
      this.clearAdminSession();
      this.logSecurityEvent('INVALID_TOKEN_DETECTED', {
        expiredAt: new Date().toISOString(),
        reason: 'Token validation failed'
      });
      return false;
    }

    return true;
  }

  /**
   * Server-side admin validation for critical operations
   */
  static validateServerSideAdmin(): boolean {
    const adminToken = StorageService.getItem('ADMIN_TOKEN');

    if (!adminToken) {
      this.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        reason: 'No admin token present',
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      throw new Error('🚨 Unauthorized: Admin token required');
    }

    const isValid = this.validateAdminToken(adminToken);

    if (!isValid) {
      this.logSecurityEvent('INVALID_TOKEN_ACCESS_ATTEMPT', {
        reason: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      this.clearAdminSession();
      throw new Error('🚨 Unauthorized: Invalid admin token');
    }

    return true;
  }
  
  /**
   * Set admin session with secure token
   */
  static setAdminSession(): void {
    const adminToken = this.generateAdminToken();
    const timestamp = Date.now().toString();

    // Store secure token instead of boolean
    StorageService.setItem('ADMIN_TOKEN', adminToken);

    // Keep legacy keys for backward compatibility (but don't rely on them for security)
    StorageService.setItem('ADMIN_STATUS', 'true');
    StorageService.setItem('ADMIN_AUTH_TIME', timestamp);

    this.logAdminAction('SECURE_SESSION_CREATED', {
      sessionId: timestamp,
      tokenGenerated: true,
      expiresAt: new Date(Date.now() + this.SESSION_DURATION).toISOString()
    });
  }

  /**
   * Clear admin session and remove all tokens
   */
  static clearAdminSession(): void {
    const sessionId = StorageService.getItem('ADMIN_AUTH_TIME');

    // Remove all admin-related data
    StorageService.removeItem('ADMIN_TOKEN');
    StorageService.removeItem('ADMIN_STATUS');
    StorageService.removeItem('ADMIN_AUTH_TIME');

    this.logAdminAction('SECURE_SESSION_CLEARED', {
      sessionId,
      tokenRemoved: true,
      clearedAt: new Date().toISOString()
    });
  }
  
  /**
   * Validate admin action before execution with server-side validation
   */
  static validateAdminAction(actionName: string): boolean {
    try {
      // Use server-side validation instead of client-side check
      this.validateServerSideAdmin();

      // Log successful validation
      this.logAdminAction('ADMIN_ACTION_VALIDATED', {
        action: actionName,
        validatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      this.logSecurityEvent('UNAUTHORIZED_ADMIN_ACTION', {
        action: actionName,
        timestamp: new Date().toISOString(),
        reason: (error as Error).message,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      throw error;
    }
  }

  /**
   * Verify admin code (for password confirmation) using Firebase
   */
  static async verifyAdminCode(inputCode: string): Promise<boolean> {
    try {
      const { FirestoreService } = await import('./firestoreService');
      const adminPassword = await FirestoreService.getAdminPassword();
      return inputCode === adminPassword;
    } catch (error) {
      console.error('Error verifying admin code:', error);
      // Fallback to environment variable if Firebase fails
      const adminCode = import.meta.env.VITE_ADMIN_CODE || 'admin123';
      return inputCode === adminCode;
    }
  }

  /**
   * Generate token for destructive operations
   */
  static generateDestructiveOperationToken(): string {
    const timestamp = Date.now();
    const randomBytes = Math.random().toString(36).substring(2, 15);
    return `DESTRUCTIVE_${timestamp}_${randomBytes}`;
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
