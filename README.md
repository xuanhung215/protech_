# Dự Án ProFit - Hướng Dẫn Thiết Lập (Chi Tiết)

Tài liệu này hướng dẫn chi tiết cách thiết lập và chạy dự án ProFit trên máy của bạn.

---

## 1. Cấu Trúc Dự Án

Dự án có cấu trúc như sau:

```
ProFit/
├── backend-node/    # Backend - Node.js / Express / TypeORM / MySQL
├── frontend/       # Giao diện web - React / Vite
└── README.md       # File hướng dẫn này
```

**QUY TẮC QUAN TRỌNG:**
- **KHÔNG** chạy `npm install` ở thư mục gốc `ProFit/`.
- Khi làm việc với Frontend: Hãy `cd frontend` trước.
- Khi làm việc với Backend: Hãy `cd backend-node` trước.

---
####################################
## 5. Chạy Đồng Thời Backend và Frontend

Mở **2 terminal** riêng biệt:

**Terminal 1 - Backend:**

```bash
cd backend-node
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
########################################
## 2. Backend (Node.js)

### 2.1. Yêu Cầu

- **Node.js** (tải tại nodejs.org)
- **MySQL** đang chạy trên máy

### 2.2. Cấu Hình Backend

1. Di chuyển vào thư mục backend mới:

```bash
cd backend-node
```

2. Cài đặt thư viện:

```bash
npm install
```

3. Mở file `backend-node/.env` và kiểm tra thông tin database:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ProFitSuppsDB
DB_USER=root
DB_PASSWORD=root
```

**Quan trọng:** Thay `root` bằng username và password MySQL của bạn. Database ProFitSuppsDB phải đã tồn tại trong MySQL (không cần tạo mới).

### 2.3. Chạy Backend

```bash
npm run dev
```

Backend sẽ chạy ở **http://localhost:3001**

---

## 4. Frontend (React / Vite)

### 4.1. Cài Đặt

```bash
cd frontend
npm install
```

### 4.2. Cấu Hình Môi Trường

Mở file `frontend/.env` và kiểm tra `VITE_API_BASE_URL`:

```
VITE_API_BASE_URL=http://localhost:3001
```

**Lưu ý:** Nếu chưa có file `.env`, hãy copy `.env.example` thành `.env` trước.

### 4.3. Chạy Frontend

```bash
npm run dev
```

Frontend sẽ chạy ở **http://localhost:5173**

---

## 5. Chạy Đồng Thời Backend và Frontend

Mở **2 terminal** riêng biệt:

**Terminal 1 - Backend:**

```bash
cd backend-node
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

---

## 6. Các Lệnh Hữu Ích

### Backend

| Lệnh | Mô tả |
|------|-------|
| `npm install` | Cài thư viện |
| `npm run dev` | Chạy server (development) |
| `npm run build` | Build code TypeScript |
| `npm start` | Chạy bản đã build |
| `npm run seed` | Tạo dữ liệu mẫu |

### Frontend

| Lệnh | Mô tả |
|------|-------|
| `npm install` | Cài thư viện |
| `npm run dev` | Chạy server phát triển |
| `npm run build` | Build cho production |

---

## 7. Xử Lý Sự Cố

### Lỗi `node` hoặc `npm` không nhận diện
→ Chưa cài Node.js. Tải và cài tại nodejs.org.

### Lỗi `Database connection failed`
→ Kiểm tra:
- MySQL đã bật chưa
- Username/password trong `.env` đúng chưa
- Database đã tồn tại trong MySQL chưa

### Backend chạy nhưng API lỗi
→ Database có thể chưa có bảng. Import file SQL schema nếu có.

### Frontend không có dữ liệu
→ Kiểm tra `frontend/.env` đã trỏ đúng URL backend chưa.

---

---

## 8. Git Workflow (Quy Tắc Làm Việc Nhóm)

### 8.1. Cấu Trúc Nhánh

Dự án sử dụng mô hình phát triển như sau:

```
main          ← Nhánh chính thức (stable, production-ready)
   ↑
develop       ← Nhánh phát triển chính (tích hợp các feature)
   ↑
feature/xxx   ← Nhánh tính năng của từng người
```

### 8.2. Phân Công Tính Năng

| Thành viên | Tính năng |
|------------|------------|


### 8.3. Quy Tắc Đặt Tên Nhánh

- `feature/ten-tinh-nang` - Tính năng mới (VD: `feature/chatbot`)
- `fix/ten-loi` - Sửa lỗi (VD: `fix/login-bug`)
- `hotfix/ten-loi-nghiem-trong` - Sửa lỗi khẩn cấp

### 8.4. Quy Trình Làm Việc

#### Bước 1: Đồng bộ nhánh develop trước khi bắt đầu

```bash
git checkout develop
git pull origin develop
```

#### Bước 2: Tạo nhánh feature riêng

```bash
git checkout -b feature/ten-tinh-nang
```

#### Bước 3: Commit code thường xuyên

```bash
git add .
git commit -m "feat: mô tả tính năng đã hoàn thành"
```

**Quy tắc viết commit message:**
- `feat:` - Thêm tính năng mới
- `fix:` - Sửa lỗi
- `refactor:` - Cấu trúc lại code
- `docs:` - Cập nhật tài liệu
- `chore:` - Việc vặt (cài thư viện, config,...)

#### Bước 4: Push nhánh lên GitHub

```bash
git push origin feature/ten-tinh-nang
```

#### Bước 5: Tạo Pull Request (PR)

1. Truy cập repo trên GitHub
2. Tạo PR từ `feature/xxx` → `develop`
3. Mô tả chi tiết thay đổi
4. Gửi cho teammate review

#### Bước 6: Sau khi PR được merge

```bash
git checkout develop
git pull origin develop
# Xóa nhánh feature đã merge
git branch -d feature/ten-tinh-nang
```

### 8.5. Xử Lý Conflict

Khi có conflict giữa nhánh của bạn và `develop`:

```bash
# Chuyển sang nhánh develop và kéo code mới nhất
git checkout develop
git pull origin develop

# Chuyển về nhánh feature
git checkout feature/ten-tinh-nang

# Merge develop vào feature để giải quyết conflict cục bộ
git merge develop

# Sau khi giải quyết conflict trong code:
git add .
git commit -m "fix: resolve merge conflict"
git push origin feature/ten-tinh-nang
```

### 8.6. Lưu Ý Quan Trọng

- **KHÔNG bao giờ push trực tiếp vào `main` hoặc `develop`**
- **Luôn tạo PR** và có ít nhất 1 người review trước khi merge
- **Pull code mới nhất** từ `develop` trước khi bắt đầu làm tính năng
- **Commit thường xuyên** với message rõ ràng

---

## 9. Thông Tin Tài Khoản Mặc Định

Backend Node.js có thể tự tạo tài khoản admin khi khởi động:

| Thông tin | Giá trị |
|-----------|---------|
| Email | `admin@profit.com` |
| Password | `Admin@123` |

---

## 10. Thông Tin Repository

| Thông tin | Giá trị |
|-----------|---------|
| Owner | HUYNH-HOANG-QUAN |
| Repository | lap_trinh_web_final |
| URL | https://github.com/HUYNH-HOANG-QUAN/lap_trinh_web_final |

---
