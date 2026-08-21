/**
 * Phân hệ Tính năng Quản trị viên Ngân hàng (Admin Module)
 */
import { store } from './store.js';

export class AdminService {

  /**
   * Thêm Giao dịch viên mới và thiết lập phân quyền thao tác
   */
  static createTeller({ fullName, staffCode, branch, email, phone, permissions, password }) {
    if (!fullName || !staffCode || !phone) {
      return { success: false, message: 'Vui lòng nhập đầy đủ Họ tên, Mã nhân viên và SĐT' };
    }

    const trimmedCode = staffCode.trim().toUpperCase();
    const exists = store.data.tellers.some(t => (t.staffCode || '').toUpperCase() === trimmedCode || t.username === 'teller_' + trimmedCode.toLowerCase());
    if (exists) {
      return { success: false, message: `Mã giao dịch viên [${trimmedCode}] đã tồn tại trên hệ thống` };
    }

    const defaultPerms = [
      'PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT',
      'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS',
      'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS', 'PERM_HANDLE_TICKETS'
    ];
    const finalPerms = (permissions && Array.isArray(permissions) && permissions.length > 0) ? permissions : defaultPerms;

    const newId = 'TELLER-' + (100 + store.data.tellers.length + 1);
    const newTeller = {
      id: newId,
      username: 'teller_' + trimmedCode.toLowerCase(),
      password: password || 'Abc@1234',
      role: 'TELLER',
      title: 'Giao Dịch Viên',
      fullName: fullName.trim(),
      staffCode: trimmedCode,
      branch: branch || 'Hội Sở - Hà Nội',
      email: email ? email.trim() : `${trimmedCode.toLowerCase()}@quangtrungbank.com`,
      phone: phone.trim(),
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      permissions: finalPerms,
      createdAt: store.todayGMT7String()
    };

    store.data.tellers.push(newTeller);
    store.addAuditLog('admin', `Thêm mới Giao dịch viên: ${newTeller.fullName} (${newTeller.staffCode})`);
    store.saveData();

    return { 
      success: true, 
      message: `Đã thêm mới Giao dịch viên [${newTeller.fullName}] thành công! Tài khoản truy cập: ${newTeller.username}`, 
      teller: newTeller 
    };
  }

  /**
   * Chỉnh sửa thông tin Giao dịch viên
   */
  static updateTeller(tellerId, { fullName, branch, email, phone, status, permissions }) {
    const teller = store.data.tellers.find(t => t.id === tellerId);
    if (!teller) return { success: false, message: 'Giao dịch viên không tồn tại' };

    if (fullName) teller.fullName = fullName.trim();
    teller.title = 'Giao Dịch Viên';
    if (branch) teller.branch = branch.trim();
    if (email) teller.email = email.trim();
    if (phone) teller.phone = phone.trim();
    if (status) teller.status = status;
    if (permissions && Array.isArray(permissions)) teller.permissions = permissions;

    store.addAuditLog('admin', `Cập nhật thông tin GDV: ${teller.fullName} (${teller.staffCode || teller.id})`);
    store.saveData();

    return { success: true, message: `Cập nhật thông tin cán bộ [${teller.fullName}] thành công!` };
  }

  /**
   * Đổi trạng thái Hoạt động / Khóa tài khoản nhân viên
   */
  static toggleTellerStatus(tellerId) {
    const teller = store.data.tellers.find(t => t.id === tellerId);
    if (!teller) return { success: false, message: 'Cán bộ nhân viên không tồn tại' };

    teller.status = teller.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const actionStr = teller.status === 'ACTIVE' ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
    store.addAuditLog('admin', `${actionStr} cán bộ: ${teller.fullName} (${teller.staffCode || teller.id})`);
    store.saveData();

    return { 
      success: true, 
      message: `Đã ${actionStr.toLowerCase()} cho nhân sự [${teller.fullName}]!`,
      status: teller.status
    };
  }

