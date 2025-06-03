import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Input, Space, Alert, message, Descriptions, Spin } from 'antd';
import { KeyOutlined, SaveOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { FirestoreService } from '../services/firestoreService';
import type { AdminConfig } from '../services/firestoreService';

const { Title, Text } = Typography;

const AdminConfigManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // Load admin config from Firebase
  const loadAdminConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const config = await FirestoreService.getAdminConfig();
      setAdminConfig(config);
    } catch (error) {
      console.error('Error loading admin config:', error);
      setError('Không thể tải cấu hình admin từ Firebase');
    } finally {
      setLoading(false);
    }
  };

  // Update admin password
  const updateAdminPassword = async () => {
    if (!newPassword.trim()) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await FirestoreService.updateAdminPassword(newPassword);
      message.success('Cập nhật mật khẩu admin thành công!');
      setNewPassword('');
      setConfirmPassword('');
      await loadAdminConfig(); // Reload config
    } catch (error) {
      console.error('Error updating admin password:', error);
      setError('Không thể cập nhật mật khẩu admin');
    } finally {
      setSaving(false);
    }
  };

  // Test Firebase connection and admin config
  const testCurrentPassword = async () => {
    try {
      const adminConfig = await FirestoreService.getAdminConfig();
      if (adminConfig.passwordHash) {
        message.success('Kết nối Firebase thành công! Cấu hình admin đã được tải.');
      } else {
        message.warning('Kết nối thành công nhưng không tìm thấy hash mật khẩu.');
      }
    } catch (error) {
      console.error('Error testing Firebase connection:', error);
      message.error('Không thể kết nối đến Firebase hoặc tải cấu hình admin');
    }
  };

  useEffect(() => {
    loadAdminConfig();
  }, []);

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Đang tải cấu hình admin...</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>Quản lý Cấu hình Admin</span>
          </Space>
        }
        extra={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadAdminConfig}
            loading={loading}
          >
            Tải lại
          </Button>
        }
      >
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {adminConfig && (
          <div style={{ marginBottom: '24px' }}>
            <Title level={4}>Thông tin cấu hình hiện tại</Title>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Phiên bản">
                {adminConfig.version}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {adminConfig.createdAt && adminConfig.createdAt.toDate ?
                  adminConfig.createdAt.toDate().toLocaleString('vi-VN') :
                  'Không có thông tin'
                }
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật lần cuối">
                {adminConfig.lastUpdated && adminConfig.lastUpdated.toDate ?
                  adminConfig.lastUpdated.toDate().toLocaleString('vi-VN') :
                  'Không có thông tin'
                }
              </Descriptions.Item>
              <Descriptions.Item label="Bảo mật">
                <Space>
                  <Text code>Mật khẩu được mã hóa an toàn</Text>
                  <Button size="small" onClick={testCurrentPassword}>
                    Kiểm tra kết nối
                  </Button>
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}

        <Card 
          title={
            <Space>
              <KeyOutlined />
              <span>Cập nhật mật khẩu Admin</span>
            </Space>
          }
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Mật khẩu mới:</Text>
              <Input.Password
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                style={{ marginTop: '8px' }}
              />
            </div>

            <div>
              <Text strong>Xác nhận mật khẩu:</Text>
              <Input.Password
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                style={{ marginTop: '8px' }}
              />
            </div>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={updateAdminPassword}
              loading={saving}
              disabled={!newPassword || !confirmPassword}
              style={{ marginTop: '16px' }}
            >
              Cập nhật mật khẩu
            </Button>
          </Space>
        </Card>

        <Alert
          message="Lưu ý bảo mật"
          description="Mật khẩu admin được mã hóa an toàn và chỉ lưu trữ hash trong Firebase. Mật khẩu gốc không bao giờ được lưu trữ dưới dạng văn bản thuần túy. Hãy chọn mật khẩu mạnh và bảo mật."
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </Card>
    </div>
  );
};

export default AdminConfigManager;
