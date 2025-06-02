import React, { useState } from 'react';
import {
  Card,
  Button,
  Upload,
  Space,
  Typography,
  message,
  Modal,
  Divider,
  Alert,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  DownloadOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { AppSettings, WeeklyRegistration } from '../types';
import { DatabaseService } from '../services/databaseService';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

interface DataManagerProps {
  settings: AppSettings;
  registrations: WeeklyRegistration[];
  onDataImport: (settings: AppSettings, registrations: WeeklyRegistration[]) => void;
}

const DataManager: React.FC<DataManagerProps> = ({
  settings,
  onDataImport
}) => {
  const [uploading, setUploading] = useState(false);

  // Handle data export
  const handleExport = () => {
    try {
      DatabaseService.exportToFile();
      message.success('Database JSON đã được xuất thành công!');
    } catch (error) {
      message.error('Lỗi khi xuất database: ' + (error as Error).message);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: UploadFile) => {
    if (!file.originFileObj) {
      message.error('Không thể đọc file');
      return false;
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      message.error('Vui lòng chọn file JSON');
      return false;
    }

    setUploading(true);

    try {
      await DatabaseService.importFromFile(file.originFileObj);

      // Reload data from database
      const newSettings = DatabaseService.getSettings();
      const newRegistrations = DatabaseService.getRegistrations();

      // Show confirmation dialog
      confirm({
        title: 'Xác nhận nhập database',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <Paragraph>
              Database đã được tải thành công! Bạn có muốn cập nhật giao diện với dữ liệu mới không?
            </Paragraph>
            <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px' }}>
              <Text strong>Thông tin database:</Text>
              <br />
              <Text>• Số lượng đăng ký: {newRegistrations.length}</Text>
              <br />
              <Text>• Tổng người chơi: {newRegistrations.reduce((sum, reg) => sum + reg.players.length, 0)}</Text>
            </div>
          </div>
        ),
        okText: 'Cập nhật giao diện',
        cancelText: 'Hủy',
        okType: 'primary',
        onOk: () => {
          onDataImport(newSettings, newRegistrations);
          message.success('Đã cập nhật giao diện với database mới!');
        },
      });
    } catch (error) {
      message.error('Lỗi khi nhập database: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }

    return false; // Prevent default upload behavior
  };

  // Get database stats
  const dbStats = DatabaseService.getStats();
  const metadata = DatabaseService.getMetadata();

  return (
    <Card title={
      <Space>
        <DatabaseOutlined />
        <span>Quản lý Database JSON</span>
      </Space>
    }>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Database Statistics */}
        <div>
          <Title level={4}>Thống kê Database</Title>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Tổng đăng ký"
                value={dbStats.totalRegistrations}
                prefix="📊"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Tổng người chơi"
                value={dbStats.totalPlayers}
                prefix="👥"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Kích thước DB"
                value={Math.round(dbStats.databaseSize / 1024)}
                suffix="KB"
                prefix="💾"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Phiên bản"
                value={metadata.version}
                prefix="🔖"
              />
            </Col>
          </Row>

          <div style={{ marginTop: '16px', background: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
            <Space direction="vertical" size="small">
              <Text>🏸 Số sân mặc định: <strong>{settings.courtsCount}</strong></Text>
              <Text>👤 Người chơi/sân: <strong>{settings.playersPerCourt}</strong></Text>
              <Text>💰 Phí sân thêm: <strong>{settings.extraCourtFee.toLocaleString('vi-VN')} VNĐ</strong></Text>
              <Text>🕒 Cập nhật lần cuối: <strong>{new Date(metadata.lastUpdated).toLocaleString('vi-VN')}</strong></Text>
            </Space>
          </div>
        </div>

        <Divider />

        {/* Export Section */}
        <div>
          <Title level={4}>Xuất Database</Title>
          <Paragraph type="secondary">
            Xuất toàn bộ database JSON ra file để sao lưu hoặc chuyển sang thiết bị khác.
          </Paragraph>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            size="large"
          >
            Xuất Database JSON
          </Button>
        </div>

        <Divider />

        {/* Import Section */}
        <div>
          <Title level={4}>Nhập Database</Title>
          <Paragraph type="secondary">
            Nhập database từ file JSON đã xuất trước đó. Database hiện tại sẽ bị thay thế hoàn toàn.
          </Paragraph>

          <Alert
            message="Cảnh báo"
            description="Việc nhập database sẽ thay thế toàn bộ dữ liệu hiện tại trong localStorage. Hãy chắc chắn bạn đã sao lưu database quan trọng."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Upload
            accept=".json"
            beforeUpload={handleFileUpload}
            showUploadList={false}
            disabled={uploading}
          >
            <Button
              icon={<UploadOutlined />}
              loading={uploading}
              size="large"
            >
              {uploading ? 'Đang xử lý...' : 'Chọn file Database JSON'}
            </Button>
          </Upload>
        </div>

        <Divider />

        {/* Database Actions */}
        <div>
          <Title level={4}>Thao tác Database</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                window.location.reload();
              }}
            >
              Tải lại trang
            </Button>
            <Button
              danger
              onClick={() => {
                confirm({
                  title: 'Xác nhận reset database',
                  content: 'Bạn có chắc chắn muốn reset database về trạng thái mặc định? Tất cả dữ liệu sẽ bị xóa.',
                  onOk: () => {
                    DatabaseService.resetDatabase();
                    window.location.reload();
                  }
                });
              }}
            >
              Reset Database
            </Button>
          </Space>
        </div>

        <Divider />

        {/* Tips */}
        <div>
          <Title level={4}>💡 Hướng dẫn sử dụng Database JSON</Title>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>Database ảo:</strong> Dữ liệu được lưu trong localStorage như một database JSON</li>
            <li><strong>Tự động lưu:</strong> Mỗi thao tác đăng ký/cài đặt sẽ tự động cập nhật database</li>
            <li><strong>Xuất/Nhập:</strong> Có thể xuất database ra file và nhập lại khi cần</li>
            <li><strong>Sao lưu:</strong> Nên xuất database thường xuyên để tạo bản sao lưu</li>
            <li><strong>Chia sẻ:</strong> File JSON có thể chia sẻ với người khác để chuyển dữ liệu</li>
            <li><strong>Xem nội dung:</strong> File JSON có thể mở bằng notepad để xem chi tiết</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};

export default DataManager;
