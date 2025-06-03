import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Alert, Statistic, Row, Col, message } from 'antd';
import { SafetyOutlined, DeleteOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { SecurityService } from '../services/securityService';
import type { AdminAction } from '../services/securityService';

const { Title, Text } = Typography;

interface SecurityEvent {
  event: string;
  details?: Record<string, unknown>;
  timestamp: string;
  userAgent: string;
  url: string;
}

interface SecuritySummary {
  isAdmin: boolean;
  sessionValid: boolean;
  totalAdminActions: number;
  totalSecurityEvents: number;
  lastAdminAction: string | null;
  lastSecurityEvent: string | null;
  sessionExpiry: string | null;
}

const SecurityDashboard: React.FC = () => {
  const [adminLogs, setAdminLogs] = useState<AdminAction[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityEvent[]>([]);
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary>({
    isAdmin: false,
    sessionValid: false,
    totalAdminActions: 0,
    totalSecurityEvents: 0,
    lastAdminAction: null,
    lastSecurityEvent: null,
    sessionExpiry: null
  });
  const [loading, setLoading] = useState(false);

  // Load security data
  const loadSecurityData = () => {
    setLoading(true);
    try {
      const logs = SecurityService.getAdminLogs();
      const secLogs = SecurityService.getSecurityLogs();
      const summary = SecurityService.getSecuritySummary();
      
      setAdminLogs(logs);
      setSecurityLogs(secLogs as unknown as SecurityEvent[]);
      setSecuritySummary(summary as unknown as SecuritySummary);
      
      SecurityService.logAdminAction('SECURITY_DASHBOARD_VIEWED', {
        logsCount: logs.length,
        securityEventsCount: secLogs.length
      });
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu bảo mật: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Clear all logs
  const handleClearLogs = () => {
    try {
      SecurityService.clearLogs();
      loadSecurityData();
      message.success('🗑️ Đã xóa tất cả logs bảo mật!');
    } catch (error) {
      message.error('Lỗi khi xóa logs: ' + (error as Error).message);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  // Admin logs table columns
  const adminLogColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => (
        <Text code>{new Date(timestamp).toLocaleString('vi-VN')}</Text>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const getColor = (action: string) => {
          if (action.includes('DELETE') || action.includes('RESET')) return 'red';
          if (action.includes('UPDATE') || action.includes('SETTINGS')) return 'orange';
          if (action.includes('LOGIN') || action.includes('SESSION')) return 'green';
          return 'blue';
        };
        return <Tag color={getColor(action)}>{action}</Tag>;
      },
    },
    {
      title: 'Chi tiết',
      dataIndex: 'details',
      key: 'details',
      render: (details: Record<string, unknown>) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {details ? JSON.stringify(details, null, 2).substring(0, 100) + '...' : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Session ID',
      dataIndex: 'sessionId',
      key: 'sessionId',
      width: 120,
      render: (sessionId: string) => (
        <Text code style={{ fontSize: '10px' }}>
          {sessionId ? sessionId.substring(0, 8) + '...' : 'N/A'}
        </Text>
      ),
    },
  ];

  // Security logs table columns
  const securityLogColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => (
        <Text code>{new Date(timestamp).toLocaleString('vi-VN')}</Text>
      ),
    },
    {
      title: 'Sự kiện',
      dataIndex: 'event',
      key: 'event',
      render: (event: string) => {
        const getColor = (event: string) => {
          if (event.includes('FAILED') || event.includes('UNAUTHORIZED')) return 'red';
          if (event.includes('EXPIRED')) return 'orange';
          return 'blue';
        };
        return <Tag color={getColor(event)}>{event}</Tag>;
      },
    },
    {
      title: 'Chi tiết',
      dataIndex: 'details',
      key: 'details',
      render: (details: Record<string, unknown>) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {details ? JSON.stringify(details, null, 2).substring(0, 100) + '...' : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 200,
      render: (url: string) => (
        <Text ellipsis style={{ maxWidth: 180 }}>
          {url || 'N/A'}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>
        <SafetyOutlined /> Dashboard Bảo mật
      </Title>
      
      <Alert
        message="🔐 Thông tin bảo mật"
        description="Dashboard này hiển thị tất cả hoạt động admin và sự kiện bảo mật. Dữ liệu được lưu trữ cục bộ và sẽ bị xóa khi clear browser data."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Security Summary */}
      <Card title="Tổng quan bảo mật" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Trạng thái Admin"
              value={securitySummary.isAdmin ? "Đã xác thực" : "Chưa xác thực"}
              prefix={securitySummary.isAdmin ? <CheckCircleOutlined /> : <WarningOutlined />}
              valueStyle={{ color: securitySummary.isAdmin ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Tổng hành động Admin"
              value={securitySummary.totalAdminActions || 0}
              prefix={<SafetyOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Sự kiện bảo mật"
              value={securitySummary.totalSecurityEvents || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: securitySummary.totalSecurityEvents > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Session hết hạn"
              value={securitySummary.sessionExpiry ? new Date(securitySummary.sessionExpiry).toLocaleString('vi-VN') : 'N/A'}
              valueStyle={{ fontSize: '12px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Action Buttons */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadSecurityData}
          loading={loading}
        >
          Tải lại
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleClearLogs}
        >
          Xóa tất cả logs
        </Button>
      </Space>

      {/* Admin Logs */}
      <Card title={`Logs hoạt động Admin (${adminLogs.length})`} style={{ marginBottom: 24 }}>
        <Table
          columns={adminLogColumns}
          dataSource={adminLogs.map((log, index) => ({ ...log, key: index }))}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          size="small"
        />
      </Card>

      {/* Security Events */}
      <Card title={`Sự kiện bảo mật (${securityLogs.length})`}>
        <Table
          columns={securityLogColumns}
          dataSource={securityLogs.map((log, index) => ({ ...log, key: index }))}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default SecurityDashboard;
