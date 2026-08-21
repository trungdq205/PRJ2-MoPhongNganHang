/**
 * Phân hệ Bảo mật Frontend — Mô phỏng Tiêu chuẩn Ngân hàng Thực tế
 * 
 * Tính năng:
 *   1. Validate chính sách mật khẩu mạnh (8+ ký tự, chữ hoa/thường, số, đặc biệt)
 *   2. Sinh mã OTP 6 chữ số cho giao dịch tài chính
 *   3. Ẩn/Che dữ liệu nhạy cảm (số tài khoản, số dư)
 *   4. Quản lý phiên đăng nhập (session timeout)
 */

export class SecurityService {

  // ═══════════════════════════════════════════════════════════
  // 1. CHÍNH SÁCH MẬT KHẨU MẠNH (Password Policy)
  // ═══════════════════════════════════════════════════════════

  /**
   * Validate mật khẩu theo tiêu chuẩn ngân hàng.
   * @returns {{ valid: boolean, score: number, errors: string[], level: string }}
   */
  static validatePasswordStrength(password) {
    const errors = [];
    let score = 0;

    if (!password || password.length === 0) {
      return { valid: false, score: 0, errors: ['Mật khẩu không được để trống'], level: 'none' };
    }

    // Quy tắc bắt buộc
    if (password.length < 8) {
      errors.push('Tối thiểu 8 ký tự');
    } else {
      score += 1;
      if (password.length >= 12) score += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Phải có ít nhất 1 chữ cái thường (a-z)');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Phải có ít nhất 1 chữ cái hoa (A-Z)');
    } else {
      score += 1;
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Phải có ít nhất 1 chữ số (0-9)');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
      errors.push('Phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');
    } else {
      score += 1;
    }

    // Mật khẩu quá đơn giản
    const commonPasswords = ['12345678', 'password', 'qwerty123', 'abc12345', 'Abc@1234'];
    // Note: Abc@1234 là mật khẩu demo ban đầu, chấp nhận khi đăng nhập nhưng khuyến cáo đổi

    let level = 'weak';
    if (score >= 5) level = 'strong';
    else if (score >= 3) level = 'medium';

