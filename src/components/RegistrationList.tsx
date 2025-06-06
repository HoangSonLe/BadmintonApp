import React, { useState, useMemo } from 'react';
import {
  Card,
  List,
  Typography,
  Tag,
  Button,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Empty,
  Select,
  Space,
  DatePicker,
  Alert,
  Input,
  Spin
} from 'antd';
import {
  DeleteOutlined,
  UserOutlined,
  HomeOutlined,
  DollarOutlined,
  OrderedListOutlined,
  FilterOutlined,
  BarChartOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  ShopOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import type { WeeklyRegistration, RegistrationSummary } from '../types';

dayjs.extend(weekOfYear);

const { Title, Text } = Typography;

interface RegistrationListProps {
  registrations: WeeklyRegistration[];
  onDeleteRegistration: (id: string) => void;
  onDeletePlayer?: (registrationId: string, playerId: string) => void;
  isAdmin?: boolean;
  loading?: boolean;
}

const RegistrationList: React.FC<RegistrationListProps> = ({
  registrations,
  onDeleteRegistration,
  onDeletePlayer,
  isAdmin = false,
  loading = false
}) => {
  const [filterType, setFilterType] = useState<'all' | 'week' | 'specific-week' | 'month' | 'year'>('all');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [playerSearchTerm, setPlayerSearchTerm] = useState<string>('');

  const formatDate = (date: Date) => {
    return dayjs(date).format('DD/MM/YYYY');
  };



  const formatTime = (date: Date) => {
    return dayjs(date).format('HH:mm:ss');
  };

  // Calculate summary for a registration
  const calculateSummary = (registration: WeeklyRegistration): RegistrationSummary => {
    const totalPlayers = registration.players.length;
    const maxPlayersWithDefaultCourts = registration.settings.courtsCount * registration.settings.playersPerCourt;
    const extraPlayersCount = Math.max(0, totalPlayers - maxPlayersWithDefaultCourts);
    const extraCourts = Math.ceil(extraPlayersCount / registration.settings.playersPerCourt);
    const requiredCourts = registration.settings.courtsCount + extraCourts;
    const totalExtraFee = extraCourts * registration.settings.extraCourtFee;
    // Chia phí thêm cho tổng số người đăng ký (thay vì chỉ người vượt quá)
    const feePerExtraPlayer = totalPlayers > 0 && extraCourts > 0 ? totalExtraFee / totalPlayers : 0;

    return {
      totalPlayers,
      requiredCourts,
      extraCourts,
      extraPlayersCount,
      totalExtraFee,
      feePerExtraPlayer
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Function to open Google Maps
  const openGoogleMaps = (address: string) => {
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  // Get available weeks for dropdown
  const availableWeeks = useMemo(() => {
    return registrations.map(reg => ({
      id: reg.id,
      label: `Tuần ${formatDate(reg.weekStart)} - ${formatDate(reg.weekEnd)} (${reg.players.length} người)`,
      weekStart: reg.weekStart,
      weekEnd: reg.weekEnd,
      playersCount: reg.players.length
    })).sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
  }, [registrations]);

  // Filter registrations based on selected criteria
  const filteredRegistrations = useMemo(() => {
    if (filterType === 'all') {
      return registrations.sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    }

    if (filterType === 'specific-week' && selectedWeekId) {
      return registrations.filter(reg => reg.id === selectedWeekId);
    }

    if (!selectedDate) {
      return registrations.sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
    }

    return registrations.filter(registration => {
      const regDate = dayjs(registration.weekStart);

      switch (filterType) {
        case 'week': {
          // Lọc theo tuần chính xác (so sánh khoảng ngày)
          const selectedWeekStart = selectedDate.startOf('week');
          const selectedWeekEnd = selectedDate.endOf('week');
          const regWeekStart = dayjs(registration.weekStart);
          const regWeekEnd = dayjs(registration.weekEnd);

          return (regWeekStart.isSame(selectedWeekStart, 'day') ||
                  regWeekStart.isAfter(selectedWeekStart)) &&
                 (regWeekEnd.isSame(selectedWeekEnd, 'day') ||
                  regWeekEnd.isBefore(selectedWeekEnd));
        }
        case 'month':
          return regDate.month() === selectedDate.month() && regDate.year() === selectedDate.year();
        case 'year':
          return regDate.year() === selectedDate.year();
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
  }, [registrations, filterType, selectedDate, selectedWeekId]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalRegistrations = filteredRegistrations.length;
    const totalPlayers = filteredRegistrations.reduce((sum, reg) => sum + reg.players.length, 0);
    const totalExtraFee = filteredRegistrations.reduce((sum, reg) => {
      const summary = calculateSummary(reg);
      return sum + summary.totalExtraFee;
    }, 0);
    const totalExtraCourts = filteredRegistrations.reduce((sum, reg) => {
      const summary = calculateSummary(reg);
      return sum + summary.extraCourts;
    }, 0);

    return {
      totalRegistrations,
      totalPlayers,
      totalExtraFee,
      totalExtraCourts,
      averagePlayersPerWeek: totalRegistrations > 0 ? Math.round(totalPlayers / totalRegistrations) : 0
    };
  }, [filteredRegistrations]);

  // Render filter controls
  const renderFilterControls = () => (
    <Card size="small" style={{ marginBottom: '16px' }}>
      <Space wrap>
        <Space>
          <FilterOutlined />
          <Text strong>Lọc theo:</Text>
        </Space>

        <Select
          value={filterType}
          onChange={(value) => {
            setFilterType(value);
            setSelectedDate(null);
            setSelectedWeekId(null);
          }}
          style={{ width: 140 }}
          options={[
            { label: 'Tất cả', value: 'all' },
            { label: 'Tuần cụ thể', value: 'specific-week' },
            { label: 'Tuần (picker)', value: 'week' },
            { label: 'Tháng', value: 'month' },
            { label: 'Năm', value: 'year' }
          ]}
        />

        {filterType === 'specific-week' && (
          <Select
            value={selectedWeekId}
            onChange={setSelectedWeekId}
            placeholder="Chọn tuần cụ thể"
            style={{ width: 280 }}
            options={availableWeeks.map(week => ({
              label: week.label,
              value: week.id
            }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        )}

        {filterType !== 'all' && filterType !== 'specific-week' && (
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            picker={filterType === 'week' ? 'week' : filterType === 'month' ? 'month' : 'year'}
            placeholder={`Chọn ${filterType === 'week' ? 'tuần' : filterType === 'month' ? 'tháng' : 'năm'}`}
            style={{ width: 150 }}
          />
        )}

        {(filterType !== 'all' && (selectedDate || selectedWeekId)) && (
          <Button
            size="small"
            onClick={() => {
              setFilterType('all');
              setSelectedDate(null);
              setSelectedWeekId(null);
            }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </Space>
    </Card>
  );

  // Render overall statistics
  const renderOverallStats = () => (
    <Card size="small" style={{ marginBottom: '16px' }}>
      <Row gutter={16}>
        <Col xs={12} sm={6} lg={4}>
          <Statistic
            title="Tổng đăng ký"
            value={overallStats.totalRegistrations}
            prefix={<BarChartOutlined />}
            valueStyle={{ fontSize: '18px', color: '#1890ff', fontWeight: 600 }}
          />
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Statistic
            title="Tổng người chơi"
            value={overallStats.totalPlayers}
            prefix={<UserOutlined />}
            valueStyle={{ fontSize: '18px', color: '#52c41a', fontWeight: 600 }}
          />
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Statistic
            title="TB người/tuần"
            value={overallStats.averagePlayersPerWeek}
            prefix={<UserOutlined />}
            valueStyle={{ fontSize: '18px', color: '#722ed1', fontWeight: 600 }}
          />
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Statistic
            title="Tổng phí thêm"
            value={formatCurrency(overallStats.totalExtraFee)}
            prefix={<DollarOutlined />}
            valueStyle={{ fontSize: '16px', color: '#f5222d', fontWeight: 600 }}
          />
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Statistic
            title="Tổng sân thêm"
            value={overallStats.totalExtraCourts}
            prefix={<HomeOutlined />}
            suffix="sân"
            valueStyle={{ fontSize: '18px', color: '#fa8c16', fontWeight: 600 }}
          />
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <Statistic
            title="TB phí/tuần"
            value={formatCurrency(overallStats.totalRegistrations > 0 ? overallStats.totalExtraFee / overallStats.totalRegistrations : 0)}
            prefix={<DollarOutlined />}
            valueStyle={{ fontSize: '16px', color: '#722ed1', fontWeight: 600 }}
          />
        </Col>
      </Row>
    </Card>
  );

  if (registrations.length === 0) {
    return (
      <Spin spinning={loading} tip="Đang tải dữ liệu...">
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
              <OrderedListOutlined />
            </div>
            <Title level={2} className="mb-0" style={{
              color: '#1890ff',
              fontSize: '26px',
              fontWeight: 600,
              lineHeight: 1.2,
              marginTop: '2px'
            }}>
              Danh sách đăng ký
            </Title>
          </div>
          <Empty
            description="Chưa có đăng ký nào"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '40px 0' }}
          />
        </Card>
      </Spin>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Spin spinning={loading} tip="Đang tải dữ liệu...">
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
            <OrderedListOutlined />
          </div>
          <Title level={2} className="mb-0" style={{
            color: '#1890ff',
            fontSize: '26px',
            fontWeight: 600,
            lineHeight: 1.2,
            marginTop: '2px'
          }}>
            Danh sách đăng ký chi tiết theo tuần
          </Title>
        </div>

        {/* Filter Controls */}
        {renderFilterControls()}

        {/* Overall Statistics */}
        {renderOverallStats()}

        {/* Show filtered results info */}
        {filterType !== 'all' && (
          <Alert
            message={`Hiển thị ${filteredRegistrations.length} đăng ký được lọc từ tổng ${registrations.length} đăng ký`}
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* No filtered results */}
        {filteredRegistrations.length === 0 && filterType !== 'all' && (
          <Empty
            description="Không tìm thấy đăng ký nào phù hợp với bộ lọc"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '40px 0' }}
          />
        )}

        {/* Registration List */}
        {filteredRegistrations.length > 0 && (
          <List
            itemLayout="vertical"
            dataSource={filteredRegistrations}
            renderItem={(registration) => {
              const summary = calculateSummary(registration);

              return (
                <List.Item key={registration.id}>
                  <Card size="small" style={{ position: 'relative' }}>
                    {/* Nút xóa ở góc trên phải - chỉ hiển thị cho admin */}
                    {isAdmin && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 1
                      }}>
                        <Popconfirm
                          title="Xóa đăng ký"
                          description="Bạn có chắc chắn muốn xóa đăng ký này?"
                          onConfirm={() => onDeleteRegistration(registration.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{
                              borderRadius: '6px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            Xóa
                          </Button>
                        </Popconfirm>
                      </div>
                    )}

                    <div className="mb-4" style={{ paddingRight: isAdmin ? '80px' : '16px' }}>
                      <Title level={4} className="mb-1">
                        🏸 Tuần {formatDate(registration.weekStart)} - {formatDate(registration.weekEnd)}
                      </Title>
                      <Space wrap>
                        <Tag color="blue" icon={<UserOutlined />}>
                          {registration.players.length} người đăng ký
                        </Tag>
                        <Tag color={summary.extraCourts > 0 ? "orange" : "green"} icon={<HomeOutlined />}>
                          {summary.requiredCourts} sân cần thiết
                        </Tag>
                        {summary.extraCourts > 0 && (
                          <Tag color="red" icon={<DollarOutlined />}>
                            Phí thêm: {formatCurrency(summary.totalExtraFee)}
                          </Tag>
                        )}
                        {summary.extraCourts === 0 && (
                          <Tag color="green">
                            ✅ Không cần thuê thêm sân
                          </Tag>
                        )}
                      </Space>
                    </div>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={14} xl={16}>
                        <Title level={5}>
                          👥 Danh sách người chơi ({registration.players.length} người):
                        </Title>

                        {/* Ô tìm kiếm người chơi */}
                        <Input
                          placeholder="Tìm kiếm người chơi..."
                          prefix={<SearchOutlined />}
                          value={playerSearchTerm}
                          onChange={(e) => setPlayerSearchTerm(e.target.value)}
                          style={{
                            marginBottom: '8px',
                            borderRadius: '6px'
                          }}
                          allowClear
                        />

                        <div style={{
                          maxHeight: 250,
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          border: '1px solid #f0f0f0',
                          borderRadius: '6px',
                          padding: '8px',
                          backgroundColor: '#fafafa'
                        }}>
                          {(() => {
                            // Lọc và sắp xếp người chơi theo thời gian đăng ký (mới nhất trước)
                            const filteredPlayers = registration.players
                              .filter(player =>
                                player.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
                              )
                              .sort((a, b) =>
                                new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
                              );

                            if (filteredPlayers.length === 0 && playerSearchTerm) {
                              return (
                                <div style={{
                                  padding: '16px',
                                  textAlign: 'center',
                                  color: '#999',
                                  fontStyle: 'italic'
                                }}>
                                  Không tìm thấy người chơi nào
                                </div>
                              );
                            }

                            return filteredPlayers.map((player, index) => {
                              // Tìm index gốc của player trong danh sách chưa sắp xếp
                              const originalIndex = registration.players.findIndex(p => p.id === player.id);
                              const maxPlayersWithDefaultCourts = registration.settings.courtsCount * registration.settings.playersPerCourt;
                              const isExtraPlayer = originalIndex >= maxPlayersWithDefaultCourts;
                              const isSearchHighlight = playerSearchTerm && player.name.toLowerCase().includes(playerSearchTerm.toLowerCase());

                              // Xác định màu nền
                              let backgroundColor = 'transparent';
                              if (isExtraPlayer && isSearchHighlight) {
                                backgroundColor = '#ffe7ba'; // Kết hợp màu vượt quá + tìm kiếm
                              } else if (isExtraPlayer) {
                                backgroundColor = '#fff2e8'; // Màu vượt quá
                              } else if (isSearchHighlight) {
                                backgroundColor = '#fff7e6'; // Màu tìm kiếm
                              }

                              return (
                                <div
                                  key={player.id}
                                  style={{
                                    padding: '6px 8px',
                                    borderBottom: index < filteredPlayers.length - 1 ? '1px solid #f5f5f5' : 'none',
                                    fontSize: '14px',
                                    overflow: 'hidden',
                                    backgroundColor,
                                    border: isExtraPlayer ? '1px solid #ff7a45' : 'none',
                                    borderRadius: isExtraPlayer ? '4px' : '0',
                                    margin: isExtraPlayer ? '1px 0' : '0',
                                    position: 'relative'
                                  }}
                                >
                                  <div style={{
                                    fontWeight: '500',
                                    marginBottom: '2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: isExtraPlayer ? '#d4380d' : 'inherit',
                                    paddingRight: isAdmin ? '24px' : '0'
                                  }}>
                                    {originalIndex + 1}. {player.name}
                                    {isExtraPlayer && (
                                      <span style={{
                                        marginLeft: '6px',
                                        fontSize: '9px',
                                        backgroundColor: '#ff7a45',
                                        color: 'white',
                                        padding: '1px 4px',
                                        borderRadius: '8px',
                                        fontWeight: 'bold'
                                      }}>
                                        VƯỢT
                                      </span>
                                    )}

                                    {/* Nút xóa người chơi - chỉ hiển thị cho admin */}
                                    {isAdmin && onDeletePlayer && (
                                      <Popconfirm
                                        title="Xóa người chơi"
                                        description={`Bạn có chắc chắn muốn xóa ${player.name}?`}
                                        onConfirm={() => onDeletePlayer(registration.id, player.id)}
                                        okText="Xóa"
                                        cancelText="Hủy"
                                        placement="topRight"
                                      >
                                        <Button
                                          type="text"
                                          danger
                                          size="small"
                                          icon={<DeleteOutlined />}
                                          style={{
                                            position: 'absolute',
                                            right: '4px',
                                            top: '2px',
                                            width: '20px',
                                            height: '20px',
                                            padding: '0',
                                            fontSize: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        />
                                      </Popconfirm>
                                    )}
                                  </div>
                                  <div style={{
                                    fontSize: '11px',
                                    color: isExtraPlayer ? '#ad4e00' : '#999',
                                    fontStyle: 'italic',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1px'
                                  }}>
                                    <div>
                                      📅 {formatDate(player.registeredAt)} • ⏰ {formatTime(player.registeredAt)}
                                    </div>

                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Hiển thị thông tin tìm kiếm */}
                        {playerSearchTerm && (
                          <div style={{
                            marginTop: '4px',
                            fontSize: '12px',
                            color: '#666'
                          }}>
                            Tìm thấy {registration.players.filter(player =>
                              player.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
                            ).length} / {registration.players.length} người chơi
                          </div>
                        )}

                        {/* Chú thích màu sắc */}
                        {summary.extraPlayersCount > 0 && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px',
                            backgroundColor: '#f9f9f9',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#666' }}>
                              Chú thích:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  backgroundColor: '#fff2e8',
                                  border: '1px solid #ff7a45',
                                  borderRadius: '2px'
                                }}></div>
                                <span style={{ color: '#d4380d' }}>Người vượt quá sức chứa sân</span>
                              </div>
                              {playerSearchTerm && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: '#fff7e6',
                                    border: '1px solid #ffa940',
                                    borderRadius: '2px'
                                  }}></div>
                                  <span style={{ color: '#ad4e00' }}>Kết quả tìm kiếm</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Col>

                      <Col xs={24} lg={10} xl={8}>
                        <Title level={5}>Thống kê chi tiết:</Title>
                        <Row gutter={[8, 8]}>
                          <Col span={8}>
                            <Statistic
                              title="Tổng số người"
                              value={summary.totalPlayers}
                              prefix={<UserOutlined />}
                              suffix="người"
                              valueStyle={{ fontSize: '16px', fontWeight: 600 }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="Sân mặc định"
                              value={registration.settings.courtsCount}
                              prefix={<HomeOutlined />}
                              suffix="sân"
                              valueStyle={{ fontSize: '16px', color: '#0ea5e9', fontWeight: 600 }}
                            />
                            <div style={{
                              fontSize: '10px',
                              color: '#666',
                              marginTop: '2px',
                              textAlign: 'center'
                            }}>
                              Sức chứa: {registration.settings.courtsCount * registration.settings.playersPerCourt} người
                            </div>
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="Người/sân"
                              value={registration.settings.playersPerCourt}
                              prefix={<UserOutlined />}
                              suffix="người"
                              valueStyle={{ fontSize: '16px', color: '#722ed1', fontWeight: 600 }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="Sân cần thiết"
                              value={summary.requiredCourts}
                              prefix={<HomeOutlined />}
                              suffix="sân"
                              valueStyle={{ fontSize: '16px', fontWeight: 600 }}
                            />
                          </Col>

                          {summary.extraCourts > 0 && (
                            <>
                              <Col span={8}>
                                <Statistic
                                  title="Sân thêm"
                                  value={summary.extraCourts}
                                  prefix={<HomeOutlined />}
                                  suffix="sân"
                                  valueStyle={{ fontSize: '16px', color: '#fa8c16', fontWeight: 600 }}
                                />
                              </Col>
                              <Col span={8}>
                                <Statistic
                                  title="Phí thêm tổng"
                                  value={formatCurrency(summary.totalExtraFee)}
                                  prefix={<DollarOutlined />}
                                  valueStyle={{ fontSize: '14px', color: '#f5222d', fontWeight: 600 }}
                                />
                              </Col>
                              <Col span={8}>
                                <Statistic
                                  title="Phí/người"
                                  value={formatCurrency(summary.feePerExtraPlayer)}
                                  prefix={<DollarOutlined />}
                                  valueStyle={{ fontSize: '14px', color: '#f5222d', fontWeight: 600 }}
                                />
                              </Col>
                              <Col span={8}>
                                <Statistic
                                  title="Người vượt quá"
                                  value={summary.extraPlayersCount}
                                  prefix={<UserOutlined />}
                                  suffix="người"
                                  valueStyle={{ fontSize: '16px', color: '#fa8c16', fontWeight: 600 }}
                                />
                              </Col>
                              <Col span={8}>
                                <Statistic
                                  title="Phí sân thêm"
                                  value={formatCurrency(registration.settings.extraCourtFee)}
                                  prefix={<DollarOutlined />}
                                  suffix="/sân"
                                  valueStyle={{ fontSize: '14px', color: '#666', fontWeight: 600 }}
                                />
                              </Col>
                            </>
                          )}

                          {summary.extraCourts === 0 && (
                            <Col span={24}>
                              <div style={{
                                backgroundColor: '#f6ffed',
                                border: '1px solid #52c41a',
                                borderRadius: '6px',
                                padding: '8px',
                                marginTop: '8px'
                              }}>
                                <div style={{
                                  color: '#52c41a',
                                  fontWeight: 'bold',
                                  marginBottom: '4px'
                                }}>
                                  ✅ Không cần thuê thêm sân
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: '#666',
                                  display: 'flex',
                                  gap: '12px',
                                  flexWrap: 'wrap'
                                }}>
                                  <span>Sân mặc định: {registration.settings.courtsCount} sân</span>
                                  <span>Sức chứa: {registration.settings.courtsCount * registration.settings.playersPerCourt} người</span>
                                  <span>Đã đăng ký: {summary.totalPlayers} người</span>
                                </div>
                              </div>
                            </Col>
                          )}

                          {/* Court Information */}
                          {(registration.settings.courtName || registration.settings.courtAddress) && (
                            <Col span={24}>
                              <div style={{
                                backgroundColor: '#f0f9ff',
                                border: '1px solid #0ea5e9',
                                borderRadius: '6px',
                                padding: '8px',
                                marginTop: '8px'
                              }}>
                                <div style={{
                                  color: '#0ea5e9',
                                  fontWeight: 'bold',
                                  marginBottom: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <ShopOutlined />
                                  Thông tin sân
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  color: '#666',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px'
                                }}>
                                  {registration.settings.courtName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <ShopOutlined style={{ color: '#0ea5e9', fontSize: '12px' }} />
                                      <span style={{ fontWeight: 600 }}>{registration.settings.courtName}</span>
                                    </div>
                                  )}
                                  {registration.settings.courtAddress && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <EnvironmentOutlined style={{ color: '#0ea5e9', fontSize: '12px' }} />
                                      <span style={{ flex: 1 }}>{registration.settings.courtAddress}</span>
                                      <Button
                                        type="link"
                                        size="small"
                                        onClick={() => openGoogleMaps(registration.settings.courtAddress!)}
                                        style={{
                                          color: '#0ea5e9',
                                          fontWeight: 600,
                                          padding: '0 4px',
                                          height: 'auto',
                                          fontSize: '11px'
                                        }}
                                      >
                                        📍 Bản đồ
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Col>
                          )}
                        </Row>
                      </Col>
                    </Row>
                  </Card>
                </List.Item>
              );
            }}
          />
        )}
        </Card>
      </Spin>
    </Space>
  );
};

export default RegistrationList;
