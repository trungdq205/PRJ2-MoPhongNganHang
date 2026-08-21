/**
 * Phân hệ Tính năng Giao dịch viên Ngân hàng (Teller Module)
 */
import { store } from './store.js';
import { BankApiService } from './api.js';
import { CccdOcrService } from './ocr.js';

export class TellerService {

  /**
   * Thêm mới hồ sơ khách hàng (Async: Backend REST API + LocalStore)
   */
  static async createCustomerAsync(custPayload) {
    const { fullName, idCard, phone, email, address, initialBalance } = custPayload;
    try {
      const apiResult = await BankApiService.tellerCreateCustomer(fullName, idCard, phone, email, address, initialBalance);
      if (apiResult && apiResult.success && apiResult.data) {
        const currentTeller = store.data.currentUser?.username || 'GDV';
        store.addAuditLog(currentTeller, `Thêm mới hồ sơ KH qua Backend: ${fullName}`);
        // Synchronize into local store for local UI state
        TellerService.createCustomer(custPayload);
        return { success: true, message: apiResult.message || 'Tạo hồ sơ thành công!', source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Teller] Backend createCustomer lỗi, fallback sang LocalStore', e);
    }
    return TellerService.createCustomer(custPayload);
  }

  /**
   * Cập nhật thông tin khách hàng (Async: Backend REST API + LocalStore)
   */
  static async updateCustomerAsync(customerId, { fullName, phone, email, address }) {
    try {
      const apiResult = await BankApiService.tellerUpdateCustomer(customerId, fullName, phone, email, address);
      if (apiResult && apiResult.success) {
        TellerService.updateCustomer(customerId, { fullName, phone, email, address });
        return { success: true, message: apiResult.message || 'Cập nhật thông tin khách hàng thành công!', source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Teller] Backend updateCustomer lỗi, fallback sang LocalStore', e);
    }
    return TellerService.updateCustomer(customerId, { fullName, phone, email, address });
  }

  /**
   * Quản lý tài khoản (Đổi trạng thái Khóa / Mở khóa / Đóng tài khoản) (Async)
   */
  static async toggleAccountStatusAsync(accountNo, newStatus) {
    try {
      const apiResult = await BankApiService.tellerToggleAccountStatus(accountNo, newStatus);
      if (apiResult && apiResult.success) {
        TellerService.toggleAccountStatus(accountNo, newStatus);
        return { success: true, message: apiResult.message || `Đã chuyển trạng thái tài khoản thành ${newStatus}`, source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Teller] Backend toggleAccountStatus lỗi, fallback sang LocalStore', e);
    }
    return TellerService.toggleAccountStatus(accountNo, newStatus);
  }

  /**
   * Xử lý hỗ trợ / khiếu nại (Async: Backend REST API + LocalStore)
   */
  static async resolveTicketAsync(ticketId, responseText, actionStatus = 'RESOLVED') {
    try {
      const apiResult = await BankApiService.tellerResolveTicket(ticketId, responseText, actionStatus);
      if (apiResult && apiResult.success) {
        TellerService.resolveTicket(ticketId, responseText, actionStatus);
        return { success: true, message: apiResult.message || `Đã xử lý đơn hỗ trợ thành công!`, source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Teller] Backend resolveTicket lỗi, fallback sang LocalStore', e);
    }
    return TellerService.resolveTicket(ticketId, responseText, actionStatus);
  }

  /**
   * Thêm mới hồ sơ khách hàng (Đăng ký tại quầy kèm Thu thập dữ liệu Sinh trắc học khuôn mặt)
   */
  static createCustomer({ fullName, idCard, phone, email, address, initialBalance, faceData, password }) {
    if (!fullName || !idCard || !phone) {
      return { success: false, message: 'Vui lòng điền đầy đủ Họ tên, Số CCCD/CMND và Số điện thoại khách hàng' };
    }

    const trimmedIdCard = idCard.trim();
    const trimmedPhone = phone.trim();
    const finalPassword = (password && password.trim()) ? password.trim() : 'Abc@1234';

    // Kiểm tra trùng lặp Số CCCD/CMND hoặc Số điện thoại
    const exists = store.data.customers.some(c => (c.idCard && c.idCard === trimmedIdCard) || c.phone === trimmedPhone);
    if (exists) {
      return { success: false, message: `Số điện thoại ${trimmedPhone} hoặc Số CCCD ${trimmedIdCard} đã tồn tại trên hệ thống` };
    }

    const nextId = 'CUST-' + (1000 + store.data.customers.length + 1);
    const newAccNo = '1000' + Math.floor(100000 + Math.random() * 900000);
    const balance = parseFloat(initialBalance) || 0;
    const finalAddress = address || 'TP. Hà Nội, Việt Nam';

    // Dữ liệu khuôn mặt ban đầu (Live Webcam Snapshot hoặc Biometric Template)
    const finalFaceData = faceData || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%230f172a"/><circle cx="150" cy="110" r="50" fill="%2338bdf8"/><path d="M70 250 c0 -50 40 -80 80 -80 s80 30 80 80" fill="%2338bdf8"/></svg>`;

    const newCustomer = {
      id: nextId,
      username: 'cust_' + trimmedPhone,
      password: finalPassword, // Mật khẩu đăng nhập khởi tạo
      role: 'CUSTOMER',
      fullName: fullName.trim(),
      idCard: trimmedIdCard,
      phone: trimmedPhone,
      email: email ? email.trim() : (trimmedPhone + '@quangtrungbank.com'),
      address: finalAddress,
      kycStatus: 'VERIFIED',
      kycVerifiedAt: store.nowGMT7String(),
      faceData: finalFaceData,
      accounts: [
        {
          accountNo: newAccNo,
          type: 'PAYMENT',
          balance: balance,
          currency: 'VND',
          status: 'ACTIVE',
          createdAt: store.todayGMT7String()
        }
      ],
      cards: []
    };

    store.data.customers.push(newCustomer);
    
    // Ghi nhận giao dịch nộp tiền nếu số dư ban đầu > 0
    if (balance > 0) {
      store.data.transactions.unshift({
        id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
        fromAccount: 'NẠP TẠI QUẦY',
        fromName: 'Giao dịch viên mở TK',
        toAccount: newAccNo,
        toName: fullName.trim(),
        amount: balance,
        fee: 0,
        type: 'DEPOSIT',
        content: 'Nộp tiền ban đầu khi mở tài khoản',
        timestamp: store.nowGMT7String(),
        status: 'SUCCESS'
      });
    }

    const currentTeller = store.data.currentUser?.username || 'GDV';
    store.addAuditLog(currentTeller, `Thêm mới hồ sơ KH (Quét Mặt Sinh Trắc Học): ${fullName} (CCCD: ${trimmedIdCard}, TK: ${newAccNo})`);
    store.saveData();

    return { 
      success: true, 
      message: `Tạo hồ sơ thành công! Mã KH: ${nextId}, CCCD: ${trimmedIdCard}, Số TK: ${newAccNo}, Tên đăng nhập: cust_${trimmedPhone}`,
      customer: newCustomer 
    };
  }

  /**
   * Tra cứu và chỉnh sửa thông tin khách hàng
   */
  static updateCustomer(customerId, { fullName, phone, email, address }) {
    const cust = store.data.customers.find(c => c.id === customerId);
    if (!cust) return { success: false, message: 'Khách hàng không tồn tại' };

    if (fullName) cust.fullName = fullName;
    if (phone) cust.phone = phone;
    if (email) cust.email = email;
    if (address) cust.address = address;

    const currentTeller = store.data.currentUser?.username || 'GDV';
    store.addAuditLog(currentTeller, `Cập nhật thông tin KH: ${cust.fullName} (${cust.id})`);
    store.saveData();

    return { success: true, message: 'Đã cập nhật thông tin khách hàng thành công!' };
  }

  /**
   * Quản lý tài khoản (Đổi trạng thái Khóa / Mở khóa / Đóng tài khoản)
   */
  static toggleAccountStatus(accountNo, newStatus) {
    let targetAcc = null;
    let targetCust = null;

    for (const cust of store.data.customers) {
      const acc = cust.accounts.find(a => a.accountNo === accountNo);
      if (acc) {
        targetAcc = acc;
        targetCust = cust;
        break;
      }
    }

    if (!targetAcc) return { success: false, message: 'Tài khoản không tồn tại' };

    targetAcc.status = newStatus;
    const currentTeller = store.data.currentUser?.username || 'GDV';
    store.addAuditLog(currentTeller, `Chuyển trạng thái tài khoản ${accountNo} thành ${newStatus}`);
    store.saveData();

    return { success: true, message: `Đã cập nhật trạng thái tài khoản ${accountNo} thành ${newStatus}` };
  }

  /**
   * Thêm tài khoản Tiết kiệm mới cho Khách hàng tại quầy
   */
  static createSavingsAccount(customerId, amount) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount < 1000000) {
      return { success: false, message: 'Số tiền mở tài khoản tiết kiệm tối thiểu là 1.000.000 VNĐ' };
    }

    const cust = store.data.customers.find(c => c.id === customerId);
    if (!cust) return { success: false, message: 'Khách hàng không tồn tại' };

    const newSavNo = '8888' + Math.floor(100000 + Math.random() * 900000);

    cust.accounts.push({
      accountNo: newSavNo,
      type: 'SAVINGS',
      balance: amount,
      currency: 'VNĐ',
      status: 'ACTIVE',
      createdAt: new Date().toISOString().substring(0, 10)
    });

    const currentTeller = store.data.currentUser?.username || 'GDV';
    store.addAuditLog(currentTeller, `Mở tài khoản tiết kiệm ${newSavNo} cho KH ${cust.fullName} với số tiền ${store.formatVND(amount)}`);
    store.saveData();

    return { success: true, message: `Đã mở tài khoản tiết kiệm thành công. Số tài khoản: ${newSavNo}` };
  }

  /**
   * Xử lý hỗ trợ / khiếu nại
   */
  static resolveTicket(ticketId, responseText, actionStatus = 'RESOLVED') {
    const ticket = store.data.tickets.find(t => t.id === ticketId);
    if (!ticket) return { success: false, message: 'Đơn hỗ trợ không tồn tại' };

    const currentTeller = store.data.currentUser?.username || 'GDV';
    ticket.status = actionStatus; // RESOLVED: Đã giải quyết hoặc REJECTED: Từ chối
    ticket.response = responseText || 'Đã tiếp nhận và xử lý yêu cầu.';
    ticket.assignedTo = currentTeller;

    store.addAuditLog(currentTeller, `Xử lý đơn khiếu nại ${ticketId}: ${actionStatus}`);
    store.saveData();

    return { success: true, message: `Đã xử lý đơn hỗ trợ ${ticketId}` };
  }

  /**
   * Lấy danh sách tất cả các khoản vay trong hệ thống
   */
  static getAllLoans() {
    return store.data.loans || [];
  }

  /**
   * Phê duyệt hồ sơ vay và GIẢI NGÂN TRỰC TIẾP vào tài khoản thanh toán của khách hàng
   * Phê duyệt & Giải ngân khoản vay (Hỗ trợ cả khoản vay tín chấp và vay thế chấp có TSBĐ)
   */
  static approveLoan(loanId, officerNote = '', collateralHandoverCode = null) {
    const loan = (store.data.loans || []).find(l => l.id === loanId);
    if (!loan) return { success: false, message: 'Hồ sơ vay không tồn tại' };
    if (loan.status !== 'PENDING') return { success: false, message: 'Hồ sơ vay này đã được xử lý trước đó' };

    const currentTeller = store.data.currentUser?.fullName ? `${store.data.currentUser.fullName} (${store.data.currentUser.username})` : 'GDV001';
    const nowStr = store.nowGMT7String();

    // Tìm tài khoản nhận giải ngân của khách hàng
    let cust = store.data.customers.find(c => c.id === loan.customerId);
    if (!cust) return { success: false, message: 'Khách hàng vay vốn không tồn tại trên hệ thống' };

    let acc = cust.accounts.find(a => a.accountNo === loan.accountNo);
    if (!acc) acc = cust.accounts.find(a => a.type === 'PAYMENT');
    if (!acc) return { success: false, message: 'Không tìm thấy tài khoản để giải ngân' };

    // Cập nhật trạng thái khoản vay
    loan.status = 'ACTIVE';
    loan.approvedAt = nowStr;
    loan.approvedBy = currentTeller;
    loan.officerNote = officerNote || 'Đã thẩm định hồ sơ đạt tiêu chuẩn tín dụng và giải ngân thành công';
    if (collateralHandoverCode) {
      loan.collateralHandoverCode = collateralHandoverCode;
      loan.collateralVerifiedAt = nowStr;
      loan.collateralStatus = 'SECURED_IN_VAULT';
    }

    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    loan.nextDueDate = store.formatDate(nextDueDate);

    // Cộng tiền giải ngân vào tài khoản thanh toán của KH
    acc.balance += loan.principalAmount;

    // Ghi nhận biến động số dư
    const txn = {
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
      fromAccount: 'QUỸ TÍN DỤNG QUANGTRUNG BANK',
      fromName: 'Ngân hàng TMCP QuangTrung (QTB)',
      toAccount: acc.accountNo,
      toName: cust.fullName,
      amount: loan.principalAmount,
      fee: 0,
      type: 'DEPOSIT',
      content: `Giải ngân hợp đồng tín dụng ${loan.contractNo || loan.id} - ${loan.title}`,
      timestamp: nowStr,
      status: 'SUCCESS'
    };
    store.data.transactions.unshift(txn);

    const auditExtra = collateralHandoverCode ? ` [Đã tiếp nhận & niêm phong TSBĐ gốc: ${collateralHandoverCode}]` : '';
    store.addAuditLog(currentTeller, `Phê duyệt & Giải ngân khoản vay [${loan.id}] cho KH ${cust.fullName} (${store.formatVND(loan.principalAmount)})${auditExtra}`);
    store.saveData();

    return {
      success: true,
      message: `Đã phê duyệt và GIẢI NGÂN thành công ${store.formatVND(loan.principalAmount)} vào tài khoản ${acc.accountNo}!${collateralHandoverCode ? ' (Đã lưu biên bản niêm phong TSBĐ gốc)' : ''}`
    };
  }

  /**
   * Từ chối cấp tín dụng cho khoản vay
   */
  static rejectLoan(loanId, reason) {
    const loan = (store.data.loans || []).find(l => l.id === loanId);
    if (!loan) return { success: false, message: 'Hồ sơ vay không tồn tại' };

    const currentTeller = store.data.currentUser?.username || 'GDV001';
    loan.status = 'REJECTED';
    loan.rejectionReason = reason || 'Hồ sơ chưa đạt tiêu chuẩn điều kiện tín dụng ngân hàng';

    store.addAuditLog(currentTeller, `Từ chối hồ sơ vay vốn [${loan.id}]: ${loan.rejectionReason}`);
    store.saveData();

    return { success: true, message: `Đã từ chối cấp tín dụng cho khoản vay ${loan.id}` };
  }

  /**
   * Phê duyệt / Từ chối hồ sơ định danh eKYC của khách hàng
   */
  static approveEKyc(customerId, status) {
    const cust = (store.data.customers || []).find(c => c.id === customerId);
    if (!cust) return { success: false, message: 'Khách hàng không tồn tại' };

    const currentTeller = store.data.currentUser?.username || 'GDV001';
    cust.kycStatus = status;
    if (status === 'VERIFIED') {
      cust.kycVerifiedAt = store.nowGMT7String();
    }

    store.addAuditLog(currentTeller, `Cập nhật trạng thái eKYC của khách hàng ${cust.fullName} (${cust.id}) thành: ${status}`);
    store.saveData();

    return { success: true, message: `Cập nhật trạng thái eKYC thành công: ${status}` };
  }
}

