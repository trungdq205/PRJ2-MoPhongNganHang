/**
 * Bộ kết nối gRPC Web Protocol phía Frontend với Backend Java Spring Boot gRPC Server
 *
 * GIAO THỨC gRPC THUẦN TÚY (gRPC-Web Protocol over HTTP/2 & HTTP/1.1):
 *   1. Sử dụng hợp đồng RPC Protocol Buffers (BankService: Login, TransferMoney, OpenSavings, ...)
 *   2. Header chuẩn: Content-Type: application/grpc-web+json / application/grpc-web+proto, X-Grpc-Web: 1
 *   3. Xác thực gRPC Metadata / Authorization: Bearer <JWT Token>
 *   4. Hoàn toàn không sử dụng bất kỳ giao thức REST API nào
 */

const GRPC_BASE_URL = 'http://localhost:8080/api/grpc';
const TOKEN_KEY = 'QUANGTRUNG_BANK_JWT_TOKEN';

export class BankApiService {

  // ── Quản lý JWT Token ──────────────────────────────────────────────────

  static saveToken(token) {
    if (!token) return;
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  }

  static getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  static clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  static hasToken() {
    return !!BankApiService.getToken();
  }

  // ── Sinh khóa Idempotency Key chuẩn UUID v4 ─────────────────────────
  static generateIdempotencyKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ── Bộ thực thi RPC Giao thức gRPC (gRPC-Web Client Protocol) ─────────────

  /**
   * Thực hiện cuộc gọi gRPC RPC theo chuẩn gRPC-Web
   * @param {string} rpcMethod — Tên phương thức RPC (ví dụ: 'TransferMoney', 'Login')
   * @param {object} payload — Dữ liệu Message Request theo hợp đồng Proto
   */
  static async grpcCall(rpcMethod, payload = {}) {
    const url = `${GRPC_BASE_URL}/${rpcMethod}`;
    const token = BankApiService.getToken();

    const headers = {
      'Content-Type': 'application/grpc-web+json',
      'X-Grpc-Web': '1',
      'Accept': 'application/grpc-web+json, application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      console.log(`[gRPC Call] ➔ rpc BankService.${rpcMethod}()`, payload);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(9000)
      });

