/**
 * Registration Logger Service - Ghi log các hoạt động đăng ký
 */

import { SecurityService } from './securityService';
import type { Player, WeeklyRegistration, AppSettings } from '../types';

export class RegistrationLogger {
  
  /**
   * Log khi tạo registration mới
   */
  static logNewRegistration(registration: WeeklyRegistration): void {
    SecurityService.logAdminAction('REGISTRATION_CREATED', {
      registrationId: registration.id,
      weekStart: registration.weekStart.toISOString(),
      weekEnd: registration.weekEnd.toISOString(),
      playersCount: registration.players.length,
      playerNames: registration.players.map(p => p.name),
      settings: registration.settings,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Log khi thêm player vào registration hiện có
   */
  static logPlayersAdded(registrationId: string, newPlayers: Player[], totalPlayers: number): void {
    SecurityService.logAdminAction('PLAYERS_ADDED_TO_REGISTRATION', {
      registrationId,
      newPlayersCount: newPlayers.length,
      newPlayerNames: newPlayers.map(p => p.name),
      totalPlayersAfter: totalPlayers,
      addedAt: new Date().toISOString()
    });
  }



  /**
   * Log khi cập nhật registration
   */
  static logRegistrationUpdated(registrationId: string, changes: Record<string, unknown>): void {
    SecurityService.logAdminAction('REGISTRATION_UPDATED', {
      registrationId,
      changes,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Log khi xóa toàn bộ registration
   */
  static logRegistrationDeleted(registrationId: string, playersCount: number, playerNames: string[]): void {
    SecurityService.logAdminAction('REGISTRATION_DELETED', {
      registrationId,
      playersCount,
      playerNames,
      deletedAt: new Date().toISOString()
    });
  }

  /**
   * Log khi có duplicate names được phát hiện
   */
  static logDuplicateNamesDetected(duplicateNames: string[], registrationId: string): void {
    SecurityService.logAdminAction('DUPLICATE_NAMES_DETECTED', {
      duplicateNames,
      registrationId,
      duplicateCount: duplicateNames.length,
      detectedAt: new Date().toISOString()
    });
  }

  /**
   * Log khi registration bị disable/enable
   */
  static logRegistrationStatusChanged(enabled: boolean, changedBy: 'admin' | 'system'): void {
    SecurityService.logAdminAction('REGISTRATION_STATUS_CHANGED', {
      enabled,
      changedBy,
      changedAt: new Date().toISOString()
    });
  }

  /**
   * Log khi settings được áp dụng cho registration
   */
  static logSettingsApplied(registrationId: string, settings: AppSettings): void {
    SecurityService.logAdminAction('SETTINGS_APPLIED_TO_REGISTRATION', {
      registrationId,
      settings,
      appliedAt: new Date().toISOString()
    });
  }

  /**
   * Log khi có lỗi trong quá trình đăng ký
   */
  static logRegistrationError(action: string, error: string, context?: Record<string, unknown>): void {
    SecurityService.logSecurityEvent('REGISTRATION_ERROR', {
      action,
      error,
      context,
      occurredAt: new Date().toISOString()
    });
  }

  /**
   * Log khi user cố gắng đăng ký khi registration bị disable
   */
  static logRegistrationAttemptWhenDisabled(attemptedPlayerName?: string): void {
    SecurityService.logSecurityEvent('REGISTRATION_ATTEMPT_WHEN_DISABLED', {
      attemptedPlayerName,
      attemptedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  /**
   * Log thống kê tổng quan về registration
   */
  static logRegistrationSummary(summary: {
    totalRegistrations: number;
    totalPlayers: number;
    totalCourts: number;
    extraFees: number;
  }): void {
    SecurityService.logAdminAction('REGISTRATION_SUMMARY_CALCULATED', {
      summary,
      calculatedAt: new Date().toISOString()
    });
  }
}
