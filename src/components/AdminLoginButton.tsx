import React from 'react';
import { Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';

interface AdminLoginButtonProps {
  onClick: () => void;
}

const AdminLoginButton: React.FC<AdminLoginButtonProps> = ({ onClick }) => {
  return (
    <Button
      type="text"
      onClick={onClick}
      icon={<LockOutlined />}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: '#1890ff',
        fontWeight: '600',
        fontSize: '14px'
      }}
    >
      Admin Login
    </Button>
  );
};

export default AdminLoginButton;
