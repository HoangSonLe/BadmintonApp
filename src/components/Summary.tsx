import React from 'react';
import { Card, Row, Col, Statistic, Alert, Typography } from 'antd';
import { UserOutlined, HomeOutlined, DollarOutlined, BarChartOutlined } from '@ant-design/icons';
import type { RegistrationSummary } from '../types';

const { Title } = Typography;

interface SummaryProps {
  summary: RegistrationSummary;
}

const Summary: React.FC<SummaryProps> = ({ summary }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
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
        <Title level={2} className="mb-0" style={{
          color: '#52c41a',
          fontSize: '26px',
          fontWeight: 600,
          lineHeight: 1.2,
          marginTop: '2px'
        }}>
          Tổng kết đăng ký
        </Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: '2px solid #40a9ff' }}>
            <Statistic
              title="Tổng số người"
              value={summary.totalPlayers}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              suffix="người"
              valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', border: '2px solid #52c41a' }}>
            <Statistic
              title="Số sân cần thiết"
              value={summary.requiredCourts}
              prefix={<HomeOutlined style={{ color: '#52c41a' }} />}
              suffix="sân"
              valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        {summary.extraCourts > 0 && (
          <>
            <Col xs={24} sm={12} md={6}>
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

            <Col xs={24} sm={12} md={6}>
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
          </>
        )}
      </Row>

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
          description="Số người đăng ký vừa đủ với số sân hiện có. Tuyệt vời!"
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
