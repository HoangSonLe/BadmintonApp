import React, { useState, useMemo } from 'react';
import { Card, Input, Button, Typography, List, Tag, Space, Alert, message } from 'antd';
import { PlusOutlined, DeleteOutlined, CalendarOutlined, UserOutlined, TrophyOutlined, DollarOutlined, HomeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import type { WeeklyRegistration as WeeklyRegistrationType, Player, AppSettings } from '../types';
import CustomLabel from './CustomLabel';

dayjs.extend(weekOfYear);

const { Title } = Typography;

interface WeeklyRegistrationProps {
  settings: AppSettings;
  onRegistrationSubmit: (registration: WeeklyRegistrationType) => void;
}

const WeeklyRegistration: React.FC<WeeklyRegistrationProps> = ({
  settings,
  onRegistrationSubmit
}) => {
  const [playerName, setPlayerName] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);

  // Tự động lấy tuần tiếp theo (tuần sau tuần hiện tại)
  const nextWeek = useMemo(() => {
    return dayjs().add(1, 'week').startOf('week').add(1, 'day'); // Monday của tuần tiếp theo
  }, []);

  const getWeekDates = (weekDate: dayjs.Dayjs) => {
    const start = weekDate.startOf('week').add(1, 'day'); // Monday
    const end = weekDate.endOf('week').add(1, 'day'); // Sunday
    return { start: start.toDate(), end: end.toDate() };
  };

  // Tính toán thông tin phí khi số người thay đổi
  const registrationSummary = useMemo(() => {
    const totalPlayers = players.length;
    const maxPlayersWithDefaultCourts = settings.courtsCount * settings.playersPerCourt;
    const extraPlayersCount = Math.max(0, totalPlayers - maxPlayersWithDefaultCourts);
    const extraCourts = Math.ceil(extraPlayersCount / settings.playersPerCourt);
    const requiredCourts = settings.courtsCount + extraCourts;
    const totalExtraFee = extraCourts * settings.extraCourtFee;
    const feePerExtraPlayer = extraPlayersCount > 0 ? totalExtraFee / extraPlayersCount : 0;

    return {
      totalPlayers,
      requiredCourts,
      extraCourts,
      extraPlayersCount,
      totalExtraFee,
      feePerExtraPlayer
    };
  }, [players.length, settings]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date: dayjs.Dayjs) => {
    return date.format('DD/MM/YYYY');
  };



  const formatTime = (date: Date) => {
    return dayjs(date).format('HH:mm:ss');
  };

  // Sắp xếp người chơi theo thời gian đăng ký (mới nhất trước)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) =>
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    );
  }, [players]);

  const addPlayer = () => {
    if (playerName.trim()) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: playerName.trim(),
        registeredAt: new Date()
      };
      setPlayers([...players, newPlayer]);
      setPlayerName('');
      message.success(`Đã thêm ${playerName.trim()}`);
    }
  };

  const removePlayer = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    setPlayers(players.filter(p => p.id !== playerId));
    if (player) {
      message.info(`Đã xóa ${player.name}`);
    }
  };

  const handleSubmit = () => {
    if (players.length > 0) {
      const { start, end } = getWeekDates(nextWeek);
      const registration: WeeklyRegistrationType = {
        id: Date.now().toString(),
        weekStart: start,
        weekEnd: end,
        players: players,
        settings: { ...settings }
      };
      onRegistrationSubmit(registration);
      setPlayers([]);
      message.success('Đăng ký thành công!');
    }
  };

  return (
    <Card className="fade-in-up">
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
          background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '22px',
          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
        }}>
          <TrophyOutlined />
        </div>
        <Title level={2} className="mb-0" style={{
          color: '#1890ff',
          fontSize: '26px',
          fontWeight: 600,
          lineHeight: 1.2,
          marginTop: '2px'
        }}>
          Đăng ký đánh cầu lông
        </Title>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Hiển thị tuần đăng ký tự động */}
        <div>
          <CustomLabel icon={<CalendarOutlined />}>
            Tuần đăng ký
          </CustomLabel>
          <Alert
            message={`Đăng ký cho tuần: ${formatDate(nextWeek)} - ${formatDate(nextWeek.endOf('week').add(1, 'day'))}`}
            type="info"
            showIcon
            style={{
              background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
              border: '2px solid #1890ff',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          />
        </div>

        <div>
          <CustomLabel icon={<UserOutlined />}>
            Thêm người chơi
          </CustomLabel>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nhập tên người chơi"
              prefix={<UserOutlined />}
              onPressEnter={addPlayer}
              size="large"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addPlayer}
              disabled={!playerName.trim()}
              size="large"
            >
              Thêm
            </Button>
          </Space.Compact>
        </div>

        {players.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Title level={4} className="mb-0">
                Danh sách đăng ký
              </Title>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Tag color="blue">{players.length} người</Tag>
                {registrationSummary.extraPlayersCount > 0 && (
                  <Tag color="orange" style={{ fontWeight: 'bold' }}>
                    {registrationSummary.extraPlayersCount} người vượt quá
                  </Tag>
                )}
              </div>
            </div>

            {/* Thông báo về người vượt quá */}
            {registrationSummary.extraPlayersCount > 0 && (
              <div style={{
                backgroundColor: '#fff7e6',
                border: '1px solid #ffa940',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '13px'
              }}>
                <span style={{ color: '#d46b08', fontWeight: 'bold' }}>
                  ⚠️ Có {registrationSummary.extraPlayersCount} người vượt quá giới hạn sân
                </span>
                <br />
                <span style={{ color: '#ad4e00' }}>
                  Những người được đánh dấu màu cam sẽ phải trả phí thêm {formatCurrency(registrationSummary.feePerExtraPlayer)}/người
                </span>
              </div>
            )}
            <List
              size="small"
              bordered
              dataSource={sortedPlayers}
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
              renderItem={(player) => {
                // Tìm index gốc trong danh sách chưa sắp xếp
                const originalIndex = players.findIndex(p => p.id === player.id);
                const maxPlayersWithDefaultCourts = settings.courtsCount * settings.playersPerCourt;
                const isExtraPlayer = originalIndex >= maxPlayersWithDefaultCourts;

                return (
                  <List.Item style={{
                    padding: '8px 12px',
                    backgroundColor: isExtraPlayer ? '#fff2e8' : 'transparent',
                    border: isExtraPlayer ? '1px solid #ff7a45' : 'none',
                    borderRadius: isExtraPlayer ? '6px' : '0',
                    margin: isExtraPlayer ? '2px 0' : '0'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '500',
                          marginBottom: '2px',
                          color: isExtraPlayer ? '#d4380d' : 'inherit'
                        }}>
                          {originalIndex + 1}. {player.name}
                          {isExtraPlayer && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              backgroundColor: '#ff7a45',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontWeight: 'bold'
                            }}>
                              VƯỢT QUÁ
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isExtraPlayer ? '#ad4e00' : '#666',
                          fontStyle: 'italic'
                        }}>
                          Đăng ký lúc: {formatTime(player.registeredAt)}
                          {isExtraPlayer && (
                            <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                              • Phí thêm: {formatCurrency(registrationSummary.feePerExtraPlayer)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removePlayer(player.id)}
                        style={{
                          marginLeft: '8px',
                          flexShrink: 0,
                          minWidth: 'auto',
                          padding: '4px 8px',
                          backgroundColor: isExtraPlayer ? '#ff4d4f' : 'transparent',
                          color: isExtraPlayer ? 'white' : 'inherit'
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </List.Item>
                );
              }}
            />
          </div>
        )}

        {/* Hiển thị thông tin phí khi có người vượt quá kế hoạch */}
        {players.length > 0 && (
          <div>
            <CustomLabel icon={<HomeOutlined />}>
              Thông tin sân và phí
            </CustomLabel>

            {registrationSummary.extraCourts > 0 ? (
              <Alert
                message="⚠️ Cần thuê thêm sân"
                description={
                  <div style={{ marginTop: '8px' }}>
                    <p><strong>Số người đăng ký:</strong> {registrationSummary.totalPlayers} người</p>
                    <p><strong>Sân cần thiết:</strong> {registrationSummary.requiredCourts} sân (gồm {settings.courtsCount} sân mặc định + {registrationSummary.extraCourts} sân thêm)</p>
                    <p><strong>Số người vượt quá:</strong> {registrationSummary.extraPlayersCount} người</p>
                    <p style={{ color: '#f5222d', fontWeight: 'bold', fontSize: '16px', marginTop: '12px' }}>
                      <DollarOutlined /> <strong>Tổng phí thêm:</strong> {formatCurrency(registrationSummary.totalExtraFee)}
                    </p>
                    <p style={{ color: '#f5222d', fontWeight: 'bold', fontSize: '14px' }}>
                      <strong>Phí/người vượt:</strong> {formatCurrency(registrationSummary.feePerExtraPlayer)}
                    </p>
                  </div>
                }
                type="warning"
                showIcon
                style={{
                  background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)',
                  border: '2px solid #fa8c16',
                  borderRadius: '12px'
                }}
              />
            ) : (
              <Alert
                message="✅ Không cần thuê thêm sân"
                description={
                  <div style={{ marginTop: '8px' }}>
                    <p><strong>Số người đăng ký:</strong> {registrationSummary.totalPlayers} người</p>
                    <p><strong>Sân cần thiết:</strong> {registrationSummary.requiredCourts} sân</p>
                    <p style={{ color: '#52c41a', fontWeight: 'bold' }}>Số người vừa đủ với {settings.courtsCount} sân hiện có!</p>
                  </div>
                }
                type="success"
                showIcon
                style={{
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  border: '2px solid #52c41a',
                  borderRadius: '12px'
                }}
              />
            )}
          </div>
        )}

        <Button
          type="primary"
          size="large"
          block
          onClick={handleSubmit}
          disabled={players.length === 0}
        >
          Đăng ký tuần tiếp theo ({players.length} người)
        </Button>
      </Space>
    </Card>
  );
};

export default WeeklyRegistration;
