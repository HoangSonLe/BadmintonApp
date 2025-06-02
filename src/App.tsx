import { useState, useEffect } from 'react';
import { Layout, Tabs, Typography, Space, message } from 'antd';
import { CalendarOutlined, UnorderedListOutlined, SettingOutlined, FileTextOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { AppSettings, WeeklyRegistration as WeeklyRegistrationType, RegistrationSummary } from './types';
import Settings from './components/Settings';
import WeeklyRegistration from './components/WeeklyRegistration';
import Summary from './components/Summary';
import RegistrationList from './components/RegistrationList';
import DataManager from './components/DataManager';
import DatabaseDemo from './components/DatabaseDemo';
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
  const [currentSummary, setCurrentSummary] = useState<RegistrationSummary | null>(null);

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
  }, []);

  // Handle settings change
  const handleSettingsChange = async (newSettings: AppSettings) => {
    try {
      setSettings(newSettings);
      await DatabaseService.updateSettings(newSettings);
      message.success('Cài đặt đã được lưu vào database Firestore!');
    } catch (error) {
      message.error('Lỗi khi lưu cài đặt: ' + (error as Error).message);
    }
  };

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
      feePerExtraPlayer
    };
  };

  // Handle new registration submission
  const handleRegistrationSubmit = async (registration: WeeklyRegistrationType) => {
    try {
      // Save to database
      await DatabaseService.addRegistration(registration);

      // Update local state
      const newRegistrations = [...registrations, registration];
      setRegistrations(newRegistrations);

      // Calculate and show summary
      const summary = calculateSummary(registration);
      setCurrentSummary(summary);

      message.success('Đăng ký đã được lưu vào database Firestore!');
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
      message.success('Đã xóa đăng ký khỏi database Firestore!');
    } catch (error) {
      message.error('Lỗi khi xóa đăng ký: ' + (error as Error).message);
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

      // Clear current summary
      setCurrentSummary(null);

      message.success('Đã nhập dữ liệu vào database Firestore!');
    } catch (error) {
      message.error('Lỗi khi nhập dữ liệu: ' + (error as Error).message);
    }
  };

  const tabItems = [
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
            onRegistrationSubmit={handleRegistrationSubmit}
          />
          {currentSummary && <Summary summary={currentSummary} />}
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
        />
      ),
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          Cài đặt
        </span>
      ),
      children: (
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
      ),
    },
    {
      key: 'data',
      label: (
        <span>
          <FileTextOutlined />
          Dữ liệu
        </span>
      ),
      children: (
        <DataManager
          settings={settings}
          registrations={registrations}
          onDataImport={handleDataImport}
        />
      ),
    },
    {
      key: 'demo',
      label: (
        <span>
          <DatabaseOutlined />
          Demo DB
        </span>
      ),
      children: <DatabaseDemo />,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div className="flex items-center justify-center h-full">
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            🏸 Quản lý đăng ký cầu lông
          </Title>
        </div>
      </Header>

      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            centered
          />
        </div>
      </Content>
    </Layout>
  );
}

export default App;
