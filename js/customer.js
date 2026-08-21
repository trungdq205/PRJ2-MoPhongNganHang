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
    const cust = store.data.customers.find(c => 
      c.id === user.id || 
      c.username === user.username || 
      (user.customerId && c.id === user.customerId)
    ) || null;
    if (cust) {
      CustomerService.ensureCustomerCards(cust);
    }
    return cust;
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
    return freshCust ? freshCust.accounts : [];
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
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
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
          id: apiRes.transaction_id || apiRes.transactionId || ('TXN-' + Math.floor(10000 + Math.random() * 90000)),
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
          id: txnData.id || ('TXN-' + Math.floor(10000 + Math.random() * 90000)),
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
        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Nợ (-)',
          message: `Tài khoản ${fromAccNo} -${store.formatVND(amount)}. Tới: ${normalizedTxn.toName || toAccNo} (${toAccNo}). Nội dung: ${content || 'Chuyển tiền nhanh QuangTrung Bank'}`,
          amount: amount,
          balanceAfter: sourceAcc ? sourceAcc.balance : undefined,
          type: 'MONEY_OUT',
          accountNo: fromAccNo
        });
        if (window.updateNotificationBadge) window.updateNotificationBadge();
        return { success: true, message: apiRes.message || 'Chuyển tiền thành công!', source: 'backend', data: normalizedTxn };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message || 'Giao dịch chuyển tiền không thành công' };
      }
    } catch (e) {
      console.warn('[Customer] Backend transferMoney lỗi hoặc offline, fallback LocalStore:', e);
    }

    const localRes = CustomerService.transferMoney({ fromAccNo, toAccNo, amount, content, pin });
    if (localRes.success) {
      localRes.source = 'local';
      const sourceAcc = CustomerService.getCustomerAccounts().find(acc => acc.accountNo === fromAccNo);
      CustomerService.triggerPushNotification({
        title: 'Biến động số dư Nợ (-)',
        message: `Tài khoản ${fromAccNo} -${store.formatVND(amount)}. Tới: ${toAccNo}. Nội dung: ${content || 'Chuyển tiền nhanh QuangTrung Bank'}`,
        amount: amount,
        balanceAfter: sourceAcc ? sourceAcc.balance : undefined,
        type: 'MONEY_OUT',
        accountNo: fromAccNo
      });
      if (window.updateNotificationBadge) window.updateNotificationBadge();
    }
    return localRes;
  }

  /**
   * Nạp tiền vào tài khoản (Async: Backend REST API + LocalStore + Idempotency)
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
      console.warn('[Customer] Backend atmDeposit lỗi, fallback LocalStore:', e);
    }
    return CustomerService.depositMoney(accountNo, amount);
  }

  /**
   * Rút tiền tại ATM (Async: Backend REST API + LocalStore + Idempotency)
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
      console.warn('[Customer] Backend atmWithdraw lỗi, fallback LocalStore:', e);
    }
    return CustomerService.withdrawMoney(accountNo, amount);
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
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
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
    if (!freshCust) return [];

    const customerAccNos = (freshCust.accounts || []).map(a => a.accountNo);
    const savingsNos = (store.data.savingsAccounts || [])
      .filter(s => s.customerId === freshCust.id)
      .map(s => s.savingsNo);
    const allUserAccs = [...customerAccNos, ...savingsNos];

    const list = store.data.transactions.filter(t => {
      if (accountNo && accountNo !== 'ALL') {
        return t.fromAccount === accountNo || t.toAccount === accountNo;
      }
      return allUserAccs.includes(t.fromAccount) || allUserAccs.includes(t.toAccount);
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
      const freshCust = CustomerService.findCustomer(user);
      if (freshCust && freshCust.accounts.length > 0) {
        // Đồng bộ qua endpoint lịch sử có phân trang/lọc
        const apiRes = await BankApiService.getHistoryFiltered({
          accountNo: (accountNo && accountNo !== 'ALL') ? accountNo : null,
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
        if ((t.type || 'TRANSFER').toUpperCase() !== params.type.toUpperCase()) return false;
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

    // 1. Thử gọi backend API (chỉ khi có JWT token)
    if (BankApiService.hasToken()) {
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
        }
      } catch (e) {
        console.warn('[Customer] Lookup backend failed, falling back to local store', e);
      }
    }

    // 2. Fallback sang LocalStore
    let foundAcc = null;
    let foundCust = null;
    for (const cust of store.data.customers) {
      const acc = cust.accounts.find(a => a.accountNo === accountNo.trim());
      if (acc) {
        foundAcc = acc;
        foundCust = cust;
        break;
      }
    }

    if (foundAcc && foundCust) {
      return {
        success: true,
        data: {
          accountNo: foundAcc.accountNo,
          fullName: foundCust.fullName,
          bankName: 'Ngân hàng TMCP QuangTrung Bank',
          status: foundAcc.status,
          type: foundAcc.type
        }
      };
    }

    return { success: false, message: 'Tài khoản người nhận không tồn tại trên hệ thống' };
  }

  /**
   * Cập nhật thông tin liên hệ Email (Async: Ưu tiên Backend REST API + MySQL, Fallback LocalStore)
   * Thông tin nhân thân (SĐT, Địa chỉ, Họ tên, CCCD) bị khóa, chỉ cập nhật tại quầy.
   */
  static async updateProfileAsync({ email }) {
    if (!email || email.trim() === '') {
      return { success: false, message: 'Vui lòng nhập địa chỉ Email liên hệ hợp lệ.' };
    }

    // 1. Thử gọi backend REST API (Spring Boot / MySQL DB)
    try {
      const apiResult = await BankApiService.updateProfile(email);
      if (apiResult && apiResult.success) {
        const user = store.data.currentUser;
        const freshCust = CustomerService.findCustomer(user);
        if (freshCust) freshCust.email = email;
        if (user) user.email = email;

        store.addAuditLog(user ? user.username : 'khách hàng', 'Cập nhật email liên hệ thành công qua Backend REST API (MySQL DB)');
        store.saveData();

        return { success: true, message: apiResult.message || 'Cập nhật email liên hệ thành công!', source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message || 'Cập nhật thất bại' };
      }
    } catch (e) {
      console.warn('[Customer] Backend updateProfile lỗi, fallback sang LocalStore', e);
    }

    // 2. Fallback sang LocalStore nếu backend không khả dụng
    return CustomerService.updateProfile({ email });
  }

  /**
   * Cập nhật thông tin liên hệ trong LocalStore
   */
  static updateProfile({ email }) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Khách hàng không tồn tại' };

    if (email) {
      freshCust.email = email;
      user.email = email;
    }

    store.addAuditLog(user ? user.username : 'khách hàng', 'Cập nhật email liên hệ thành công');
    store.saveData();

    return { success: true, message: 'Cập nhật email liên hệ thành công!' };
  }

  /**
   * Đổi mật khẩu bảo mật (Async: Ưu tiên Backend REST API + BCrypt, Fallback LocalStore)
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

    // 3. Thử gọi backend REST API
    try {
      const apiResult = await BankApiService.changePassword(currentPassword, newPassword, confirmPassword);
      if (apiResult && apiResult.success) {
        const user = store.data.currentUser;
        const freshCust = CustomerService.findCustomer(user);
        if (freshCust) freshCust.password = newPassword;
        if (user) user.password = newPassword;

        store.addAuditLog(user ? user.username : 'khách hàng', 'Đổi mật khẩu thành công qua xác thực 2FA OTP & Backend REST API (MySQL DB)');
        store.saveData();

        return { success: true, message: apiResult.message || 'Đổi mật khẩu bảo mật thành công!', source: 'backend' };
      } else if (apiResult && apiResult.status && apiResult.status !== 401 && apiResult.status !== 403) {
        return { success: false, message: apiResult.message || 'Đổi mật khẩu thất bại' };
      }
    } catch (e) {
      console.warn('[Customer] Backend changePassword lỗi, fallback sang LocalStore', e);
    }

    // 4. Fallback sang LocalStore
    return CustomerService.changePassword({ currentPassword, newPassword, confirmPassword });
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

    return { success: true, message: 'Đổi mật khẩu bảo mật thành công!' };
  }

  /**
   * Gửi yêu cầu khiếu nại / hỗ trợ tới Giao dịch viên (Async: Backend REST API + LocalStore)
   */
  static async createTicketAsync(subject, content, accountNo) {
    try {
      const apiResult = await BankApiService.createTicket(subject, content, accountNo);
      if (apiResult && apiResult.success && apiResult.data) {
        const ticket = apiResult.data;
        const freshCust = CustomerService.findCustomer();
        const ticketObj = {
          id: ticket.id,
          customerId: ticket.customerId || freshCust?.id,
          customerName: ticket.customerName || freshCust?.fullName,
          accountNo: ticket.accountNo || accountNo || 'N/A',
          subject: ticket.subject,
          content: ticket.content,
          status: ticket.status || 'PENDING',
          createdAt: ticket.createdAt ? String(ticket.createdAt).replace('T', ' ').substring(0, 19) : store.nowGMT7String(),
          assignedTo: ticket.assignedTo || 'Tự động phân công',
          response: ticket.response || ''
        };
        store.data.tickets.unshift(ticketObj);
        store.addAuditLog(store.data.currentUser?.username || 'khách hàng', `Gửi đơn hỗ trợ qua Backend REST API (MySQL): ${subject}`);
        store.saveData();
        return { success: true, message: apiResult.message || 'Đã gửi yêu cầu hỗ trợ thành công!', source: 'backend', ticket: ticketObj };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Customer] Backend createTicket lỗi, fallback sang LocalStore', e);
    }
    return CustomerService.createTicket(subject, content, accountNo);
  }

  /**
   * Gửi yêu cầu khiếu nại / hỗ trợ tới Giao dịch viên
   */
  static createTicket(subject, content, accountNo) {
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Lỗi xác thực người dùng' };

    const ticket = {
      id: 'TCK-' + Math.floor(100 + Math.random() * 900),
      customerId: freshCust.id,
      customerName: freshCust.fullName,
      accountNo: accountNo || freshCust.accounts[0]?.accountNo || 'N/A',
      subject: subject,
      content: content,
      status: 'PENDING',
      createdAt: store.nowGMT7String(),
      assignedTo: 'Tự động phân công',
      response: ''
    };

    store.data.tickets.unshift(ticket);
    store.addAuditLog(user.username, `Gửi đơn hỗ trợ/khiếu nại: ${subject}`);
    store.saveData();

    return { success: true, message: 'Đã gửi yêu cầu hỗ trợ thành công. Giao dịch viên sẽ phản hồi sớm nhất!' };
  }

  /**
   * Rút tiền mặt tại bưu cục VNPOST (Async: Backend REST API + LocalStore)
   */
  static async vnpostCashWithdrawalAsync({ accountNo, amount }) {
    try {
      const apiResult = await BankApiService.vnpostWithdraw(accountNo, amount);
      if (apiResult && apiResult.success && apiResult.data) {
        const txn = apiResult.data;
        const freshCust = CustomerService.findCustomer();
        const acc = freshCust?.accounts.find(a => a.accountNo === accountNo);
        if (acc) acc.balance -= parseFloat(amount);
        store.data.transactions.unshift(txn);
        store.addAuditLog(store.data.currentUser?.username || 'khách hàng', `Rút tiền mặt VNPOST ${store.formatVND(amount)} qua Backend REST API`);
        store.saveData();

        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Nợ (-)',
          message: `Tài khoản ${accountNo} -${store.formatVND(amount)}. Rút tiền mặt tại bưu cục VNPOST`,
          amount: amount,
          balanceAfter: acc ? acc.balance : undefined,
          type: 'MONEY_OUT',
          accountNo: accountNo
        });
        if (window.updateNotificationBadge) window.updateNotificationBadge();

        return {
          success: true,
          message: apiResult.message || `Đã tạo mã rút tiền mặt VNPOST thành công!`,
          code: txn.content,
          amount: amount,
          accountNo: accountNo,
          source: 'backend'
        };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Customer] Backend vnpostWithdraw lỗi, fallback sang LocalStore', e);
    }
    return CustomerService.vnpostCashWithdrawal({ accountNo, amount });
  }

  /**
   * Chuyển tiền mặt VNPOST (Async: Backend REST API + LocalStore)
   */
  static async vnpostCashTransferAsync({ accountNo, amount, receiverName, receiverIdCard, receiverPhone, province }) {
    try {
      const apiResult = await BankApiService.vnpostTransfer(accountNo, receiverIdCard, amount, `Chuyển tiền mặt VNPOST tới ${receiverName} - CCCD: ${receiverIdCard}`);
      if (apiResult && apiResult.success && apiResult.data) {
        const txn = apiResult.data;
        const freshCust = CustomerService.findCustomer();
        const acc = freshCust?.accounts.find(a => a.accountNo === accountNo);
        if (acc) acc.balance -= parseFloat(amount);
        store.data.transactions.unshift(txn);
        store.addAuditLog(store.data.currentUser?.username || 'khách hàng', `Chuyển tiền mặt VNPOST ${store.formatVND(amount)} cho ${receiverName} qua Backend REST API`);
        store.saveData();

        CustomerService.triggerPushNotification({
          title: 'Biến động số dư Nợ (-)',
          message: `Tài khoản ${accountNo} -${store.formatVND(amount)}. Chuyển tiền mặt VNPOST tới ${receiverName}`,
          amount: amount,
          balanceAfter: acc ? acc.balance : undefined,
          type: 'MONEY_OUT',
          accountNo: accountNo
        });
        if (window.updateNotificationBadge) window.updateNotificationBadge();

        return {
          success: true,
          message: apiResult.message || `Tạo lệnh chuyển tiền mặt VNPOST thành công!`,
          receiverName,
          receiverIdCard,
          source: 'backend'
        };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Customer] Backend vnpostTransfer lỗi, fallback sang LocalStore', e);
    }
    return CustomerService.vnpostCashTransfer({ accountNo, amount, receiverName, receiverIdCard, receiverPhone, province });
  }

  /**
   * Rút tiền mặt tại bưu cục VNPOST
   */
  static vnpostCashWithdrawal({ accountNo, amount }) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) return { success: false, message: 'Số tiền không hợp lệ' };

    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Người dùng không hợp lệ' };

    const acc = freshCust.accounts.find(a => a.accountNo === accountNo);
    if (!acc) return { success: false, message: 'Tài khoản không tồn tại' };

    if (acc.balance < amount) {
      return { success: false, message: `Số dư không đủ. Số dư hiện tại: ${store.formatVND(acc.balance)}` };
    }

    acc.balance -= amount;
    const code = 'VNPOST-W-' + Math.floor(100000 + Math.random() * 900000);

    const txn = {
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
      fromAccount: accountNo,
      fromName: freshCust.fullName,
      toAccount: 'VNPOST CASH POST OFFICE',
      toName: 'Bưu cục VNPOST',
      amount: amount,
      fee: 0,
      type: 'WITHDRAW',
      content: `Rút tiền mặt tại bưu cục VNPOST (Mã rút tiền: ${code})`,
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };

    store.data.transactions.unshift(txn);
    store.addAuditLog(user.username, `Tạo mã rút tiền mặt VNPOST ${store.formatVND(amount)} - Mã: ${code}`);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Biến động số dư Nợ (-)',
      message: `Tài khoản ${accountNo} -${store.formatVND(amount)}. Tạo mã rút tiền mặt VNPOST ${code}`,
      amount: amount,
      balanceAfter: acc.balance,
      type: 'MONEY_OUT',
      accountNo: accountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Đã tạo mã rút tiền mặt thành công! Mã rút tiền: ${code}`,
      code: code,
      amount: amount,
      accountNo: accountNo
    };
  }

  /**
   * Chuyển tiền mặt qua bưu cục VNPOST tới người nhận
   */
  static vnpostCashTransfer({ accountNo, amount, receiverName, receiverIdCard, receiverPhone, province }) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) return { success: false, message: 'Số tiền không hợp lệ' };
    if (!receiverName || !receiverIdCard) return { success: false, message: 'Vui lòng nhập đầy đủ thông tin người nhận' };

    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return { success: false, message: 'Người dùng không hợp lệ' };

    const acc = freshCust.accounts.find(a => a.accountNo === accountNo);
    if (!acc) return { success: false, message: 'Tài khoản không tồn tại' };

    if (acc.balance < amount) {
      return { success: false, message: `Số dư không đủ. Số dư hiện tại: ${store.formatVND(acc.balance)}` };
    }

    acc.balance -= amount;
    const code = 'VNPOST-T-' + Math.floor(100000 + Math.random() * 900000);

    const txn = {
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
      fromAccount: accountNo,
      fromName: freshCust.fullName,
      toAccount: `VNPOST (${receiverIdCard})`,
      toName: `${receiverName} (Tiền mặt VNPOST)`,
      amount: amount,
      fee: 0,
      type: 'TRANSFER',
      content: `Chuyển tiền mặt VNPOST tới ${receiverName} - CCCD: ${receiverIdCard} (Mã: ${code})`,
      timestamp: store.nowGMT7String(),
      status: 'SUCCESS'
    };

    store.data.transactions.unshift(txn);
    store.addAuditLog(user.username, `Chuyển tiền mặt VNPOST ${store.formatVND(amount)} cho ${receiverName} (CCCD: ${receiverIdCard}) - Mã: ${code}`);
    store.saveData();

    CustomerService.triggerPushNotification({
      title: 'Biến động số dư Nợ (-)',
      message: `Tài khoản ${accountNo} -${store.formatVND(amount)}. Chuyển tiền mặt VNPOST cho ${receiverName}`,
      amount: amount,
      balanceAfter: acc.balance,
      type: 'MONEY_OUT',
      accountNo: accountNo
    });
    if (window.updateNotificationBadge) window.updateNotificationBadge();

    return {
      success: true,
      message: `Tạo lệnh chuyển tiền mặt VNPOST thành công! Mã giao dịch: ${code}`,
      code: code,
      amount: amount,
      receiverName: receiverName,
      receiverIdCard: receiverIdCard
    };
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
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Customer] Backend createAtmCode lỗi, fallback sang LocalStore', e);
    }
    return CustomerService.createAtmCode({ accountNo, type, amount, pin });
  }

  /**
   * Hủy Mã ATM chưa sử dụng (Async: Backend REST API + LocalStore)
   */
  static async cancelAtmCodeAsync(codeId) {
    try {
      const apiResult = await BankApiService.cancelAtmCode(codeId);
      if (apiResult && apiResult.success) {
        const item = (store.data.atmCodes || []).find(c => c.id === codeId || c.code === codeId);
        if (item) item.status = 'CANCELLED';
        store.addAuditLog(store.data.currentUser?.username || 'khách hàng', `Hủy mã ATM [${codeId}] qua Backend REST API`);
        store.saveData();
        return { success: true, message: apiResult.message || `Đã hủy thành công mã ATM`, source: 'backend' };
      } else if (apiResult && !apiResult.success) {
        return { success: false, message: apiResult.message };
      }
    } catch (e) {
      console.warn('[Customer] Backend cancelAtmCode lỗi, fallback sang LocalStore', e);
    }
    return CustomerService.cancelAtmCode(codeId);
  }

  /**
   * Tạo Mã Rút/Nạp Tiền ATM Không Dùng Thẻ
   */
  static createAtmCode({ accountNo, type = 'WITHDRAW', amount, pin = '1234' }) {
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) return { success: false, message: 'Số tiền không hợp lệ' };
    if (amount < 10000) return { success: false, message: 'Số tiền tối thiểu là 10,000 VNĐ' };

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
   * Lấy danh sách mã ATM của khách hàng
   */
  static getAtmCodes() {
    const user = store.data.currentUser;
    if (!user) return [];
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return [];

    return (store.data.atmCodes || []).filter(item => item.customerId === freshCust.id);
  }

  /**
   * Hủy Mã ATM chưa sử dụng
   */
  static cancelAtmCode(codeId) {
    const user = store.data.currentUser;
    const item = (store.data.atmCodes || []).find(c => c.id === codeId || c.code === codeId);
    if (!item) return { success: false, message: 'Mã ATM không tồn tại' };

    if (item.status !== 'PENDING') {
      return { success: false, message: 'Chỉ có thể hủy mã đang ở trạng thái Chờ sử dụng' };
    }

    item.status = 'CANCELLED';
    store.addAuditLog(user.username, `Hủy mã ATM [${item.code}]`);
    store.saveData();

    return { success: true, message: `Đã hủy thành công mã ATM ${item.code}` };
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
      if (apiRes && apiRes.success && Array.isArray(apiRes.data)) {
        return apiRes.data;
      }
    } catch (err) {
      console.warn('[Savings] Lỗi tải biểu lãi suất, dùng mặc định:', err);
    }
    return store.data.savingsInterestRates || [
      { termMonths: 0, label: 'Không kỳ hạn', annualRate: 0.2, minAmount: 100000 },
      { termMonths: 1, label: '1 Tháng', annualRate: 4.5, minAmount: 1000000 },
      { termMonths: 3, label: '3 Tháng', annualRate: 5.2, minAmount: 1000000 },
      { termMonths: 6, label: '6 Tháng', annualRate: 6.5, minAmount: 1000000 },
      { termMonths: 12, label: '12 Tháng', annualRate: 7.2, minAmount: 1000000 },
      { termMonths: 24, label: '24 Tháng', annualRate: 7.8, minAmount: 1000000 },
      { termMonths: 36, label: '36 Tháng', annualRate: 8.0, minAmount: 5000000 }
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
    const diffTime = Math.abs(now - created);
    const daysActive = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const isDemand = sav.savingsType === 'DEMAND' || sav.termMonths === 0;
    const isMatured = sav.maturityDate && new Date(sav.maturityDate) <= now;

    let currentAccruedInterest = 0;
    if (isDemand) {
      currentAccruedInterest = Math.round((sav.depositAmount * sav.interestRate * daysActive) / 36500);
    } else if (isMatured) {
      currentAccruedInterest = sav.expectedInterest;
    } else {
      currentAccruedInterest = Math.round((sav.depositAmount * 0.2 * daysActive) / 36500);
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
   * Lấy danh sách sổ tiết kiệm của khách hàng hiện tại (Local Store)
   */
  static getCustomerSavings() {
    const user = store.data.currentUser;
    if (!user) return [];
    const freshCust = CustomerService.findCustomer(user);
    if (!freshCust) return [];

    return (store.data.savingsAccounts || []).filter(s => s.customerId === freshCust.id);
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
        if (window.updateNotificationBadge) window.updateNotificationBadge();
        return { success: true, message: apiRes.message || 'Mở tài khoản tiết kiệm thành công!', savings: apiRes.data };
      } else if (apiRes && !apiRes.success) {
        return { success: false, message: apiRes.message };
      }
    } catch (err) {
      console.warn('[Savings] API backend gặp lỗi, chuyển sang thực thi local:', err);
    }
    return CustomerService.openSavingsAccount({ sourceAccountNo, amount, termMonths, savingsType, renewType });
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
      const rates = store.data.savingsInterestRates || [];
      const rateObj = rates.find(r => r.termMonths === termMonths);
      interestRate = rateObj ? rateObj.interestRate : 5.0;
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
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
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
        return { success: false, message: apiRes.message };
      }
    } catch (err) {
      console.warn('[Savings] API backend gặp lỗi, chuyển sang local:', err);
    }
    return CustomerService.closeSavingsAccount(savingsId, isEarly, partialAmount);
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
    const diffDays = Math.max(1, Math.ceil(Math.abs(now - created) / (1000 * 60 * 60 * 24)));
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
        id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
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
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
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
   * Nộp thêm tiền vào sổ tiết kiệm không kỳ hạn (Async: ưu tiên REST API)
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
        return { success: false, message: apiRes.message };
      }
    } catch (err) {
      console.warn('[Savings] API backend topup lỗi, dùng local:', err);
    }
    return CustomerService.topUpSavings({ savingsId, sourceAccountNo, amount });
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
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
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
   * Lấy danh sách các khoản vay của khách hàng
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

    // Tìm gói vay & lãi suất cơ sở
    const packages = store.data.loanPackages || [];
    const pkg = packages.find(p => p.id === loanType) || { baseRate: 8.5, name: 'Vay Tiêu Dùng' };
    const interestRate = pkg.baseRate || 8.5;

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
   * Trả nợ định kỳ hoặc tất toán khoản vay trước hạn
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
    } else {
      // Trừ vào dư nợ gốc
      const monthlyPrincipal = Math.round(loan.principalAmount / loan.termMonths);
      loan.remainingBalance = Math.max(0, loan.remainingBalance - monthlyPrincipal);
      loan.installmentPaidCount = (loan.installmentPaidCount || 0) + 1;
      if (loan.remainingBalance <= 0 || loan.installmentPaidCount >= loan.termMonths) {
        loan.remainingBalance = 0;
        loan.status = 'PAID_OFF';
      }
    }

    // Lịch sử giao dịch
    const txn = {
      id: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
      fromAccount: payAcc.accountNo,
      fromName: freshCust.fullName,
      toAccount: loan.contractNo || loan.id,
      toName: `QuangTrung Bank - Thu nợ ${loan.contractNo || loan.id}`,
      amount: payAmount,
      fee: penaltyFee,
      type: 'TRANSFER',
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
      console.warn('[CustomerService] Fallback generateEStatementDataAsync sang LocalStore', e);
    }

    return CustomerService.generateEStatementData(accountNo, fromDate, toDate);
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
    rows.push([`Mã tra cứu: ${data.statementRef}`, `Thời gian in: ${data.generatedAt}`]);
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
        t.type,
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

  /**
   * Nộp hồ sơ định danh eKYC trực tuyến (mô phỏng Liveness & Face Matching)
   */
  static submitEKyc({ idCardFront, idCardBack, selfiePhoto }) {
    const user = store.data.currentUser;
    if (!user) return { success: false, message: 'Chưa đăng nhập hệ thống' };

    const cust = store.data.customers.find(c => c.id === user.id || c.username === user.username);
    if (!cust) return { success: false, message: 'Không tìm thấy hồ sơ khách hàng' };

    const nowStr = store.nowGMT7String();

    cust.kycStatus = 'VERIFIED';
    cust.idCardFront = idCardFront || cust.idCardFront;
    cust.idCardBack = idCardBack || cust.idCardBack;
    cust.selfiePhoto = selfiePhoto || cust.selfiePhoto;
    cust.kycVerifiedAt = nowStr;

    user.kycStatus = 'VERIFIED';

    store.save();
    return {
      success: true,
      message: 'Xác thực eKYC thành công! Hạn mức tài khoản của bạn đã được nâng lên 500.000.000 VNĐ/ngày.',
      customer: cust
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PUSH NOTIFICATION & NOTIFICATION CENTER HELPER METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Lấy danh sách thông báo biến động số dư từ REST API (hoặc LocalStore)
   */
  static async getNotificationsAsync() {
    try {
      const res = await BankApiService.getNotifications();
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch (e) {
      console.warn('[CustomerService] Fallback getNotificationsAsync sang LocalStore', e);
    }
    const user = store.data.currentUser;
    const cust = CustomerService.findCustomer(user);
    if (!cust) return [];
    return (store.data.notifications || []).filter(n => n.customerId === cust.id);
  }

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  static async markNotificationReadAsync(id) {
    try {
      await BankApiService.markNotificationRead(id);
    } catch (e) {
      const notif = (store.data.notifications || []).find(n => n.id === id);
      if (notif) notif.read = true;
      store.save();
    }
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  static async markAllNotificationsReadAsync() {
    try {
      await BankApiService.markAllNotificationsRead();
    } catch (e) {
      const user = store.data.currentUser;
      const cust = CustomerService.findCustomer(user);
      if (cust) {
        (store.data.notifications || []).filter(n => n.customerId === cust.id).forEach(n => n.read = true);
        store.save();
      }
    }
  }

  /**
   * Phát âm thanh chuông báo Ngân hàng khi có Push Notification
   */
  static playNotificationChime() {
    try {
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
   * Đẩy Thẻ Push Notification Nổi trên góc màn hình (Floating Glassmorphism Card)
   */
  static triggerPushNotification({ title, message, amount, balanceAfter, type, accountNo }) {
    CustomerService.playNotificationChime();

    // 1. Tự động lưu vào store.data.notifications nếu khách hàng đang đăng nhập
    const user = store.data.currentUser;
    const freshCust = CustomerService.findCustomer(user);
    if (freshCust) {
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

    let container = document.getElementById('push-notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'push-notification-container';
      container.style.cssText = 'position: fixed !important; top: 24px !important; right: 24px !important; z-index: 1000000 !important; display: flex !important; flex-direction: column !important; gap: 12px !important; pointer-events: none !important;';
      document.body.appendChild(container);
    }

    const typeUpper = String(type || '').toUpperCase();
    const titleUpper = String(title || '').toUpperCase();
    const msgUpper = String(message || '').toUpperCase();

    const isExpense = typeUpper === 'MONEY_OUT' || 
                      typeUpper === 'DEBIT' || 
                      typeUpper === 'WITHDRAW' || 
                      typeUpper === 'TRANSFER_OUT' || 
                      titleUpper.includes('NỢ') || 
                      titleUpper.includes('(-)') ||
                      msgUpper.includes(' -') ||
                      (typeof amount === 'number' && amount < 0);

    const isSystem = typeUpper === 'SYSTEM' || typeUpper === 'SECURITY';
    const isIncome = !isExpense && !isSystem;

    let badgeColor = '#10b981';
    let notifIcon = '🟢';
    let amountFormatted = '';

    if (isSystem) {
      badgeColor = '#06b6d4';
      notifIcon = '🔔';
      amountFormatted = '';
    } else if (isExpense) {
      badgeColor = '#ef4444';
      notifIcon = '🔴';
      amountFormatted = (amount !== undefined && amount !== null && amount !== '') ? `-${store.formatVND(Math.abs(amount || 0))}` : '';
    } else {
      badgeColor = '#10b981';
      notifIcon = '🟢';
      amountFormatted = (amount !== undefined && amount !== null && amount !== '') ? `+${store.formatVND(Math.abs(amount || 0))}` : '';
    }

    const card = document.createElement('div');
    card.className = 'push-notification-card';
    card.style.borderLeft = `5px solid ${badgeColor}`;

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 0.75rem; color: #f59e0b; letter-spacing: 0.5px;">
          <span>❖ QUANGTRUNG BANK ALERT</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.7rem; color: #94a3b8;">${nowStr}</span>
          <button style="background: none; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer; padding: 0 4px; line-height: 1;" onclick="this.closest('.push-notification-card').remove()">×</button>
        </div>
      </div>
      <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px; color: ${badgeColor}; display: flex; align-items: center; gap: 6px;">
        <span>${notifIcon}</span> ${title || (isExpense ? 'Biến động số dư Nợ (-)' : (isIncome ? 'Biến động số dư Có (+)' : 'Thông báo hệ thống'))}
      </div>
      ${amountFormatted ? `
        <div style="font-size: 1.2rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: ${badgeColor}; margin-bottom: 6px; letter-spacing: -0.5px;">
          ${amountFormatted}
        </div>
      ` : ''}
      <div style="font-size: 0.82rem; color: #cbd5e1; margin-bottom: 6px; line-height: 1.4;">
        ${(message || '').replace(/([+-]?\b\d{4,}\b)(?=\s*VNĐ|\s*VND|\s*đ)/gi, (m) => {
          const sign = m.startsWith('+') ? '+' : (m.startsWith('-') ? '-' : '');
          const val = Math.abs(parseInt(m.replace(/[^0-9]/g, ''), 10));
          return sign + new Intl.NumberFormat('vi-VN').format(val);
        })}
      </div>
      ${balanceAfter !== undefined ? `<div style="font-size: 0.78rem; color: #94a3b8; font-weight: 600; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 6px;">Số dư khả dụng: <span style="color: #f8fafc; font-weight: 700;">${store.formatVND(balanceAfter)}</span></div>` : ''}
    `;

    container.appendChild(card);

    if (window.updateNotificationBadge) window.updateNotificationBadge();

    // Tự động đóng sau 7 giây
    setTimeout(() => {
      card.classList.add('dismissing');
      setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 350);
    }, 7000);
  }
}




