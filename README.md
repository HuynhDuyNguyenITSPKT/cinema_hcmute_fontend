Link : FE : https://www.ticket-movie-nhom09.duckdns.org

# Cinema HCMUTE Frontend

Frontend cho hệ thống đặt vé phim, xây bằng React + Vite + React Router + Axios + Bootstrap.

Mục tiêu của README này:
- Giúp dev mới biết bắt đầu đọc code từ đâu.
- Nắm nhanh kiến trúc tổng thể của dự án.
- Hiểu rõ luồng đăng nhập, phân quyền và gọi API.

## 1. Công nghệ chính

- React 19
- Vite 8
- React Router DOM 7
- Axios
- Bootstrap 5
- ESLint 9

## 2. Cài đặt và chạy dự án

### Yêu cầu

- Node.js >= 18
- npm >= 9

### Biến môi trường

Tạo file `.env` ở thư mục gốc (hoặc dùng file sẵn có) với nội dung:

```env
VITE_API_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### Chạy local

```bash
npm install
npm run dev
```

Mở trình duyệt tại địa chỉ do Vite cung cấp (thường là `http://localhost:5173`).

### Script có sẵn

- `npm run dev`: chạy môi trường development.
- `npm run build`: build production.
- `npm run preview`: chạy bản build.
- `npm run lint`: kiểm tra lint.

## 3. Điểm bắt đầu đọc code cho dev mới

Nếu bạn mới vào dự án, đọc theo thứ tự này:

1. `src/main.jsx`
2. `src/App.jsx`
3. `src/router/AppRouter.jsx`
4. `src/contexts/AuthContext.jsx`
5. `src/components/ProtectedRoute.jsx`
6. `src/api/axiosClient.js`
7. `src/services/authService.js` và `src/services/userService.js`
8. `src/layouts/*` rồi `src/pages/*`

Chỉ cần đi đúng thứ tự trên là hiểu được 90% luồng chạy của app.

## 4. Luồng khởi động ứng dụng

### Bước 1: Mount React app

- `index.html` có `<div id="root"></div>`.
- `src/main.jsx` gọi `createRoot(...).render(<App />)`.

### Bước 2: Khởi tạo Router + Auth

Trong `src/App.jsx`:
- Bọc app bởi `BrowserRouter`.
- Bọc tiếp bằng `AuthProvider`.
- Render `AppRouter` để map route.
- Mount `AppNotificationModal` để hiển thị thông báo toàn cục.

### Bước 3: Kiểm tra phiên đăng nhập

`AuthProvider` (trong `src/contexts/AuthContext.jsx`) chạy `initializeAuth` ngay khi app mở:
- Nếu không có `accessToken` trong localStorage: đánh dấu xong khởi tạo, chưa đăng nhập.
- Nếu có token: gọi `/auth/me` để lấy profile.
- Nếu lỗi: clear token và đưa user về trạng thái đăng xuất.

## 5. Cấu trúc thư mục

```text
src/
	api/                  # Axios client + interceptor
	assets/               # Ảnh, SVG
	components/           # Component tái sử dụng
		layout/             # Header/Footer dùng chung
	contexts/             # React Context (AuthContext)
	layouts/              # Khung trang theo vai trò (Guest/Public/Admin/User)
	pages/                # Màn hình theo route
	router/               # Định nghĩa route + redirect theo role
	services/             # Hàm gọi API theo nghiệp vụ
	utils/                # Hàm tiện ích (token storage, notify, role route)
	App.jsx               # Nút kết nối Router + Auth + Notification
	main.jsx              # Entry point
```

## 6. Hệ thống route và phân quyền

Định nghĩa tại `src/router/AppRouter.jsx`:

- Guest routes:
	- `/login`
	- `/register`
	- `/forgot-password`

- Public route:
	- `/` (Home)

- Protected route dùng redirect theo role:
	- `/redirect` -> `RoleBasedRedirect`

- Admin routes (bắt buộc role `ADMIN`):
	- `/admin/profile`
	- `/admin/users`

- User routes (bắt buộc role `USER`):
	- `/user/profile`

- Fallback:
	- `*` -> `/`

`ProtectedRoute` kiểm tra theo thứ tự:
1. Đang initialize auth -> hiện loading.
2. Chưa đăng nhập -> điều hướng về `/login`.
3. Có đăng nhập nhưng sai role -> điều hướng về route mặc định của role.
4. Đúng điều kiện -> render children.

## 7. Luồng đăng nhập và quản lý phiên

### 7.1 Lưu token

`src/utils/tokenStorage.js` dùng localStorage với key:
- `accessToken`
- `refreshToken`

### 7.2 Đăng nhập thường

