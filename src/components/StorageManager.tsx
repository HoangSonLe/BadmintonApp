import React, { useState } from 'react';
import { Card, Typography, Table, Button, Space, Tag, Alert, Modal, message, Descriptions } from 'antd';
import { DatabaseOutlined, DeleteOutlined, EyeOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { StorageService, STORAGE_KEYS, LEGACY_KEYS } from '../config/storageKeys';

const { Title, Text } = Typography;

interface StorageItem {
  key: string;
  name: string;
  value: string | null;
  size: number;
  type: 'current' | 'legacy';
}

const StorageManager: React.FC = () => {
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get all storage data
  const getStorageData = (): StorageItem[] => {
    const items: StorageItem[] = [];

    // Current storage keys
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const value = localStorage.getItem(key);
      items.push({
        key,
        name,
        value,
        size: value ? new Blob([value]).size : 0,
        type: 'current'
      });
    });

    // Legacy storage keys
    Object.entries(LEGACY_KEYS).forEach(([name, key]) => {
      const value = localStorage.getItem(key);
      if (value) { // Only show legacy keys that exist
        items.push({
          key,
          name: `${name} (Legacy)`,
          value,
          size: new Blob([value]).size,
          type: 'legacy'
        });
      }
    });

    return items;
  };

  const storageData = getStorageData();

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle view details
  const handleViewDetails = (item: StorageItem) => {
    setSelectedItem(item);
    setViewModalVisible(true);
  };

  // Handle clear legacy data
  const handleClearLegacyData = () => {
    Modal.confirm({
      title: 'Xóa dữ liệu cũ',
      content: 'Bạn có chắc chắn muốn xóa tất cả dữ liệu localStorage cũ? Hành động này không thể hoàn tác.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: () => {
        Object.values(LEGACY_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
        setRefreshKey(prev => prev + 1);
        message.success('Đã xóa tất cả dữ liệu localStorage cũ!');
      }
    });
  };

  // Handle clear all app data
  const handleClearAllData = () => {
    Modal.confirm({
      title: 'Xóa tất cả dữ liệu ứng dụng',
      content: 'Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu localStorage của ứng dụng? Bao gồm cả database, logs, và session. Hành động này không thể hoàn tác.',
      okText: 'Xóa tất cả',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: () => {
        StorageService.clearAll();
        Object.values(LEGACY_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
        setRefreshKey(prev => prev + 1);
        message.success('Đã xóa tất cả dữ liệu localStorage!');
      }
    });
  };

  // Handle migrate legacy data
  const handleMigrateLegacyData = () => {
    if (!StorageService.hasLegacyData()) {
      message.info('Không có dữ liệu cũ nào cần migrate!');
      return;
    }

    Modal.confirm({
      title: 'Migrate dữ liệu cũ',
      content: 'Bạn có muốn migrate dữ liệu từ localStorage keys cũ sang keys mới không?',
      okText: 'Migrate',
      cancelText: 'Hủy',
      onOk: () => {
        StorageService.migrateLegacyData();
        setRefreshKey(prev => prev + 1);
        message.success('Đã migrate dữ liệu thành công!');
      }
    });
  };

  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: StorageItem) => (
        <Space>
          <span>{name}</span>
          <Tag color={record.type === 'current' ? 'blue' : 'orange'}>
            {record.type === 'current' ? 'Hiện tại' : 'Cũ'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => <Text code>{key}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'value',
      key: 'status',
      render: (value: string | null) => (
        <Tag color={value ? 'green' : 'red'}>
          {value ? 'Có dữ liệu' : 'Trống'}
        </Tag>
      ),
    },
    {
      title: 'Kích thước',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatSize(size),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: StorageItem) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            disabled={!record.value}
            size="small"
          >
            Xem
          </Button>
        </Space>
      ),
    },
  ];

  const hasLegacyData = StorageService.hasLegacyData();

  return (
    <div key={refreshKey}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '22px',
          boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
        }}>
          <DatabaseOutlined />
        </div>
        <Title level={2} className="mb-0" style={{
          color: '#52c41a',
          fontSize: '26px',
          fontWeight: 600,
          lineHeight: 1.2,
          marginTop: '2px'
        }}>
          Quản lý localStorage
        </Title>
      </div>

      <Alert
        message="🔧 Quản lý localStorage Keys"
        description="Trang này cho phép bạn xem và quản lý các localStorage keys của ứng dụng. Các keys mới sử dụng prefix để tránh conflict với ứng dụng khác."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: '24px' }}
      />

      {hasLegacyData && (
        <Alert
          message="⚠️ Phát hiện dữ liệu cũ"
          description="Hệ thống phát hiện có dữ liệu localStorage sử dụng keys cũ. Bạn có thể migrate sang keys mới hoặc xóa chúng."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          action={
            <Space>
              <Button size="small" onClick={handleMigrateLegacyData}>
                Migrate
              </Button>
              <Button size="small" danger onClick={handleClearLegacyData}>
                Xóa dữ liệu cũ
              </Button>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        />
      )}

      <Card
        title="Danh sách localStorage Keys"
        extra={
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={handleClearAllData}
          >
            Xóa tất cả
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={storageData.map((item, index) => ({ ...item, key: `${item.key}-${index}` }))}
          pagination={false}
          size="small"
        />
      </Card>

      {/* View Details Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>Chi tiết localStorage</span>
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setViewModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width="80%"
        style={{ top: 20 }}
      >
        {selectedItem && (
          <div>
            <Descriptions
              bordered
              column={1}
              size="small"
              style={{
                backgroundColor: '#fafafa',
                borderRadius: '6px',
                padding: '8px 12px'
              }}
            >
              <Descriptions.Item label="Tên">
                <Text strong>{selectedItem.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Key">
                <Text code>{selectedItem.key}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Kích thước">
                <Text>{formatSize(selectedItem.size)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Loại">
                <Tag color={selectedItem.type === 'current' ? 'blue' : 'orange'}>
                  {selectedItem.type === 'current' ? 'Key hiện tại' : 'Key cũ'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: '16px' }}>
              <Text strong>Nội dung:</Text>
              <pre style={{
                background: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                marginTop: '8px',
                maxHeight: '400px',
                overflow: 'auto',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {selectedItem.value ? JSON.stringify(JSON.parse(selectedItem.value), null, 2) : 'Không có dữ liệu'}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StorageManager;