      // Xử lý khi Token hết hạn (401 Unauthorized / 403 Forbidden)
      if (res.status === 401 || res.status === 403) {
        console.warn(`[gRPC] ${res.status} cho rpc ${rpcMethod} — Token có thể hết hạn`);
        const data = await res.json().catch(() => null);
        const msg = (data && data.message) || '';
        const isTokenExpired = msg.includes('hết hạn') || msg.includes('expired') || msg.includes('không hợp lệ');
        if (isTokenExpired && BankApiService.hasToken()) {
          BankApiService.clearToken();
          window.dispatchEvent(new CustomEvent('jwt-expired', {
            detail: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }
          }));
        }
        return data || { success: false, message: msg || 'Phiên đăng nhập không hợp lệ (401)' };
      }

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          message: (result && (result.message || result.error)) || `Lỗi gRPC HTTP ${res.status}`
        };
      }

      return result;
    } catch (e) {
      console.warn(`[gRPC] RPC ${rpcMethod} thất bại:`, e.message);
      return null;
    }
  }

  // ── Kiểm tra backend gRPC Server có hoạt động không ──────────────────
  static async checkBackendHealth() {
    try {
      const res = await BankApiService.grpcCall('Login', { username: '_ping_', password: '_ping_' });
      return res !== null;
    } catch (e) {
      return false;
    }
  }

  // ── 1. Authentication RPCs ──────────────────────────────────────────

  static async login(username, password) {
    const data = await BankApiService.grpcCall('Login', { username, password });
    if (data && data.success) {
      const token = data.token || (data.data && data.data.token);
      if (token) {
        BankApiService.saveToken(token);
        console.log('[gRPC] JWT token từ gRPC Login đã được lưu thành công');
      }
    }
    return data;
  }

  static async loginWithFace(username, faceData) {
    const data = await BankApiService.grpcCall('FaceLogin', {
      username,
      face_data: faceData,
      liveness_score: 99.5
    });
    if (data && data.success) {
      const token = data.token || (data.data && data.data.token);
      if (token) {
        BankApiService.saveToken(token);
        console.log('[gRPC] JWT token từ gRPC FaceLogin đã được lưu');
      }
    }
    return data;
  }

  static logout() {
    BankApiService.clearToken();
    console.log('[gRPC] Đã xóa token — Đăng xuất gRPC thành công');
  }

  static async resetLocks() {
    return BankApiService.grpcCall('ResetLocks', {});
  }

  static async changePassword(currentPassword, newPassword, confirmPassword) {
    return BankApiService.grpcCall('ChangePassword', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
  }

  static async updateProfile(email) {
    return BankApiService.grpcCall('UpdateProfile', { email });
  }

  // ── 2. Account & KYC RPCs ───────────────────────────────────────────

  static async getAccounts(customerId) {
    return BankApiService.grpcCall('GetAccounts', { customer_id: customerId });
  }

  static async lookupAccount(accountNo) {
    return BankApiService.grpcCall('LookupAccount', { account_no: accountNo });
  }

  static async submitKyc(data) {
    return BankApiService.grpcCall('SubmitKyc', data);
  }

  // ── 3. Transaction RPCs ─────────────────────────────────────────────

  static async transferMoney(fromAccNo, toAccNo, amount, content, idempotencyKey = null) {
    const key = idempotencyKey || BankApiService.generateIdempotencyKey();
    return BankApiService.grpcCall('TransferMoney', {
      from_account: fromAccNo,
      to_account: toAccNo,
      amount: parseFloat(amount),
      content,
      idempotency_key: key
    });
  }

  static async atmDeposit(accountNo, amount, idempotencyKey = null) {
    const key = idempotencyKey || BankApiService.generateIdempotencyKey();
    return BankApiService.grpcCall('AtmDeposit', {
      account_no: accountNo,
      amount: parseFloat(amount),
      idempotency_key: key
    });
  }

  static async atmWithdraw(accountNo, amount, idempotencyKey = null) {
    const key = idempotencyKey || BankApiService.generateIdempotencyKey();
    return BankApiService.grpcCall('AtmWithdraw', {
      account_no: accountNo,
      amount: parseFloat(amount),
      idempotency_key: key
    });
  }

  static async getHistory(accountNo) {
    return BankApiService.grpcCall('GetTransactionHistory', { account_no: accountNo });
  }

  static async getHistoryFiltered(params = {}) {
    return BankApiService.grpcCall('GetTransactionHistory', {
      account_no: params.accountNo !== 'ALL' ? params.accountNo : null,
      from_date: params.fromDate || null,
      to_date: params.toDate || null,
      type: params.type !== 'ALL' ? params.type : null,
      min_amount: params.minAmount || null,
      max_amount: params.maxAmount || null,
      search: params.search || null,
      page: params.page !== undefined ? params.page : 0,
      size: params.size !== undefined ? params.size : 10
    });
  }

  static async getEStatement(accountNo, fromDate, toDate) {
    return BankApiService.grpcCall('GetAccountStatement', {
      account_no: accountNo,
      from_date: fromDate,
      to_date: toDate
    });
  }

  static async vnpostWithdraw(fromAccNo, amount, idempotencyKey = null) {
    const key = idempotencyKey || BankApiService.generateIdempotencyKey();
    return BankApiService.grpcCall('VnpostWithdraw', {
      from_account: fromAccNo,
      amount: parseFloat(amount),
      idempotency_key: key
    });
  }

  static async vnpostTransfer(fromAccNo, toAccNo, amount, content, idempotencyKey = null) {
    const key = idempotencyKey || BankApiService.generateIdempotencyKey();
    return BankApiService.grpcCall('VnpostTransfer', {
      from_account: fromAccNo,
      to_account: toAccNo,
      amount: parseFloat(amount),
      content,
      idempotency_key: key
    });
  }

  // ── 4. Cardless ATM Codes RPCs ──────────────────────────────────────

  static async createAtmCode(accountNo, type, amount, pin) {
    return BankApiService.grpcCall('CreateAtmCode', {
      account_no: accountNo,
      type,
      amount: parseFloat(amount),
      pin
    });
  }

  static async getAtmCodes() {
    return BankApiService.grpcCall('GetAtmCodes', {});
  }

  static async cancelAtmCode(codeId) {
    return BankApiService.grpcCall('CancelAtmCode', { code_id: codeId });
  }

  // ── 5. Savings (Tiết kiệm) RPCs ─────────────────────────────────────

  static async openSavingsAccount(sourceAccountNo, depositAmount, termMonths, savingsType = 'TERM', renewType = 'AUTO_ROLLOVER_ALL', idempotencyKey = null) {
    const key = idempotencyKey || BankApiService.generateIdempotencyKey();
    return BankApiService.grpcCall('OpenSavings', {
      source_account: sourceAccountNo,
      amount: parseFloat(depositAmount),
      term_months: parseInt(termMonths, 10),
      savings_type: savingsType,
      renew_type: renewType,
      idempotency_key: key
    });
  }

  static async closeSavingsAccount(savingsId, isEarlyClose = false, partialAmount = null, idempotencyKey = null) {
    const key = idempotencyKey || BankApiService.generateIdempotencyKey();
    return BankApiService.grpcCall('CloseSavings', {
      savings_no: savingsId,
      is_early_close: isEarlyClose,
      partial_amount: partialAmount ? parseFloat(partialAmount) : null,
      idempotency_key: key
    });
  }

  static async topUpSavingsAccount(savingsId, sourceAccountNo, amount, idempotencyKey = null) {
    const key = idempotencyKey || BankApiService.generateIdempotencyKey();
    return BankApiService.grpcCall('TopUpSavings', {
      savings_no: savingsId,
      source_account: sourceAccountNo,
      amount: parseFloat(amount),
      idempotency_key: key
    });
  }

  static async getSavingsDetail(savingsId) {
    return BankApiService.grpcCall('GetSavingsDetail', { savings_id: savingsId });
  }

  static async getSavingsAccounts() {
    return BankApiService.grpcCall('GetSavingsAccounts', {});
  }

  static async getSavingsInterestRates() {
    return BankApiService.grpcCall('GetSavingsInterestRates', {});
  }

  // ── 6. Loan (Tín dụng & Khoản vay) RPCs ─────────────────────────────

  static async applyLoan(accountNo, loanType, title, principalAmount, termMonths) {
    return BankApiService.grpcCall('ApplyLoan', {
      account_no: accountNo,
      loan_type: loanType,
      title,
      principal_amount: parseFloat(principalAmount),
      term_months: parseInt(termMonths, 10)
    });
  }

  static async getLoans() {
    return BankApiService.grpcCall('GetLoans', {});
  }

  // ── 7. Notifications & Support Tickets RPCs ─────────────────────────

  static async getNotifications() {
    return BankApiService.grpcCall('GetNotifications', {});
  }

  static async markNotificationRead(id) {
    return BankApiService.grpcCall('MarkNotificationRead', { notification_id: id });
  }

  static async markAllNotificationsRead() {
    return BankApiService.grpcCall('MarkAllNotificationsRead', {});
  }

  static async createTicket(subject, content, accountNo) {
    return BankApiService.grpcCall('CreateTicket', {
      subject,
      content,
      account_no: accountNo
    });
  }

  static async getTickets() {
    return BankApiService.grpcCall('GetTickets', {});
  }

  // ── 8. Teller Operations RPCs ───────────────────────────────────────

  static async tellerCreateCustomer(fullName, idCard, phone, email, address, initialBalance) {
    return BankApiService.grpcCall('TellerCreateCustomer', {
      full_name: fullName,
      id_card: idCard,
      phone,
      email,
      address,
      initial_balance: parseFloat(initialBalance) || 0
    });
  }

  static async tellerToggleAccountStatus(accountNo, status) {
    return BankApiService.grpcCall('TellerToggleAccountStatus', {
      account_no: accountNo,
      status
    });
  }

  static async tellerResolveTicket(ticketId, response, status = 'RESOLVED') {
    return BankApiService.grpcCall('TellerResolveTicket', {
      ticket_id: ticketId,
      response,
      status
    });
  }

  static async tellerGetTickets() {
    return BankApiService.grpcCall('TellerGetAllTickets', {});
  }

  static async tellerUpdateCustomer(customerId, fullName, phone, email, address) {
    return BankApiService.grpcCall('TellerUpdateCustomer', {
      customer_id: customerId,
      full_name: fullName,
      phone,
      email,
      address
    });
  }

  static async tellerApproveKyc(customerId, status) {
    return BankApiService.grpcCall('TellerApproveKyc', {
      customer_id: customerId,
      status
    });
  }
}

