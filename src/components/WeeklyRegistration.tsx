import React, { useState, useMemo } from 'react';
import { Card, Input, Button, Typography, List, Tag, Space, Alert, App } from 'antd';
import { PlusOutlined, DeleteOutlined, CalendarOutlined, UserOutlined, TrophyOutlined, DollarOutlined, HomeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import type { WeeklyRegistration as WeeklyRegistrationType, Player, AppSettings } from '../types';
import CustomLabel from './CustomLabel';
import { RegistrationLogger } from '../services/registrationLogger';
import { DateUtils } from '../utils/dateUtils';

dayjs.extend(weekOfYear);

const { Title } = Typography;

interface WeeklyRegistrationProps {
  settings: AppSettings;
  registrations: WeeklyRegistrationType[];
  onRegistrationSubmit: (registration: WeeklyRegistrationType) => void;
  isAdmin?: boolean; // Để hiển thị thông tin admin
}

const WeeklyRegistration: React.FC<WeeklyRegistrationProps> = ({
  settings,
  registrations,
  onRegistrationSubmit,
  isAdmin = false
}) => {
  const { message } = App.useApp();
  const [playerName, setPlayerName] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);

  // Tự động lấy tuần tiếp theo (tuần sau tuần hiện tại)
  const nextWeekDates = useMemo(() => {
    return DateUtils.getNextWeekDates();
  }, []);

  // Tìm đăng ký hiện có cho tuần tiếp theo
  const existingRegistration = useMemo(() => {
    return registrations.find(reg => {
      return DateUtils.isSameWeek(reg.weekStart, reg.weekEnd, nextWeekDates.start, nextWeekDates.end);
    }) || null;
  }, [registrations, nextWeekDates]);

  // Tính toán thông tin phí khi số người thay đổi (bao gồm cả người đã đăng ký trước đó)
  const registrationSummary = useMemo(() => {
    const existingPlayersCount = existingRegistration ? existingRegistration.players.length : 0;
    const newPlayersCount = players.length;
    const totalPlayers = existingPlayersCount + newPlayersCount;

    const maxPlayersWithDefaultCourts = settings.courtsCount * settings.playersPerCourt;
    const extraPlayersCount = Math.max(0, totalPlayers - maxPlayersWithDefaultCourts);
    const extraCourts = Math.ceil(extraPlayersCount / settings.playersPerCourt);
    const requiredCourts = settings.courtsCount + extraCourts;
    const totalExtraFee = extraCourts * settings.extraCourtFee;
    // Chia phí thêm cho tổng số người đăng ký (thay vì chỉ người vượt quá)
    const feePerPlayer = totalPlayers > 0 && extraCourts > 0 ? totalExtraFee / totalPlayers : 0;

    return {
      totalPlayers,
      existingPlayersCount,
      newPlayersCount,
      requiredCourts,
      extraCourts,
      extraPlayersCount,
      totalExtraFee,
      feePerPlayer
    };
  }, [players.length, settings, existingRegistration]);

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
    // Check if registration is disabled
    if (!settings.registrationEnabled) {
      RegistrationLogger.logRegistrationAttemptWhenDisabled(playerName.trim());
      message.warning('Đăng ký hiện đang bị khóa!');
      return;
    }

    if (playerName.trim()) {
      const trimmedName = playerName.trim();

      // Kiểm tra tên trùng với người đã đăng ký trước đó
      if (existingRegistration) {
        const existingPlayerNames = new Set(existingRegistration.players.map(p => p.name.toLowerCase().trim()));
        if (existingPlayerNames.has(trimmedName.toLowerCase())) {
          message.warning(`Tên "${trimmedName}" đã được đăng ký cho tuần này rồi!`);
          return;
        }
      }

      // Kiểm tra tên trùng trong danh sách hiện tại
      const currentPlayerNames = new Set(players.map(p => p.name.toLowerCase().trim()));
      if (currentPlayerNames.has(trimmedName.toLowerCase())) {
        message.warning(`Tên "${trimmedName}" đã có trong danh sách hiện tại!`);
        return;
      }

      const newPlayer: Player = {
        id: Date.now().toString(),
        name: trimmedName,
        registeredAt: new Date()
      };
      setPlayers([...players, newPlayer]);
      setPlayerName('');
      message.success(`Đã thêm ${trimmedName}`);
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
      const registration: WeeklyRegistrationType = {
        id: Date.now().toString(),
        weekStart: nextWeekDates.start,
        weekEnd: nextWeekDates.end,
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
            message={`Đăng ký cho tuần: ${DateUtils.formatWeekRange(nextWeekDates.start, nextWeekDates.end)}`}
            description={
              <div style={{ marginTop: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HomeOutlined style={{ color: '#1890ff' }} />
                    <span><strong>Sân mặc định:</strong> {settings.courtsCount} sân</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    <span><strong>Sức chứa:</strong> {settings.courtsCount * settings.playersPerCourt} người ({settings.playersPerCourt} người/sân)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarOutlined style={{ color: '#1890ff' }} />
                    <span><strong>Phí thuê thêm sân:</strong> {formatCurrency(settings.extraCourtFee)}/sân</span>
                  </div>
                </div>
              </div>
            }
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

        {/* Hiển thị thông tin người đã đăng ký trước đó */}
        {existingRegistration && (
          <div>
            <CustomLabel icon={<UserOutlined />}>
              Người đã đăng ký cho tuần này
            </CustomLabel>
            <Alert
              message={`Đã có ${existingRegistration.players.length} người đăng ký cho tuần này`}
              description={
                <div style={{ marginTop: '8px' }}>
                  <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Danh sách đã đăng ký:</p>
                  <div style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    backgroundColor: '#f9f9f9',
                    padding: '8px',
                    borderRadius: '6px'
                  }}>
                    {existingRegistration.players.map((existingPlayer, index) => (
                      <div key={existingPlayer.id} style={{
                        padding: '4px 0',
                        borderBottom: index < existingRegistration.players.length - 1 ? '1px solid #e8e8e8' : 'none',
                        fontSize: '13px'
                      }}>
                        <span style={{ fontWeight: 'bold' }}>{index + 1}. {existingPlayer.name}</span>
                        <span style={{ color: '#666', marginLeft: '8px', fontSize: '12px' }}>
                          ({formatTime(existingPlayer.registeredAt)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              }
              type="info"
              showIcon
              style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '2px solid #0ea5e9',
                borderRadius: '12px',
                marginBottom: '16px'
              }}
            />
          </div>
        )}

        {/* Hiển thị thông báo khi đăng ký bị khóa */}
        {!settings.registrationEnabled && (
          <Alert
            message="🔒 Đăng ký đã bị khóa"
            description={
              <div>
                <p>Hiện tại không thể đăng ký cho tuần này.</p>
                {isAdmin && (
                  <p style={{ color: '#1890ff', fontWeight: 'bold' }}>
                    💡 Admin: Bạn có thể mở lại đăng ký bằng nút "Mở đăng ký" ở góc phải trên.
                  </p>
                )}
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Form đăng ký chỉ hiển thị khi được phép */}
        {settings.registrationEnabled && (
          <div>
            <CustomLabel icon={<UserOutlined />}>
              Thêm người chơi mới
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
        )}

        {settings.registrationEnabled && players.length > 0 && (
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
                  Mỗi người sẽ phải trả phí thêm {formatCurrency(registrationSummary.feePerPlayer)}/người
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
                // Tính vị trí thực tế trong tổng danh sách (bao gồm người đã đăng ký trước đó)
                const totalIndex = registrationSummary.existingPlayersCount + originalIndex;
                const maxPlayersWithDefaultCourts = settings.courtsCount * settings.playersPerCourt;
                const isExtraPlayer = totalIndex >= maxPlayersWithDefaultCourts;

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
                          {totalIndex + 1}. {player.name}
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
                          {registrationSummary.extraCourts > 0 && (
                            <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                              • Phí thêm: {formatCurrency(registrationSummary.feePerPlayer)}
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
        {settings.registrationEnabled && players.length > 0 && (
          <div>
            <CustomLabel icon={<HomeOutlined />}>
              Thông tin sân và phí
            </CustomLabel>

            {registrationSummary.extraCourts > 0 ? (
              <Alert
                message="⚠️ Cần thuê thêm sân"
                description={
                  <div style={{ marginTop: '8px' }}>
                    <p><strong>Tổng số người đăng ký:</strong> {registrationSummary.totalPlayers} người</p>
                    {registrationSummary.existingPlayersCount > 0 && (
                      <p><strong>• Đã đăng ký trước:</strong> {registrationSummary.existingPlayersCount} người</p>
                    )}
                    {registrationSummary.newPlayersCount > 0 && (
                      <p><strong>• Đăng ký mới:</strong> {registrationSummary.newPlayersCount} người</p>
                    )}
                    <p><strong>Sân mặc định có sẵn:</strong> {settings.courtsCount} sân (sức chứa {settings.courtsCount * settings.playersPerCourt} người)</p>
                    <p><strong>Sân cần thiết:</strong> {registrationSummary.requiredCourts} sân (gồm {settings.courtsCount} sân mặc định + {registrationSummary.extraCourts} sân thêm)</p>
                    <p><strong>Số người vượt quá:</strong> {registrationSummary.extraPlayersCount} người</p>
                    <p style={{ color: '#f5222d', fontWeight: 'bold', fontSize: '16px', marginTop: '12px' }}>
                      <DollarOutlined /> <strong>Tổng phí thêm:</strong> {formatCurrency(registrationSummary.totalExtraFee)}
                    </p>
                    <p style={{ color: '#f5222d', fontWeight: 'bold', fontSize: '14px' }}>
                      <strong>Phí/người:</strong> {formatCurrency(registrationSummary.feePerPlayer)}
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
                    <p><strong>Tổng số người đăng ký:</strong> {registrationSummary.totalPlayers} người</p>
                    {registrationSummary.existingPlayersCount > 0 && (
                      <p><strong>• Đã đăng ký trước:</strong> {registrationSummary.existingPlayersCount} người</p>
                    )}
                    {registrationSummary.newPlayersCount > 0 && (
                      <p><strong>• Đăng ký mới:</strong> {registrationSummary.newPlayersCount} người</p>
                    )}
                    <p><strong>Sân mặc định có sẵn:</strong> {settings.courtsCount} sân (sức chứa {settings.courtsCount * settings.playersPerCourt} người)</p>
                    <p><strong>Sân cần thiết:</strong> {registrationSummary.requiredCourts} sân</p>
                    <p style={{ color: '#52c41a', fontWeight: 'bold' }}>✅ Số người vừa đủ với {settings.courtsCount} sân mặc định có sẵn!</p>
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

        {settings.registrationEnabled && (
          <Button
            type="primary"
            size="large"
            block
            onClick={handleSubmit}
            disabled={players.length === 0}
          >
            {existingRegistration
              ? `Thêm vào đăng ký (${players.length} người mới, tổng ${registrationSummary.totalPlayers} người)`
              : `Đăng ký tuần tiếp theo (${players.length} người)`
            }
          </Button>
        )}
      </Space>
    </Card>
  );
};

export default WeeklyRegistration;
