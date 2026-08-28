/**
 * Phân hệ Tính năng Giao dịch viên Ngân hàng (Teller Module)
 */
import { store } from './store.js';
import { BankApiService } from './api.js';

export class TellerService {

  /**
   * Đồng bộ toàn bộ danh sách khách hàng trực tiếp từ CSDL Backend
   */
  static async syncCustomersAsync() {
    try {
      const apiResult = await BankApiService.tellerGetAllCustomers();
      if (apiResult && apiResult.success && Array.isArray(apiResult.data)) {
        store.data.customers = apiResult.data;
        return store.data.customers;
      }
    } catch (e) {
      console.warn('Lỗi tải danh sách khách hàng từ CSDL Backend:', e);
    }
    return store.data.customers || [];
  }

  /**
   * Thêm mới hồ sơ khách hàng trực tiếp vào CSDL Backend
   */
  static async createCustomerAsync(custPayload) {
    const { fullName, idCard, phone, email, address, initialBalance, password } = custPayload;
    try {
      const apiResult = await BankApiService.tellerCreateCustomer(fullName, idCard, phone, email, address, initialBalance);
      if (apiResult && apiResult.success) {
        const currentTeller = store.data.currentUser?.username || 'GDV';
        store.addAuditLog(currentTeller, `Thêm mới hồ sơ KH qua CSDL Backend: ${fullName}`);

        return { 
          success: true, 
          message: apiResult.message || 'Tạo hồ sơ khách hàng trong CSDL thành công!', 
          source: 'database',
          customer: apiResult.data
        };
      } else {
        return { 
          success: false, 
          message: apiResult ? apiResult.message : 'Không nhận được phản hồi từ CSDL Backend' 
        };
      }
    } catch (e) {
      console.error('[Teller] Lỗi khi kết nối CSDL Backend:', e);
      return { 
        success: false, 
        message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể lưu hồ sơ') 
      };
    }
  }



  /**
   * Cập nhật thông tin khách hàng trực tiếp trong CSDL Backend
   */
  static async updateCustomerAsync(customerId, { fullName, phone, email, address }) {
    try {
      const apiResult = await BankApiService.tellerUpdateCustomer(customerId, fullName, phone, email, address);
      if (apiResult && apiResult.success) {
        await TellerService.syncCustomersAsync();
        return { success: true, message: apiResult.message || 'Cập nhật thông tin khách hàng trong CSDL thành công!', source: 'database' };
      } else {
        return { success: false, message: apiResult ? apiResult.message : 'Lỗi cập nhật CSDL' };
      }
    } catch (e) {
      console.error('[Teller] Lỗi updateCustomer Backend:', e);
      return { success: false, message: 'Lỗi kết nối CSDL: ' + e.message };
    }
  }

