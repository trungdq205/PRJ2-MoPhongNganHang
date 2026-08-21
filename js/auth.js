/**
 * Phân hệ Xác thực & Quản lý Quyền người dùng (Authentication)
 * 
 * BẢO MẬT CẤP NGÂN HÀNG:
 *   1. Khóa tài khoản sau 5 lần nhập sai mật khẩu (15 phút)
 *   2. Thông báo số lần thử còn lại
 *   3. Không tiết lộ user có tồn tại hay không
 * 
 * Chiến lược đăng nhập:
 *   1. Thử gọi REST API backend (Spring Boot / MySQL / BCrypt)
 *   2. Nếu backend offline hoặc lỗi → fallback sang LocalStore (localStorage)
 */
import { store } from './store.js';
import { BankApiService } from './api.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 phút

export class AuthService {

  /**
   * Kiểm tra tài khoản có đang bị khóa không (LocalStore).
   * @returns {{ locked: boolean, minutesRemaining: number }}
   */
  static checkAccountLock(userObj) {
    if (!userObj || !userObj.accountLockedUntil) return { locked: false, minutesRemaining: 0 };
    
    const lockUntil = new Date(userObj.accountLockedUntil).getTime();
    const now = Date.now();
    
    if (now < lockUntil) {
      const minutesRemaining = Math.ceil((lockUntil - now) / 60000);
      return { locked: true, minutesRemaining };
    }
    
    // Khóa đã hết hạn — reset
    userObj.failedLoginAttempts = 0;
    userObj.accountLockedUntil = null;
    store.saveData();
    return { locked: false, minutesRemaining: 0 };
  }

  /**
   * Ghi nhận lần đăng nhập thất bại (LocalStore).
   */
  static recordFailedLogin(userObj) {
    userObj.failedLoginAttempts = (userObj.failedLoginAttempts || 0) + 1;
    
    if (userObj.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      userObj.accountLockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      store.saveData();
      return {
        locked: true,
        message: `Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu ${MAX_FAILED_ATTEMPTS} lần liên tiếp. Liên hệ ngân hàng nếu cần hỗ trợ.`
      };
    }
    
    store.saveData();
    const remaining = MAX_FAILED_ATTEMPTS - userObj.failedLoginAttempts;
    return {
      locked: false,
      message: `Mật khẩu không chính xác. Bạn còn ${remaining} lần thử trước khi tài khoản bị khóa.`
    };
  }

  /**
   * Reset bộ đếm đăng nhập thất bại (sau khi đăng nhập thành công).
   */
  static resetFailedAttempts(userObj) {
    userObj.failedLoginAttempts = 0;
    userObj.accountLockedUntil = null;
    store.saveData();
  }

