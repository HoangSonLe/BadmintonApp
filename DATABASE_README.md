# Database JSON - Hệ thống quản lý dữ liệu ảo

## Tổng quan

Ứng dụng này sử dụng một **Database JSON ảo** được xây dựng trên localStorage để giả lập việc thao tác với database thực tế. Thay vì sử dụng localStorage trực tiếp, chúng ta đã tạo ra một lớp abstraction hoàn chỉnh với các tính năng của một database thật.

## Cấu trúc Database

```json
{
  "settings": {
    "courtsCount": 2,
    "playersPerCourt": 4,
    "extraCourtFee": 100000
  },
  "registrations": [
    {
      "id": "1234567890",
      "weekStart": "2024-01-01T00:00:00.000Z",
      "weekEnd": "2024-01-07T23:59:59.999Z",
      "players": [
        {
          "id": "player1",
          "name": "Nguyễn Văn A",
          "registeredAt": "2024-01-01T10:00:00.000Z"
        }
      ],
      "settings": { ... }
    }
  ],
  "metadata": {
    "version": "1.0.0",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastUpdated": "2024-01-01T12:00:00.000Z",
    "totalRegistrations": 1,
    "totalPlayers": 3
  }
}
```

## Tính năng chính

### 1. DatabaseService - API giả lập database

- **CRUD Operations**: Create, Read, Update, Delete
- **Auto-save**: Tự động lưu sau mỗi thao tác
- **Metadata tracking**: Theo dõi thời gian cập nhật, số lượng records
- **Data validation**: Kiểm tra tính hợp lệ của dữ liệu
- **Export/Import**: Xuất ra file JSON và nhập lại

### 2. Các phương thức chính

```typescript
// Khởi tạo database
DatabaseService.initializeDatabase()

// Đọc/ghi toàn bộ database
DatabaseService.readDatabase()
DatabaseService.writeDatabase(database)

// Thao tác với settings
DatabaseService.getSettings()
DatabaseService.updateSettings(newSettings)

// Thao tác với registrations
DatabaseService.getRegistrations()
DatabaseService.addRegistration(registration)
DatabaseService.deleteRegistration(id)
DatabaseService.findRegistrationById(id)
DatabaseService.updateRegistration(id, updatedRegistration)

// Export/Import
DatabaseService.exportToFile()
DatabaseService.importFromFile(file)

// Utilities
DatabaseService.getStats()
DatabaseService.getMetadata()
DatabaseService.resetDatabase()
```

### 3. Tự động lưu dữ liệu

Mỗi khi có thao tác:
- **Đăng ký mới**: Tự động lưu vào database
- **Cập nhật cài đặt**: Tự động lưu vào database  
- **Xóa đăng ký**: Tự động cập nhật database
- **Metadata**: Tự động cập nhật thời gian và thống kê

### 4. Export/Import JSON

- **Export**: Tải xuống file JSON chứa toàn bộ database
- **Import**: Tải lên file JSON để khôi phục database
- **Backup**: Tạo bản sao lưu tự động
- **Sharing**: Chia sẻ database giữa các thiết bị

## Cách sử dụng

### 1. Đăng ký mới
1. Chọn tab "Đăng ký"
2. Chọn tuần và thêm người chơi
3. Click "Đăng ký tuần này"
4. Dữ liệu tự động lưu vào database JSON

### 2. Quản lý dữ liệu
1. Chọn tab "Dữ liệu"
2. Xem thống kê database
3. Xuất database ra file JSON
4. Nhập database từ file JSON

### 3. Demo và test
1. Chọn tab "Demo DB"
2. Tạo dữ liệu mẫu để test
3. Xem thống kê real-time
4. Test các chức năng export/import

## Ưu điểm của giải pháp

### 1. Giả lập database thật
- Cấu trúc rõ ràng như database thực tế
- API hoàn chỉnh với các phương thức CRUD
- Metadata tracking và statistics

### 2. Dễ sử dụng và maintain
- Code clean và có tổ chức
- Type-safe với TypeScript
- Error handling đầy đủ

### 3. Tính năng nâng cao
- Auto-save sau mỗi thao tác
- Export/Import để backup và sharing
- Real-time statistics
- Data validation

### 4. Performance tốt
- Sử dụng localStorage (nhanh)
- Lazy loading và caching
- Optimized JSON operations

## Hạn chế

1. **Dung lượng**: localStorage có giới hạn ~5-10MB
2. **Đồng bộ**: Chỉ hoạt động trên một trình duyệt
3. **Bảo mật**: Dữ liệu lưu local, không mã hóa
4. **Backup**: Cần export thủ công để backup

## Kết luận

Giải pháp Database JSON ảo này cung cấp một cách tiếp cận chuyên nghiệp để quản lý dữ liệu trong ứng dụng web, giả lập hoàn toàn các tính năng của một database thực tế mà không cần server backend.