`Login.jsx` -> `useAuth().login(...)`:
1. Gọi `POST /auth/login`.
2. Lưu token vào localStorage.
3. Gọi `GET /auth/me` để lấy user profile.
4. Điều hướng theo role hoặc route trước đó.

### 7.3 Đăng nhập Google

`Login.jsx` dùng Google Identity trong React để lấy `credential` (ID token), sau đó gửi về backend:

```json
POST /api/auth/google
{
	"tokenId": "..."
}
```

Sau khi backend trả token giống login thường:
1. Lưu token.
2. Gọi `/auth/me`.
3. Điều hướng theo role.

### 7.4 Đăng xuất

`logout` trong `AuthContext`:
1. Nếu có refresh token -> gọi `POST /auth/logout`.
2. Dù API lỗi vẫn clear token local.
3. Set `user = null`.

## 8. Tầng API và endpoint đang dùng

### 8.1 Axios client

`src/api/axiosClient.js`:
- `baseURL` lấy từ `VITE_API_URL`.
- Request interceptor: tự đính `Authorization: Bearer <accessToken>` nếu có token.
- Response interceptor:
	- Trả về luôn `response.data`.
	- Nếu payload có `success === false` thì reject.
	- Chuẩn hóa lỗi mạng thành object có `message`.

### 8.2 Auth service

`src/services/authService.js` đang dùng các endpoint:
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/register`
- `POST /auth/verify-otp`
- `POST /auth/resend-otp`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/refresh` (đã có hàm, hiện chưa gắn auto-refresh interceptor)

### 8.3 User service

`src/services/userService.js`:
- `GET /users/pageable`
- `PUT /users/profile`
- `PUT /users/{userId}/status`

## 9. Mô tả nhanh từng khu vực UI

- `src/layouts/GuestLayout.jsx`: khung cho trang chưa đăng nhập.
- `src/layouts/PublicLayout.jsx`: navbar + footer cho trang public và user.
- `src/layouts/AdminLayout.jsx`: sidebar/admin shell.
- `src/layouts/UserLayout.jsx`: bọc `PublicLayout` cho user area.

- `src/pages/Home.jsx`: trang chủ public (đang dùng dữ liệu mẫu phim).
- `src/pages/Login.jsx`: đăng nhập thường + Google Login (ID token -> `/auth/google`).
- `src/pages/Register.jsx`: đăng ký và xác thực OTP.
- `src/pages/ForgotPassword.jsx`: xin OTP + đặt lại mật khẩu.
- `src/pages/AdminUsers.jsx`: danh sách user có phân trang/tìm kiếm và bật tắt trạng thái.
- `src/pages/AdminProfile.jsx`, `src/pages/UserProfile.jsx`: dùng lại `ProfileCard`.

- `src/components/ProfileCard.jsx`: hiển thị và cập nhật hồ sơ + đổi mật khẩu.
- `src/components/AppNotificationModal.jsx`: popup thông báo toàn cục.
- `src/utils/notify.js`: API bắn sự kiện notify (`app:notify`).

## 10. Cách thêm tính năng mới (quick guide)

### 10.1 Thêm API mới

1. Thêm hàm trong file service tương ứng ở `src/services/`.
2. Dùng hàm đó trong page/component.
3. Bọc xử lý thành công/thất bại bằng `notifySuccess` hoặc `notifyError` nếu cần.

### 10.2 Thêm route mới cần đăng nhập

1. Tạo page trong `src/pages/`.
2. Thêm route vào `src/router/AppRouter.jsx` bên trong `ProtectedRoute` phù hợp role.
3. Nếu cần tab/menu thì cập nhật layout tương ứng (`AdminLayout` hoặc `PublicLayout`).

### 10.3 Thêm trường vào hồ sơ user

1. Cập nhật `createProfileForm` và form trong `src/components/ProfileCard.jsx`.
2. Cập nhật payload `updateProfile`.
3. Đảm bảo backend trả về dữ liệu mới ở `/auth/me` hoặc `/users/profile`.

## 11. Lưu ý quan trọng khi bảo trì

- Google Login cần cấu hình đúng `VITE_GOOGLE_CLIENT_ID` để render nút Google.
- `getDefaultPathByRole('USER')` hiện trả về `/`, trong khi user area có route `/user/profile`.
- `authService.refreshToken` đã có nhưng chưa được dùng trong interceptor để tự refresh access token.

Những điểm này không sai, nhưng dev mới cần biết để tránh hiểu nhầm khi debug flow auth.

## 12. Tài nguyên tĩnh

- `public/favicon.svg`
- `public/icons.svg`
- `src/assets/*`

---

Nếu bạn là dev mới: hãy chạy app, đăng nhập bằng 1 tài khoản ADMIN và 1 tài khoản USER, rồi theo thứ tự đọc code ở Mục 3 để nắm dự án nhanh nhất.