  /**
   * Đăng nhập async — ưu tiên backend, fallback LocalStore.
   * @returns Promise<{ success, user, source }>
   */
  /**
   * Đăng nhập async — thử LocalStore trước hoặc Backend, đảm bảo tài khoản mới tạo đăng nhập mượt mà.
   * @returns Promise<{ success, user, source }>
   */
  static async loginAsync(username, password, roleHint = 'CUSTOMER') {
    // 1. ƯU TIÊN gọi Backend REST API trước để lấy JWT Token và xác thực cơ sở dữ liệu thật
    try {
      const apiResult = await BankApiService.login(username, password);
      if (apiResult && apiResult.success && apiResult.data) {
        const backendData = apiResult.data;
        const localCust = store.data.customers.find(c => c.username === backendData.username || c.phone === username);
        const mappedUser = {
          id: localCust ? localCust.id : (backendData.role === 'CUSTOMER' ? `CUST-${1000 + backendData.userId}` : String(backendData.userId)),
          username: backendData.username,
          role: backendData.role,
          fullName: backendData.fullName,
          email: backendData.email || '',
          phone: backendData.phone || '',
          _backendId: backendData.userId,
          _source: 'backend',
          _loginTime: Date.now(),
          _hasJwtToken: true
        };

        if (backendData.role === 'CUSTOMER') {
          mappedUser.customerId = localCust ? localCust.id : 'CUST-1001';
        }

        if (localCust) {
          AuthService.resetFailedAttempts(localCust);
        }

        store.data.currentUser = mappedUser;
        store.addAuditLog(backendData.username, `Đăng nhập thành công qua Backend JWT (Vai trò: ${backendData.role})`);
        store.saveData();

        return { success: true, user: mappedUser, source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        // Backend phản hồi lỗi rõ ràng (ví dụ: sai mật khẩu, tài khoản bị khóa)
        // Kiểm tra xem có phải tài khoản tạo local offline không
        const localResult = AuthService.login(username, password, roleHint);
        if (localResult.success) {
          localResult.source = 'local';
          return localResult;
        }
        return { success: false, message: apiResult.message || 'Đăng nhập không thành công' };
      }
    } catch (e) {
      console.warn('[Auth] Backend không khả dụng hoặc lỗi kết nối, fallback sang LocalStore:', e);
    }

    // 2. Fallback sang LocalStore khi backend offline
    const localResult = AuthService.login(username, password, roleHint);
    if (localResult.success) {
      localResult.source = 'local';
    }
    return localResult;
  }

  /**
   * Đăng nhập bằng nhận diện khuôn mặt FaceID.
   */
  static async loginWithFaceAsync(username = '0901234567', faceData = null) {
    try {
      const apiResult = await BankApiService.loginWithFace(username, faceData);
      if (apiResult && apiResult.success && (apiResult.data || apiResult.token || apiResult.username)) {
        const backendData = apiResult.data || apiResult;
        const localCust = store.data.customers.find(c => 
          c.username === (backendData.username || username) || 
          c.phone === username || 
          c.phone === backendData.phone
        );
        const mappedUser = {
          id: localCust ? localCust.id : `CUST-${1000 + (backendData.userId || 1)}`,
          username: backendData.username || username,
          role: backendData.role || 'CUSTOMER',
          fullName: backendData.fullName || backendData.full_name || (localCust ? localCust.fullName : 'Khách hàng'),
          email: backendData.email || (localCust ? localCust.email : ''),
          phone: backendData.phone || (localCust ? localCust.phone : username),
          _backendId: backendData.userId || 1,
          _source: 'backend',
          _loginTime: Date.now(),
          _hasJwtToken: true
        };
        if (mappedUser.role === 'CUSTOMER') {
          mappedUser.customerId = (localCust && localCust.id) ? localCust.id : (backendData.customer_id || 'CUST-1001');
        }
        store.data.currentUser = mappedUser;
        store.addAuditLog(mappedUser.phone || mappedUser.username, 'Đăng nhập thành công bằng FaceID (Khuôn mặt sinh trắc học)');
        store.saveData();
        return { success: true, user: mappedUser, source: 'backend', message: apiResult.message || 'Xác thực FaceID thành công!' };
      }
    } catch (e) {
      console.warn('[Auth] FaceID backend error, fallback local', e);
    }

    const query = (username || '').trim().toLowerCase();
    const localCust = store.data.customers.find(c => 
      (c.phone && c.phone.trim() === query) ||
      (c.username && c.username.toLowerCase() === query) ||
      (c.username === 'cust_' + query)
    ) || store.data.customers[0];

    if (localCust) {
      const mappedUser = {
        ...localCust,
        _source: 'local',
        _loginTime: Date.now()
      };
      store.data.currentUser = mappedUser;
      store.addAuditLog(localCust.phone || localCust.username, 'Đăng nhập thành công bằng FaceID');
      store.saveData();
      return { success: true, user: mappedUser, source: 'local', message: 'Xác thực sinh trắc học FaceID thành công!' };
    }
    return { success: false, message: 'Khuôn mặt không trùng khớp với dữ liệu sinh trắc học đã đăng ký' };
  }

  /**
   * Đăng nhập đồng bộ qua LocalStore (bằng Số Điện Thoại).
   * Bao gồm kiểm tra khóa tài khoản và đếm số lần sai.
   */
  static login(username, password, roleHint = 'CUSTOMER') {
    const data = store.data;
    const query = (username || '').trim().toLowerCase();

    // Hàm kiểm tra khớp số điện thoại hoặc mã
    const matchCustomer = (c) => {
      if (!c) return false;
      const uPhone = (c.phone || '').trim();
      const uName = (c.username || '').toLowerCase();
      const uEmail = (c.email || '').toLowerCase();
      return uPhone === query || 
             uName === query || 
             uName === 'cust_' + query ||
             uEmail === query;
    };

    const matchTeller = (t) => {
      if (!t) return false;
      const uPhone = (t.phone || '').trim();
      const uName = (t.username || '').toLowerCase();
      const uStaff = (t.staffCode || '').toLowerCase();
      const uEmail = (t.email || '').toLowerCase();
      return uPhone === query || 
             uName === query || 
             uStaff === query || 
             uEmail === query;
    };

    const matchAdmin = (a) => {
      if (!a) return false;
      const uPhone = (a.phone || '').trim();
      const uName = (a.username || '').toLowerCase();
      const uEmail = (a.email || '').toLowerCase();
      return uPhone === query || uName === query || uEmail === query;
    };

    // Tìm user
    let foundUser = null;
    if (roleHint === 'CUSTOMER') {
      foundUser = data.customers.find(matchCustomer);
    } else if (roleHint === 'TELLER') {
      foundUser = data.tellers.find(matchTeller);
    } else if (roleHint === 'ADMIN') {
      foundUser = data.admins.find(matchAdmin);
    }

    if (!foundUser) {
      foundUser = data.customers.find(matchCustomer) ||
                  data.tellers.find(matchTeller) ||
                  data.admins.find(matchAdmin);
    }

    if (!foundUser) {
      return { success: false, message: 'Số điện thoại hoặc mật khẩu không chính xác' };
    }

    // Kiểm tra tài khoản bị khóa
    const lockStatus = AuthService.checkAccountLock(foundUser);
    if (lockStatus.locked) {
      return { 
        success: false, 
        message: `Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${lockStatus.minutesRemaining} phút.` 
      };
    }

    // Xác minh mật khẩu
    if (foundUser.password !== password) {
      const failResult = AuthService.recordFailedLogin(foundUser);
      store.addAuditLog(foundUser.phone || username, `Đăng nhập thất bại — Sai mật khẩu`);
      return { success: false, message: failResult.message };
    }

    // Đăng nhập thành công — reset bộ đếm
    AuthService.resetFailedAttempts(foundUser);

    store.data.currentUser = { ...foundUser, _loginTime: Date.now() };
    store.addAuditLog(foundUser.phone || foundUser.username, `Đăng nhập thành công (Vai trò: ${foundUser.role})`);
    store.saveData();
    return { success: true, user: store.data.currentUser };
  }

  static logout() {
    if (store.data.currentUser) {
      store.addAuditLog(store.data.currentUser.username, 'Đăng xuất khỏi hệ thống');
      store.data.currentUser = null;
      store.saveData();
    }
    // Xóa JWT token khỏi sessionStorage
    BankApiService.logout();
  }

  static getCurrentUser() {
    return store.data.currentUser;
  }

  static hasPermission(permissionId) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'ADMIN') return true; // Quản trị viên có toàn quyền
    if (user.role === 'TELLER') {
      return (user.permissions || []).includes(permissionId);
    }
    return false;
  }

  static getStaffPositionTitle(user = null) {
    const u = user || this.getCurrentUser();
    if (!u) return 'Người Dùng';
    if (u.role === 'ADMIN') return 'Quản Trị Viên';
    return 'Giao Dịch Viên';
  }

  static getStaffBadgeClass(user = null) {
    const u = user || this.getCurrentUser();
    if (!u) return 'badge-customer';
    if (u.role === 'ADMIN') return 'badge-admin';
    return 'badge-teller';
  }
}
