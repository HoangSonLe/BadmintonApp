import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, message, Divider } from 'antd';
import { DatabaseOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { DatabaseService } from '../services/databaseService';
import type { WeeklyRegistration, Player } from '../types';

const { Title, Text, Paragraph } = Typography;

const DatabaseDemo: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  const refreshStats = () => {
    const dbStats = DatabaseService.getStats();
    const metadata = DatabaseService.getMetadata();
    setStats({ ...dbStats, ...metadata });
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const createSampleData = () => {
    try {
      // Create sample registration
      const sampleRegistration: WeeklyRegistration = {
        id: Date.now().toString(),
        weekStart: new Date(),
        weekEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        players: [
          {
            id: '1',
            name: 'Nguyễn Văn A',
            registeredAt: new Date()
          },
          {
            id: '2',
            name: 'Trần Thị B',
            registeredAt: new Date()
          },
          {
            id: '3',
            name: 'Lê Văn C',
            registeredAt: new Date()
          }
        ] as Player[],
        settings: {
          courtsCount: 2,
          playersPerCourt: 4,
          extraCourtFee: 100000
        }
      };

      DatabaseService.addRegistration(sampleRegistration);
      refreshStats();
      message.success('Đã tạo dữ liệu mẫu thành công!');
    } catch (error) {
      message.error('Lỗi khi tạo dữ liệu mẫu: ' + (error as Error).message);
    }
  };

  const createMockData = () => {
    try {
      DatabaseService.createMockData();
      refreshStats();
      message.success('Đã tạo 5 tuần dữ liệu mock với 38 người chơi!');

      // Reload trang để cập nhật UI
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      message.error('Lỗi khi tạo mock data: ' + (error as Error).message);
    }
  };

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined />
          <span>Demo Database JSON</span>
        </Space>
      }
      style={{ marginBottom: '16px' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>Thống kê Database hiện tại</Title>
          {stats && (
            <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>📊 Tổng đăng ký: <strong>{stats.totalRegistrations}</strong></Text>
                <Text>👥 Tổng người chơi: <strong>{stats.totalPlayers}</strong></Text>
                <Text>💾 Kích thước database: <strong>{Math.round(stats.databaseSize / 1024)} KB</strong></Text>
                <Text>🔖 Phiên bản: <strong>{stats.version}</strong></Text>
                <Text>🕒 Cập nhật lần cuối: <strong>{new Date(stats.lastUpdated).toLocaleString('vi-VN')}</strong></Text>
              </Space>
            </div>
          )}
        </div>

        <Divider />

        <div>
          <Title level={4}>Thao tác Demo</Title>
          <Paragraph type="secondary">
            Các thao tác này sẽ giúp bạn test chức năng database JSON.
          </Paragraph>
          
          <Space wrap>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={createMockData}
              size="large"
            >
              🎯 Tạo Mock Data (5 tuần)
            </Button>

            <Button
              icon={<PlayCircleOutlined />}
              onClick={createSampleData}
            >
              Tạo 1 đăng ký mẫu
            </Button>

            <Button
              onClick={refreshStats}
            >
              Refresh thống kê
            </Button>

            <Button
              onClick={() => {
                DatabaseService.exportToFile();
                message.success('Đã xuất database!');
              }}
            >
              Xuất Database
            </Button>

            <Button
              danger
              onClick={() => {
                DatabaseService.resetDatabase();
                refreshStats();
                message.success('Đã reset database!');
              }}
            >
              Reset Database
            </Button>
          </Space>
        </div>

        <Divider />

        <div>
          <Title level={4}>💡 Hướng dẫn sử dụng Mock Data</Title>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>🎯 Mock Data (5 tuần):</strong> Tạo 5 tuần đăng ký với 38 người chơi khác nhau</li>
            <li><strong>📅 Thời gian:</strong> Tuần này, tuần trước, 2 tuần trước, 3 tuần trước, tháng trước</li>
            <li><strong>👥 Số người:</strong> Từ 4-11 người mỗi tuần để test các trường hợp khác nhau</li>
            <li><strong>🏸 Test Filter:</strong> Có thể test filter theo tuần/tháng/năm</li>
            <li><strong>📊 Test Thống kê:</strong> Xem thống kê tổng quan và chi tiết từng tuần</li>
            <li><strong>💰 Test Phí:</strong> Một số tuần có phí thêm sân, một số không</li>
          </ul>

          <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae7ff' }}>
            <Text strong style={{ color: '#1890ff' }}>💡 Tip: </Text>
            <Text>Sau khi tạo Mock Data, hãy chuyển sang tab "Danh sách" để xem UI đầy đủ với filter và thống kê!</Text>
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default DatabaseDemo;