    return {
      valid: errors.length === 0,
      score: score,
      errors: errors,
      level: level
    };
  }

  /**
   * Render thanh đánh giá độ mạnh mật khẩu (Password Strength Meter).
   * @returns {string} HTML markup
   */
  static renderPasswordStrengthBar(password) {
    const result = SecurityService.validatePasswordStrength(password);
    const percentage = Math.min(100, (result.score / 6) * 100);

    let color = 'var(--accent-danger)';
    let label = 'Yếu';
    if (result.level === 'strong') {
      color = 'var(--accent-emerald)';
      label = 'Mạnh';
    } else if (result.level === 'medium') {
      color = 'var(--accent-gold)';
      label = 'Trung bình';
    }

    return `
      <div class="password-strength-meter" style="margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
          <span style="color: var(--text-muted);">Độ mạnh mật khẩu</span>
          <span style="color: ${color}; font-weight: 600;">${label}</span>
        </div>
        <div style="height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
          <div style="height: 100%; width: ${percentage}%; background: ${color}; border-radius: 2px; transition: all 0.3s ease;"></div>
        </div>
        ${result.errors.length > 0 ? `
          <div style="margin-top: 6px; font-size: 0.7rem; color: var(--accent-danger);">
            ${result.errors.map(e => `• ${e}`).join('<br>')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // 2. XÁC THỰC OTP (One-Time Password)
  // ═══════════════════════════════════════════════════════════

  static _currentOTP = null;
  static _otpExpiry = null;
  static _otpAttempts = 0;
  static _maxOTPAttempts = 3;

  /**
   * Sinh mã OTP 6 chữ số mới.
   * Mã có hiệu lực trong 60 giây.
   * @returns {{ code: string, expiresAt: number }}
   */
  static generateOTP() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 60000; // 60 giây

    SecurityService._currentOTP = code;
    SecurityService._otpExpiry = expiresAt;
    SecurityService._otpAttempts = 0;

    return { code, expiresAt };
  }

  /**
   * Xác minh mã OTP.
   * @returns {{ valid: boolean, message: string }}
   */
  static verifyOTP(inputCode) {
    if (!SecurityService._currentOTP) {
      return { valid: false, message: 'Chưa có mã OTP nào được tạo. Vui lòng yêu cầu mã mới.' };
    }

    // Kiểm tra hết hạn
    if (Date.now() > SecurityService._otpExpiry) {
      SecurityService._currentOTP = null;
      return { valid: false, message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' };
    }

    // Kiểm tra số lần nhập sai
    if (SecurityService._otpAttempts >= SecurityService._maxOTPAttempts) {
      SecurityService._currentOTP = null;
      return { valid: false, message: 'Bạn đã nhập sai OTP quá 3 lần. Giao dịch đã bị hủy vì lý do bảo mật.' };
    }

    if (inputCode.trim() !== SecurityService._currentOTP) {
      SecurityService._otpAttempts++;
      const remaining = SecurityService._maxOTPAttempts - SecurityService._otpAttempts;
      if (remaining <= 0) {
        SecurityService._currentOTP = null;
        return { valid: false, message: 'Bạn đã nhập sai OTP quá 3 lần. Giao dịch đã bị hủy vì lý do bảo mật.' };
      }
      return { valid: false, message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.` };
    }

    // Thành công — xóa OTP (dùng 1 lần duy nhất)
    SecurityService._currentOTP = null;
    SecurityService._otpExpiry = null;
    return { valid: true, message: 'Xác thực OTP thành công!' };
  }

  /**
   * Lấy thời gian còn lại của OTP (giây).
   */
  static getOTPRemainingSeconds() {
    if (!SecurityService._otpExpiry) return 0;
    const remaining = Math.max(0, Math.ceil((SecurityService._otpExpiry - Date.now()) / 1000));
    return remaining;
  }

  // ═══════════════════════════════════════════════════════════
  // 3. ẨN/CHE DỮ LIỆU NHẠY CẢM (Data Masking)
  // ═══════════════════════════════════════════════════════════

  /**
   * Che số tài khoản: 1000123456 → 1000****56
   */
  static maskAccountNumber(accNo) {
    if (!accNo || accNo.length < 6) return accNo;
    const prefix = accNo.substring(0, 4);
    const suffix = accNo.substring(accNo.length - 2);
    return `${prefix}${'•'.repeat(accNo.length - 6)}${suffix}`;
  }

  /**
   * Che số dư: 250.000.000 VNĐ → ••••••••
   */
  static maskBalance(amount) {
    return '••••••••';
  }

  /**
   * Che số CCCD: 001098123456 → 0010****3456
   */
  static maskIdCard(idCard) {
    if (!idCard || idCard.length < 8) return idCard;
    const prefix = idCard.substring(0, 4);
    const suffix = idCard.substring(idCard.length - 4);
    return `${prefix}${'•'.repeat(idCard.length - 8)}${suffix}`;
  }

  /**
   * Che số điện thoại: 0901234567 → 090*****67
   */
  static maskPhone(phone) {
    if (!phone || phone.length < 5) return phone;
    const prefix = phone.substring(0, 3);
    const suffix = phone.substring(phone.length - 2);
    return `${prefix}${'*'.repeat(phone.length - 5)}${suffix}`;
  }

  // ═══════════════════════════════════════════════════════════
  // 4. QUẢN LÝ PHIÊN ĐĂNG NHẬP (Session Management)
  // ═══════════════════════════════════════════════════════════

  static _sessionTimer = null;
  static _warningTimer = null;
  static _sessionDurationMs = 15 * 60 * 1000; // 15 phút
  static _warningBeforeMs = 2 * 60 * 1000; // Cảnh báo 2 phút trước
  static _onSessionExpired = null;
  static _onSessionWarning = null;
  static _lastActivity = Date.now();

  /**
   * Khởi tạo quản lý phiên đăng nhập.
   * @param {Function} onWarning — callback khi phiên sắp hết hạn
   * @param {Function} onExpired — callback khi phiên hết hạn
   */
  static startSessionTimer(onWarning, onExpired) {
    SecurityService._onSessionWarning = onWarning;
    SecurityService._onSessionExpired = onExpired;
    SecurityService._lastActivity = Date.now();

    SecurityService.resetSessionTimer();

    // Theo dõi hoạt động người dùng
    const activityEvents = ['click', 'keypress', 'mousemove', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      document.addEventListener(event, SecurityService._handleActivity, { passive: true });
    });
  }

  static _handleActivity = () => {
    SecurityService._lastActivity = Date.now();
  };

  /**
   * Reset bộ đếm phiên (khi gia hạn hoặc có hoạt động).
   */
  static resetSessionTimer() {
    if (SecurityService._sessionTimer) clearTimeout(SecurityService._sessionTimer);
    if (SecurityService._warningTimer) clearTimeout(SecurityService._warningTimer);

    SecurityService._lastActivity = Date.now();

    // Đặt cảnh báo trước 2 phút
    SecurityService._warningTimer = setTimeout(() => {
      // Kiểm tra xem user đã hoạt động gần đây chưa
      const idleMs = Date.now() - SecurityService._lastActivity;
      if (idleMs >= SecurityService._sessionDurationMs - SecurityService._warningBeforeMs) {
        if (SecurityService._onSessionWarning) SecurityService._onSessionWarning();
      } else {
        // User vẫn đang hoạt động → reset timer
        SecurityService.resetSessionTimer();
      }
    }, SecurityService._sessionDurationMs - SecurityService._warningBeforeMs);

    // Đặt hết hạn phiên
    SecurityService._sessionTimer = setTimeout(() => {
      const idleMs = Date.now() - SecurityService._lastActivity;
      if (idleMs >= SecurityService._sessionDurationMs - 5000) { // Chừa 5s buffer
        if (SecurityService._onSessionExpired) SecurityService._onSessionExpired();
      } else {
        // User vẫn đang hoạt động → reset timer
        SecurityService.resetSessionTimer();
      }
    }, SecurityService._sessionDurationMs);
  }

  /**
   * Dừng hoàn toàn phiên đăng nhập (khi đăng xuất).
   */
  static stopSessionTimer() {
    if (SecurityService._sessionTimer) clearTimeout(SecurityService._sessionTimer);
    if (SecurityService._warningTimer) clearTimeout(SecurityService._warningTimer);

    const activityEvents = ['click', 'keypress', 'mousemove', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      document.removeEventListener(event, SecurityService._handleActivity);
    });
  }

  /**
   * Lấy thời gian phiên còn lại (giây).
   */
  static getSessionRemainingSeconds() {
    const idleMs = Date.now() - SecurityService._lastActivity;
    const remaining = Math.max(0, Math.ceil((SecurityService._sessionDurationMs - idleMs) / 1000));
    return remaining;
  }
}
