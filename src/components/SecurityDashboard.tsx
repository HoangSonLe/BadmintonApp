import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Alert, Statistic, Row, Col, message, Switch, Modal, Descriptions } from 'antd';
import { SafetyOutlined, DeleteOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined, CloudOutlined, DatabaseOutlined, EyeOutlined } from '@ant-design/icons';
import { SecurityService } from '../services/securityService';
import { FirestoreService } from '../services/firestoreService';
import type { AdminAction, SecurityEvent } from '../services/securityService';

const { Title, Text } = Typography;

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
  const [useFirebase, setUseFirebase] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminAction | SecurityEvent | null>(null);

  // Load security data (internal function)
  const loadSecurityData = useCallback(async (logAction = false) => {
    setLoading(true);
    try {
      let logs: AdminAction[] = [];
      let secLogs: SecurityEvent[] = [];

      if (useFirebase) {
        // Load from Firebase
        const [firebaseAdminLogs, firebaseSecurityLogs] = await Promise.all([
          FirestoreService.getAdminLogsFromFirebase(),
          FirestoreService.getSecurityLogsFromFirebase()
        ]);

        logs = firebaseAdminLogs;
        secLogs = firebaseSecurityLogs;
      } else {
        // Load from localStorage
        logs = SecurityService.getAdminLogs();
        secLogs = SecurityService.getSecurityLogs();
      }

      const summary = SecurityService.getSecuritySummary();

      setAdminLogs(logs);
      setSecurityLogs(secLogs);
      setSecuritySummary(summary as unknown as SecuritySummary);

      // Only log if explicitly requested
      if (logAction) {
        SecurityService.logAdminAction('SECURITY_DASHBOARD_VIEWED', {
          logsCount: logs.length,
          securityEventsCount: secLogs.length,
          dataSource: useFirebase ? 'firebase' : 'localStorage'
        });
      }
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu bảo mật: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [useFirebase]);

  // Handle manual reload button
  const handleReloadData = () => {
    loadSecurityData(false); // Don't log the view action again
    message.success('🔄 Đã tải lại dữ liệu bảo mật!');
  };

  // Clear all logs
  const handleClearLogs = async () => {
    setLoading(true);
    try {
      // Clear localStorage logs
      SecurityService.clearLogs();

      // Clear Firebase logs
      await FirestoreService.clearAllLogsFromFirebase();

      // Reload data to reflect changes
      await loadSecurityData(false);

      message.success('🗑️ Đã xóa tất cả logs bảo mật từ cả LocalStorage và Firebase!');
    } catch (error) {
      message.error('Lỗi khi xóa logs: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData(true); // Log the initial view
  }, [loadSecurityData]); // Reload when data source changes

  // Handle view log details
  const handleViewDetails = (log: AdminAction | SecurityEvent) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setDetailModalVisible(false);
    setSelectedLog(null);
  };

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
          if (action.includes('RELOADED') || action.includes('VIEWED')) return 'cyan';
          if (action.includes('REGISTRATION')) return 'purple';
          if (action.includes('DUPLICATE')) return 'volcano';
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
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record: AdminAction) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
          size="small"
        >
          Chi tiết
        </Button>
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
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record: SecurityEvent) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
          size="small"
        >
          Chi tiết
        </Button>
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

      {/* Data Source Switch */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space align="center">
          <DatabaseOutlined />
          <span>Nguồn dữ liệu:</span>
          <Switch
            checked={useFirebase}
            onChange={setUseFirebase}
            checkedChildren={<CloudOutlined />}
            unCheckedChildren="Local"
            loading={loading}
          />
          <span style={{ color: useFirebase ? '#1890ff' : '#666' }}>
            {useFirebase ? 'Firebase (Bền vững)' : 'LocalStorage (Tạm thời)'}
          </span>
        </Space>
      </Card>

      {/* Action Buttons */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleReloadData}
          loading={loading}
        >
          Tải lại
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleClearLogs}
          loading={loading}
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

      {/* Log Detail Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>Chi tiết Log</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseModal}>
            Đóng
          </Button>
        ]}
        width="90%"
        style={{
          top: 20,
          maxWidth: '900px'
        }}
        styles={{
          body: {
            maxHeight: '70vh',
            overflow: 'auto'
          }
        }}
      >
        {selectedLog && (
          <Descriptions
            bordered
            column={1}
            size="small"
            style={{
              marginTop: 16,
              background: '#fff'
            }}
            labelStyle={{
              background: '#fafafa',
              fontWeight: 600,
              width: '120px',
              padding: '8px 12px'
            }}
            contentStyle={{
              background: '#fff',
              padding: '8px 12px'
            }}
          >
            <Descriptions.Item label="Thời gian">
              <Text code>{new Date(selectedLog.timestamp).toLocaleString('vi-VN')}</Text>
            </Descriptions.Item>

            {'action' in selectedLog ? (
              <Descriptions.Item label="Hành động">
                <Tag color="blue">{selectedLog.action}</Tag>
              </Descriptions.Item>
            ) : (
              <Descriptions.Item label="Sự kiện">
                <Tag color="orange">{selectedLog.event}</Tag>
              </Descriptions.Item>
            )}

            {selectedLog.details && (
              <Descriptions.Item label="Chi tiết">
                <pre style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  maxHeight: '300px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </Descriptions.Item>
            )}

            {'sessionId' in selectedLog && selectedLog.sessionId && (
              <Descriptions.Item label="Session ID">
                <Text code>{selectedLog.sessionId}</Text>
              </Descriptions.Item>
            )}

            {'userAgent' in selectedLog && selectedLog.userAgent && (
              <Descriptions.Item label="User Agent">
                <div style={{
                  background: '#f9f9f9',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  wordBreak: 'break-all',
                  lineHeight: '1.3',
                  maxHeight: '80px',
                  overflow: 'auto'
                }}>
                  {selectedLog.userAgent}
                </div>
              </Descriptions.Item>
            )}

            {'url' in selectedLog && selectedLog.url && (
              <Descriptions.Item label="URL">
                <Text code>{selectedLog.url}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default SecurityDashboard;
