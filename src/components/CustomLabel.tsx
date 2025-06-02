import React from 'react';

interface CustomLabelProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const CustomLabel: React.FC<CustomLabelProps> = ({ icon, children, className = '' }) => {
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '12px',
    minHeight: '40px',
    padding: '4px 0',
    fontWeight: 600,
    fontSize: '18px',
    color: '#1890ff',
    lineHeight: 1.3
  };

  const iconStyle = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '18px',
    boxShadow: '0 2px 8px rgba(82, 196, 26, 0.4)'
  };

  const textStyle = {
    flex: 1,
    lineHeight: 1.4,
    fontSize: '17px',
    fontWeight: 600,
    marginTop: '2px',
    color: '#1890ff'
  };

  return (
    <div className={`custom-label ${className}`} style={containerStyle}>
      <span className="custom-label-icon" style={iconStyle}>
        {icon}
      </span>
      <span className="custom-label-text" style={textStyle}>
        {children}
      </span>
    </div>
  );
};

export default CustomLabel;