  /**
   * Quản lý tài khoản (Đổi trạng thái Khóa / Mở khóa / Đóng tài khoản) trực tiếp trong CSDL Backend
   */
  static async toggleAccountStatusAsync(accountNo, newStatus) {
    try {
      const apiResult = await BankApiService.tellerToggleAccountStatus(accountNo, newStatus);
      if (apiResult && apiResult.success) {
        await TellerService.syncCustomersAsync();
        return { success: true, message: apiResult.message || `Đã chuyển trạng thái tài khoản thành ${newStatus}`, source: 'database' };
      } else {
        return { success: false, message: apiResult ? apiResult.message : 'Lỗi cập nhật trạng thái trong CSDL' };
      }
    } catch (e) {
      console.error('[Teller] Lỗi toggleAccountStatus Backend:', e);
      return { success: false, message: 'Lỗi kết nối CSDL: ' + e.message };
    }
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

    // Kiểm tra nếu đã tồn tại trong local store
    const existingCust = store.data.customers.find(c => (c.idCard && c.idCard === trimmedIdCard) || c.phone === trimmedPhone);
    if (existingCust) {
      if (!existingCust.accounts || !Array.isArray(existingCust.accounts)) {
        existingCust.accounts = [{
          accountNo: '1000' + Math.floor(100000 + Math.random() * 900000),
          type: 'PAYMENT',
          balance: parseFloat(initialBalance) || 0,
          currency: 'VND',
          status: 'ACTIVE',
          createdAt: store.todayGMT7String()
        }];
      }
      return { 
        success: true, 
        message: `Hồ sơ khách hàng ${existingCust.fullName} (${trimmedPhone}) đã được lưu trên hệ thống.`, 
        customer: existingCust 
      };
    }

    const nextId = 'CUST-' + (1000 + store.data.customers.length + 1);
    const newAccNo = '1000' + Math.floor(100000 + Math.random() * 900000);
    const balance = parseFloat(initialBalance) || 0;
    const finalAddress = address || 'TP. Hà Nội, Việt Nam';

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
      faceData: null,
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
        id: store.generateTxnId(),
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
    store.addAuditLog(currentTeller, `Thêm mới hồ sơ KH: ${fullName} (CCCD: ${trimmedIdCard}, TK: ${newAccNo})`);
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
   * Lấy danh sách tất cả hồ sơ vay vốn trong toàn hệ thống (Async: ưu tiên REST/gRPC API)
   */
  static async getAllLoansAsync() {
    try {
      if (BankApiService.hasToken()) {
        const apiRes = await BankApiService.tellerGetAllLoans();
        if (apiRes && apiRes.success && Array.isArray(apiRes.loans || apiRes.data)) {
          const fetched = apiRes.loans || apiRes.data;
          store.data.loans = fetched.map(l => ({
            id: l.id,
            contractNo: l.contractNo,
            customerId: l.customerId,
            customerName: l.customerName,
            accountNo: l.accountNo,
            loanType: l.loanType,
            title: l.title,
            principalAmount: parseFloat(l.principalAmount) || 0,
            remainingBalance: parseFloat(l.remainingBalance) || 0,
            termMonths: parseInt(l.termMonths, 10) || 12,
            interestRate: parseFloat(l.interestRate) || 0,
            monthlyPayment: parseFloat(l.monthlyPayment) || 0,
            nextDueDate: l.nextDueDate,
            installmentPaidCount: parseInt(l.installmentPaidCount, 10) || 0,
            status: l.status,
            rejectionReason: l.rejectionReason,
            approvedBy: l.approvedBy,
            appliedAt: l.appliedAt
          }));
          store.saveData();
          return store.data.loans;
        }
      }
    } catch (e) {
      console.warn('[Teller] API tellerGetAllLoans gặp lỗi, dùng local:', e);
    }
    return TellerService.getAllLoans();
  }

  static getAllLoans() {
    return store.data.loans || [];
  }

  /**
   * Phê duyệt & Giải ngân khoản vay (Async: ưu tiên REST/gRPC API)
   */
  static async approveLoanAsync(loanId, officerNote = '', collateralHandoverCode = null) {
    try {
      if (BankApiService.hasToken()) {
        const apiRes = await BankApiService.tellerApproveLoan(loanId, officerNote, collateralHandoverCode);
        if (apiRes && apiRes.success) {
          if (typeof BroadcastChannel !== 'undefined') {
            try {
              const bc = new BroadcastChannel('bank_realtime_events');
              bc.postMessage({
                type: 'LOAN_APPROVED',
                loanId: loanId,
                contractNo: apiRes.data?.contractNo || loanId,
                amount: apiRes.data?.disbursedAmount || 0,
                accountNo: apiRes.data?.accountNo,
                balanceAfter: apiRes.data?.newAccountBalance,
                message: apiRes.message,
                timestamp: Date.now()
              });
            } catch (err) {}
          }
          await TellerService.getAllLoansAsync();
          return { success: true, message: apiRes.message || 'Phê duyệt & giải ngân thành công!', data: apiRes.data };
        } else if (apiRes && !apiRes.success) {
          return { success: false, message: apiRes.message || 'Phê duyệt thất bại' };
        }
      }
    } catch (e) {
      console.warn('[Teller] API approveLoan gặp lỗi, chuyển sang local:', e);
    }
    return TellerService.approveLoan(loanId, officerNote, collateralHandoverCode);
  }

  /**
   * Từ chối cấp tín dụng cho khoản vay (Async: ưu tiên REST/gRPC API)
   */
  static async rejectLoanAsync(loanId, reason = '') {
    try {
      if (BankApiService.hasToken()) {
        const apiRes = await BankApiService.tellerRejectLoan(loanId, reason);
        if (apiRes && apiRes.success) {
          await TellerService.getAllLoansAsync();
          return { success: true, message: apiRes.message || 'Đã từ chối cấp tín dụng' };
        } else if (apiRes && !apiRes.success) {
          return { success: false, message: apiRes.message || 'Từ chối thất bại' };
        }
      }
    } catch (e) {
      console.warn('[Teller] API rejectLoan gặp lỗi, chuyển sang local:', e);
    }
    return TellerService.rejectLoan(loanId, reason);
  }

  /**
   * Phê duyệt hồ sơ vay và GIẢI NGÂN TRỰC TIẾP vào tài khoản thanh toán của khách hàng (Local Fallback)
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

    loan.installmentPaidCount = 0;
    loan.nextDueDate = store.getLoanInstallmentDueDate(nowStr, 1);

    // Cộng tiền giải ngân vào tài khoản thanh toán của KH
    acc.balance += loan.principalAmount;

    // Ghi nhận biến động số dư
    const txn = {
      id: store.generateTxnId(),
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
}

