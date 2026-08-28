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
   * Đăng nhập async trực tiếp qua Backend REST API kết nối CSDL MySQL & BCrypt
   * @returns Promise<{ success, user, source }>
   */
  static async loginAsync(username, password, roleHint = 'CUSTOMER') {
    try {
      const apiResult = await BankApiService.login(username, password);
      if (apiResult && apiResult.success && apiResult.data) {
        const backendData = apiResult.data;
        const localCust = store.data.customers.find(c => c.username === backendData.username || c.phone === username);
        const idCard = backendData.idCard || backendData.id_card || (apiResult.id_card) || (localCust ? localCust.idCard : '');
        const address = backendData.address || (apiResult.address) || (localCust ? localCust.address : '');
        const contactAddress = backendData.contactAddress || backendData.contact_address || (apiResult.contact_address) || address;
        const customerId = backendData.customerId || backendData.customer_id || (apiResult.customer_id) || (localCust ? localCust.id : (backendData.role === 'CUSTOMER' ? `CUST-${1000 + backendData.userId}` : ''));

        const mappedUser = {
          id: localCust ? localCust.id : (backendData.role === 'CUSTOMER' ? (customerId || `CUST-${1000 + backendData.userId}`) : String(backendData.userId)),
          username: backendData.username,
          role: backendData.role,
          fullName: backendData.fullName || backendData.full_name || '',
          email: backendData.email || '',
          phone: backendData.phone || '',
          idCard: idCard,
          address: address,
          contactAddress: contactAddress,
          _backendId: backendData.userId,
          _source: 'backend',
          _loginTime: Date.now(),
          _hasJwtToken: true
        };

        if (backendData.role === 'CUSTOMER') {
          mappedUser.customerId = customerId || (localCust ? localCust.id : 'CUST-1001');
        }

        if (localCust) {
          if (idCard) localCust.idCard = idCard;
          if (address) localCust.address = address;
          if (contactAddress) localCust.contactAddress = contactAddress;
          AuthService.resetFailedAttempts(localCust);
        } else if (backendData.role === 'CUSTOMER') {
          const newCust = {
            id: mappedUser.customerId || mappedUser.id,
            username: mappedUser.username,
            fullName: mappedUser.fullName,
            phone: mappedUser.phone,
            email: mappedUser.email,
            idCard: idCard,
            address: address,
            contactAddress: contactAddress,
            accounts: [],
            cards: [],
            savings: [],
            loans: []
          };
          if (!store.data.customers) store.data.customers = [];
          store.data.customers.push(newCust);
        }

        store.data.currentUser = mappedUser;
        store.addAuditLog(backendData.username, `Đăng nhập thành công qua Backend JWT (Vai trò: ${backendData.role})`);
        store.saveData();

        return { success: true, user: mappedUser, source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message || 'Số điện thoại hoặc mật khẩu không chính xác' };
      }
    } catch (e) {
      console.error('[Auth] Lỗi kết nối máy chủ CSDL khi đăng nhập:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể đăng nhập') };
    }

    return { success: false, message: 'Không thể kết nối đến máy chủ CSDL' };
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
