import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Tabs, Typography, Space, message, Button, App as AntApp } from 'antd';
import { CalendarOutlined, UnorderedListOutlined, SettingOutlined, FileTextOutlined, DatabaseOutlined, LockOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import type { AppSettings, WeeklyRegistration as WeeklyRegistrationType, RegistrationSummary } from './types';
import Settings from './components/Settings';
import WeeklyRegistration from './components/WeeklyRegistration';
import Summary from './components/Summary';
import RegistrationList from './components/RegistrationList';
import DataManager from './components/DataManager';
import DatabaseDemo from './components/DatabaseDemo';
import SecurityDashboard from './components/SecurityDashboard';
import AdminAuth from './components/AdminAuth';
import { DatabaseService } from './services/databaseService';
import { SecurityService } from './services/securityService';
import { RegistrationLogger } from './services/registrationLogger';
import { DateUtils } from './utils/dateUtils';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const [activeTab, setActiveTab] = useState<string>('register');
  const [settings, setSettings] = useState<AppSettings>({
    courtsCount: 2,
    playersPerCourt: 4,
    extraCourtFee: 100000,
    registrationEnabled: true, // Mặc định cho phép đăng ký
    courtName: 'Sân Cầu Lông ABC',
    courtAddress: 'Số 123 Đường ABC, Quận XYZ, TP.HCM'
  });
  const [registrations, setRegistrations] = useState<WeeklyRegistrationType[]>([]);
  const [currentSummary, setCurrentSummary] = useState<RegistrationSummary>({
    totalPlayers: 0,
    requiredCourts: 2,
    extraCourts: 0,
    extraPlayersCount: 0,
    totalExtraFee: 0,
    feePerExtraPlayer: 0,
    weekInfo: null
  });

  // Admin authentication states
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminAuth, setShowAdminAuth] = useState<boolean>(false);

  // Track last time data was loaded for auto-refresh
  const lastDataLoadTime = useRef<number>(Date.now());
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Check admin status using SecurityService on component mount
  useEffect(() => {
    const isValidAdmin = SecurityService.isCurrentSessionAdmin();
    setIsAdmin(isValidAdmin);

    if (isValidAdmin) {
      SecurityService.logAdminAction('SESSION_RESTORED', {
        restoredAt: new Date().toISOString()
      });
    }
  }, []);

  // Calculate summary for current week registration
  const calculateSummary = (registration: WeeklyRegistrationType): RegistrationSummary => {
    const totalPlayers = registration.players.length;
    const maxPlayersWithDefaultCourts = registration.settings.courtsCount * registration.settings.playersPerCourt;
    const extraPlayersCount = Math.max(0, totalPlayers - maxPlayersWithDefaultCourts);
    const extraCourts = Math.ceil(extraPlayersCount / registration.settings.playersPerCourt);
    const requiredCourts = registration.settings.courtsCount + extraCourts;
    const totalExtraFee = extraCourts * registration.settings.extraCourtFee;
    const feePerExtraPlayer = extraPlayersCount > 0 ? totalExtraFee / extraPlayersCount : 0;

    return {
      totalPlayers,
      requiredCourts,
      extraCourts,
      extraPlayersCount,
      totalExtraFee,
      feePerExtraPlayer,
      weekInfo: {
        weekStart: registration.weekStart,
        weekEnd: registration.weekEnd,
        registrationId: registration.id
      }
    };
  };

  // Create default summary based on current settings (when no registration exists)
  const createDefaultSummary = (settings: AppSettings): RegistrationSummary => {
    return {
      totalPlayers: 0,
      requiredCourts: settings.courtsCount,
      extraCourts: 0,
      extraPlayersCount: 0,
      totalExtraFee: 0,
      feePerExtraPlayer: 0,
      weekInfo: null
    };
  };

  // Find the next week registration (same logic as WeeklyRegistration component)
  const findNextWeekRegistration = (registrations: WeeklyRegistrationType[]): WeeklyRegistrationType | null => {
    if (registrations.length === 0) return null;

    // Calculate next week dates using DateUtils for consistency
    const nextWeekDates = DateUtils.getNextWeekDates();

    // Find registration for next week
    return registrations.find(reg => {
      return DateUtils.isSameWeek(reg.weekStart, reg.weekEnd, nextWeekDates.start, nextWeekDates.end);
    }) || null;
  };

  // Calculate summary from Firebase data for next week (same as WeeklyRegistration)
  const calculateSummaryFromFirebase = useCallback((registrations: WeeklyRegistrationType[], settings: AppSettings): RegistrationSummary => {
    const nextWeekRegistration = findNextWeekRegistration(registrations);

    if (!nextWeekRegistration) {
      return createDefaultSummary(settings);
    }

    return calculateSummary(nextWeekRegistration);
  }, []);

  // Function to reload data from database
  const reloadData = useCallback(async (showMessage = false) => {
    setIsLoadingData(true);
    try {
      // Load data from Firestore database
      const dbSettings = await DatabaseService.getSettings();
      const dbRegistrations = await DatabaseService.getRegistrations();

      setSettings(dbSettings);
      setRegistrations(dbRegistrations);

      // Update summary with fresh data
      setCurrentSummary(calculateSummaryFromFirebase(dbRegistrations, dbSettings));

      // Update last load time
      lastDataLoadTime.current = Date.now();

      if (showMessage) {
        const stats = await DatabaseService.getStats();
        message.success({
          content: `🔄 Đã tải lại dữ liệu! ${stats.totalRegistrations} đăng ký, ${stats.totalPlayers} người chơi.`,
          duration: 3,
        });
      }
    } catch (error) {
      message.error('Lỗi khi tải lại dữ liệu: ' + (error as Error).message);
    } finally {
      setIsLoadingData(false);
    }
  }, [calculateSummaryFromFirebase]);

  // Initialize database and load data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database
        await DatabaseService.initializeDatabase();

        // Load initial data
        await reloadData();

        // Show welcome message
        const stats = await DatabaseService.getStats();
        message.success({
          content: `Đã tải database Firestore! ${stats.totalRegistrations} đăng ký, ${stats.totalPlayers} người chơi.`,
          duration: 4,
        });
      } catch (error) {
        message.error('Lỗi khi tải database: ' + (error as Error).message);
      }
    };

    initializeApp();
  }, [reloadData]);

  // Handle settings change
  const handleSettingsChange = async (newSettings: AppSettings) => {
    try {
      setSettings(newSettings);
      await DatabaseService.updateSettings(newSettings);

      // Find and update only the next week registration (current registration being worked on)
      const nextWeekRegistration = findNextWeekRegistration(registrations);

      if (nextWeekRegistration) {
        // Update only the next week registration with new settings
        const updatedRegistration = {
          ...nextWeekRegistration,
          settings: newSettings
        };

        // Update in database
        await DatabaseService.updateRegistration(nextWeekRegistration.id, updatedRegistration);

        // Update local state - only update the specific registration
        const updatedRegistrations = registrations.map(reg =>
          reg.id === nextWeekRegistration.id ? updatedRegistration : reg
        );
        setRegistrations(updatedRegistrations);

        // Update summary to reflect new settings for next week
        setCurrentSummary(calculateSummaryFromFirebase(updatedRegistrations, newSettings));
      } else {
        // If no next week registration exists, just update summary with new settings
        setCurrentSummary(calculateSummaryFromFirebase(registrations, newSettings));
      }

      if (nextWeekRegistration) {
        message.success('Cài đặt đã được lưu và áp dụng cho tuần đang đăng ký!');
      } else {
        message.success('Cài đặt đã được lưu và sẽ áp dụng cho đăng ký tuần tiếp theo!');
      }
    } catch (error) {
      message.error('Lỗi khi lưu cài đặt: ' + (error as Error).message);
    }
  };



  // Check if registration exists for the same week
  const findExistingRegistrationForWeek = (weekStart: Date, weekEnd: Date): WeeklyRegistrationType | null => {
    return registrations.find(reg => {
      return DateUtils.isSameWeek(reg.weekStart, reg.weekEnd, weekStart, weekEnd);
    }) || null;
  };

  // Handle new registration submission
  const handleRegistrationSubmit = async (registration: WeeklyRegistrationType) => {
    try {
      // Check if registration already exists for this week
      const existingRegistration = findExistingRegistrationForWeek(registration.weekStart, registration.weekEnd);

      if (existingRegistration) {
        // Merge players, avoiding duplicates by name
        const existingPlayerNames = new Set(existingRegistration.players.map(p => p.name.toLowerCase().trim()));
        const newPlayers = registration.players.filter(p => !existingPlayerNames.has(p.name.toLowerCase().trim()));

        // Tìm những tên bị trùng để thông báo cụ thể
        const duplicateNames = registration.players
          .filter(p => existingPlayerNames.has(p.name.toLowerCase().trim()))
          .map(p => p.name);

        if (newPlayers.length === 0) {
          // Log duplicate names detected
          RegistrationLogger.logDuplicateNamesDetected(duplicateNames, existingRegistration.id);
          message.warning(`Tất cả người chơi đã được đăng ký cho tuần này rồi! Tên trùng: ${duplicateNames.join(', ')}`);
          return;
        } else if (duplicateNames.length > 0) {
          // Có một số tên trùng và một số tên mới
          RegistrationLogger.logDuplicateNamesDetected(duplicateNames, existingRegistration.id);
          message.info(`Tên đã tồn tại: ${duplicateNames.join(', ')}. Chỉ thêm những người chưa đăng ký.`);
        }

        // Update existing registration
        const updatedRegistration: WeeklyRegistrationType = {
          ...existingRegistration,
          players: [...existingRegistration.players, ...newPlayers],
          settings: registration.settings // Use latest settings
        };

        // Update in database
        await DatabaseService.deleteRegistration(existingRegistration.id);
        await DatabaseService.addRegistration(updatedRegistration);

        // Update local state
        const newRegistrations = registrations.map(reg =>
          reg.id === existingRegistration.id ? updatedRegistration : reg
        );
        setRegistrations(newRegistrations);

        // Calculate and show summary
        const summary = calculateSummary(updatedRegistration);
        setCurrentSummary(summary);

        // Log players added to existing registration
        RegistrationLogger.logPlayersAdded(existingRegistration.id, newPlayers, updatedRegistration.players.length);

        message.success(`Đã thêm ${newPlayers.length} người vào đăng ký tuần này! Tổng cộng: ${updatedRegistration.players.length} người`);
      } else {
        // Create new registration
        await DatabaseService.addRegistration(registration);

        // Update local state
        const newRegistrations = [...registrations, registration];
        setRegistrations(newRegistrations);

        // Calculate and show summary
        const summary = calculateSummary(registration);
        setCurrentSummary(summary);

        // Log new registration created
        RegistrationLogger.logNewRegistration(registration);

        message.success('Đăng ký đã được lưu vào database Firestore!');
      }
    } catch (error) {
      // Log registration error
      RegistrationLogger.logRegistrationError('SAVE_REGISTRATION', (error as Error).message, {
        registrationId: registration.id,
        playersCount: registration.players.length
      });
      message.error('Lỗi khi lưu đăng ký: ' + (error as Error).message);
    }
  };

  // Handle registration deletion
  const handleDeleteRegistration = async (id: string) => {
    try {
      // Find the registration before deleting for logging
      const registrationToDelete = registrations.find(reg => reg.id === id);

      await DatabaseService.deleteRegistration(id);
      const newRegistrations = registrations.filter(reg => reg.id !== id);
      setRegistrations(newRegistrations);

      // Update summary after deletion
      setCurrentSummary(calculateSummaryFromFirebase(newRegistrations, settings));

      // Log registration deletion
      if (registrationToDelete) {
        RegistrationLogger.logRegistrationDeleted(
          id,
          registrationToDelete.players.length,
          registrationToDelete.players.map(p => p.name)
        );
      }

      message.success('Đã xóa đăng ký khỏi database Firestore!');
    } catch (error) {
      // Log deletion error
      RegistrationLogger.logRegistrationError('DELETE_REGISTRATION', (error as Error).message, {
        registrationId: id
      });
      message.error('Lỗi khi xóa đăng ký: ' + (error as Error).message);
    }
  };

  // Handle player deletion from registration
  const handleDeletePlayer = async (registrationId: string, playerId: string) => {
    try {
      // Find the registration
      const registration = registrations.find(reg => reg.id === registrationId);
      if (!registration) {
        message.error('Không tìm thấy đăng ký!');
        return;
      }

      // Remove player from the registration
      const updatedPlayers = registration.players.filter(player => player.id !== playerId);

      if (updatedPlayers.length === 0) {
        // If no players left, delete the entire registration
        await handleDeleteRegistration(registrationId);
        return;
      }

      // Update registration with remaining players
      const updatedRegistration = {
        ...registration,
        players: updatedPlayers
      };

      // Update in Firestore
      await DatabaseService.updateRegistration(registrationId, updatedRegistration);

      // Update local state
      const newRegistrations = registrations.map(reg =>
        reg.id === registrationId ? updatedRegistration : reg
      );
      setRegistrations(newRegistrations);

      // Update summary after deletion
      setCurrentSummary(calculateSummaryFromFirebase(newRegistrations, settings));

      const deletedPlayer = registration.players.find(p => p.id === playerId);

      // Log successful player deletion
      if (deletedPlayer) {
        RegistrationLogger.logRegistrationUpdated(registrationId, {
          action: 'PLAYER_REMOVED_FROM_REGISTRATION',
          removedPlayer: deletedPlayer.name,
          remainingPlayersCount: updatedPlayers.length,
          remainingPlayerNames: updatedPlayers.map(p => p.name)
        });
      }

      message.success(`Đã xóa ${deletedPlayer?.name} khỏi đăng ký!`);
    } catch (error) {
      // Log player deletion error
      RegistrationLogger.logRegistrationError('DELETE_PLAYER', (error as Error).message, {
        registrationId,
        playerId
      });
      message.error('Lỗi khi xóa người chơi: ' + (error as Error).message);
    }
  };

  // Handle data import from JSON file
  const handleDataImport = async (newSettings: AppSettings, newRegistrations: WeeklyRegistrationType[]) => {
    try {
      // Update database
      await DatabaseService.updateSettings(newSettings);

      // Clear existing registrations and add new ones
      const currentRegistrations = await DatabaseService.getRegistrations();
      for (const reg of currentRegistrations) {
        await DatabaseService.deleteRegistration(reg.id);
      }
      for (const reg of newRegistrations) {
        await DatabaseService.addRegistration(reg);
      }

      // Update local state
      setSettings(newSettings);
      setRegistrations(newRegistrations);

      // Update summary with new imported data
      setCurrentSummary(calculateSummaryFromFirebase(newRegistrations, newSettings));

      message.success('Đã nhập dữ liệu vào database Firestore!');
    } catch (error) {
      message.error('Lỗi khi nhập dữ liệu: ' + (error as Error).message);
    }
  };

  // Admin authentication handlers
  const handleAdminSuccess = () => {
    setIsAdmin(true);
    setShowAdminAuth(false);
    message.success('Đã xác thực admin thành công!');
  };

  const handleAdminCancel = () => {
    setShowAdminAuth(false);
  };

  const handleAdminLogout = () => {
    SecurityService.clearAdminSession();
    setIsAdmin(false);
    setActiveTab('register'); // Switch back to register tab
    message.info('🔐 Đã đăng xuất khỏi chế độ admin');
  };

  const handleAdminTabClick = () => {
    if (!isAdmin) {
      setShowAdminAuth(true);
    }
  };

  // Toggle registration status (admin only)
  const handleToggleRegistration = async () => {
    try {
      const newSettings = {
        ...settings,
        registrationEnabled: !settings.registrationEnabled
      };

      await handleSettingsChange(newSettings);

      const status = newSettings.registrationEnabled ? 'mở' : 'khóa';
      message.success(`Đã ${status} đăng ký thành công!`);
    } catch (error) {
      message.error('Lỗi khi thay đổi trạng thái đăng ký: ' + (error as Error).message);
    }
  };

  // Base tabs that are always visible
  const baseTabs = [
    {
      key: 'register',
      label: (
        <span>
          <CalendarOutlined />
          Đăng ký
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <WeeklyRegistration
            settings={settings}
            registrations={registrations}
            onRegistrationSubmit={handleRegistrationSubmit}
            isAdmin={isAdmin}
          />
          <Summary summary={currentSummary} settings={settings} />
        </Space>
      ),
    },
    {
      key: 'list',
      label: (
        <span>
          <UnorderedListOutlined />
          Danh sách
        </span>
      ),
      children: (
        <div style={{ position: 'relative' }}>
          <RegistrationList
            registrations={registrations}
            onDeleteRegistration={handleDeleteRegistration}
            onDeletePlayer={handleDeletePlayer}
            isAdmin={isAdmin}
            loading={isLoadingData}
          />
        </div>
      ),
    },
  ];

  // Admin tabs that require authentication
  const adminTabs = [
    {
      key: 'settings',
      label: (
        <span onClick={handleAdminTabClick}>
          <SettingOutlined />
          Cài đặt
          {!isAdmin && <LockOutlined style={{ marginLeft: '4px', fontSize: '12px' }} />}
        </span>
      ),
      children: isAdmin ? (
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
      ) : null,
    },
    {
      key: 'data',
      label: (
        <span onClick={handleAdminTabClick}>
          <FileTextOutlined />
          Dữ liệu
          {!isAdmin && <LockOutlined style={{ marginLeft: '4px', fontSize: '12px' }} />}
        </span>
      ),
      children: isAdmin ? (
        <DataManager
          settings={settings}
          registrations={registrations}
          onDataImport={handleDataImport}
        />
      ) : null,
    },
    {
      key: 'demo',
      label: (
        <span onClick={handleAdminTabClick}>
          <DatabaseOutlined />
          Demo DB
          {!isAdmin && <LockOutlined style={{ marginLeft: '4px', fontSize: '12px' }} />}
        </span>
      ),
      children: isAdmin ? <DatabaseDemo /> : null,
    },
    {
      key: 'security',
      label: (
        <span onClick={handleAdminTabClick}>
          🔐
          Bảo mật
          {!isAdmin && <LockOutlined style={{ marginLeft: '4px', fontSize: '12px' }} />}
        </span>
      ),
      children: isAdmin ? <SecurityDashboard /> : null,
    },
  ];

  // Combine tabs based on admin status
  const tabItems = isAdmin ? [...baseTabs, ...adminTabs] : [...baseTabs, ...adminTabs];

  // Handle tab change with admin check and auto-reload
  const handleTabChange = async (key: string) => {
    const adminTabKeys = ['settings', 'data', 'demo', 'security'];

    if (adminTabKeys.includes(key) && !isAdmin) {
      setShowAdminAuth(true);
      return;
    }

    setActiveTab(key);

    // Auto-reload data when switching to list tab
    if (key === 'list') {
      const timeSinceLastLoad = Date.now() - lastDataLoadTime.current;

      // Only reload if it's been more than 2 seconds since last load
      if (timeSinceLastLoad > 2000) {
        await reloadData(true);
      }
    }
  };

  return (
    <AntApp>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div className="flex items-center justify-between h-full">
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
              🏸 Quản lý đăng ký cầu lông
            </Title>

            {isAdmin && (
              <Space>
                <Button
                  type={settings.registrationEnabled ? "default" : "primary"}
                  onClick={handleToggleRegistration}
                  icon={settings.registrationEnabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '600',
                    fontSize: '16px',
                    color: settings.registrationEnabled ? '#ffffff' : '#ffffff',
                    backgroundColor: settings.registrationEnabled ? '#ff6b6b' : '#006600',
                    borderColor: settings.registrationEnabled ? '#ff6b6b' : '#006600',
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                    border: 'none'
                  }}
                >
                  {settings.registrationEnabled ? 'Khóa đăng ký' : 'Mở đăng ký'}
                </Button>

                <Button
                  type="text"
                  danger
                  onClick={handleAdminLogout}
                  icon={<LockOutlined />}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#ff4d4f',
                    fontWeight: 'bold'
                  }}
                >
                  Đăng xuất Admin
                </Button>
              </Space>
            )}
          </div>
        </Header>

        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
              size="large"
              centered
            />
          </div>
        </Content>

        {/* Admin Authentication Modal */}
        <AdminAuth
          visible={showAdminAuth}
          onSuccess={handleAdminSuccess}
          onCancel={handleAdminCancel}
        />
      </Layout>
    </AntApp>
  );
}

export default App;
