/**
 * Phân hệ Tính năng Khách hàng Ngân hàng (Customer Module)
 */
import { store } from './store.js';
import { SecurityService } from './security.js';
import { BankApiService } from './api.js';

export class CustomerService {

  /**
   * Helper tìm kiếm hồ sơ khách hàng khớp với user hiện tại
   */
  static findCustomer(user = store.data.currentUser) {
    if (!user) return null;
    let cust = (store.data.customers || []).find(c => 
      (user.id && c.id === user.id) || 
      (user.username && c.username && c.username.toLowerCase() === user.username.toLowerCase()) || 
      (user.customerId && c.id === user.customerId) ||
      (user.phone && (c.phone === user.phone || c.username === 'cust_' + user.phone)) ||
      (user.fullName && c.fullName && c.fullName.toLowerCase() === user.fullName.toLowerCase())
    ) || null;

    if (!cust && user.role === 'CUSTOMER') {
      const custId = user.customerId || user.id || (user._backendId ? `CUST-${1000 + user._backendId}` : 'CUST-1001');
      cust = {
        id: custId,
        username: user.username,
        fullName: user.fullName || user.username,
        phone: user.phone || '',
        email: user.email || '',
        idCard: user.idCard || '',
        address: user.address || '',
        contactAddress: user.contactAddress || user.address || '',
        accounts: [],
        cards: [],
        savings: [],
        loans: []
      };
      if (!store.data.customers) store.data.customers = [];
      store.data.customers.push(cust);
    } else if (cust && user) {
      if (user.idCard && !cust.idCard) cust.idCard = user.idCard;
      if (user.address && !cust.address) cust.address = user.address;
      if (user.contactAddress && !cust.contactAddress) cust.contactAddress = user.contactAddress;
      if (user.email && !cust.email) cust.email = user.email;
      if (user.phone && !cust.phone) cust.phone = user.phone;
    }
    if (cust) {
      CustomerService.ensureCustomerCards(cust);
    }
    return cust;
  }

  /**
   * Phân loại giao dịch thành 9 loại chuẩn Tiếng Việt:
   * 1. Gửi tiền
   * 2. Rút tiền
   * 3. Chuyển khoản
   * 4. Nhận tiền
   * 5. Ghi có tiền lãi
   * 6. Giải ngân
   * 7. Trả nợ vay
   * 8. Gửi tiết kiệm
   * 9. Tất toán tiết kiệm
   */
  static getTransactionTypeLabel(t, myAccNos = []) {
    if (!t) return 'Chuyển khoản';
    const type = (typeof t === 'string' ? t : (t.type || '')).toUpperCase();
    const content = (typeof t === 'object' && t.content ? t.content : '').toLowerCase();
    const fromAcc = typeof t === 'object' && t.fromAccount ? t.fromAccount : '';
    const toAcc = typeof t === 'object' && t.toAccount ? t.toAccount : '';

    let isMoneyIn = false;
    if (myAccNos && myAccNos.length > 0) {
      if (!myAccNos.includes(fromAcc) && myAccNos.includes(toAcc)) {
        isMoneyIn = true;
      }
    }

    // 1. Trả nợ vay / Tất toán khoản nợ vay
    if (type === 'LOAN_REPAYMENT' || type === 'REPAYMENT' || type === 'LOAN_PAYMENT' || type === 'LOAN_SETTLEMENT' ||
        content.includes('hợp đồng tín dụng') || content.includes('hop dong tin dung') || content.includes('hdtd') ||
        content.includes('khoản vay') || content.includes('khoan vay') || content.includes('khoản nợ') || content.includes('khoan no') ||
        content.includes('trả nợ') || content.includes('tra no') || content.includes('thanh toán nợ') || content.includes('thanh toan ky vay') ||
        toAcc.includes('HDTD') || (typeof t === 'object' && t.toName && t.toName.toLowerCase().includes('thu nợ'))) {
      return 'Trả nợ vay';
    }

    // 2. Giải ngân khoản vay
    if (type === 'LOAN_DISBURSEMENT' || type === 'DISBURSEMENT' ||
        content.includes('giải ngân') || content.includes('giai ngan')) {
      return 'Giải ngân';
    }

    // 3. Tất toán tiết kiệm
    if (type === 'SAVINGS_SETTLEMENT' || type === 'CLOSE_SAVINGS' || type === 'WITHDRAW_SAVINGS' || type === 'SAVINGS_WITHDRAW' ||
        content.includes('tất toán tiết kiệm') || content.includes('tat toan tiet kiem') || content.includes('tất toán sổ') || content.includes('tat toan so') || content.includes('rút tiết kiệm') || content.includes('rut tiet kiem') ||
        (content.includes('tất toán') && !content.includes('tín dụng') && !content.includes('nợ') && !content.includes('vay') && !content.includes('hdtd'))) {
      return 'Tất toán tiết kiệm';
    }

    // 4. Gửi tiết kiệm
    if (type === 'SAVINGS_DEPOSIT' || type === 'OPEN_SAVINGS' || type === 'SAVINGS_TOPUP' || type === 'SAVINGS' ||
        content.includes('gửi tiết kiệm') || content.includes('gui tiet kiem') || content.includes('mở sổ tiết kiệm') || content.includes('mo so tiet kiem') || content.includes('nộp thêm tiết kiệm') || toAcc.startsWith('STK-') || (toAcc.length === 6 && /^\d+$/.test(toAcc) && !toAcc.startsWith('1000') && !toAcc.includes('HDTD'))) {
      return 'Gửi tiết kiệm';
    }

    // 5. Ghi có tiền lãi
    if (type === 'INTEREST' || type === 'INTEREST_CREDIT' || type === 'SAVINGS_INTEREST' ||
        content.includes('tiền lãi') || content.includes('tien lai') || content.includes('trả lãi') || content.includes('tra lai') || content.includes('ghi có lãi')) {
      return 'Ghi có tiền lãi';
    }

    // 6. Gửi tiền
    if (type === 'DEPOSIT' || type === 'ATM_DEPOSIT' ||
        fromAcc.includes('ATM') || fromAcc.includes('QUẦY') || fromAcc.includes('NẠP') || content.includes('nạp tiền') || content.includes('nap tien') || content.includes('gửi tiền') || content.includes('gui tien')) {
      return 'Gửi tiền';
    }

    // 7. Rút tiền
    if (type === 'WITHDRAW' || type === 'ATM_WITHDRAW' || type === 'CARD_ATM' ||
        toAcc.includes('ATM') || toAcc.includes('RÚT') || content.includes('rút tiền') || content.includes('rut tien')) {
      return 'Rút tiền';
    }

    // 8. Nhận tiền
    if (type === 'TRANSFER_IN' || type === 'RECEIVE' || (type === 'TRANSFER' && isMoneyIn)) {
      return 'Nhận tiền';
    }

    // 9. Chuyển khoản
    return 'Chuyển khoản';
  }

  /**
   * Tạo Badge HTML hiển thị Phân loại giao dịch chuẩn Tiếng Việt
   */
  static getTransactionTypeBadge(t, myAccNos = []) {
    if (!t) return `<span class="user-role-badge badge-customer">Chuyển khoản</span>`;
    const label = CustomerService.getTransactionTypeLabel(t, myAccNos);
    
    switch (label) {
      case 'Gửi tiền':
        return `<span class="user-role-badge badge-teller" style="background: rgba(16, 185, 129, 0.18); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35); font-weight: 600;">Gửi tiền</span>`;
      case 'Rút tiền':
        return `<span class="user-role-badge badge-admin" style="background: rgba(239, 68, 68, 0.18); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 600;">Rút tiền</span>`;
      case 'Chuyển khoản':
        return `<span class="user-role-badge badge-customer" style="background: rgba(56, 189, 248, 0.18); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); font-weight: 600;">Chuyển khoản</span>`;
      case 'Nhận tiền':
        return `<span class="user-role-badge badge-teller" style="background: rgba(16, 185, 129, 0.18); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35); font-weight: 600;">Nhận tiền</span>`;
      case 'Ghi có tiền lãi':
        return `<span class="user-role-badge badge-teller" style="background: rgba(52, 211, 153, 0.18); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.35); font-weight: 600;">Ghi có tiền lãi</span>`;
      case 'Giải ngân':
        return `<span class="user-role-badge badge-customer" style="background: rgba(99, 102, 241, 0.18); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.35); font-weight: 600;">Giải ngân</span>`;
      case 'Trả nợ vay':
        return `<span class="user-role-badge badge-admin" style="background: rgba(244, 63, 94, 0.18); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.35); font-weight: 600;">Trả nợ vay</span>`;
      case 'Gửi tiết kiệm':
        return `<span class="user-role-badge badge-customer" style="background: rgba(6, 182, 212, 0.18); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.35); font-weight: 600;">Gửi tiết kiệm</span>`;
      case 'Tất toán tiết kiệm':
        return `<span class="user-role-badge badge-teller" style="background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); font-weight: 600;">Tất toán tiết kiệm</span>`;
      default:
        return `<span class="user-role-badge badge-customer">${label}</span>`;
    }
  }

  /**
   * Đảm bảo hồ sơ khách hàng luôn có danh sách thẻ ngân hàng chuẩn hóa với 16 chữ số đầy đủ
   */
  static ensureCustomerCards(cust) {
    if (!cust) return [];
    const accNo = cust.accounts?.[0]?.accountNo || '1000123456';
    if (!cust.cards || cust.cards.length === 0) {
      cust.cards = [
        {
          id: 'CARD-' + (cust.id || 'CUST') + '-1',
          cardNumber: '4532990011228899',
          maskedNumber: '4532 •••• •••• 8899',
          cardHolder: (cust.fullName || 'CUSTOMER').toUpperCase(),
          cardType: 'VISA Platinum Debit',
          expDate: '12/28',
          cvv: '321',
          pin: '123456',
          status: 'ACTIVE',
          dailyLimit: 100000000,
          perTxnLimit: 30000000,
          onlinePayment: true,
          contactless: true,
          internationalPayment: true,
          atmWithdrawal: true,
          linkedAccountNo: accNo,
          issuedAt: '2024-01-15'
        },
        {
          id: 'CARD-' + (cust.id || 'CUST') + '-2',
          cardNumber: '9704220055667788',
          maskedNumber: '9704 •••• •••• 7788',
          cardHolder: (cust.fullName || 'CUSTOMER').toUpperCase(),
          cardType: 'NAPAS Smart Debit',
          expDate: '06/29',
          cvv: '886',
          pin: '654321',
          status: 'ACTIVE',
          dailyLimit: 50000000,
          perTxnLimit: 20000000,
          onlinePayment: true,
          contactless: true,
          internationalPayment: false,
          atmWithdrawal: true,
          linkedAccountNo: accNo,
          issuedAt: '2024-06-20'
        }
      ];
      store.saveData();
    } else {
      let changed = false;
      cust.cards.forEach((c, idx) => {
        if (!c.id) { c.id = 'CARD-' + (cust.id || 'CUST') + '-' + (idx + 1); changed = true; }
        if (!c.cardNumber || c.cardNumber.includes('•')) {
          c.cardNumber = idx === 0 ? '4532990011228899' : (idx === 1 ? '9704220055667788' : '5421880033445566');
          changed = true;
        }
        if (!c.maskedNumber) {
          const raw = c.cardNumber.replace(/\D/g, '');
          c.maskedNumber = raw.length >= 8 ? `${raw.slice(0, 4)} •••• •••• ${raw.slice(-4)}` : '4532 •••• •••• 8899';
          changed = true;
        }
        if (!c.cardHolder) { c.cardHolder = (cust.fullName || 'CUSTOMER').toUpperCase(); changed = true; }
        if (!c.expDate) { c.expDate = c.expiry || '12/28'; changed = true; }
        if (!c.cvv) { c.cvv = '321'; changed = true; }
        if (!c.pin) { c.pin = '123456'; changed = true; }
        if (!c.linkedAccountNo) { c.linkedAccountNo = accNo; changed = true; }
        if (c.dailyLimit === undefined) { c.dailyLimit = 100000000; changed = true; }
        if (c.perTxnLimit === undefined) { c.perTxnLimit = 30000000; changed = true; }
        if (c.onlinePayment === undefined) { c.onlinePayment = true; changed = true; }
        if (c.contactless === undefined) { c.contactless = true; changed = true; }
        if (c.internationalPayment === undefined) { c.internationalPayment = !c.cardType?.includes('NAPAS'); changed = true; }
        if (c.atmWithdrawal === undefined) { c.atmWithdrawal = true; changed = true; }
      });
      if (changed) store.saveData();
    }
    return cust.cards;
  }

  /**
   * Lấy danh sách tất cả tài khoản của khách hàng đang đăng nhập
   */
  static getCustomerAccounts() {
    const user = store.data.currentUser;
    if (!user || user.role !== 'CUSTOMER') return [];
    // Luôn làm mới dữ liệu từ store.data.customers
    const freshCust = CustomerService.findCustomer(user);
    if (freshCust && Array.isArray(freshCust.accounts) && freshCust.accounts.length > 0) {
      return freshCust.accounts;
    }
    if (freshCust) {
      if (!freshCust.accounts) freshCust.accounts = [];
      if (freshCust.accounts.length === 0) {
        freshCust.accounts.push({
          accountNo: '1000' + (freshCust.phone ? freshCust.phone.slice(-6) : '123456'),
          type: 'PAYMENT',
          balance: 250000000,
          currency: 'VNĐ',
          status: 'ACTIVE',
          createdAt: store.todayGMT7String()
        });
        CustomerService.ensureCustomerCards(freshCust);
        store.saveData();
      }
      return freshCust.accounts;
    }
    return [];
  }

