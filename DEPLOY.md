# Hướng Dẫn Deploy ProFit Bằng Docker

Tài liệu này hướng dẫn chi tiết cách đóng gói và chạy dự án ProFit (backend Node.js + frontend React) bằng Docker & Docker Compose.

---

## 1. Cấu Trúc Docker

```
lap_trinh_web_final/
├── backend-node/
│   ├── Dockerfile              # Multi-stage build cho Node/TS
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile              # Build Vite -> phục vụ qua Nginx
│   ├── nginx.conf              # Reverse proxy: /api -> backend
│   └── .dockerignore
├── docker-compose.yml          # Orchestrate 2 services: backend + frontend
├── .env.docker.example         # Mẫu biến môi trường cho Docker
└── DEPLOY.md                   # File này
```

---

## 2. Yêu Cầu

- **Docker Desktop** (đã cài trên Windows/Mac/Linux) — bao gồm cả Docker Engine và Docker Compose
- Kiểm tra nhanh:

```bash
docker --version
docker compose version
```

> Trên Windows, dùng PowerShell hoặc Windows Terminal. Đảm bảo Docker Desktop đang chạy.

---

## 3. Chuẩn Bị Biến Môi Trường

Tạo file `.env` tại thư mục gốc dự án (cùng cấp với `docker-compose.yml`) bằng cách copy từ file mẫu:

```bash
# PowerShell
Copy-Item .env.docker.example .env
```

Sau đó mở file `.env` và chỉnh sửa nếu cần. Các biến quan trọng:

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `FRONTEND_PORT` | Port host cho frontend (Nginx) | `8080` |
| `BACKEND_PORT` | Port host cho backend (Express) | `3001` |
| `DB_HOST` | Host MySQL | Aiven (xem file mẫu) |
| `DB_PORT` | Port MySQL | `26354` |
| `DB_NAME` | Tên database | `defaultdb` |
| `DB_USER` | User MySQL | `avnadmin` |
| `DB_PASSWORD` | Password MySQL | (xem file mẫu) |
| `JWT_SECRET` | Secret cho JWT (>= 64 ký tự) | (xem file mẫu) |
| `CORS_ORIGIN` | Domain frontend được phép gọi API | `*` |
| `FRONTEND_BASE_URL` | URL public của frontend | `http://localhost:8080` |

> **Lưu ý bảo mật:** Ở môi trường production thật, hãy đổi `JWT_SECRET` thành chuỗi ngẫu nhiên dài, và đặt `CORS_ORIGIN` thành domain thật thay vì `*`.

---

## 4. Build & Khởi Chạy

Tại thư mục gốc (`lap_trinh_web_final/`):

```bash
# Build images lần đầu (mất vài phút)
docker compose build

# Chạy containers ở chế độ detached (chạy nền)
docker compose up -d

# Xem logs realtime
docker compose logs -f
```

Sau khi khởi động thành công:

| Service | URL |
|---------|-----|
| Frontend (Web) | http://localhost:8080 |
| Backend API | http://localhost:3001/api/v1 |
| Admin Panel (EJS) | http://localhost:8080/admin |

> Khi truy cập từ trình duyệt, **frontend sẽ gọi API qua Nginx proxy** (`/api/...` -> backend container), nên không cần CORS phức tạp.

---

## 5. Kiểm Tra Sau Khi Triển Khai

```bash
# Xem trạng thái containers
docker compose ps

# Xem log của từng service
docker compose logs backend
docker compose logs frontend

# Test API public
curl http://localhost:8080/api/v1/products
```

Nếu mọi thứ OK, bạn sẽ thấy JSON danh sách sản phẩm trả về.

---

## 6. Các Lệnh Thường Dùng

| Lệnh | Mô tả |
|------|-------|
| `docker compose up -d` | Khởi động containers (nền) |
| `docker compose down` | Dừng và xóa containers |
| `docker compose down -v` | Dừng, xóa containers **và volumes** (mất uploads) |
| `docker compose restart` | Khởi động lại tất cả services |
| `docker compose restart backend` | Khởi động lại 1 service |
| `docker compose build --no-cache` | Build lại images từ đầu |
| `docker compose logs -f backend` | Xem log realtime của backend |
| `docker compose exec backend sh` | Vào shell trong container backend |
| `docker compose pull` | Pull image mới nhất (nếu dùng image có sẵn) |

---

## 7. Cập Nhật Code & Re-Deploy

Sau khi sửa code:

```bash
# Rebuild và khởi động lại
docker compose up -d --build
```

Lệnh này sẽ:
1. Build lại image backend (nếu code backend đổi) hoặc frontend (nếu code frontend đổi)
2. Khởi động lại containers với image mới
3. **Giữ nguyên volume uploads** (dữ liệu ảnh upload không bị mất)

---

## 8. Dữ Liệu Upload (uploads/)

Thư mục `uploads/` của backend được mount vào Docker volume `backend-uploads`. Điều này có nghĩa:

- Ảnh upload từ admin sẽ **được giữ lại** khi restart container
- Ảnh sẽ **bị mất** nếu chạy `docker compose down -v`
- Để backup dữ liệu, dump volume ra thư mục host:

```bash
docker run --rm -v profit_backend-uploads:/data -v ${PWD}:/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

Để restore:

```bash
docker run --rm -v profit_backend-uploads:/data -v ${PWD}:/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /data
```

---

## 9. Xử Lý Sự Cố

### Lỗi kết nối database khi backend khởi động
- Kiểm tra biến `DB_*` trong file `.env` đã đúng chưa
- Đảm bảo Aiven MySQL cho phép kết nối từ IP máy bạn (vào Aiven Dashboard kiểm tra "Allowed IP addresses")
- Xem log: `docker compose logs backend`

### Frontend không gọi được API
- Mở DevTools (F12) -> tab Network, kiểm tra request `/api/...` có status gì
- Nếu là 404: nginx proxy sai. Xem lại `frontend/nginx.conf`
- Nếu là CORS error: cập nhật `CORS_ORIGIN` trong `.env`

### Container restart liên tục
- Xem log: `docker compose logs --tail=100 backend`
- Nguyên nhân thường gặp: sai biến môi trường, database không truy cập được

### Port đã bị chiếm
- Đổi `FRONTEND_PORT` hoặc `BACKEND_PORT` trong file `.env`
- Sau đó `docker compose up -d` lại

### Build chậm / lỗi mạng
- Dùng `--no-cache` để build sạch
- Hoặc dùng cache mount (đã cấu hình sẵn trong Dockerfile)

---

## 10. Production Hardening (Tùy chọn)

1. **Đổi `JWT_SECRET`** thành chuỗi ngẫu nhiên dài (>= 64 ký tự):

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

2. **Đặt `CORS_ORIGIN`** thành domain frontend thật, ví dụ: `https://profit.example.com`

3. **Dùng reverse proxy bên ngoài** (Caddy / Nginx / Traefik) để thêm HTTPS.

4. **Backup volume `backend-uploads`** định kỳ.

---

## 11. Lệnh Nhanh

```bash
# Lần đầu tiên
Copy-Item .env.docker.example .env
docker compose build
docker compose up -d
docker compose logs -f

# Cập nhật code
docker compose up -d --build

# Dừng
docker compose down
```