  /**
   * Phân quyền cho cán bộ nhân viên
   */
  static updateTellerPermissions(tellerId, newPermissions) {
    const teller = store.data.tellers.find(t => t.id === tellerId);
    if (!teller) return { success: false, message: 'Cán bộ nhân viên không tồn tại' };

    teller.permissions = Array.isArray(newPermissions) ? newPermissions : [];
    store.addAuditLog('admin', `Cập nhật ma trận phân quyền (${teller.permissions.length} quyền) cho: ${teller.fullName} (${teller.staffCode || teller.id})`);
    store.saveData();

    return { success: true, message: `Đã cập nhật phân quyền cho [${teller.fullName}] thành công!` };
  }

  /**
   * Cấu hình Tham số Hệ thống (Biểu Phí, Hạn Mức, Lãi Suất & Tỷ Giá FX)
   */
  static updateSystemSettings(newSettings = {}) {
    const sys = store.data.systemSettings;
    if (newSettings.bankName) sys.bankName = newSettings.bankName;
    if (newSettings.savingsInterestRate !== undefined && !isNaN(newSettings.savingsInterestRate)) {
      sys.savingsInterestRate = parseFloat(newSettings.savingsInterestRate);
    }
    if (newSettings.transferFee !== undefined && !isNaN(newSettings.transferFee)) {
      sys.transferFee = parseFloat(newSettings.transferFee);
    }
    if (newSettings.systemStatus) sys.systemStatus = newSettings.systemStatus;

    if (newSettings.feeSchedule) {
      sys.feeSchedule = { ...sys.feeSchedule, ...newSettings.feeSchedule };
    }
    if (newSettings.transactionLimits) {
      sys.transactionLimits = { ...sys.transactionLimits, ...newSettings.transactionLimits };
    }
    if (newSettings.fxRates && Array.isArray(newSettings.fxRates)) {
      sys.fxRates = newSettings.fxRates;
    }
    if (newSettings.savingsInterestRates && Array.isArray(newSettings.savingsInterestRates)) {
      store.data.savingsInterestRates = newSettings.savingsInterestRates;
    }

    store.addAuditLog('admin', `Cập nhật cấu hình hệ thống (Biểu phí, Hạn mức, Lãi suất & Tỷ giá FX)`);
    store.saveData();

    return { success: true, message: 'Lưu cấu hình hệ thống thành công!' };
  }

  /**
   * Tính toán các chỉ số Thống kê tổng quan cho Admin
   * Đồng bộ 100% với tài khoản thanh toán và sổ tiết kiệm thực tế của khách hàng.
   */
  static getSystemMetrics() {
    let totalDeposits = 0;
    let totalSavings = 0;
    let totalAccounts = 0;

    // 1. Duyệt toàn bộ tài khoản thanh toán và tài khoản con của tất cả khách hàng
    (store.data.customers || []).forEach(cust => {
      (cust.accounts || []).forEach(acc => {
        totalAccounts++;
        const bal = parseFloat(acc.balance || 0);
        if (acc.type === 'SAVINGS') {
          totalSavings += bal;
        } else {
          totalDeposits += bal;
        }
      });
    });

    // 2. Duyệt toàn bộ các sổ/tài khoản tiết kiệm độc lập đang hoạt động trong hệ thống
    (store.data.savingsAccounts || []).forEach(s => {
      if (s.status === 'ACTIVE' || !s.status) {
        totalSavings += parseFloat(s.depositAmount || s.balance || 0);
        totalAccounts++;
      }
    });

    const totalTransactions = (store.data.transactions || []).length;
    const totalVolume = (store.data.transactions || []).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    return {
      totalCustomers: (store.data.customers || []).length,
      totalTellers: (store.data.tellers || []).length,
      totalAccounts: totalAccounts,
      totalDeposits: totalDeposits,
      totalSavings: totalSavings,
      totalLiquidity: totalDeposits + totalSavings,
      totalTransactions: totalTransactions,
      totalVolume: totalVolume
    };
  }
}
