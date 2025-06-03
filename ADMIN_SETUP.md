# 🔐 Cấu hình Admin Authentication

## Tổng quan

Ứng dụng Badminton App sử dụng mã admin để bảo vệ các tính năng quản trị như:
- Cài đặt hệ thống
- Quản lý dữ liệu
- Demo database
- Xóa đăng ký và người chơi

## Cấu hình Admin Code

### 1. Thiết lập Environment Variable

Mã admin được lưu trong file `.env` với biến `VITE_ADMIN_CODE`:

```bash
# Admin Authentication
VITE_ADMIN_CODE=your_secure_admin_code_here
```

### 2. Thay đổi mã admin

**Bước 1:** Mở file `.env` trong thư mục gốc của project

**Bước 2:** Tìm dòng `VITE_ADMIN_CODE` và thay đổi giá trị:

```bash
# Thay đổi từ:
VITE_ADMIN_CODE=admin123

# Thành mã bảo mật của bạn:
VITE_ADMIN_CODE=MySecureAdminCode2024!
```

**Bước 3:** Restart server development:

```bash
npm run dev
```

### 3. Sử dụng Admin Code

1. Truy cập ứng dụng
2. Click vào tab "Cài đặt", "Dữ liệu", hoặc "Demo DB"
3. Nhập mã admin trong popup xác thực
4. Truy cập các tính năng quản trị

## Bảo mật

### ✅ Nên làm:
- Sử dụng mã phức tạp, khó đoán
- Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt
- Thay đổi mã định kỳ
- Không chia sẻ mã với người không có quyền

### ❌ Không nên:
- Sử dụng mã đơn giản như "123456", "admin", "password"
- Commit file `.env` vào Git (đã được ignore)
- Chia sẻ mã qua email hoặc chat không mã hóa

## Ví dụ mã admin tốt

```bash
# Ví dụ các mã admin bảo mật:
VITE_ADMIN_CODE=BadmintonAdmin2024!
VITE_ADMIN_CODE=SportClub@Manager#2024
VITE_ADMIN_CODE=SecureAccess$789
```

## Khôi phục mã admin

Nếu quên mã admin:

1. Mở file `.env`
2. Xem giá trị của `VITE_ADMIN_CODE`
3. Hoặc thay đổi thành mã mới

## Lưu ý kỹ thuật

- Mã admin được lưu trong environment variable, không hardcode trong source code
- Session admin có thời hạn 24 giờ
- Sau 24 giờ cần xác thực lại
- Mã admin chỉ được kiểm tra ở frontend (phù hợp cho ứng dụng demo)

## Troubleshooting

### Lỗi: "Mã admin không đúng!"
- Kiểm tra file `.env` có đúng giá trị `VITE_ADMIN_CODE`
- Restart server sau khi thay đổi `.env`
- Đảm bảo không có khoảng trắng thừa

### Lỗi: Không thể truy cập admin
- Xóa localStorage: `localStorage.removeItem('isAdmin')`
- Refresh trang và thử lại
- Kiểm tra console browser có lỗi không

---

💡 **Tip:** Để tăng cường bảo mật, có thể tích hợp với hệ thống authentication thực tế như Firebase Auth, Auth0, hoặc JWT tokens trong production.