  /**
   * Thực hiện giao dịch chuyển khoản giữa các tài khoản
   */
  static transferMoney({ fromAccNo, toAccNo, amount, content, pin }) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Số tiền giao dịch không hợp lệ' };
    }

    if (!fromAccNo || !toAccNo) {
      return { success: false, message: 'Vui lòng chọn tài khoản nguồn và điền tài khoản đích' };
    }

    if (fromAccNo === toAccNo) {
      return { success: false, message: 'Tài khoản nhận phải khác tài khoản chuyển' };
    }

    // Tìm tài khoản nguồn (tài khoản trích tiền)
    let sourceAcc = null;
    let sourceCust = null;
    for (const cust of store.data.customers) {
      const acc = cust.accounts.find(a => a.accountNo === fromAccNo);
      if (acc) {
        sourceAcc = acc;
        sourceCust = cust;
        break;
      }
    }

    if (!sourceAcc) {
      return { success: false, message: 'Tài khoản chuyển không tồn tại' };
    }

    if (sourceAcc.type === 'SAVINGS') {
      return { success: false, message: 'Tài khoản tiết kiệm không được phép dùng làm tài khoản nguồn chuyển tiền. Vui lòng sử dụng Tài khoản thanh toán.' };
    }

    if (sourceAcc.status !== 'ACTIVE') {
      return { success: false, message: 'Tài khoản chuyển đang bị khóa hoặc đóng' };
    }

    if (sourceAcc.balance < amount) {
      return { success: false, message: `Số dư không đủ. Số dư hiện tại: ${store.formatVND(sourceAcc.balance)}` };
    }

    // Tìm tài khoản đích (tài khoản thụ hưởng)
    let targetAcc = null;
    let targetCust = null;
    for (const cust of store.data.customers) {
      const acc = cust.accounts.find(a => a.accountNo === toAccNo);
      if (acc) {
        targetAcc = acc;
        targetCust = cust;
        break;
      }
    }

    if (!targetAcc) {
      return { success: false, message: 'Tài khoản người nhận không tồn tại trên hệ thống' };
    }

    if (targetAcc.status !== 'ACTIVE') {
      return { success: false, message: 'Tài khoản người nhận đang bị tạm khóa' };
    }

    // Cập nhật biến động số dư tài khoản
    sourceAcc.balance -= amount;
    targetAcc.balance += amount;

    // Tạo bản ghi nhật ký giao dịch
    const txn = {
      id: store.generateTxnId(),
      fromAccount: fromAccNo,
      fromName: sourceCust.fullName,
      toAccount: toAccNo,
      toName: targetCust.fullName,
      amount: amount,
      fee: 0,
      type: 'TRANSFER',
      content: content || 'Chuyển tiền nhanh QuangTrung Bank',
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };

    store.data.transactions.unshift(txn);
    store.addAuditLog(sourceCust.username, `Chuyển khoản ${store.formatVND(amount)} từ ${fromAccNo} đến ${toAccNo}`);
    store.saveData();

    return { success: true, message: `Chuyển thành công ${store.formatVND(amount)} tới ${targetCust.fullName}`, transaction: txn };
  }

  /**
   * Thực hiện giao dịch chuyển khoản (Async: Ưu tiên Backend REST API + Lưu vào MySQL + Idempotency)
   */
  static async transferMoneyAsync({ fromAccNo, toAccNo, amount, content, pin, idempotencyKey }) {
    if (!fromAccNo || !toAccNo) {
      return { success: false, message: 'Vui lòng chọn tài khoản nguồn và điền tài khoản người nhận' };
    }
    if (fromAccNo.trim() === toAccNo.trim()) {
      return { success: false, message: 'Tài khoản nhận không được trùng với tài khoản chuyển' };
    }

    try {
      const apiRes = await BankApiService.transferMoney(fromAccNo, toAccNo, amount, content, idempotencyKey);
      if (apiRes && apiRes.success) {
        const txnData = apiRes.data || {
          id: store.formatTxnId(apiRes.transaction_id || apiRes.transactionId) || store.generateTxnId(),
          idempotencyKey: idempotencyKey,
          fromAccount: fromAccNo,
          fromName: 'Chủ tài khoản',
          toAccount: toAccNo,
          toName: 'Người nhận',
          amount: Number(apiRes.amount ?? amount),
          fee: Number(apiRes.fee ?? 0),
          type: 'TRANSFER',
          content: content || 'Chuyển tiền nhanh QuangTrung Bank',
          timestamp: apiRes.timestamp || store.nowGMT7String(),
          status: 'SUCCESS'
        };

        const normalizedTxn = {
          id: store.formatTxnId(txnData.id) || store.generateTxnId(),
          idempotencyKey: txnData.idempotencyKey || idempotencyKey,
          fromAccount: txnData.fromAccount || fromAccNo,
          fromName: txnData.fromName || 'Chủ tài khoản',
          toAccount: txnData.toAccount || toAccNo,
          toName: txnData.toName || 'Người nhận',
          amount: parseFloat(txnData.amount ?? amount),
          fee: parseFloat(txnData.fee ?? 0),
          type: txnData.type || 'TRANSFER',
          content: txnData.content || content || 'Chuyển tiền nhanh QuangTrung Bank',
          timestamp: txnData.timestamp ? String(txnData.timestamp).replace('T', ' ').substring(0, 19) : store.nowGMT7String(),
          status: txnData.status || 'SUCCESS'
        };

        const sourceAcc = CustomerService.getCustomerAccounts().find(acc => acc.accountNo === fromAccNo);
        const targetAcc = CustomerService.getCustomerAccounts().find(acc => acc.accountNo === toAccNo);
        if (sourceAcc) sourceAcc.balance = Number(sourceAcc.balance) - Number(normalizedTxn.amount);
        if (targetAcc) targetAcc.balance = Number(targetAcc.balance) + Number(normalizedTxn.amount);

        if (!store.data.transactions.some(t => t.id === normalizedTxn.id)) {
          store.data.transactions.unshift(normalizedTxn);
        }
        store.saveData();

        await CustomerService.syncCustomerAccountsAsync();
        await CustomerService.getTransactionHistoryAsync();

        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Nợ (-)',
          message: `Tài khoản ${fromAccNo} -${store.formatVND(amount)}. Tới: ${normalizedTxn.toName || toAccNo} (${toAccNo}). Nội dung: ${content || 'Chuyển tiền nhanh QuangTrung Bank'}`,
          amount: amount,
          balanceAfter: sourceAcc ? sourceAcc.balance : undefined,
          type: 'MONEY_OUT',
          accountNo: fromAccNo
        });
        if (window.refreshNotificationsNow) {
          window.refreshNotificationsNow();
        } else if (window.updateNotificationBadge) {
          window.updateNotificationBadge();
        }
        return { success: true, message: apiRes.message || 'Chuyển tiền thành công!', source: 'backend', data: normalizedTxn, transaction: normalizedTxn };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message || 'Giao dịch chuyển tiền không thành công' };
      }
    } catch (e) {
      console.error('[Customer] Lỗi kết nối CSDL khi chuyển tiền:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể thực hiện chuyển tiền') };
    }
    return { success: false, message: 'Không nhận được phản hồi từ CSDL Backend' };
  }

  /**
   * Nạp tiền vào tài khoản (Thực thi trực tiếp trên CSDL Backend)
   */
  static async depositMoneyAsync(accountNo, amount, idempotencyKey = null) {
    try {
      const apiRes = await BankApiService.atmDeposit(accountNo, amount, idempotencyKey);
      if (apiRes && apiRes.success) {
        await CustomerService.syncCustomerAccountsAsync();
        await CustomerService.getTransactionHistoryAsync(accountNo);
        const acc = CustomerService.getCustomerAccounts().find(a => a.accountNo === accountNo);
        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Có (+)',
          message: `Tài khoản ${accountNo} +${store.formatVND(amount)}. Nạp tiền thành công`,
          amount: amount,
          balanceAfter: acc ? acc.balance : undefined,
          type: 'MONEY_IN',
          accountNo: accountNo
        });
        if (window.updateNotificationBadge) window.updateNotificationBadge();
        return { success: true, message: apiRes.message || 'Nạp tiền thành công!', source: 'backend', data: apiRes.data };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message };
      }
    } catch (e) {
      console.error('[Customer] Lỗi nạp tiền vào CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể nạp tiền') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Rút tiền tại ATM (Thực thi trực tiếp trên CSDL Backend)
   */
  static async withdrawMoneyAsync(accountNo, amount, idempotencyKey = null) {
    try {
      const apiRes = await BankApiService.atmWithdraw(accountNo, amount, idempotencyKey);
      if (apiRes && apiRes.success) {
        await CustomerService.syncCustomerAccountsAsync();
        await CustomerService.getTransactionHistoryAsync(accountNo);
        const acc = CustomerService.getCustomerAccounts().find(a => a.accountNo === accountNo);
        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Nợ (-)',
          message: `Tài khoản ${accountNo} -${store.formatVND(amount)}. Rút tiền thành công`,
          amount: amount,
          balanceAfter: acc ? acc.balance : undefined,
          type: 'MONEY_OUT',
          accountNo: accountNo
        });
        if (window.updateNotificationBadge) window.updateNotificationBadge();
        return { success: true, message: apiRes.message || 'Rút tiền thành công!', source: 'backend', data: apiRes.data };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message };
      }
    } catch (e) {
      console.error('[Customer] Lỗi rút tiền từ CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể rút tiền') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Nạp tiền vào tài khoản
   */
  static depositMoney(accountNo, amount) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) return { success: false, message: 'Số tiền không hợp lệ' };

    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    const acc = freshCust ? freshCust.accounts.find(a => a.accountNo === accountNo) : null;

    if (!acc) return { success: false, message: 'Tài khoản không tồn tại' };

    acc.balance += amount;

    const txn = {
      id: store.generateTxnId(),
      fromAccount: 'NẠP TẠI CÂY ATM/QUẦY',
      fromName: 'Nạp tiền mặt',
      toAccount: accountNo,
      toName: freshCust.fullName,
      amount: amount,
      fee: 0,
      type: 'DEPOSIT',
      content: 'Nạp tiền vào tài khoản',
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };

    store.data.transactions.unshift(txn);
    store.addAuditLog(user.username, `Nạp tiền ${store.formatVND(amount)} vào tài khoản ${accountNo}`);
    store.saveData();

    return { success: true, message: `Nạp thành công ${store.formatVND(amount)} vào tài khoản` };
  }

  /**
   * Lấy lịch sử giao dịch của khách hàng hiện tại (Đồng bộ với tất cả tài khoản thanh toán & tiết kiệm)
   */
  static getTransactionHistory(accountNo = null) {
    const user = store.data.currentUser;
    if (!user) return [];

    const freshCust = CustomerService.findCustomer(user);
    const accounts = CustomerService.getCustomerAccounts();
    const customerAccNos = (accounts || []).map(a => a.accountNo);
    const savingsNos = (store.data.savingsAccounts || [])
      .filter(s => (freshCust && s.customerId === freshCust.id) || (user && (s.customerId === user.id || s.customerName === user.fullName)))
      .map(s => s.savingsNo);
    const allUserAccs = [...customerAccNos, ...savingsNos];

    const list = (store.data.transactions || []).filter(t => {
      if (accountNo && accountNo !== 'ALL') {
        return t.fromAccount === accountNo || t.toAccount === accountNo;
      }
      if (allUserAccs.length === 0) return true;
      return allUserAccs.includes(t.fromAccount) || allUserAccs.includes(t.toAccount) ||
             (freshCust && (t.fromName === freshCust.fullName || t.toName === freshCust.fullName)) ||
             (user && (t.fromName === user.fullName || t.toName === user.fullName));
    });

    // Sắp xếp thời gian mới nhất lên đầu
    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime() || 0;
      const timeB = new Date(b.timestamp || 0).getTime() || 0;
      return timeB - timeA;
    });
  }

  /**
   * Lấy lịch sử giao dịch từ Backend REST/gRPC API (nếu online) và đồng bộ vào LocalStore
   */
  static async getTransactionHistoryAsync(accountNo = null) {
    try {
      const user = store.data.currentUser;
      if (user && BankApiService.hasToken()) {
        const queryAccNo = (accountNo && accountNo !== 'ALL') ? accountNo : null;

        // Đồng bộ qua endpoint lịch sử có phân trang/lọc
        const apiRes = await BankApiService.getHistoryFiltered({
          accountNo: queryAccNo,
          size: 50,
          page: 0
        });

        if (apiRes && apiRes.success && apiRes.data) {
          const list = Array.isArray(apiRes.data.content) ? apiRes.data.content : (Array.isArray(apiRes.data) ? apiRes.data : []);
          list.forEach(apiTxn => {
            let timestampStr = store.nowGMT7String();
            if (apiTxn.timestamp) {
              if (typeof apiTxn.timestamp === 'string') {
                timestampStr = apiTxn.timestamp.replace('T', ' ').substring(0, 19);
              } else if (Array.isArray(apiTxn.timestamp)) {
                const [y, m, d, h, min, s] = apiTxn.timestamp;
                const pad = (n) => String(n).padStart(2, '0');
                timestampStr = `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:${pad(s || 0)}`;
              }
            }
            const txn = {
              id: apiTxn.id || apiTxn.txnId,
              fromAccount: apiTxn.fromAccount,
              fromName: apiTxn.fromName || 'Chủ tài khoản',
              toAccount: apiTxn.toAccount,
              toName: apiTxn.toName || 'Người nhận',
              amount: parseFloat(apiTxn.amount),
              fee: apiTxn.fee || 0,
              type: apiTxn.type || 'TRANSFER',
              content: apiTxn.content || '',
              timestamp: timestampStr,
              status: apiTxn.status || 'SUCCESS'
            };
            const existingIdx = store.data.transactions.findIndex(t => t.id === txn.id);
            if (existingIdx >= 0) {
              store.data.transactions[existingIdx] = txn;
            } else {
              store.data.transactions.unshift(txn);
            }
          });
          store.saveData();
          return list;
        }
      }
    } catch (e) {
      console.warn('[CustomerService] Backend getTransactionHistoryAsync không khả dụng', e.message);
    }
    return CustomerService.getTransactionHistory(accountNo);
  }

  /**
   * Lấy lịch sử giao dịch nâng cao (Bộ lọc & Phân trang) từ API
   */
  static async getTransactionHistoryFilteredAsync(params = {}) {
    try {
      const apiRes = await BankApiService.getHistoryFiltered(params);
      if (apiRes && apiRes.success && apiRes.data) {
        const pageData = apiRes.data;
        const list = Array.isArray(pageData.content) ? pageData.content : [];

        const formattedContent = list.map(apiTxn => {
          let timestampStr = store.nowGMT7String();
          if (apiTxn.timestamp) {
            if (typeof apiTxn.timestamp === 'string') {
              timestampStr = apiTxn.timestamp.replace('T', ' ').substring(0, 19);
            } else if (Array.isArray(apiTxn.timestamp)) {
              const [y, m, d, h, min, s] = apiTxn.timestamp;
              const pad = (n) => String(n).padStart(2, '0');
              timestampStr = `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:${pad(s || 0)}`;
            }
          }
          const txn = {
            id: apiTxn.id || apiTxn.txnId,
            fromAccount: apiTxn.fromAccount,
            fromName: apiTxn.fromName || 'Chủ tài khoản',
            toAccount: apiTxn.toAccount,
            toName: apiTxn.toName || 'Người nhận',
            amount: parseFloat(apiTxn.amount),
            fee: apiTxn.fee || 0,
            type: apiTxn.type || 'TRANSFER',
            content: apiTxn.content || '',
            timestamp: timestampStr,
            status: apiTxn.status || 'SUCCESS'
          };
          if (!store.data.transactions.some(t => t.id === txn.id)) {
            store.data.transactions.unshift(txn);
          }
          return txn;
        });
        store.saveData();

        return {
          success: true,
          data: {
            content: formattedContent,
            page: pageData.page || 0,
            size: pageData.size || 10,
            totalElements: pageData.totalElements || formattedContent.length,
            totalPages: pageData.totalPages || 1
          }
        };
      }
    } catch (e) {
      console.warn('[CustomerService] Fallback getTransactionHistoryFilteredAsync sang LocalStore', e);
    }

    return CustomerService.getTransactionHistoryFilteredLocal(params);
  }

  /**
   * Lọc và phân trang trên LocalStore nếu offline
   */
  static getTransactionHistoryFilteredLocal(params = {}) {
    const user = store.data.currentUser;
    if (!user) return { success: true, data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } };

    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: true, data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } };

    const customerAccNos = freshCust.accounts.map(a => a.accountNo);
    const savingsNos = (store.data.savingsAccounts || []).filter(s => s.customerId === freshCust.id).map(s => s.savingsNo);
    const allUserAccs = [...customerAccNos, ...savingsNos];

    let filtered = store.data.transactions.filter(t => {
      // Filter accountNo
      if (params.accountNo && params.accountNo !== 'ALL') {
        if (t.fromAccount !== params.accountNo && t.toAccount !== params.accountNo) return false;
      } else {
        if (!allUserAccs.includes(t.fromAccount) && !allUserAccs.includes(t.toAccount)) return false;
      }

      // Filter fromDate
      if (params.fromDate) {
        const tDate = (t.timestamp || '').substring(0, 10);
        if (tDate < params.fromDate) return false;
      }

      // Filter toDate
      if (params.toDate) {
        const tDate = (t.timestamp || '').substring(0, 10);
        if (tDate > params.toDate) return false;
      }

      // Filter type
      if (params.type && params.type !== 'ALL') {
        const label = CustomerService.getTransactionTypeLabel(t, allUserAccs);
        const filterType = params.type.toUpperCase();
        
        let matches = false;
        if (filterType === 'DEPOSIT' && label === 'Gửi tiền') matches = true;
        else if (filterType === 'WITHDRAW' && label === 'Rút tiền') matches = true;
        else if (filterType === 'TRANSFER' && label === 'Chuyển khoản') matches = true;
        else if (filterType === 'TRANSFER_IN' && label === 'Nhận tiền') matches = true;
        else if (filterType === 'INTEREST' && label === 'Ghi có tiền lãi') matches = true;
        else if (filterType === 'LOAN_DISBURSEMENT' && label === 'Giải ngân') matches = true;
        else if (filterType === 'LOAN_REPAYMENT' && label === 'Trả nợ vay') matches = true;
        else if (filterType === 'SAVINGS_DEPOSIT' && label === 'Gửi tiết kiệm') matches = true;
        else if (filterType === 'SAVINGS_SETTLEMENT' && label === 'Tất toán tiết kiệm') matches = true;
        else if ((t.type || '').toUpperCase() === filterType) matches = true;
        
        if (!matches) return false;
      }

      // Filter minAmount
      if (params.minAmount !== undefined && params.minAmount !== null && params.minAmount !== '') {
        if (t.amount < parseFloat(params.minAmount)) return false;
      }

      // Filter maxAmount
      if (params.maxAmount !== undefined && params.maxAmount !== null && params.maxAmount !== '') {
        if (t.amount > parseFloat(params.maxAmount)) return false;
      }

      // Filter search keyword
      if (params.search && params.search.trim()) {
        const kw = params.search.trim().toLowerCase();
        const matchId = (t.id || '').toLowerCase().includes(kw);
        const matchContent = (t.content || '').toLowerCase().includes(kw);
        const matchFromName = (t.fromName || '').toLowerCase().includes(kw);
        const matchToName = (t.toName || '').toLowerCase().includes(kw);
        const matchFromAcc = (t.fromAccount || '').toLowerCase().includes(kw);
        const matchToAcc = (t.toAccount || '').toLowerCase().includes(kw);
        if (!matchId && !matchContent && !matchFromName && !matchToName && !matchFromAcc && !matchToAcc) return false;
      }

      return true;
    });

    const page = Math.max(0, parseInt(params.page, 10) || 0);
    const size = parseInt(params.size, 10) || 10;
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size) || 1;

    const start = page * size;
    const content = filtered.slice(start, start + size);

    return {
      success: true,
      data: {
        content,
        page,
        size,
        totalElements,
        totalPages
      }
    };
  }

  /**
   * Đồng bộ danh sách tài khoản & số dư mới nhất từ Backend REST API
   */
  static async syncCustomerAccountsAsync() {
    try {
      const user = store.data.currentUser;
      if (!user) return [];
      const freshCust = CustomerService.findCustomer(user);
      const custId = freshCust ? freshCust.id : user.id;

      const apiRes = await BankApiService.getAccounts(custId);
      if (apiRes && apiRes.success && Array.isArray(apiRes.data)) {
        if (freshCust) {
          apiRes.data.forEach(accApi => {
            const localAcc = freshCust.accounts.find(a => a.accountNo === accApi.accountNo);
            if (localAcc) {
              localAcc.balance = parseFloat(accApi.balance);
              localAcc.status = accApi.status || localAcc.status;
            } else {
              freshCust.accounts.push({
                accountNo: accApi.accountNo,
                type: accApi.type,
                balance: parseFloat(accApi.balance),
                currency: accApi.currency || 'VNĐ',
                status: accApi.status || 'ACTIVE',
                createdAt: accApi.createdAt || store.todayGMT7String()
              });
            }
          });
          store.saveData();
        }
      }
      return freshCust ? freshCust.accounts : [];
    } catch (e) {
      console.warn('[Customer] Không thể đồng bộ số dư từ backend:', e);
      return CustomerService.getCustomerAccounts();
    }
  }

  /**
   * Tra cứu thông tin số tài khoản thụ hưởng (xem trước thông tin người nhận)
   */
  static async lookupAccount(accountNo) {
    if (!accountNo || accountNo.trim() === '') {
      return { success: false, message: 'Số tài khoản không được để trống' };
    }

    // 1. Gọi backend API trực tiếp tới CSDL
    try {
      const apiRes = await BankApiService.lookupAccount(accountNo.trim());
      if (apiRes && apiRes.success && apiRes.data) {
        return {
          success: true,
          data: {
            accountNo: apiRes.data.accountNo,
            fullName: apiRes.data.fullName,
            bankName: apiRes.data.bankName || 'Ngân hàng TMCP QuangTrung Bank',
            status: apiRes.data.status || 'ACTIVE',
            type: apiRes.data.type || 'PAYMENT'
          }
        };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message || 'Tài khoản người nhận không tồn tại trên hệ thống CSDL' };
      }
    } catch (e) {
      console.error('[Customer] Lỗi tra cứu tài khoản trên CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL khi tra cứu tài khoản' };
    }

    return { success: false, message: 'Tài khoản người nhận không tồn tại trên hệ thống CSDL' };
  }

  /**
   * Cập nhật thông tin liên hệ Email trực tiếp trên CSDL Backend
   */
  static async updateProfileAsync({ email, contactAddress }) {
    if (!email || email.trim() === '') {
      return { success: false, message: 'Vui lòng nhập địa chỉ Email liên hệ hợp lệ.' };
    }

    try {
      const apiResult = await BankApiService.updateProfile(email.trim(), contactAddress ? contactAddress.trim() : '');
      if (apiResult && apiResult.success) {
        const user = store.data.currentUser;
        const freshCust = CustomerService.findCustomer(user);
        if (freshCust) {
          freshCust.email = email.trim();
          if (contactAddress !== undefined) freshCust.contactAddress = contactAddress.trim();
        }
        if (user) user.email = email.trim();

        store.addAuditLog(user ? user.username : 'khách hàng', 'Cập nhật thông tin liên hệ (Email, Địa chỉ liên hệ) thành công vào CSDL Backend MySQL');
        store.saveData();

        return { success: true, message: apiResult.message || 'Cập nhật thông tin liên hệ thành công!', source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message || 'Cập nhật thất bại' };
      }
    } catch (e) {
      console.error('[Customer] Lỗi cập nhật thông tin trong CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể lưu thông tin') };
    }
    return { success: false, message: 'Không thể cập nhật hồ sơ trên CSDL' };
  }

  /**
   * Xác minh mật khẩu hiện tại của người dùng trực tiếp qua CSDL Backend
   */
  static async verifyCurrentPasswordAsync(currentPassword) {
    if (!currentPassword || currentPassword.trim() === '') {
      return { success: false, message: 'Vui lòng nhập mật khẩu hiện tại.' };
    }

    try {
      const apiResult = await BankApiService.verifyPassword(currentPassword.trim());
      if (apiResult && apiResult.success !== undefined) {
        return {
          success: apiResult.success,
          message: apiResult.message || (apiResult.success ? 'Hợp lệ' : 'Mật khẩu hiện tại không chính xác.')
        };
      }
    } catch (e) {
      console.error('[Customer] Lỗi xác minh mật khẩu qua CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL khi kiểm tra mật khẩu' };
    }

    return { success: false, message: 'Không thể xác minh mật khẩu qua CSDL' };
  }

  /**
   * Đổi mật khẩu bảo mật trực tiếp trên CSDL Backend
   */
  static async changePasswordAsync({ currentPassword, newPassword, confirmPassword }) {
    // 1. Validate dữ liệu cơ bản
    if (!currentPassword || currentPassword.trim() === '') {
      return { success: false, message: 'Vui lòng nhập mật khẩu hiện tại.' };
    }
    if (!newPassword || newPassword.trim() === '') {
      return { success: false, message: 'Vui lòng nhập mật khẩu mới.' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, message: 'Xác nhận mật khẩu mới không trùng khớp.' };
    }
    if (currentPassword === newPassword) {
      return { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' };
    }

    // 2. Kiểm tra quy tắc mật khẩu mạnh
    const validation = SecurityService.validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return { 
        success: false, 
        message: 'Mật khẩu không đáp ứng chính sách bảo mật:\n• ' + validation.errors.join('\n• ') 
      };
    }

    // 3. Gọi backend REST API lưu vào CSDL MySQL
    try {
      const apiResult = await BankApiService.changePassword(currentPassword, newPassword, confirmPassword);
      if (apiResult && apiResult.success) {
        const user = store.data.currentUser;
        const freshCust = CustomerService.findCustomer(user);
        if (freshCust) freshCust.password = newPassword;
        if (user) user.password = newPassword;

        store.addAuditLog(user ? user.username : 'khách hàng', 'Đổi mật khẩu thành công qua xác thực 2FA OTP & Backend REST API (MySQL DB)');
        store.saveData();

        CustomerService.triggerPushNotification({
          title: 'Cảnh Báo Bảo Mật: Đổi Mật Khẩu Thành Công',
          message: 'Mật khẩu đăng nhập tài khoản của quý khách đã được thay đổi thành công. Vui lòng ghi nhớ mật khẩu mới.',
          type: 'SECURITY',
          skipSaveLocal: true,
          skipBadgeIncrement: true
        });
        CustomerService.cachedNotifs = null;
        if (window.updateNotificationBadge) window.updateNotificationBadge(null, true);

        return { success: true, message: apiResult.message || 'Đổi mật khẩu bảo mật thành công!', source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message || 'Đổi mật khẩu thất bại' };
      }
    } catch (e) {
      console.error('[Customer] Lỗi đổi mật khẩu trong CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể đổi mật khẩu') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Đổi mật khẩu trong LocalStore
   */
  static changePassword({ currentPassword, newPassword, confirmPassword }) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    // Kiểm tra mật khẩu hiện tại trong localstore
    if (freshCust.password && freshCust.password !== currentPassword && user.password !== currentPassword) {
      return { success: false, message: 'Mật khẩu hiện tại không chính xác.' };
    }

    freshCust.password = newPassword;
    user.password = newPassword;

    store.addAuditLog(user.username, 'Đổi mật khẩu thành công qua xác thực 2FA OTP');
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Cảnh Báo Bảo Mật: Đổi Mật Khẩu Thành Công',
      message: 'Mật khẩu đăng nhập tài khoản của quý khách đã được thay đổi thành công. Vui lòng ghi nhớ mật khẩu mới.',
      type: 'SECURITY'
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return { success: true, message: 'Đổi mật khẩu bảo mật thành công!' };
  }



  /**
   * Nạp tiền mặt tại cây ATM
   */
  static atmDeposit({ accountNo, amount, pin, location = 'ATM Hội Sở - QuangTrung Bank' }) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) return { success: false, message: 'Số tiền nạp không hợp lệ' };
    if (amount < 10000) return { success: false, message: 'Số tiền nạp tối thiểu tại ATM là 10,000 VNĐ' };

    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const acc = freshCust.accounts.find(a => a.accountNo === accountNo);
    if (!acc) return { success: false, message: 'Tài khoản chọn nạp không tồn tại' };
    if (acc.status !== 'ACTIVE') return { success: false, message: 'Tài khoản đang bị khóa hoặc ngưng hoạt động' };

    // Xác thực mã PIN thẻ ATM (Mặc định 1234 hoặc 123)
    if (pin && pin !== '1234' && pin !== '123' && pin !== freshCust.password) {
      return { success: false, message: 'Mã PIN thẻ ATM không chính xác' };
    }

    acc.balance += amount;

    const txnId = 'ATM-DEP-' + Math.floor(100000 + Math.random() * 900000);
    const txn = {
      id: txnId,
      fromAccount: `MÁY ATM (${location})`,
      fromName: 'Nạp tiền mặt ATM',
      toAccount: accountNo,
      toName: freshCust.fullName,
      amount: amount,
      fee: 0,
      type: 'DEPOSIT',
      content: `Nạp tiền mặt tại cây ATM QuangTrung Bank (${location})`,
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };

    store.data.transactions.unshift(txn);
    store.addAuditLog(user.username, `Nạp tiền mặt ATM ${store.formatVND(amount)} vào TK ${accountNo} [Mã: ${txnId}]`);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Biến động số dư Có (+)',
      message: `Tài khoản ${accountNo} +${store.formatVND(amount)}. Nạp tiền mặt tại cây ATM`,
      amount: amount,
      balanceAfter: acc.balance,
      type: 'MONEY_IN',
      accountNo: accountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Giao dịch NẠP TIỀN ATM THÀNH CÔNG! Số dư mới: ${store.formatVND(acc.balance)}`,
      transaction: txn,
      newBalance: acc.balance,
      accountNo: accountNo
    };
  }

  /**
   * Rút tiền mặt tại cây ATM
   */
  static atmWithdraw({ accountNo, amount, pin, location = 'ATM Hội Sở - QuangTrung Bank' }) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) return { success: false, message: 'Số tiền rút không hợp lệ' };
    if (amount < 50000) return { success: false, message: 'Số tiền rút tối thiểu tại ATM là 50,000 VNĐ' };
    if (amount % 10000 !== 0) return { success: false, message: 'Số tiền rút phải là bội số của 10,000 VNĐ' };

    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const acc = freshCust.accounts.find(a => a.accountNo === accountNo);
    if (!acc) return { success: false, message: 'Tài khoản rút tiền không tồn tại' };
    if (acc.status !== 'ACTIVE') return { success: false, message: 'Tài khoản đang bị khóa hoặc ngưng hoạt động' };

    // Xác thực mã PIN thẻ ATM
    if (pin && pin !== '1234' && pin !== '123' && pin !== freshCust.password) {
      return { success: false, message: 'Mã PIN thẻ ATM không chính xác (Mặc định: 1234)' };
    }

    if (acc.balance < amount) {
      return { success: false, message: `Số dư tài khoản không đủ. Số dư khả dụng: ${store.formatVND(acc.balance)}` };
    }

    acc.balance -= amount;

    const txnId = 'ATM-WDR-' + Math.floor(100000 + Math.random() * 900000);
    const txn = {
      id: txnId,
      fromAccount: accountNo,
      fromName: freshCust.fullName,
      toAccount: `MÁY ATM (${location})`,
      toName: 'Rút tiền mặt ATM',
      amount: amount,
      fee: 0,
      type: 'WITHDRAW',
      content: `Rút tiền mặt tại cây ATM QuangTrung Bank (${location})`,
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };

    store.data.transactions.unshift(txn);
    store.addAuditLog(user.username, `Rút tiền mặt ATM ${store.formatVND(amount)} từ TK ${accountNo} [Mã: ${txnId}]`);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Biến động số dư Nợ (-)',
      message: `Tài khoản ${accountNo} -${store.formatVND(amount)}. Rút tiền mặt tại cây ATM`,
      amount: amount,
      balanceAfter: acc.balance,
      type: 'MONEY_OUT',
      accountNo: accountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Giao dịch RÚT TIỀN ATM THÀNH CÔNG! Đang nhả tiền mặt...`,
      transaction: txn,
      newBalance: acc.balance,
      accountNo: accountNo
    };
  }

  /**
   * Tạo Mã Rút/Nạp Tiền ATM Không Dùng Thẻ (Async: Backend REST API + LocalStore)
   */
  static async createAtmCodeAsync({ accountNo, type = 'WITHDRAW', amount, pin = '1234' }) {
    try {
      const apiResult = await BankApiService.createAtmCode(accountNo, type, amount, pin);
      if (apiResult && apiResult.success && apiResult.data) {
        const item = apiResult.data;
        const freshCust = CustomerService.findCustomer();
        const atmCodeObj = {
          id: item.id,
          code: item.code,
          type: item.type,
          customerId: item.customerId || freshCust?.id,
          customerName: freshCust?.fullName || 'Khách hàng',
          accountNo: item.accountNo,
          amount: item.amount,
          pin: item.pin || '1234',
          status: item.status || 'PENDING',
          createdAt: item.createdAt ? String(item.createdAt).replace('T', ' ').substring(0, 19) : store.nowGMT7String(),
          completedAt: null
        };
        store.data.atmCodes.unshift(atmCodeObj);
        store.addAuditLog(store.data.currentUser?.username || 'khách hàng', `Tạo mã ${type === 'WITHDRAW' ? 'Rút' : 'Nạp'} tiền ATM [${item.code}] qua Backend REST API (MySQL)`);
        store.saveData();

        return {
          success: true,
          message: apiResult.message || `Tạo mã ${type === 'WITHDRAW' ? 'RÚT TIỀN' : 'NẠP TIỀN'} ATM thành công! Mã xác thực: ${item.code}`,
          atmCode: atmCodeObj,
          source: 'backend'
        };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message || 'Tạo mã ATM thất bại' };
      }
    } catch (e) {
      console.error('[Customer] Lỗi tạo mã ATM trong CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể tạo mã ATM') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Hủy Mã ATM chưa sử dụng trực tiếp trên CSDL Backend
   */
  static async cancelAtmCodeAsync(codeId) {
    try {
      const apiResult = await BankApiService.cancelAtmCode(codeId);
      if (apiResult && apiResult.success) {
        store.data.atmCodes = (store.data.atmCodes || []).filter(c => c.id !== codeId && c.code !== codeId);
        store.addAuditLog(store.data.currentUser?.username || 'khách hàng', `Hủy và xóa mã ATM [${codeId}] qua Backend REST API`);
        store.saveData();
        return { success: true, message: apiResult.message || `Đã hủy và xóa thành công mã ATM`, source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message || 'Hủy mã ATM thất bại' };
      }
    } catch (e) {
      console.error('[Customer] Lỗi hủy mã ATM trong CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể hủy mã ATM') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Tạo Mã Rút/Nạp Tiền ATM Không Dùng Thẻ
   */
  static createAtmCode({ accountNo, type = 'WITHDRAW', amount, pin = '1234' }) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) return { success: false, message: 'Số tiền không hợp lệ' };
    if (amount < 10000) return { success: false, message: 'Số tiền tối thiểu là 10.000 VNĐ' };
    if (amount % 10000 !== 0) return { success: false, message: 'Số tiền giao dịch tại ATM phải là bội số của 10.000 VNĐ' };

    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Người dùng không tồn tại' };

    const acc = freshCust.accounts.find(a => a.accountNo === accountNo);
    if (!acc) return { success: false, message: 'Tài khoản chọn không tồn tại' };
    if (acc.status !== 'ACTIVE') return { success: false, message: 'Tài khoản đang bị khóa' };

    if (type === 'WITHDRAW' && acc.balance < amount) {
      return { success: false, message: `Số dư không đủ để khởi tạo mã rút tiền. Số dư hiện tại: ${store.formatVND(acc.balance)}` };
    }

    // Khởi tạo mã xác thực ATM 6 chữ số
    const codeDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const atmCodeObj = {
      id: 'ATMC-' + codeDigits,
      code: codeDigits,
      type: type, // WITHDRAW: Rút tiền hoặc DEPOSIT: Nạp tiền
      customerId: freshCust.id,
      customerName: freshCust.fullName,
      accountNo: accountNo,
      amount: amount,
      pin: pin || '1234',
      status: 'PENDING', // PENDING: Chờ sử dụng, COMPLETED: Hoàn tất, CANCELLED: Hủy, EXPIRED: Hết hạn
      createdAt: store.nowGMT7String(),
      completedAt: null
    };

    store.data.atmCodes.unshift(atmCodeObj);
    store.addAuditLog(user.username, `Tạo mã ${type === 'WITHDRAW' ? 'Rút' : 'Nạp'} tiền ATM [${codeDigits}] cho TK ${accountNo} (${store.formatVND(amount)})`);
    store.saveData();

    return {
      success: true,
      message: `Tạo mã ${type === 'WITHDRAW' ? 'RÚT TIỀN' : 'NẠP TIỀN'} ATM thành công! Mã xác thực: ${codeDigits}`,
      atmCode: atmCodeObj
    };
  }

  /**
   * Lấy danh sách mã ATM của khách hàng (không bao gồm mã đã hủy)
   */
  static getAtmCodes() {
    const user = store.data.currentUser;
    if (!user) return [];
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return [];

    return (store.data.atmCodes || []).filter(item => item.customerId === freshCust.id && item.status !== 'CANCELLED');
  }

  /**
   * Hủy Mã ATM chưa sử dụng (Xóa khỏi danh sách)
   */
  static cancelAtmCode(codeId) {
    const user = store.data.currentUser;
    const index = (store.data.atmCodes || []).findIndex(c => c.id === codeId || c.code === codeId);
    if (index === -1) return { success: false, message: 'Mã ATM không tồn tại' };

    const item = store.data.atmCodes[index];
    if (item.status !== 'PENDING') {
      return { success: false, message: 'Chỉ có thể hủy mã đang ở trạng thái Chờ sử dụng' };
    }

    const codeVal = item.code;
    store.data.atmCodes.splice(index, 1);
    store.addAuditLog(user.username, `Hủy và xóa mã ATM [${codeVal}]`);
    store.saveData();

    return { success: true, message: `Đã hủy và xóa thành công mã ATM ${codeVal}` };
  }

  // ==========================================
  // NGHIỆP VỤ TIẾT KIỆM TRỰC TUYẾN (ONLINE SAVINGS)
  // ==========================================

  /**
   * Lấy danh sách sổ tiết kiệm của khách hàng hiện tại (Async: ưu tiên REST API)
   */
  static async getCustomerSavingsAsync() {
    try {
      const apiRes = await BankApiService.getSavingsAccounts();
      if (apiRes && apiRes.success && Array.isArray(apiRes.data)) {
        const user = store.data.currentUser;
        const cust = CustomerService.findCustomer(user);
        if (cust) {
          cust.savings = apiRes.data;
          store.saveData();
        }
        return apiRes.data;
      }
    } catch (err) {
      console.warn('[Savings] Lỗi tải từ backend, chuyển sang Local Store:', err);
    }
    return CustomerService.getCustomerSavings();
  }

  /**
   * Lấy biểu lãi suất tiền gửi tiết kiệm (Async: ưu tiên REST API)
   */
  static async getSavingsInterestRatesAsync() {
    try {
      const apiRes = await BankApiService.getSavingsInterestRates();
      const list = (apiRes && apiRes.success && Array.isArray(apiRes.data)) ? apiRes.data : (apiRes && apiRes.rates ? apiRes.rates : null);
      if (list && list.length > 0) {
        const mapped = list.map(r => {
          const m = r.termMonths !== undefined ? r.termMonths : (r.term !== undefined ? r.term : 0);
          const rateVal = r.annualRate !== undefined ? parseFloat(r.annualRate) : (r.rate !== undefined ? parseFloat(r.rate) : 0);
          return {
            term: m,
            termMonths: m,
            rate: rateVal,
            annualRate: rateVal,
            label: r.label || (m === 0 ? 'Không kỳ hạn' : `${m} Tháng`),
            minAmount: r.minAmount ? parseFloat(r.minAmount) : (m === 0 ? 100000 : 1000000)
          };
        });
        store.data.savingsInterestRates = mapped;
        store.saveData();
        return mapped;
      }
    } catch (err) {
      console.warn('[Savings] Lỗi tải biểu lãi suất từ backend, dùng store:', err);
    }
    return store.data.savingsInterestRates || [
      { term: 0, termMonths: 0, label: 'Không kỳ hạn', rate: 0.2, annualRate: 0.2, minAmount: 100000 },
      { term: 1, termMonths: 1, label: '1 Tháng', rate: 4.5, annualRate: 4.5, minAmount: 1000000 },
      { term: 3, termMonths: 3, label: '3 Tháng', rate: 5.2, annualRate: 5.2, minAmount: 1000000 },
      { term: 6, termMonths: 6, label: '6 Tháng', rate: 6.5, annualRate: 6.5, minAmount: 1000000 },
      { term: 12, termMonths: 12, label: '12 Tháng', rate: 7.2, annualRate: 7.2, minAmount: 1000000 },
      { term: 24, termMonths: 24, label: '24 Tháng', rate: 7.8, annualRate: 7.8, minAmount: 1000000 },
      { term: 36, termMonths: 36, label: '36 Tháng', rate: 8.0, annualRate: 8.0, minAmount: 5000000 }
    ];
  }

  /**
   * Lấy chi tiết 1 sổ tiết kiệm kèm lãi suất tạm tính hiện tại
   */
  static async getSavingsDetailAsync(savingsId) {
    try {
      const apiRes = await BankApiService.getSavingsDetail(savingsId);
      if (apiRes && apiRes.success && apiRes.data) {
        return { success: true, data: apiRes.data };
      }
    } catch (err) {
      console.warn('[Savings] Lỗi lấy chi tiết từ backend:', err);
    }

    // Fallback Local Store
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const sav = (store.data.savingsAccounts || []).find(s => (s.id === savingsId || s.savingsNo === savingsId) && s.customerId === freshCust.id);
    if (!sav) return { success: false, message: 'Tài khoản tiết kiệm không tồn tại' };

    const created = new Date(sav.createdAt || new Date());
    const now = new Date();
    const startDay = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
    const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const daysActive = Math.max(0, Math.floor((currentDay - startDay) / (1000 * 60 * 60 * 24)));
    const isDemand = sav.savingsType === 'DEMAND' || sav.termMonths === 0;
    const isMatured = sav.maturityDate && new Date(sav.maturityDate) <= now;

    let currentAccruedInterest = 0;
    if (isDemand) {
      currentAccruedInterest = Math.round((sav.depositAmount * sav.interestRate * daysActive) / 36500);
    } else if (isMatured) {
      currentAccruedInterest = sav.expectedInterest;
    } else {
      const earlyRate = sav.earlyWithdrawalRate || 0.2;
      currentAccruedInterest = Math.round((sav.depositAmount * earlyRate * daysActive) / 36500);
    }

    const relatedTxns = (store.data.transactions || []).filter(t => t.fromAccount === sav.savingsNo || t.toAccount === sav.savingsNo);

    return {
      success: true,
      data: {
        savingsAccount: sav,
        daysActive: daysActive,
        currentAccruedInterest: currentAccruedInterest,
        payoutIfClosedToday: sav.depositAmount + currentAccruedInterest,
        isMatured: isMatured,
        relatedTransactions: relatedTxns
      }
    };
  }

  /**
   * Lấy danh sách sổ tiết kiệm của khách hàng hiện tại (Local Store & Cached)
   */
  static getCustomerSavings() {
    const user = store.data.currentUser;
    if (!user) return [];
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return [];

    if (Array.isArray(freshCust.savings) && freshCust.savings.length > 0) {
      return freshCust.savings;
    }
    return (store.data.savingsAccounts || []).filter(s => s.customerId === freshCust.id || s.customer_id === freshCust.id);
  }

  static getAllSavingsAccounts() {
    return CustomerService.getCustomerSavings();
  }

  static async getAllSavingsAccountsAsync() {
    return CustomerService.getCustomerSavingsAsync();
  }

  /**
   * Mở sổ tiết kiệm trực tuyến (Async: ưu tiên REST API)
   */
  static async openSavingsAccountAsync({ sourceAccountNo, amount, termMonths, savingsType = 'TERM', renewType = 'AUTO_ROLLOVER_ALL', idempotencyKey }) {
    try {
      const apiRes = await BankApiService.openSavingsAccount(sourceAccountNo, amount, termMonths, savingsType, renewType, idempotencyKey);
      if (apiRes && apiRes.success) {
        // Cập nhật lại số dư LocalStore nếu có
        const user = store.data.currentUser;
        const freshCust = CustomerService.findCustomer(user);
        if (freshCust) {
          const acc = freshCust.accounts.find(a => a.accountNo === sourceAccountNo);
          if (acc) acc.balance -= parseFloat(amount);
          if (!store.data.savingsAccounts) store.data.savingsAccounts = [];
          if (apiRes.data) store.data.savingsAccounts.unshift(apiRes.data);
          store.saveData();
        }
        const sourceAcc = CustomerService.getCustomerAccounts().find(a => a.accountNo === sourceAccountNo);
        const savNo = (apiRes.data && (apiRes.data.savingsNo || apiRes.data.savings_no)) || '';
        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Nợ (-)',
          message: `Tài khoản ${sourceAccountNo} -${store.formatVND(amount)}. Mở tài khoản tiết kiệm ${savNo}`,
          amount: amount,
          balanceAfter: sourceAcc ? sourceAcc.balance : undefined,
          type: 'MONEY_OUT',
          accountNo: sourceAccountNo
        });
        return { success: true, message: apiRes.message || 'Mở tài khoản tiết kiệm thành công!', savings: apiRes.data };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message || 'Mở sổ tiết kiệm thất bại' };
      }
    } catch (err) {
      console.error('[Savings] Lỗi mở tài khoản tiết kiệm trên CSDL:', err);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (err.message || 'Không thể mở sổ tiết kiệm') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Mở sổ tiết kiệm trực tuyến (Local Store Fallback)
   */
  static openSavingsAccount({ sourceAccountNo, amount, termMonths, savingsType = 'TERM', renewType = 'AUTO_ROLLOVER_ALL' }) {
    const user = store.data.currentUser;
    if (!user) return { success: false, message: 'Vui lòng đăng nhập' };

    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    amount = typeof amount === 'string' ? (parseFloat(amount.replace(/\D/g, '')) || 0) : (parseFloat(amount) || 0);
    termMonths = parseInt(termMonths, 10);
    const isDemand = savingsType === 'DEMAND' || termMonths === 0;
    const minAmount = isDemand ? 100000 : 1000000;

    if (isNaN(amount) || amount < minAmount) {
      return { success: false, message: `Số tiền gửi tối thiểu là ${store.formatVND(minAmount)}` };
    }

    const sourceAcc = freshCust.accounts.find(a => a.accountNo === sourceAccountNo);
    if (!sourceAcc) return { success: false, message: 'Tài khoản nguồn không tồn tại' };
    if (sourceAcc.balance < amount) {
      return { success: false, message: 'Số dư tài khoản thanh toán không đủ để gửi tiết kiệm' };
    }

    // Trừ tiền tài khoản nguồn
    sourceAcc.balance -= amount;

    // Lấy lãi suất
    let interestRate = 0.2;
    if (!isDemand) {
      interestRate = CustomerService.getSavingsInterestRate(termMonths);
    }

    // Tính lãi dự kiến
    const expectedInterest = isDemand ? 0 : Math.round((amount * interestRate * termMonths) / 1200);
    let maturityDateStr = null;
    const now = new Date();
    const createdDateStr = store.nowGMT7String();

    if (!isDemand && termMonths > 0) {
      const maturity = new Date(now);
      maturity.setMonth(maturity.getMonth() + termMonths);
      maturityDateStr = maturity.toISOString().replace('T', ' ').substring(0, 19);
    }

    const savingsNo = String(Math.floor(100000 + Math.random() * 900000));

    const newSavingsObj = {
      id: 'SAV-' + Math.floor(10000 + Math.random() * 90000),
      customerId: freshCust.id,
      customerName: freshCust.fullName,
      savingsNo: savingsNo,
      savingsType: isDemand ? 'DEMAND' : 'TERM',
      depositAmount: amount,
      termMonths: isDemand ? 0 : termMonths,
      interestRate: interestRate,
      originalRate: interestRate,
      expectedInterest: expectedInterest,
      accruedInterest: 0,
      earlyWithdrawalRate: 0.2,
      renewType: renewType || 'AUTO_ROLLOVER_ALL',
      renewCount: 0,
      sourceAccountNo: sourceAccountNo,
      status: 'ACTIVE',
      createdAt: createdDateStr,
      maturityDate: maturityDateStr
    };

    if (!store.data.savingsAccounts) store.data.savingsAccounts = [];
    store.data.savingsAccounts.unshift(newSavingsObj);

    // Ghi nhận lịch sử giao dịch
    const txn = {
      id: store.generateTxnId(),
      fromAccount: sourceAccountNo,
      fromName: freshCust.fullName,
      toAccount: savingsNo,
      toName: isDemand ? `Tài Khoản Tiết Kiệm (${interestRate}%/năm)` : `Tài Khoản Tiết Kiệm ${termMonths} tháng (${interestRate}%/năm)`,
      amount: amount,
      fee: 0,
      type: 'TRANSFER',
      content: `Mở tài khoản tiết kiệm ${savingsNo} ${isDemand ? 'không kỳ hạn' : 'kỳ hạn ' + termMonths + ' tháng'}`,
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };
    store.data.transactions.unshift(txn);

    store.addAuditLog(user.username, `Mở tài khoản tiết kiệm [${savingsNo}] - Số tiền: ${store.formatVND(amount)} - Kỳ hạn: ${isDemand ? 'Không KH' : termMonths + ' tháng'}`);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Biến động số dư Nợ (-)',
      message: `Tài khoản ${sourceAccountNo} -${store.formatVND(amount)}. Mở tài khoản tiết kiệm ${savingsNo}`,
      amount: amount,
      balanceAfter: sourceAcc.balance,
      type: 'MONEY_OUT',
      accountNo: sourceAccountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Mở tài khoản tiết kiệm trực tuyến thành công! Mã tài khoản: ${savingsNo}`,
      savings: newSavingsObj
    };
  }

  /**
   * Tất toán sổ tiết kiệm (Async: ưu tiên REST API)
   */
  static async closeSavingsAccountAsync({ savingsId, isEarly = false, partialAmount = null, idempotencyKey }) {
    try {
      const apiRes = await BankApiService.closeSavingsAccount(savingsId, isEarly, partialAmount, idempotencyKey);
      if (apiRes && apiRes.success) {
        const payout = (apiRes.data && (apiRes.data.totalPayout || apiRes.data.total_payout)) || partialAmount || 0;
        const targetAccNo = (apiRes.data && (apiRes.data.targetAccountNo || apiRes.data.target_account_no)) || '';
        const targetAcc = CustomerService.getCustomerAccounts().find(a => a.accountNo === targetAccNo);
        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Có (+)',
          message: `Tài khoản ${targetAccNo || 'thanh toán'} +${store.formatVND(payout)}. ${partialAmount ? 'Rút một phần tài khoản tiết kiệm' : 'Tất toán tài khoản tiết kiệm ' + savingsId}`,
          amount: payout,
          balanceAfter: targetAcc ? targetAcc.balance : undefined,
          type: 'MONEY_IN',
          accountNo: targetAccNo
        });
        if (window.updateNotificationBadge) window.updateNotificationBadge();
        if (window.refreshNotificationsLoop) window.refreshNotificationsLoop();
        return { success: true, message: apiRes.message || 'Tất toán thành công!', data: apiRes.data };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message || 'Tất toán sổ tiết kiệm thất bại' };
      }
    } catch (err) {
      console.error('[Savings] Lỗi tất toán tài khoản tiết kiệm trên CSDL:', err);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (err.message || 'Không thể tất toán sổ tiết kiệm') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Tất toán sổ tiết kiệm (Local Store Fallback)
   */
  static closeSavingsAccount(savingsId, isEarly = false, partialAmount = null) {
    const user = store.data.currentUser;
    if (!user) return { success: false, message: 'Vui lòng đăng nhập' };

    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const savings = (store.data.savingsAccounts || []).find(s => (s.id === savingsId || s.savingsNo === savingsId) && s.customerId === freshCust.id);
    if (!savings) return { success: false, message: 'Tài khoản tiết kiệm không tồn tại' };
    if (savings.status !== 'ACTIVE') return { success: false, message: 'Tài khoản tiết kiệm đã được tất toán hoặc giải tỏa trước đó' };

    let targetAcc = freshCust.accounts.find(a => a.accountNo === savings.sourceAccountNo);
    if (!targetAcc) {
      targetAcc = freshCust.accounts.find(a => a.type === 'PAYMENT');
    }
    if (!targetAcc) return { success: false, message: 'Không tìm thấy tài khoản thanh toán nhận tiền tất toán' };

    const created = new Date(savings.createdAt || new Date());
    const now = new Date();
    const startDay = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
    const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.max(0, Math.floor((currentDay - startDay) / (1000 * 60 * 60 * 24)));
    const isDemand = savings.savingsType === 'DEMAND' || savings.termMonths === 0;

    // Xử lý rút một phần sổ tiết kiệm
    if (partialAmount && partialAmount > 0) {
      const withdrawAmt = parseFloat(partialAmount);
      if (isNaN(withdrawAmt) || withdrawAmt <= 0) {
        return { success: false, message: 'Số tiền rút không hợp lệ' };
      }
      if (withdrawAmt >= savings.depositAmount) {
        return { success: false, message: 'Số tiền rút một phần phải nhỏ hơn tổng số dư hiện tại. Nếu muốn rút hết, vui lòng chọn Tất toán toàn bộ.' };
      }

      const remaining = savings.depositAmount - withdrawAmt;
      const minKeep = isDemand ? 100000 : 1000000;
      if (remaining < minKeep) {
        return { success: false, message: `Số dư còn lại trong tài khoản sau khi rút phải đạt tối thiểu ${store.formatVND(minKeep)}` };
      }

      const partialInterest = Math.round((withdrawAmt * (savings.earlyWithdrawalRate || 0.2) * diffDays) / 36500);
      const totalPayout = withdrawAmt + partialInterest;

      savings.depositAmount = remaining;
      if (!isDemand && savings.termMonths > 0) {
        savings.expectedInterest = Math.round((remaining * savings.interestRate * savings.termMonths) / 1200);
      }
      targetAcc.balance += totalPayout;

      const txn = {
        id: store.generateTxnId(),
        fromAccount: savings.savingsNo,
        fromName: `Tài Khoản Tiết Kiệm (${savings.savingsNo})`,
        toAccount: targetAcc.accountNo,
        toName: freshCust.fullName,
        amount: totalPayout,
        fee: 0,
        type: 'TRANSFER',
        content: `Rút một phần tài khoản TK ${savings.savingsNo} (Gốc: ${store.formatVND(withdrawAmt)}, Lãi: ${store.formatVND(partialInterest)})`,
        timestamp: store.nowGMT7String(),
        status: 'SUCCESS'
      };
      store.data.transactions.unshift(txn);
      store.saveData();

      CustomerService.triggerPushNotification({
        title: 'Biến động số dư Có (+)',
        message: `Tài khoản ${targetAcc.accountNo} +${store.formatVND(totalPayout)}. Rút một phần tài khoản tiết kiệm ${savings.savingsNo}`,
        amount: totalPayout,
        balanceAfter: targetAcc.balance,
        type: 'MONEY_IN',
        accountNo: targetAcc.accountNo
      });
      if (window.updateNotificationBadge) window.updateNotificationBadge();

      return {
        success: true,
        message: `Rút một phần tài khoản tiết kiệm thành công! Số tiền ${store.formatVND(totalPayout)} đã chuyển vào TK ${targetAcc.accountNo}`,
        totalPayout: totalPayout
      };
    }

    // Tất toán toàn bộ
    let payoutInterest = savings.expectedInterest || 0;
    let payoutRate = savings.interestRate;
    let payoutDesc = `Tất toán đúng hạn sổ TK ${savings.savingsNo}`;

    if (isDemand) {
      payoutRate = savings.interestRate || 0.2;
      payoutInterest = Math.round((savings.depositAmount * payoutRate * diffDays) / 36500);
      payoutDesc = `Tất toán tài khoản tiết kiệm không kỳ hạn ${savings.savingsNo}`;
    } else if (isEarly) {
      payoutRate = savings.earlyWithdrawalRate || 0.2;
      payoutInterest = Math.round((savings.depositAmount * payoutRate * diffDays) / 36500);
      payoutDesc = `Tất toán trước hạn tài khoản TK ${savings.savingsNo} (Lãi KKH ${payoutRate}%)`;
    }

    const totalPayout = savings.depositAmount + payoutInterest;
    targetAcc.balance += totalPayout;
    savings.status = isEarly ? 'CLOSED_EARLY' : 'MATURED';
    savings.actualInterestPaid = payoutInterest;
    savings.closedAt = store.todayGMT7String();

    const txn = {
      id: store.generateTxnId(),
      fromAccount: savings.savingsNo,
      fromName: `Tài Khoản Tiết Kiệm (${savings.savingsNo})`,
      toAccount: targetAcc.accountNo,
      toName: freshCust.fullName,
      amount: totalPayout,
      fee: 0,
      type: 'TRANSFER',
      content: payoutDesc,
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };
    store.data.transactions.unshift(txn);

    store.addAuditLog(user.username, `Tất toán tài khoản tiết kiệm [${savings.savingsNo}] - Nhận về: ${store.formatVND(totalPayout)} vào TK ${targetAcc.accountNo}`);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Biến động số dư Có (+)',
      message: `Tài khoản ${targetAcc.accountNo} +${store.formatVND(totalPayout)}. Tất toán tài khoản tiết kiệm ${savings.savingsNo}`,
      amount: totalPayout,
      balanceAfter: targetAcc.balance,
      type: 'MONEY_IN',
      accountNo: targetAcc.accountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Tất toán tài khoản tiết kiệm ${savings.savingsNo} thành công! Số tiền gốc + lãi (${store.formatVND(totalPayout)}) đã được chuyển về TK ${targetAcc.accountNo}`,
      totalPayout: totalPayout
    };
  }

  /**
   * Nộp thêm tiền vào sổ tiết kiệm không kỳ hạn (Thực thi trực tiếp trên CSDL Backend)
   */
  static async topUpSavingsAsync({ savingsId, sourceAccountNo, amount, idempotencyKey }) {
    try {
      const apiRes = await BankApiService.topUpSavingsAccount(savingsId, sourceAccountNo, amount, idempotencyKey);
      if (apiRes && apiRes.success) {
        const sourceAcc = CustomerService.getCustomerAccounts().find(a => a.accountNo === sourceAccountNo);
        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Nợ (-)',
          message: `Tài khoản ${sourceAccountNo} -${store.formatVND(amount)}. Nộp thêm tiền vào tài khoản tiết kiệm ${savingsId}`,
          amount: amount,
          balanceAfter: sourceAcc ? sourceAcc.balance : undefined,
          type: 'MONEY_OUT',
          accountNo: sourceAccountNo
        });
        if (window.updateNotificationBadge) window.updateNotificationBadge();
        return { success: true, message: apiRes.message || 'Nộp thêm tiền thành công!', savings: apiRes.data };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message || 'Nộp thêm tiền thất bại' };
      }
    } catch (err) {
      console.error('[Savings] Lỗi nộp thêm tiền vào sổ tiết kiệm trên CSDL:', err);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (err.message || 'Không thể nộp thêm tiền') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Nộp thêm tiền vào sổ tiết kiệm không kỳ hạn (Local Store Fallback)
   */
  static topUpSavings({ savingsId, sourceAccountNo, amount }) {
    const user = store.data.currentUser;
    if (!user) return { success: false, message: 'Vui lòng đăng nhập' };

    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const savings = (store.data.savingsAccounts || []).find(s => (s.id === savingsId || s.savingsNo === savingsId) && s.customerId === freshCust.id);
    if (!savings) return { success: false, message: 'Tài khoản tiết kiệm không tồn tại' };
    if (savings.status !== 'ACTIVE') return { success: false, message: 'Tài khoản tiết kiệm không ở trạng thái hoạt động' };

    const isDemand = savings.savingsType === 'DEMAND' || savings.termMonths === 0;
    if (!isDemand) {
      return { success: false, message: 'Theo quy định Ngân hàng, chỉ Tài khoản tiết kiệm không kỳ hạn mới cho phép nộp thêm tiền' };
    }

    amount = typeof amount === 'string' ? (parseFloat(amount.replace(/\D/g, '')) || 0) : (parseFloat(amount) || 0);
    if (isNaN(amount) || amount < 100000) {
      return { success: false, message: 'Số tiền nộp thêm tối thiểu là 100.000 VNĐ' };
    }

    const sourceAcc = freshCust.accounts.find(a => a.accountNo === sourceAccountNo);
    if (!sourceAcc) return { success: false, message: 'Tài khoản trích tiền không hợp lệ' };
    if (sourceAcc.balance < amount) {
      return { success: false, message: `Số dư tài khoản thanh toán không đủ. Hiện có: ${store.formatVND(sourceAcc.balance)}` };
    }

    sourceAcc.balance -= amount;
    savings.depositAmount += amount;

    const txn = {
      id: store.generateTxnId(),
      fromAccount: sourceAccountNo,
      fromName: freshCust.fullName,
      toAccount: savings.savingsNo,
      toName: `Tài Khoản Tiết Kiệm (${savings.savingsNo})`,
      amount: amount,
      fee: 0,
      type: 'TRANSFER',
      content: `Nộp thêm tiền vào tài khoản tiết kiệm không kỳ hạn ${savings.savingsNo}`,
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };
    store.data.transactions.unshift(txn);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Biến động số dư Nợ (-)',
      message: `Tài khoản ${sourceAccountNo} -${store.formatVND(amount)}. Nộp thêm tiền vào tài khoản tiết kiệm ${savings.savingsNo}`,
      amount: amount,
      balanceAfter: sourceAcc.balance,
      type: 'MONEY_OUT',
      accountNo: sourceAccountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Nộp thêm tiền vào tài khoản tiết kiệm thành công! Số dư mới: ${store.formatVND(savings.depositAmount)}`,
      savings: savings
    };
  }

  // ==========================================
  // NGHIỆP VỤ TÍN DỤNG & KHOẢN VAY (LOANS)
  // ==========================================

  /**
   * Tính toán bảng phân kỳ lịch trả nợ chuẩn ngân hàng
   * @param {number} amount - Số tiền vay gốc
   * @param {number} termMonths - Kỳ hạn vay (tháng)
   * @param {number} annualRate - Lãi suất vay (%/năm)
   * @param {string} method - 'REDUCING_BALANCE' (Dư nợ giảm dần) hoặc 'ANNUITY' (Trả góp đều)
   */
  static calculateLoanSchedule(amount, termMonths, annualRate = 8.5, method = 'REDUCING_BALANCE') {
    amount = typeof amount === 'string' ? (parseFloat(amount.replace(/\D/g, '')) || 0) : (parseFloat(amount) || 0);
    termMonths = parseInt(termMonths, 10) || 12;
    annualRate = parseFloat(annualRate) || 8.5;

    const monthlyRate = annualRate / 100 / 12;
    const schedule = [];

    if (method === 'ANNUITY') {
      // Phương pháp Trả góp đều hàng tháng (Annuity Payment)
      const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
      let remaining = amount;

      for (let month = 1; month <= termMonths; month++) {
        const interest = remaining * monthlyRate;
        const principal = monthlyPayment - interest;
        remaining -= principal;

        schedule.push({
          month: month,
          principal: Math.round(principal),
          interest: Math.round(interest),
          totalPayment: Math.round(monthlyPayment),
          remainingBalance: Math.max(0, Math.round(remaining))
        });
      }

      return {
        totalPrincipal: amount,
        totalInterest: schedule.reduce((sum, item) => sum + item.interest, 0),
        totalAmountPaid: schedule.reduce((sum, item) => sum + item.totalPayment, 0),
        firstMonthPayment: schedule[0] ? schedule[0].totalPayment : 0,
        monthlyPaymentFixed: Math.round(monthlyPayment),
        method: 'ANNUITY',
        schedule: schedule
      };
    } else {
      // Phương pháp Dư nợ giảm dần (Reducing Balance)
      const monthlyPrincipal = amount / termMonths;
      let remaining = amount;

      for (let month = 1; month <= termMonths; month++) {
        const interest = remaining * monthlyRate;
        const totalPayment = monthlyPrincipal + interest;
        remaining -= monthlyPrincipal;

        schedule.push({
          month: month,
          principal: Math.round(monthlyPrincipal),
          interest: Math.round(interest),
          totalPayment: Math.round(totalPayment),
          remainingBalance: Math.max(0, Math.round(remaining))
        });
      }

      return {
        totalPrincipal: amount,
        totalInterest: schedule.reduce((sum, item) => sum + item.interest, 0),
        totalAmountPaid: schedule.reduce((sum, item) => sum + item.totalPayment, 0),
        firstMonthPayment: schedule[0] ? schedule[0].totalPayment : 0,
        monthlyPaymentFixed: 0,
        method: 'REDUCING_BALANCE',
        schedule: schedule
      };
    }
  }

  /**
   * Lấy danh sách các khoản vay của khách hàng (Async: ưu tiên REST/gRPC API từ Backend)
   */
  static async getCustomerLoansAsync() {
    try {
      if (BankApiService.hasToken()) {
        const apiRes = await BankApiService.getLoans();
        if (apiRes && apiRes.success && Array.isArray(apiRes.loans || apiRes.data)) {
          const fetchedLoans = apiRes.loans || apiRes.data;
          const user = store.data.currentUser;
          const freshCust = CustomerService.findCustomer(user);
          const myLoans = fetchedLoans.map(l => ({
            id: l.id,
            customerId: l.customerId || (freshCust ? freshCust.id : ''),
            customerName: l.customerName || (freshCust ? freshCust.fullName : ''),
            accountNo: l.accountNo,
            loanType: l.loanType,
            title: l.title,
            principalAmount: parseFloat(l.principalAmount) || 0,
            remainingBalance: parseFloat(l.remainingBalance) || 0,
            termMonths: parseInt(l.termMonths, 10) || 12,
            interestRate: parseFloat(l.interestRate) || 0,
            monthlyPayment: parseFloat(l.monthlyPayment) || 0,
            nextDueDate: l.nextDueDate,
            status: l.status,
            contractNo: l.contractNo,
            installmentPaidCount: parseInt(l.installmentPaidCount, 10) || 0,
            appliedAt: l.appliedAt
          }));
          if (freshCust) {
            const otherLoans = (store.data.loans || []).filter(l => l.customerId !== freshCust.id);
            store.data.loans = [...otherLoans, ...myLoans];
            store.saveData();
          }
          return myLoans;
        }
      }
    } catch (err) {
      console.warn('[Loan] Không thể fetch danh sách khoản vay từ backend, dùng local:', err);
    }
    return CustomerService.getCustomerLoans();
  }

  /**
   * Lấy danh sách các khoản vay của khách hàng (Local Store)
   */
  static getCustomerLoans() {
    const user = store.data.currentUser;
    if (!user) return [];
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return [];

    return (store.data.loans || []).filter(l => l.customerId === freshCust.id);
  }

  /**
   * Đăng ký khoản vay vốn trực tuyến sát thực tế ngân hàng
   */
  /**
   * Lấy lãi suất tiết kiệm trực tuyến theo kỳ hạn từ cấu hình của hệ thống
   */
  static getSavingsInterestRate(termMonths) {
    const t = parseInt(termMonths, 10);
    const rates = store.data.savingsInterestRates || [];
    if (isNaN(t) || t === 0) {
      const kkh = rates.find(r => (r.term === 0 || r.termMonths === 0));
      return kkh ? Number(kkh.rate || kkh.interestRate || 0.2) : 0.2;
    }
    const found = rates.find(r => (r.term === t || r.termMonths === t));
    if (found) return Number(found.rate || found.interestRate || found.annualRate || 6.5);
    return 6.5;
  }

  /**
   * Lấy biểu lãi suất cho vay tín dụng trực tiếp từ Backend REST API (CSDL)
   */
  static async getLoanInterestRatesAsync() {
    try {
      const apiRes = await BankApiService.getLoanInterestRates();
      const rates = (apiRes && apiRes.success && apiRes.data) ? apiRes.data : (apiRes && apiRes.rates ? apiRes.rates : null);
      if (apiRes && apiRes.success && rates && typeof rates === 'object' && Object.keys(rates).length > 0) {
        store.data.loanInterestRates = rates;
        if (store.data.loanPackages && Array.isArray(store.data.loanPackages)) {
          store.data.loanPackages.forEach(pkg => {
            if (rates[pkg.id]) {
              const vals = Object.values(rates[pkg.id]).map(Number).filter(v => !isNaN(v) && v > 0);
              if (vals.length > 0) pkg.baseRate = Math.min(...vals);
            }
          });
        }
        store.saveData();
        return rates;
      }
    } catch (err) {
      console.error('[Loan] Lỗi tải biểu lãi suất cho vay từ CSDL backend:', err);
    }
    return store.data.loanInterestRates || {
      CONSUMER: { 6: 8.90, 12: 9.50, 24: 10.50, 36: 11.50, 48: 12.00, 60: 12.50 },
      CAR: { 12: 7.80, 24: 8.20, 36: 8.50, 48: 8.90, 60: 9.20, 84: 9.80 },
      MORTGAGE: { 36: 6.80, 60: 7.50, 120: 8.20, 180: 8.60, 240: 8.90 },
      BUSINESS: { 6: 6.80, 12: 7.50, 24: 7.80, 36: 8.00, 60: 8.40, 120: 8.80 }
    };
  }

  /**
   * Tính lãi suất cho vay chuẩn xác theo Gói sản phẩm tín dụng và Kỳ hạn vay
   */
  static getLoanInterestRate(loanType, termMonths) {
    const t = parseInt(termMonths, 10) || 12;
    const defaultRates = {
      CONSUMER: { 6: 8.90, 12: 9.50, 24: 10.50, 36: 11.50, 48: 12.00, 60: 12.50 },
      CAR: { 12: 7.80, 24: 8.20, 36: 8.50, 48: 8.90, 60: 9.20, 84: 9.80 },
      MORTGAGE: { 36: 6.80, 60: 7.50, 120: 8.20, 180: 8.60, 240: 8.90 },
      BUSINESS: { 6: 6.80, 12: 7.50, 24: 7.80, 36: 8.00, 60: 8.40, 120: 8.80 }
    };
    const allRates = store.data.loanInterestRates || defaultRates;
    const pkgRates = allRates[loanType] || defaultRates[loanType] || defaultRates.CONSUMER;
    if (pkgRates) {
      if (pkgRates[t] !== undefined) return parseFloat(pkgRates[t]);
      if (pkgRates[String(t)] !== undefined) return parseFloat(pkgRates[String(t)]);
      const terms = Object.keys(pkgRates).map(Number).sort((a, b) => a - b);
      if (terms.length > 0) {
        let bestTerm = terms[0];
        for (const k of terms) {
          if (k <= t) bestTerm = k;
        }
        return parseFloat(pkgRates[bestTerm]);
      }
    }
    return 10.50;
  }

  /**
   * Đăng ký khoản vay vốn trực tuyến (Async: ưu tiên REST/gRPC API từ Backend)
   */
  static async applyLoanAsync(params) {
    try {
      if (BankApiService.hasToken()) {
        const rawAmount = typeof params.amount === 'string' ? parseFloat(params.amount.replace(/\D/g, '')) : parseFloat(params.amount);
        const rawTerm = parseInt(params.termMonths, 10) || 12;
        const apiRes = await BankApiService.applyLoan(
          params.accountNo,
          params.loanType,
          params.title,
          rawAmount,
          rawTerm
        );
        if (apiRes && apiRes.success) {
          const loanData = apiRes.loan || apiRes.data;
          if (loanData) {
            store.data.loans = store.data.loans || [];
            store.data.loans.unshift(loanData);
            store.saveData();
          }
          if (window.updateNotificationBadge) window.updateNotificationBadge();
          return { success: true, message: apiRes.message || 'Nộp hồ sơ vay vốn thành công!', loan: loanData };
        } else if (apiRes && !apiRes.success) {
          return { success: false, message: apiRes.message || 'Nộp hồ sơ vay vốn thất bại' };
        }
      }
    } catch (e) {
      console.error('[Loan] Lỗi nộp hồ sơ vay trên CSDL:', e);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (e.message || 'Không thể nộp hồ sơ vay') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Đăng ký khoản vay vốn trực tuyến (Local Store Fallback)
   */
  static applyLoan({ accountNo, loanType, title, amount, termMonths, income, incomeSource, collateral, purpose, repaymentMethod }) {
    const user = store.data.currentUser;
    if (!user) return { success: false, message: 'Vui lòng đăng nhập' };

    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    amount = typeof amount === 'string' ? (parseFloat(amount.replace(/\D/g, '')) || 0) : (parseFloat(amount) || 0);
    income = typeof income === 'string' ? (parseFloat(income.replace(/\D/g, '')) || 0) : (parseFloat(income) || 0);
    termMonths = parseInt(termMonths, 10) || 12;
    repaymentMethod = repaymentMethod || 'REDUCING_BALANCE';

    if (isNaN(amount) || amount < 10000000) {
      return { success: false, message: 'Số tiền đăng ký vay tối thiểu từ 10.000.000 VNĐ' };
    }

    const acc = freshCust.accounts.find(a => a.accountNo === accountNo) || freshCust.accounts[0];
    if (!acc) return { success: false, message: 'Vui lòng chọn tài khoản nhận giải ngân hợp lệ' };

    // Tính lãi suất chuẩn theo gói vay và kỳ hạn
    const packages = store.data.loanPackages || [];
    const pkg = packages.find(p => p.id === loanType) || { baseRate: 8.5, name: 'Vay Tiêu Dùng' };
    const interestRate = CustomerService.getLoanInterestRate(loanType, termMonths);

    const calc = CustomerService.calculateLoanSchedule(amount, termMonths, interestRate, repaymentMethod);

    const effectiveIncome = income > 0 ? income : 25000000;
    const contractNo = 'HDTD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    const loanObj = {
      id: 'LOAN-' + Math.floor(1000 + Math.random() * 9000),
      contractNo: contractNo,
      customerId: freshCust.id,
      customerName: freshCust.fullName,
      accountNo: acc.accountNo,
      loanType: loanType || 'CONSUMER',
      title: title || `${pkg.name} - ${store.formatVND(amount)}`,
      principalAmount: amount,
      remainingBalance: amount,
      termMonths: termMonths,
      interestRate: interestRate,
      repaymentMethod: repaymentMethod,
      monthlyPayment: calc.firstMonthPayment,
      nextDueDate: 'Chờ thẩm định giải ngân',
      installmentPaidCount: 0,
      status: 'PENDING',
      appliedAt: store.nowGMT7String(),
      approvedAt: null,
      approvedBy: null,
      income: effectiveIncome,
      incomeSource: incomeSource || 'Lương chuyển khoản / Thu nhập cá nhân',
      collateral: collateral || 'Không (Tín chấp)',
      purpose: purpose || 'Nhu cầu chi tiêu & đầu tư cá nhân',
      rejectionReason: ''
    };

    if (!store.data.loans) store.data.loans = [];
    store.data.loans.unshift(loanObj);

    store.addAuditLog(user.username, `Nộp hồ sơ vay vốn [${loanObj.id} - ${contractNo}]: ${store.formatVND(amount)}, Kỳ hạn: ${termMonths} tháng`);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Hồ sơ tín dụng mới',
      message: `Đã nộp hồ sơ vay vốn [${loanObj.id}]: ${store.formatVND(amount)}. Đang chờ thẩm định`,
      amount: amount,
      type: 'SYSTEM',
      accountNo: acc.accountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Đã nộp hồ sơ xin vay vốn [Mã: ${loanObj.id} | HĐ: ${contractNo}] thành công! Cán bộ tín dụng QuangTrung Bank sẽ tiếp nhận và thẩm định trong 24h.`,
      loan: loanObj
    };
  }

  /**
   * Trả nợ định kỳ hoặc tất toán khoản vay trước hạn (Thực thi trực tiếp trên CSDL Backend)
   */
  static async payLoanInstallmentAsync({ loanId, isPayOffAll = false, idempotencyKey = null }) {
    try {
      if (BankApiService.hasToken()) {
        const apiRes = await BankApiService.payLoan(loanId, isPayOffAll, idempotencyKey);
        if (apiRes && apiRes.success) {
          // Đồng bộ lại local data nếu có
          const user = store.data.currentUser;
          const freshCust = CustomerService.findCustomer(user);
          if (freshCust) {
            const loan = (store.data.loans || []).find(l => l.id === loanId || l.contractNo === loanId);
            if (loan && apiRes.data) {
              loan.remainingBalance = apiRes.data.remainingBalance !== undefined ? apiRes.data.remainingBalance : (isPayOffAll ? 0 : loan.remainingBalance);
              loan.status = apiRes.data.status || (isPayOffAll ? 'PAID_OFF' : loan.status);
              if (apiRes.data.installmentPaidCount !== undefined) {
                loan.installmentPaidCount = apiRes.data.installmentPaidCount;
              }
            }
            if (apiRes.data && apiRes.data.accountBalance !== undefined) {
              const payAcc = freshCust.accounts.find(a => a.accountNo === (loan ? loan.accountNo : '')) || freshCust.accounts.find(a => a.type === 'PAYMENT');
              if (payAcc) payAcc.balance = apiRes.data.accountBalance;
            }
            store.saveData();
          }

          if (window.updateNotificationBadge) window.updateNotificationBadge();
          return { success: true, message: apiRes.message || 'Thanh toán thành công!', data: apiRes.data };
        } else if (apiRes && !apiRes.success) {
          return { success: false, message: apiRes.message || 'Thanh toán khoản vay thất bại' };
        }
      }
    } catch (err) {
      console.error('[Loan] Lỗi thanh toán khoản vay trên CSDL:', err);
      return { success: false, message: 'Lỗi kết nối máy chủ CSDL: ' + (err.message || 'Không thể thanh toán khoản vay') };
    }
    return { success: false, message: 'Không thể kết nối máy chủ CSDL' };
  }

  /**
   * Trả nợ định kỳ hoặc tất toán khoản vay trước hạn (Local Store Fallback)
   */
  static payLoanInstallment(loanId, isPayOffAll = false) {
    const user = store.data.currentUser;
    if (!user) return { success: false, message: 'Vui lòng đăng nhập' };

    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const loan = (store.data.loans || []).find(l => l.id === loanId && l.customerId === freshCust.id);
    if (!loan) return { success: false, message: 'Khoản vay không tồn tại' };
    if (loan.status !== 'ACTIVE') return { success: false, message: 'Khoản vay hiện không trong trạng thái hoạt động' };

    const payAcc = freshCust.accounts.find(a => a.accountNo === loan.accountNo) || freshCust.accounts.find(a => a.type === 'PAYMENT');
    if (!payAcc) return { success: false, message: 'Không tìm thấy tài khoản trích nợ' };

    // Tính toán số tiền phải trả
    let payAmount = 0;
    let penaltyFee = 0;

    if (isPayOffAll) {
      // Phí phạt tất toán trước hạn (1.5% trên số dư nợ còn lại)
      penaltyFee = Math.round(loan.remainingBalance * 0.015);
      payAmount = loan.remainingBalance + penaltyFee;
    } else {
      payAmount = Math.min(loan.monthlyPayment, loan.remainingBalance);
    }

    if (payAcc.balance < payAmount) {
      return {
        success: false,
        message: `Số dư tài khoản không đủ để thanh toán nợ. Cần: ${store.formatVND(payAmount)} ${penaltyFee > 0 ? `(Gồm ${store.formatVND(penaltyFee)} phí phạt tất toán trước hạn 1.5%)` : ''}, Hiện có: ${store.formatVND(payAcc.balance)}`
      };
    }

    payAcc.balance -= payAmount;
    
    if (isPayOffAll) {
      loan.remainingBalance = 0;
      loan.status = 'PAID_OFF';
      loan.nextDueDate = 'Đã tất toán';
    } else {
      // Trừ vào dư nợ gốc
      const monthlyPrincipal = Math.round(loan.principalAmount / loan.termMonths);
      loan.remainingBalance = Math.max(0, loan.remainingBalance - monthlyPrincipal);
      loan.installmentPaidCount = (loan.installmentPaidCount || 0) + 1;
      if (loan.remainingBalance <= 0 || loan.installmentPaidCount >= loan.termMonths) {
        loan.remainingBalance = 0;
        loan.status = 'PAID_OFF';
        loan.nextDueDate = 'Đã tất toán';
      } else {
        const baseDisburseDate = loan.approvedAt || loan.appliedAt || store.nowGMT7String();
        loan.nextDueDate = store.getLoanInstallmentDueDate(baseDisburseDate, loan.installmentPaidCount + 1);
      }
    }

    // Lịch sử giao dịch
    const txn = {
      id: store.generateTxnId(),
      fromAccount: payAcc.accountNo,
      fromName: freshCust.fullName,
      toAccount: loan.contractNo || loan.id,
      toName: `QuangTrung Bank - Thu nợ ${loan.contractNo || loan.id}`,
      amount: payAmount,
      fee: penaltyFee,
      type: 'LOAN_REPAYMENT',
      content: isPayOffAll ? `Tất toán toàn bộ hợp đồng tín dụng ${loan.contractNo || loan.id}` : `Thanh toán kỳ nợ số ${(loan.installmentPaidCount || 1)} hợp đồng ${loan.contractNo || loan.id}`,
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };
    store.data.transactions.unshift(txn);

    store.addAuditLog(user.username, `Thanh toán ${isPayOffAll ? 'tất toán' : 'kỳ nợ'} khoản vay [${loan.id} | ${loan.contractNo}]: ${store.formatVND(payAmount)}`);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Biến động số dư Nợ (-)',
      message: `Tài khoản ${payAcc.accountNo} -${store.formatVND(payAmount)}. ${isPayOffAll ? 'Tất toán hợp đồng' : 'Thanh toán kỳ nợ'} ${loan.contractNo || loan.id}`,
      amount: payAmount,
      balanceAfter: payAcc.balance,
      type: 'MONEY_OUT',
      accountNo: payAcc.accountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Thanh toán ${isPayOffAll ? 'tất toán toàn bộ' : 'kỳ nợ'} thành công ${store.formatVND(payAmount)}! Dư nợ gốc còn lại: ${store.formatVND(loan.remainingBalance)}`
    };
  }

  /**
   * Lấy dữ liệu Hợp đồng tín dụng điện tử chi tiết
   */
  static getLoanContractData(loanId) {
    const loan = (store.data.loans || []).find(l => l.id === loanId);
    if (!loan) return null;

    const cust = store.data.customers.find(c => c.id === loan.customerId) || {};
    const pkg = (store.data.loanPackages || []).find(p => p.id === loan.loanType) || { name: 'Vay Tiêu Dùng' };

    return {
      loan: loan,
      customer: cust,
      package: pkg,
      contractNo: loan.contractNo || ('HDTD-2026-' + loan.id.replace(/\D/g, '')),
      bankName: 'NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN QUANGTRUNG (QUANGTRUNG BANK)',
      headquarters: 'Tòa nhà Landmark 88, Phố Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh'
    };
  }

  // ==========================================
  // NGHIỆP VỤ DANH BẠ THỤ HƯỞNG (BENEFICIARIES)
  // ==========================================

  /**
   * Thêm danh bạ thụ hưởng
   */
  static saveBeneficiary({ accountNo, name, bankName, nickname }) {
    const user = store.data.currentUser;
    if (!user) return { success: false, message: 'Vui lòng đăng nhập' };

    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    if (!store.data.beneficiaries) store.data.beneficiaries = [];
    const exists = store.data.beneficiaries.find(b => b.customerId === freshCust.id && b.accountNo === accountNo);
    if (exists) return { success: false, message: 'Số tài khoản này đã có trong Danh bạ thụ hưởng' };

    const newBen = {
      id: 'BENEF-' + Math.floor(1000 + Math.random() * 9000),
      customerId: freshCust.id,
      accountNo: accountNo,
      name: name,
      bankName: bankName || 'QuangTrung Bank',
      nickname: nickname || name
    };
    store.data.beneficiaries.push(newBen);
    store.saveData();

    return { success: true, message: `Lưu người thụ hưởng ${name} (${accountNo}) vào danh bạ thành công!`, beneficiary: newBen };
  }

  static getBeneficiaries() {
    const user = store.data.currentUser;
    if (!user) return [];
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return [];

    return (store.data.beneficiaries || []).filter(b => b.customerId === freshCust.id);
  }

  static deleteBeneficiary(benefId) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    store.data.beneficiaries = (store.data.beneficiaries || []).filter(b => b.id !== benefId);
    store.saveData();
    return { success: true, message: 'Đã xóa người thụ hưởng khỏi danh bạ' };
  }

  // ==========================================
  /**
   * Cập nhật hạn mức ngày, hạn mức lần & Đổi mã PIN thẻ
   */
  static updateCardLimitsAndPin({ cardNumber, dailyLimit, perTxnLimit, newPin }) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const card = freshCust.cards.find(c => c.cardNumber === cardNumber || c.maskedNumber === cardNumber);
    if (!card) return { success: false, message: 'Thẻ ngân hàng không tồn tại' };

    if (dailyLimit !== undefined && dailyLimit !== null && dailyLimit !== '') {
      card.dailyLimit = parseFloat(String(dailyLimit).replace(/\D/g, '')) || card.dailyLimit;
    }
    if (perTxnLimit !== undefined && perTxnLimit !== null && perTxnLimit !== '') {
      card.perTxnLimit = parseFloat(String(perTxnLimit).replace(/\D/g, '')) || card.perTxnLimit;
    }
    if (newPin) {
      card.pin = newPin;
    }

    store.addAuditLog(user.username, `Cập nhật cấu hình Thẻ ${card.cardNumber}: Hạn mức ngày ${store.formatVND(card.dailyLimit || 0)}`);
    store.saveData();

    return { success: true, message: 'Cập nhật hạn mức giao dịch & mã PIN thẻ thành công!' };
  }

  /**
   * Cập nhật các tính năng bảo mật thẻ (E-commerce, Contactless, International, ATM)
   */
  static updateCardSecuritySettings({ cardNumber, onlinePayment, contactless, internationalPayment, atmWithdrawal }) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const card = freshCust.cards.find(c => c.cardNumber === cardNumber || c.maskedNumber === cardNumber);
    if (!card) return { success: false, message: 'Thẻ ngân hàng không tồn tại' };

    if (onlinePayment !== undefined) card.onlinePayment = Boolean(onlinePayment);
    if (contactless !== undefined) card.contactless = Boolean(contactless);
    if (internationalPayment !== undefined) card.internationalPayment = Boolean(internationalPayment);
    if (atmWithdrawal !== undefined) card.atmWithdrawal = Boolean(atmWithdrawal);

    store.addAuditLog(user.username, `Cập nhật tính năng bảo mật cho Thẻ [${card.cardNumber}]`);
    store.saveData();

    return { success: true, message: 'Cập nhật cấu hình bảo mật thẻ thành công!' };
  }

  /**
   * Lấy danh sách giao dịch qua thẻ
   */
  static getCardTransactions(cardNumber) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return [];

    const card = freshCust.cards.find(c => c.cardNumber === cardNumber || c.maskedNumber === cardNumber);
    const cleanCardNo = card ? card.cardNumber.replace(/\D/g, '') : (cardNumber || '').replace(/\D/g, '');

    const allTxns = store.data.transactions || [];
    return allTxns.filter(t => {
      if (t.cardNumber) {
        const tCardNo = t.cardNumber.replace(/\D/g, '');
        if (cleanCardNo && tCardNo.includes(cleanCardNo.slice(-4))) return true;
        if (cleanCardNo && cleanCardNo.includes(tCardNo.slice(-4))) return true;
      }
      // Giao dịch thẻ theo loại
      if ((t.type === 'CARD_POS' || t.type === 'CARD_ATM') && freshCust.accounts.some(a => a.accountNo === t.fromAccount)) {
        return true;
      }
      return false;
    });
  }

  /**
   * Phát hành thẻ mới / thẻ ảo online cho khách hàng
   */
  static issueNewCard({ cardType, linkedAccountNo, dailyLimit, cardPin }) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const prefix = cardType.includes('VISA') ? '4532' : (cardType.includes('MASTERCARD') ? '5421' : '9704');
    const randomMid = Math.floor(1000 + Math.random() * 9000);
    const randomMid2 = Math.floor(1000 + Math.random() * 9000);
    const randomLast = Math.floor(1000 + Math.random() * 9000);
    const fullCardNumber = `${prefix}${randomMid}${randomMid2}${randomLast}`;
    const maskedNumber = `${prefix} •••• •••• ${randomLast}`;
    const cvv = String(Math.floor(100 + Math.random() * 900));

    const expMonth = ('0' + (new Date().getMonth() + 1)).slice(-2);
    const expYear = String((new Date().getFullYear() + 5)).slice(-2);
    const expDate = `${expMonth}/${expYear}`;

    const newCard = {
      id: 'CARD-' + Date.now(),
      cardNumber: fullCardNumber,
      maskedNumber: maskedNumber,
      cardHolder: (freshCust.fullName || user.fullName || 'CUSTOMER').toUpperCase(),
      cardType: cardType || 'VISA Platinum Debit',
      expDate: expDate,
      cvv: cvv,
      pin: cardPin || '123456',
      status: 'ACTIVE',
      dailyLimit: dailyLimit ? parseFloat(String(dailyLimit).replace(/\D/g, '')) : 50000000,
      perTxnLimit: 20000000,
      onlinePayment: true,
      contactless: true,
      internationalPayment: !cardType.includes('NAPAS'),
      atmWithdrawal: true,
      linkedAccountNo: linkedAccountNo || freshCust.accounts[0]?.accountNo || '1000123456',
      issuedAt: store.todayGMT7String()
    };

    if (!freshCust.cards) freshCust.cards = [];
    freshCust.cards.push(newCard);

    store.addAuditLog(user.username, `Phát hành thẻ mới [${newCard.cardType} - ${newCard.maskedNumber}] liên kết TK ${newCard.linkedAccountNo}`);
    store.saveData();

    return {
      success: true,
      message: `Phát hành ${newCard.cardType} thành công! Thẻ đã sẵn sàng giao dịch ngay lập tức.`,
      data: newCard
    };
  }

  /**
   * Khóa / Mở khóa thẻ khẩn cấp
   */
  static toggleCardStatus(cardNumber) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    const card = freshCust.cards.find(c => c.cardNumber === cardNumber || c.maskedNumber === cardNumber);
    if (!card) return { success: false, message: 'Thẻ ngân hàng không tồn tại' };

    card.status = card.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    store.addAuditLog(user.username, `Thay đổi trạng thái Thẻ ${card.cardNumber} thành ${card.status}`);
    store.saveData();

    return {
      success: true,
      message: `Đã ${card.status === 'ACTIVE' ? 'MỞ KHÓA' : 'KHÓA TẠM THỜI'} thẻ thành công!`,
      status: card.status
    };
  }

  /**
   * Tạo dữ liệu Sao kê điện tử (E-Statement) từ Backend REST API (hoặc LocalStore fallback)
   */
  static async generateEStatementDataAsync(accountNo, fromDate, toDate) {
    try {
      const apiRes = await BankApiService.getEStatement(accountNo, fromDate, toDate);
      if (apiRes && apiRes.success && apiRes.data) {
        const stmt = apiRes.data;
        const txns = (stmt.transactions || []).map(t => {
          let timestampStr = store.nowGMT7String();
          if (t.timestamp) {
            if (typeof t.timestamp === 'string') {
              timestampStr = t.timestamp.replace('T', ' ').substring(0, 19);
            } else if (Array.isArray(t.timestamp)) {
              const [y, m, d, h, min, s] = t.timestamp;
              const pad = (n) => String(n).padStart(2, '0');
              timestampStr = `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:${pad(s || 0)}`;
            }
          }
          return {
            id: t.id,
            fromAccount: t.fromAccount,
            fromName: t.fromName || 'Chủ tài khoản',
            toAccount: t.toAccount,
            toName: t.toName || 'Người nhận',
            amount: parseFloat(t.amount),
            type: t.type || 'TRANSFER',
            content: t.content || '',
            timestamp: timestampStr,
            status: t.status || 'SUCCESS'
          };
        });

        return {
          customer: {
            fullName: stmt.customerName,
            idCard: stmt.idCard,
            phone: stmt.phone
          },
          account: {
            accountNo: stmt.accountNo,
            type: stmt.accountType,
            balance: stmt.currentBalance
          },
          transactions: txns,
          fromDate: stmt.fromDate,
          toDate: stmt.toDate,
          totalIn: parseFloat(stmt.totalIn || 0),
          totalOut: parseFloat(stmt.totalOut || 0),
          generatedAt: stmt.generatedAt,
          statementRef: stmt.statementRef
        };
      }
    } catch (e) {
      console.error('[CustomerService] Lỗi tạo sao kê điện tử từ CSDL backend:', e);
    }

    return null;
  }

  /**
   * Tạo dữ liệu Sao kê điện tử từ LocalStore
   */
  static generateEStatementData(accountNo, fromDate, toDate) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return null;

    const acc = freshCust.accounts.find(a => a.accountNo === accountNo) ||
                (store.data.savingsAccounts || []).find(s => s.savingsNo === accountNo);
    if (!acc) return null;

    let txns = (store.data.transactions || []).filter(t => t.fromAccount === accountNo || t.toAccount === accountNo);

    if (fromDate) {
      txns = txns.filter(t => (t.timestamp || '').substring(0, 10) >= fromDate);
    }
    if (toDate) {
      txns = txns.filter(t => (t.timestamp || '').substring(0, 10) <= toDate);
    }

    const totalIn = txns.filter(t => t.toAccount === accountNo).reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOut = txns.filter(t => t.fromAccount === accountNo).reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      customer: freshCust,
      account: acc,
      transactions: txns,
      fromDate: fromDate || 'Tất cả',
      toDate: toDate || 'Hôm nay',
      totalIn: totalIn,
      totalOut: totalOut,
      generatedAt: new Date().toLocaleString('vi-VN'),
      statementRef: 'ESTM-' + Math.floor(100000 + Math.random() * 900000)
    };
  }

  /**
   * Xuất file Excel (.csv với UTF-8 BOM) cho dữ liệu Sao kê tài khoản
   */
  static exportStatementToExcel(data) {
    if (!data || !data.account) return false;

    const rows = [];

    // Header Metadata
    rows.push(['NGÂN HÀNG TMCP QUANGTRUNG (QUANGTRUNG DIGITAL BANK)']);
    rows.push(['BẢN SAO KÊ TÀI KHOẢN ĐIỆN TỬ (E-STATEMENT)']);
    rows.push([`Thời gian in: ${data.generatedAt}`]);
    rows.push([]);
    rows.push([`Chủ tài khoản: ${data.customer.fullName || data.customer.customerName}`, `Số CCCD/CMND: ${data.customer.idCard || '-'}`, `Số điện thoại: ${data.customer.phone || '-'}`]);
    rows.push([`Số tài khoản: ${data.account.accountNo}`, `Loại tài khoản: ${data.account.type || 'PAYMENT'}`, `Số dư hiện tại: ${data.account.balance} VNĐ`]);
    rows.push([`Từ ngày: ${data.fromDate || 'Tất cả'}`, `Đến ngày: ${data.toDate || 'Hôm nay'}`, `Tổng tiền vào (+): ${data.totalIn} VNĐ`, `Tổng tiền ra (-): ${data.totalOut} VNĐ`]);
    rows.push([]);

    // Table Column Headers
    rows.push(['Thời gian', 'Mã Giao Dịch', 'Tài Khoản Gửi', 'Tên Người Gửi', 'Tài Khoản Nhận', 'Tên Người Nhận', 'Loại GD', 'Nội Dung', 'Phát Sinh Có (+ VNĐ)', 'Phát Sinh Nợ (- VNĐ)', 'Trạng Thái']);

    // Data rows
    (data.transactions || []).forEach(t => {
      const isOut = t.fromAccount === data.account.accountNo;
      rows.push([
        t.timestamp,
        t.id,
        t.fromAccount,
        t.fromName || '',
        t.toAccount,
        t.toName || '',
        CustomerService.getTransactionTypeLabel(t, [data.account.accountNo]),
        `"${(t.content || '').replace(/"/g, '""')}"`,
        isOut ? '0' : t.amount,
        isOut ? t.amount : '0',
        t.status || 'SUCCESS'
      ]);
    });

    // Format CSV content
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const fileName = `SaoKe_QuangTrungBank_${data.account.accountNo}_${data.fromDate || 'ALL'}_${data.toDate || 'TODAY'}.csv`;

    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, fileName);
    } else {
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // PUSH NOTIFICATION & NOTIFICATION CENTER HELPER METHODS
  // ═══════════════════════════════════════════════════════════

  static lastGetNotifTime = 0;
  static cachedNotifs = null;
  static pendingGetNotifsPromise = null;

  /**
   * Lấy danh sách thông báo biến động số dư trực tiếp từ CSDL Backend REST API
   * Có cơ chế Deduplication & Throttle 1.5s chống spam request kép tới Backend
   */
  static async getNotificationsAsync(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && CustomerService.cachedNotifs && (now - CustomerService.lastGetNotifTime < 1500)) {
      return CustomerService.cachedNotifs;
    }
    if (!forceRefresh && CustomerService.pendingGetNotifsPromise) {
      return CustomerService.pendingGetNotifsPromise;
    }

    CustomerService.pendingGetNotifsPromise = (async () => {
      try {
        const res = await BankApiService.getNotifications();
        if (res && res.success && res.data) {
          CustomerService.cachedNotifs = res.data;
          CustomerService.lastGetNotifTime = Date.now();
          return res.data;
        }
      } catch (e) {
        console.error('[CustomerService] Lỗi tải thông báo từ CSDL:', e);
      } finally {
        CustomerService.pendingGetNotifsPromise = null;
      }
      return [];
    })();

    return CustomerService.pendingGetNotifsPromise;
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  static async markNotificationReadAsync(id) {
    try {
      await BankApiService.markNotificationRead(id);
    } catch (e) {
      console.error('[CustomerService] Lỗi đánh dấu đã đọc thông báo trên CSDL:', e);
    }
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  static async markAllNotificationsReadAsync() {
    try {
      await BankApiService.markAllNotificationsRead();
    } catch (e) {
      console.error('[CustomerService] Lỗi đánh dấu tất cả thông báo đã đọc trên CSDL:', e);
    }
  }

  /**
   * Phát âm thanh chuông báo Ngân hàng khi có Push Notification (Có cơ chế chống lặp âm thanh / Debounce 1.5s)
   */
  static lastChimeTime = 0;

  static playNotificationChime() {
    try {
      const nowMs = Date.now();
      if (CustomerService.lastChimeTime && (nowMs - CustomerService.lastChimeTime < 1500)) {
        return; // Đang trong khoảng cách an toàn, chỉ phát đúng 1 sound thông báo
      }
      CustomerService.lastChimeTime = nowMs;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      // Audio play blocked or not supported
    }
  }

  /**
   * Đẩy thông báo hệ thống & biến động số dư vào Trung tâm thông báo (Đã loại bỏ popup nổi trên màn hình)
   */
  static triggerPushNotification({ title, message, amount, balanceAfter, type, accountNo, skipSaveLocal = false, skipBadgeIncrement = false }) {
    // 1. Tự động lưu vào store.data.notifications nếu khách hàng đang đăng nhập và chưa lưu từ backend
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (freshCust && !skipSaveLocal) {
      if (!store.data.notifications) store.data.notifications = [];
      const newNotif = {
        id: 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        customerId: freshCust.id,
        title: title || (amount ? (amount < 0 ? 'Biến động số dư Nợ (-)' : 'Biến động số dư Có (+)') : 'Thông báo giao dịch'),
        message: message || '',
        amount: amount !== undefined ? amount : null,
        balanceAfter: balanceAfter !== undefined ? balanceAfter : undefined,
        type: type || 'TRANSACTION',
        accountNo: accountNo || '',
        read: false,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      // Tránh trùng lặp nếu vừa thêm cùng message trong vòng 3 giây
      const existsRecent = store.data.notifications.slice(0, 3).some(n => n.message === newNotif.message);
      if (!existsRecent) {
        store.data.notifications.unshift(newNotif);
        store.saveData();
      }
    }

    // Xóa cache để luôn lấy thông báo mới nhất
    CustomerService.cachedNotifs = null;

    // Tăng giá trị của badge chuông thông báo trên thanh tiêu đề
    if (!skipBadgeIncrement) {
      const badge = document.getElementById('notif-unread-badge');
      if (badge) {
        let currentVal = parseInt(badge.textContent, 10);
        if (isNaN(currentVal) || badge.classList.contains('hidden') || badge.style.display === 'none') {
          currentVal = 0;
        }
        const newVal = currentVal + 1;
        badge.textContent = newVal > 99 ? '99+' : String(newVal);
        badge.classList.remove('hidden');
        badge.style.setProperty('display', 'inline-flex', 'important');
      }
    }
  }
}




