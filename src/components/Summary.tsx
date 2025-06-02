import React from 'react';
import { Card, Row, Col, Statistic, Alert, Typography } from 'antd';
import { UserOutlined, HomeOutlined, DollarOutlined, BarChartOutlined, CalendarOutlined } from '@ant-design/icons';
import type { RegistrationSummary } from '../types';

const { Title } = Typography;

interface SummaryProps {
  summary: RegistrationSummary;
  settings: {
    courtsCount: number;
    playersPerCourt: number;
    extraCourtFee: number;
  };
}

const Summary: React.FC<SummaryProps> = ({ summary, settings }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const formatDateShort = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <Card className="fade-in-up" style={{ marginTop: '24px' }}>
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
          <BarChartOutlined />
        </div>
        <div>
          <Title level={2} className="mb-0" style={{
            color: '#52c41a',
            fontSize: '26px',
            fontWeight: 600,
            lineHeight: 1.2,
            marginTop: '2px',
            marginBottom: '4px'
          }}>
            Tổng kết đăng ký
          </Title>
          {summary.weekInfo ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#666',
              fontSize: '14px'
            }}>
              <CalendarOutlined style={{ color: '#52c41a' }} />
              <span>
                Tuần: {formatDateShort(summary.weekInfo.weekStart)} - {formatDateShort(summary.weekInfo.weekEnd)}
              </span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#999',
              fontSize: '14px'
            }}>
              <CalendarOutlined style={{ color: '#999' }} />
              <span>Chưa có dữ liệu đăng ký</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1: Thông tin cơ bản - 3 cột đều nhau */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card style={{
            background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
            border: '2px solid #40a9ff',
            height: '130px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <Statistic
              title="Tổng số người"
              value={summary.totalPlayers}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              suffix="người"
              valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: 'bold' }}
            />
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              marginTop: 'auto'
            }}>
              Đã đăng ký
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '2px solid #0ea5e9',
            height: '130px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <Statistic
              title="Sân mặc định"
              value={settings.courtsCount}
              prefix={<HomeOutlined style={{ color: '#0ea5e9' }} />}
              suffix="sân"
              valueStyle={{ color: '#0ea5e9', fontSize: '24px', fontWeight: 'bold' }}
            />
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              marginTop: 'auto'
            }}>
              Sức chứa: {settings.courtsCount * settings.playersPerCourt} người
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card style={{
            background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
            border: '2px solid #52c41a',
            height: '130px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <Statistic
              title="Số sân cần thiết"
              value={summary.requiredCourts}
              prefix={<HomeOutlined style={{ color: '#52c41a' }} />}
              suffix="sân"
              valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
            />
            <div style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              marginTop: 'auto'
            }}>
              Theo tính toán
            </div>
          </Card>
        </Col>
      </Row>

      {/* Row 2: Thông tin vượt quá - 2 cột đều nhau */}
      {summary.extraCourts > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12}>
            <Card style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', border: '2px solid #fa8c16' }}>
              <Statistic
                title="Số sân thêm"
                value={summary.extraCourts}
                prefix={<HomeOutlined style={{ color: '#fa8c16' }} />}
                suffix="sân"
                valueStyle={{ color: '#fa8c16', fontSize: '24px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12}>
            <Card style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)', border: '2px solid #fa8c16' }}>
              <Statistic
                title="Số người vượt quá"
                value={summary.extraPlayersCount}
                prefix={<UserOutlined style={{ color: '#fa8c16' }} />}
                suffix="người"
                valueStyle={{ color: '#fa8c16', fontSize: '24px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {summary.totalExtraFee > 0 ? (
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} md={12}>
            <Card style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)', border: '2px solid #f5222d' }}>
              <Statistic
                title="Tổng phí thêm"
                value={summary.totalExtraFee}
                prefix={<DollarOutlined style={{ color: '#f5222d' }} />}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{ color: '#f5222d', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)', border: '2px solid #f5222d' }}>
              <Statistic
                title="Phí/người vượt quá"
                value={summary.feePerExtraPlayer}
                prefix={<DollarOutlined style={{ color: '#f5222d' }} />}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{ color: '#f5222d', fontSize: '20px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <Alert
          message="🎉 Không cần thuê thêm sân"
          description={
            <div>
              <p style={{ marginBottom: '8px' }}>
                Số người đăng ký ({summary.totalPlayers} người) vừa đủ với {settings.courtsCount} sân mặc định có sẵn
                (sức chứa {settings.courtsCount * settings.playersPerCourt} người). Tuyệt vời!
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '14px',
                color: '#52c41a',
                fontWeight: 'bold'
              }}>
                <span>✅ Sân mặc định: {settings.courtsCount} sân</span>
                <span>✅ Sức chứa: {settings.courtsCount * settings.playersPerCourt} người</span>
                <span>✅ Đã đăng ký: {summary.totalPlayers} người</span>
              </div>
            </div>
          }
          type="success"
          showIcon
          style={{
            marginTop: 24,
            background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
            border: '2px solid #52c41a',
            borderRadius: '12px',
            fontSize: '16px'
          }}
        />
      )}
    </Card>
  );
};

export default Summary;
