# Hướng dẫn Setup Firebase cho Badminton App

## 🔥 Tổng quan

App đã được chuyển đổi từ localStorage sang **Cloud Firestore** để lưu trữ dữ liệu trên cloud. Điều này mang lại nhiều lợi ích:

- ✅ **Đồng bộ dữ liệu** giữa nhiều thiết bị
- ✅ **Sao lưu tự động** trên cloud
- ✅ **Bảo mật cao** với Google Firebase
- ✅ **Truy cập từ xa** mọi lúc mọi nơi
- ✅ **Fallback** về localStorage nếu không có internet

## 🚀 Cách Setup Firebase

### Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Đăng nhập bằng tài khoản Google
3. Click **"Create a project"** hoặc **"Add project"**
4. Đặt tên project: `badminton-app` (hoặc tên bạn muốn)
5. Tắt Google Analytics (không cần thiết cho app này)
6. Click **"Create project"**

### Bước 2: Setup Firestore Database

1. Trong Firebase Console, chọn project vừa tạo
2. Vào **"Firestore Database"** từ menu bên trái
3. Click **"Create database"**
4. Chọn **"Start in test mode"** (cho development)
5. Chọn location gần nhất (ví dụ: `asia-southeast1`)
6. Click **"Done"**

### Bước 3: Tạo Web App

1. Trong Firebase Console, click icon **"Web"** (</>) 
2. Đặt tên app: `Badminton Registration App`
3. **KHÔNG** check "Firebase Hosting" (chưa cần)
4. Click **"Register app"**
5. **Copy** toàn bộ config object (sẽ dùng ở bước tiếp theo)

### Bước 4: Cấu hình Environment Variables

1. Tạo file `.env` trong thư mục root của project:

```bash
# Copy file .env.example thành .env
cp .env.example .env
```

2. Mở file `.env` và điền thông tin từ Firebase config:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Development Settings
VITE_USE_FIREBASE_PROD=true
```

### Bước 5: Cấu hình Firestore Rules (Tùy chọn)

Để bảo mật hơn, bạn có thể cập nhật Firestore Rules:

1. Vào **"Firestore Database"** > **"Rules"**
2. Thay thế rules mặc định bằng:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cho phép đọc/ghi tất cả documents (chỉ dùng cho development)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Lưu ý:** Rules này chỉ dùng cho development. Trong production cần rules bảo mật hơn.

## 🧪 Test Setup

### Chạy App với Firestore

1. Khởi động app:
```bash
npm run dev
```

2. Mở browser và truy cập app
3. Kiểm tra Console để xem có lỗi Firebase không
4. Thử tạo đăng ký mới và kiểm tra dữ liệu trong Firebase Console

### Kiểm tra Firestore Console

1. Vào Firebase Console > Firestore Database
2. Bạn sẽ thấy các collections:
   - `settings`: Cài đặt app
   - `registrations`: Danh sách đăng ký
   - `metadata`: Thông tin metadata

## 🔧 Development vs Production

### Development Mode (Mặc định)

- App sẽ cố gắng kết nối Firestore Emulator trước
- Nếu không có emulator, sẽ dùng Firestore production
- Có thể fallback về localStorage nếu có lỗi

### Production Mode

Để force sử dụng Firebase production:

```env
VITE_USE_FIREBASE_PROD=true
```

## 🚨 Troubleshooting

### Lỗi thường gặp:

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Kiểm tra lại `VITE_FIREBASE_API_KEY` trong file `.env`

2. **"Missing or insufficient permissions"**
   - Kiểm tra Firestore Rules
   - Đảm bảo đã enable Firestore Database

3. **"Network error"**
   - Kiểm tra kết nối internet
   - App sẽ tự động fallback về localStorage

4. **"Module not found: firebase"**
   - Chạy `npm install` để cài đặt dependencies

### Debug Mode

Để xem chi tiết logs:

1. Mở Developer Tools (F12)
2. Vào tab Console
3. Tìm logs có prefix "🔥" hoặc "⚠️"

## 📱 Tính năng mới với Firestore

1. **Real-time sync**: Dữ liệu đồng bộ real-time (có thể thêm sau)
2. **Multi-device**: Truy cập từ nhiều thiết bị
3. **Backup tự động**: Google tự động backup
4. **Offline support**: Hoạt động offline với cache
5. **Scalability**: Có thể mở rộng cho nhiều người dùng

## 🎯 Kết luận

Sau khi setup xong, app sẽ:
- ✅ Lưu dữ liệu trên Cloud Firestore
- ✅ Hiển thị "Database Firestore" thay vì "Database JSON"
- ✅ Có loading states khi thao tác với database
- ✅ Fallback về localStorage nếu có lỗi
- ✅ Hoạt động mượt mà như trước

**Chúc bạn setup thành công! 🎉**
