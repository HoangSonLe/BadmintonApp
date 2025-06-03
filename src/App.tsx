import { useState, useEffect, useCallback } from 'react';
import { Layout, Tabs, Typography, Space, message, Button } from 'antd';
import { CalendarOutlined, UnorderedListOutlined, SettingOutlined, FileTextOutlined, DatabaseOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { AppSettings, WeeklyRegistration as WeeklyRegistrationType, RegistrationSummary } from './types';
import Settings from './components/Settings';
import WeeklyRegistration from './components/WeeklyRegistration';
import Summary from './components/Summary';
import RegistrationList from './components/RegistrationList';
import DataManager from './components/DataManager';
import DatabaseDemo from './components/DatabaseDemo';
import AdminAuth from './components/AdminAuth';
import { DatabaseService } from './services/databaseService';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const [activeTab, setActiveTab] = useState<string>('register');
  const [settings, setSettings] = useState<AppSettings>({
    courtsCount: 2,
    playersPerCourt: 4,
    extraCourtFee: 100000
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

  // Check admin status from localStorage on component mount
  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin');
    const adminAuthTime = localStorage.getItem('adminAuthTime');

    if (adminStatus === 'true' && adminAuthTime) {
      // Check if admin session is still valid (24 hours)
      const authTime = parseInt(adminAuthTime);
      const currentTime = Date.now();
      const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (currentTime - authTime < sessionDuration) {
        setIsAdmin(true);
      } else {
        // Session expired, clear localStorage
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('adminAuthTime');
      }
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

    // Calculate next week dates (same logic as WeeklyRegistration)
    const nextWeek = dayjs().add(1, 'week').startOf('week').add(1, 'day'); // Monday của tuần tiếp theo
    const nextWeekStart = nextWeek.toDate();
    const nextWeekEnd = nextWeek.endOf('week').add(1, 'day').toDate(); // Sunday

    // Find registration for next week
    return registrations.find(reg => {
      const regStart = new Date(reg.weekStart);
      const regEnd = new Date(reg.weekEnd);
      return regStart.getTime() === nextWeekStart.getTime() && regEnd.getTime() === nextWeekEnd.getTime();
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

  // Initialize database and load data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database
        await DatabaseService.initializeDatabase();

        // Load data from Firestore database
        const dbSettings = await DatabaseService.getSettings();
        const dbRegistrations = await DatabaseService.getRegistrations();

        setSettings(dbSettings);
        setRegistrations(dbRegistrations);

        // Initialize summary with Firebase data
        setCurrentSummary(calculateSummaryFromFirebase(dbRegistrations, dbSettings));

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
  }, [calculateSummaryFromFirebase]);

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

      message.success('Cài đặt đã được lưu và áp dụng cho tuần hiện tại!');
    } catch (error) {
      message.error('Lỗi khi lưu cài đặt: ' + (error as Error).message);
    }
  };



  // Check if registration exists for the same week
  const findExistingRegistrationForWeek = (weekStart: Date, weekEnd: Date): WeeklyRegistrationType | null => {
    return registrations.find(reg => {
      const regStart = new Date(reg.weekStart);
      const regEnd = new Date(reg.weekEnd);
      return regStart.getTime() === weekStart.getTime() && regEnd.getTime() === weekEnd.getTime();
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

        if (newPlayers.length === 0) {
          message.warning('Tất cả người chơi đã được đăng ký cho tuần này rồi!');
          return;
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

        message.success('Đăng ký đã được lưu vào database Firestore!');
      }
    } catch (error) {
      message.error('Lỗi khi lưu đăng ký: ' + (error as Error).message);
    }
  };

  // Handle registration deletion
  const handleDeleteRegistration = async (id: string) => {
    try {
      await DatabaseService.deleteRegistration(id);
      const newRegistrations = registrations.filter(reg => reg.id !== id);
      setRegistrations(newRegistrations);

      // Update summary after deletion
      setCurrentSummary(calculateSummaryFromFirebase(newRegistrations, settings));

      message.success('Đã xóa đăng ký khỏi database Firestore!');
    } catch (error) {
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
      message.success(`Đã xóa ${deletedPlayer?.name} khỏi đăng ký!`);
    } catch (error) {
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
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminAuthTime');
    setActiveTab('register'); // Switch back to register tab
    message.info('Đã đăng xuất khỏi chế độ admin');
  };

  const handleAdminTabClick = () => {
    if (!isAdmin) {
      setShowAdminAuth(true);
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
        <RegistrationList
          registrations={registrations}
          onDeleteRegistration={handleDeleteRegistration}
          onDeletePlayer={handleDeletePlayer}
          isAdmin={isAdmin}
        />
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
  ];

  // Combine tabs based on admin status
  const tabItems = isAdmin ? [...baseTabs, ...adminTabs] : [...baseTabs, ...adminTabs];

  // Handle tab change with admin check
  const handleTabChange = (key: string) => {
    const adminTabKeys = ['settings', 'data', 'demo'];

    if (adminTabKeys.includes(key) && !isAdmin) {
      setShowAdminAuth(true);
      return;
    }

    setActiveTab(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div className="flex items-center justify-between h-full">
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            🏸 Quản lý đăng ký cầu lông
          </Title>

          {isAdmin && (
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
  );
}

export default App;
