/**
 * Quản lý Trạng thái & Kho dữ liệu Lưu trữ (Store) cho Hệ thống Mô phỏng Ngân hàng Apex Digital Bank
 */

const SYS_CONFIG_KEY = 'QUANGTRUNG_BANK_SYS_CONFIG';

const defaultSystemConfig = {
  theme: 'dark',
  maskBalance: false,
  autoRefresh: true,
  refreshIntervalMs: 30000,
  language: 'vi'
};

const initialSeedData = {
  currentUser: null, // Đối tượng người dùng đang đăng nhập
  systemSettings: {
    bankName: 'Ngân hàng Thương mại Cổ phần QuangTrung Bank',
    swiftCode: 'QTBKVNVN',
    savingsInterestRate: 6.5,
    transferFee: 0,
    systemStatus: 'ACTIVE',
    maxDailyLimit: 500000000,
    feeSchedule: {
      internalTransferFee: 0,
      interbankTransferFee: 2200,
      atmWithdrawInternalFee: 0,
      atmWithdrawExternalFee: 3300,
      monthlyAccountFee: 0,
      cardIssuanceFee: 50000
    },
    transactionLimits: {
      perTxnUnverified: 10000000,
      dailyUnverified: 20000000,
      perTxnVerified: 100000000,
      dailyVerified: 500000000,
      softOtpThreshold: 10000000,
      maxSavingsDepositPerTxn: 1000000000
    },
    fxRates: [
      { currency: 'USD', name: 'Đô la Mỹ', cashBuy: 25120, transferBuy: 25150, sell: 25480 },
      { currency: 'EUR', name: 'Đồng Euro', cashBuy: 27200, transferBuy: 27250, sell: 27890 },
      { currency: 'JPY', name: 'Yên Nhật', cashBuy: 162.5, transferBuy: 163.1, sell: 169.8 },
      { currency: 'GBP', name: 'Bảng Anh', cashBuy: 32100, transferBuy: 32200, sell: 32950 },
      { currency: 'SGD', name: 'Đô la Singapore', cashBuy: 18800, transferBuy: 18880, sell: 19350 }
    ]
  },
  permissionsList: [
    // Nhóm 1: Khách hàng & Định danh
    { id: 'PERM_CREATE_CUSTOMER', name: 'Thêm mới hồ sơ KH & Quét mặt', category: 'Khách Hàng & Định Danh', desc: 'Mở hồ sơ khách hàng mới và thu thập dữ liệu sinh trắc học' },
    { id: 'PERM_EDIT_CUSTOMER', name: 'Chỉnh sửa thông tin khách hàng', category: 'Khách Hàng & Định Danh', desc: 'Cập nhật địa chỉ, SĐT, email và thông tin hành chính của KH' },

    // Nhóm 2: Tài khoản & Tiền gửi
    { id: 'PERM_MANAGE_ACCOUNT', name: 'Khóa / Mở / Đóng tài khoản', category: 'Tài Khoản & Tiền Gửi', desc: 'Thay đổi trạng thái hoạt động của tài khoản thanh toán' },
    { id: 'PERM_OPEN_SAVINGS', name: 'Mở sổ & Tất toán Tiết kiệm', category: 'Tài Khoản & Tiền Gửi', desc: 'Thực hiện nghiệp vụ gửi tiền có kỳ hạn / không kỳ hạn tại quầy' },
    { id: 'PERM_MANAGE_CARDS', name: 'Phát hành & Quản lý Thẻ ATM/Debit', category: 'Tài Khoản & Tiền Gửi', desc: 'Phát hành thẻ, cấp lại PIN, khóa thẻ và cấu hình hạn mức' },

    // Nhóm 3: Tín dụng & Cho vay
    { id: 'PERM_REVIEW_LOANS', name: 'Tiếp nhận & Thẩm định vay vốn', category: 'Tín Dụng & Cho Vay', desc: 'Xem hồ sơ xin vay, thẩm định nguồn thu và lập tờ trình tín dụng' },
    { id: 'PERM_VERIFY_COLLATERAL', name: 'Kiểm tra & Thu giữ TSBĐ gốc', category: 'Tín Dụng & Cho Vay', desc: 'Kiểm tra sổ đỏ, cà vẹt gốc tại quầy và lập biên bản niêm phong kho quỹ' },
    { id: 'PERM_APPROVE_LOANS', name: 'Phê duyệt & Giải ngân khoản vay', category: 'Tín Dụng & Cho Vay', desc: 'Thẩm quyền quyết định giải ngân tiền vay trực tiếp vào TK khách hàng' },

    // Nhóm 4: Quản trị & Giám sát
    { id: 'PERM_VIEW_REPORTS', name: 'Xem báo cáo thống kê & Tài chính', category: 'Quản Trị & Giám Sát', desc: 'Xem biểu đồ thanh khoản, doanh thu và báo cáo phân tích' },
    { id: 'PERM_MANAGE_TELLERS', name: 'Quản lý nhân sự & Phân quyền', category: 'Quản Trị & Giám Sát', desc: 'Thêm, sửa, khóa nhân viên và thiết lập ma trận quyền' },
    { id: 'PERM_SYSTEM_CONFIG', name: 'Cấu hình tham số & Biểu phí hệ thống', category: 'Quản Trị & Giám Sát', desc: 'Cài đặt lãi suất, hạn mức và biểu phí toàn ngân hàng' }
  ],
  roleTemplates: [
    {
      id: 'FRONT_TELLER',
      title: 'Giao Dịch Viên Quầy',
      desc: 'Phục vụ khách hàng tại quầy: Mở TK, gửi tiết kiệm, phát hành thẻ',
      badgeClass: 'badge-teller',
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS']
    },
    {
      id: 'CREDIT_OFFICER',
      title: 'Chuyên Viên Tín Dụng',
      desc: 'Tiếp nhận hồ sơ vay, thẩm định năng lực tài chính, kiểm tra và niêm phong TSBĐ gốc',
      badgeClass: 'badge-customer',
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL']
    },
    {
      id: 'SUPERVISOR',
      title: 'Kiểm Soát Viên / Trưởng Phòng',
      desc: 'Kiểm soát phê duyệt cấp tín dụng, giải ngân và xem báo cáo chi nhánh',
      badgeClass: 'badge-admin',
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS', 'PERM_VIEW_REPORTS']
    }
  ],
  customers: [],
  tellers: [
    {
      id: 'TELLER-001',
      username: 'teller1',
      password: 'Abc@1234',
      role: 'TELLER',
      title: 'Giao Dịch Viên',
      fullName: 'Phạm Minh Đức',
      staffCode: 'GDV001',
      branch: 'Hội Sở - Hà Nội',
      email: 'duc.pm@quangtrungbank.com',
      phone: '0933445566',
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS']
    },
    {
      id: 'TELLER-002',
      username: 'teller2',
      password: 'Abc@1234',
      role: 'TELLER',
      title: 'Giao Dịch Viên',
      fullName: 'Võ Thu Hà',
      staffCode: 'GDV002',
      branch: 'Chi nhánh Sài Gòn',
      email: 'ha.vt@quangtrungbank.com',
      phone: '0977889900',
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS']
    },
    {
      id: 'TELLER-003',
      username: 'teller3',
      password: 'Abc@1234',
      role: 'TELLER',
      title: 'Giao Dịch Viên',
      fullName: 'Trần Quang Hải',
      staffCode: 'GDV003',
      branch: 'Hội Sở - Hà Nội',
      email: 'hai.tq@quangtrungbank.com',
      phone: '0911223344',
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS', 'PERM_VIEW_REPORTS']
    }
  ],
  admins: [
    {
      id: 'ADMIN-001',
      username: 'admin',
      password: 'Abc@1234',
      role: 'ADMIN',
      fullName: 'Lê Quang Trưởng',
      staffCode: 'ADM001',
      email: 'admin@quangtrungbank.com',
      phone: '0900000000',
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      permissions: ['PERM_VIEW_REPORTS', 'PERM_MANAGE_TELLERS', 'PERM_SYSTEM_CONFIG']
    }
  ],
  transactions: [],
  tickets: [],
  auditLogs: [],
  atmCodes: [],
  savingsAccounts: [],
  loanPackages: [
    { id: 'MORTGAGE', name: 'Vay Mua Nhà / Bất Động Sản', baseRate: 7.5, maxTerm: 240, maxAmount: 10000000000, desc: 'Lãi suất ưu đãi từ 7.5%/năm, thời hạn lên đến 20 năm, thế chấp bằng chính BĐS' },
    { id: 'CAR', name: 'Vay Mua Ô Tô Trả Góp', baseRate: 8.5, maxTerm: 84, maxAmount: 2000000000, desc: 'Lãi suất 8.5%/năm, tài trợ đến 85% giá trị xe, phê duyệt hồ sơ nhanh chóng' },
    { id: 'CONSUMER', name: 'Vay Tiêu Dùng', baseRate: 10.5, maxTerm: 60, maxAmount: 500000000, desc: 'Không cần tài sản bảo đảm, duyệt vay dựa trên thu nhập lương chuyển khoản' },
    { id: 'BUSINESS', name: 'Vay Sản Xuất Kinh Doanh', baseRate: 8.0, maxTerm: 120, maxAmount: 5000000000, desc: 'Bổ sung vốn lưu động linh hoạt, lãi suất cạnh tranh cho hộ kinh doanh' }
  ],
  loans: [],
  beneficiaries: [],
  savingsInterestRates: [
    { term: 0, label: 'Không Kỳ Hạn', rate: 0.2 },
    { term: 1, label: '1 Tháng', rate: 4.5 },
    { term: 3, label: '3 Tháng', rate: 5.2 },
    { term: 6, label: '6 Tháng', rate: 6.5 },
    { term: 12, label: '12 Tháng', rate: 7.2 },
    { term: 24, label: '24 Tháng', rate: 7.8 },
    { term: 36, label: '36 Tháng', rate: 8.0 }
  ],
  loanInterestRates: {
    CONSUMER: { 6: 8.90, 12: 9.50, 24: 10.50, 36: 11.50, 48: 12.00, 60: 12.50 },
    CAR: { 12: 7.80, 24: 8.20, 36: 8.50, 48: 8.90, 60: 9.20, 84: 9.80 },
    MORTGAGE: { 36: 6.80, 60: 7.50, 120: 8.20, 180: 8.60, 240: 8.90 },
    BUSINESS: { 6: 6.80, 12: 7.50, 24: 7.80, 36: 8.00, 60: 8.40, 120: 8.80 }
  }
};

class BankStore {
  constructor() {
    this.cleanLegacyBusinessStorage();
    this.systemConfig = this.loadSystemConfig();
    this.data = JSON.parse(JSON.stringify(initialSeedData)); // In-memory runtime state
    this.loadSessionBusinessData(); // Khôi phục dữ liệu nghiệp vụ trong phiên (sessionStorage)
  }

  /**
   * Khôi phục cấu hình hệ thống & thông tin phiên (sessionStorage)
   */
  loadSessionBusinessData() {
    try {
      const raw = sessionStorage.getItem('QUANGTRUNG_BANK_SESSION_BUSINESS_DATA');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.currentUser) {
        this.data.currentUser = parsed.currentUser;
      }
      if (parsed.systemSettings) {
        this.data.systemSettings = { ...this.data.systemSettings, ...parsed.systemSettings };
      }
      if (parsed.savingsInterestRates && Array.isArray(parsed.savingsInterestRates)) {
        this.data.savingsInterestRates = parsed.savingsInterestRates;
      }
      if (parsed.loanPackages && Array.isArray(parsed.loanPackages)) {
        this.data.loanPackages = parsed.loanPackages;
      }
      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
        this.data.auditLogs = parsed.auditLogs;
      }
    } catch (e) {
      console.warn('Không thể đọc dữ liệu phiên làm việc:', e);
    }

    // Đọc audit logs đã lưu từ LocalStorage để không bị mất khi chuyển đổi tài khoản giữa các tab
    try {
      const logsRaw = localStorage.getItem('QUANGTRUNG_BANK_AUDIT_LOGS');
      if (logsRaw) {
        const pLogs = JSON.parse(logsRaw);
        if (Array.isArray(pLogs)) {
          const map = new Map();
          (this.data.auditLogs || []).forEach(l => {
            const k = `${l.timestamp}_${l.user}_${l.action}`;
            map.set(k, l);
          });
          pLogs.forEach(l => {
            const k = `${l.timestamp}_${l.user}_${l.action}`;
            if (!map.has(k)) {
              map.set(k, l);
            }
          });
          this.data.auditLogs = Array.from(map.values()).slice(0, 100);
        }
      }
    } catch (err) {
      console.warn('Không thể đọc audit logs từ LocalStorage:', err);
    }

    // Đọc cấu hình biểu lãi suất hệ thống mới nhất từ LocalStorage (đồng bộ đa tab)
    try {
      const ratesRaw = localStorage.getItem('QUANGTRUNG_BANK_SYS_RATES');
      if (ratesRaw) {
        const pRates = JSON.parse(ratesRaw);
        if (pRates.loanInterestRates && typeof pRates.loanInterestRates === 'object') {
          this.data.loanInterestRates = pRates.loanInterestRates;
        }
        if (pRates.savingsInterestRates && Array.isArray(pRates.savingsInterestRates)) {
          this.data.savingsInterestRates = pRates.savingsInterestRates;
        }
        if (pRates.loanPackages && Array.isArray(pRates.loanPackages)) {
          this.data.loanPackages = pRates.loanPackages;
        }
      }
    } catch (err) {
      console.warn('Không thể đọc cấu hình lãi suất từ LocalStorage:', err);
    }
  }

  /**
   * Lưu trữ dữ liệu nghiệp vụ tạm thời vào sessionStorage để F5 reload không bị mất số dư & lịch sử
   */
  saveSessionBusinessData() {
    try {
      const payload = {
        currentUser: this.data.currentUser,
        customers: this.data.customers,
        transactions: this.data.transactions,
        savingsAccounts: this.data.savingsAccounts,
        atmCodes: this.data.atmCodes,
        systemSettings: this.data.systemSettings,
        savingsInterestRates: this.data.savingsInterestRates,
        loanPackages: this.data.loanPackages,
        loanInterestRates: this.data.loanInterestRates,
        auditLogs: this.data.auditLogs
      };
      sessionStorage.setItem('QUANGTRUNG_BANK_SESSION_BUSINESS_DATA', JSON.stringify(payload));

      if (this.data.auditLogs && Array.isArray(this.data.auditLogs)) {
        localStorage.setItem('QUANGTRUNG_BANK_AUDIT_LOGS', JSON.stringify(this.data.auditLogs.slice(0, 100)));
      }

      // Lưu biểu lãi suất vào LocalStorage để đồng bộ xuyên suốt các tab và khi đổi tài khoản
      localStorage.setItem('QUANGTRUNG_BANK_SYS_RATES', JSON.stringify({
        savingsInterestRates: this.data.savingsInterestRates,
        loanInterestRates: this.data.loanInterestRates,
        loanPackages: this.data.loanPackages
      }));
    } catch (e) {
      console.warn('Lỗi lưu dữ liệu phiên làm việc:', e);
    }
  }

  /**
   * Yêu cầu 5: LocalStorage chỉ lưu cấu hình hệ thống.
   * Xóa bỏ các key cũ lưu dữ liệu nghiệp vụ ngân hàng ở localStorage.
   */
  cleanLegacyBusinessStorage() {
    try {
      localStorage.removeItem('QUANGTRUNG_BANK_SIMULATION_DATA_V3');
      localStorage.removeItem('QUANGTRUNG_BANK_SIMULATION_DATA_V2');
      localStorage.removeItem('QUANGTRUNG_BANK_SIMULATION_DATA');
      sessionStorage.removeItem('QUANGTRUNG_BANK_SESSION_BUSINESS_DATA');
    } catch (e) {
      console.warn('Lỗi dọn dẹp bộ nhớ lưu trữ cũ:', e);
    }
  }

  loadSystemConfig() {
    try {
      const raw = localStorage.getItem(SYS_CONFIG_KEY);
      if (!raw) {
        this.saveSystemConfig(defaultSystemConfig);
        return { ...defaultSystemConfig };
      }
      return { ...defaultSystemConfig, ...JSON.parse(raw) };
    } catch (e) {
      console.error('Không thể đọc cấu hình hệ thống từ LocalStorage, dùng mặc định:', e);
      return { ...defaultSystemConfig };
    }
  }

  saveSystemConfig(config = null) {
    if (config) this.systemConfig = { ...this.systemConfig, ...config };
    try {
      localStorage.setItem(SYS_CONFIG_KEY, JSON.stringify(this.systemConfig));
    } catch (e) {
      console.error('Không thể lưu cấu hình hệ thống vào LocalStorage:', e);
    }
  }

  saveData(customData = null) {
    if (customData) this.data = customData;
    this.saveSessionBusinessData();
  }

  resetToDefaults() {
    sessionStorage.removeItem('QUANGTRUNG_BANK_SESSION_BUSINESS_DATA');
    this.saveSystemConfig(defaultSystemConfig);
    this.data = JSON.parse(JSON.stringify(initialSeedData));
    window.location.reload();
  }

  /**
   * Yêu cầu 4: Mọi số tiền phải gắn liền với VNĐ. Không được ghi đ hoặc ₫ sau số tiền.
   */
  formatVND(amount) {
    const val = Math.round(Number(amount) || 0);
    return new Intl.NumberFormat('vi-VN').format(val) + ' VNĐ';
  }

  /**
   * Định dạng Ngày tháng sang định dạng ngày/tháng/năm (dd/MM/yyyy) theo múi giờ GMT+7 (Asia/Ho_Chi_Minh)
   */
  formatDate(dateInput) {
    if (!dateInput) return '';
    const str = String(dateInput).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

    // Trường hợp YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return `${d}/${m}/${y}`;
    }

    try {
      let dateObj;
      if (typeof dateInput === 'string') {
        const clean = str.replace(' ', 'T');
        dateObj = new Date(clean.includes('Z') || clean.includes('+') ? clean : clean + '+07:00');
        if (isNaN(dateObj.getTime())) dateObj = new Date(str);
      } else {
        dateObj = new Date(dateInput);
      }

      if (isNaN(dateObj.getTime())) return str;

      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(dateObj);
    } catch (e) {
      return str;
    }
  }

  /**
   * Định dạng Ngày Giờ sang định dạng HH:mm:ss dd/MM/yyyy theo múi giờ GMT+7 (Asia/Ho_Chi_Minh)
   */
  formatDateTime(dateInput) {
    if (!dateInput) return '';
    const str = String(dateInput).trim();

    // Nếu đã ở dạng HH:mm:ss dd/MM/yyyy
    if (/^\d{2}:\d{2}(:\d{2})?\s+\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    
    // Nếu ở dạng dd/MM/yyyy HH:mm:ss
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?$/.test(str)) {
      const parts = str.split(/\s+/);
      return `${parts[1]} ${parts[0]}`;
    }

    try {
      let dateObj;
      if (typeof dateInput === 'string') {
        const clean = str.replace(' ', 'T');
        dateObj = new Date(clean.includes('Z') || clean.includes('+') ? clean : clean + '+07:00');
        if (isNaN(dateObj.getTime())) dateObj = new Date(str);
      } else {
        dateObj = new Date(dateInput);
      }

      if (isNaN(dateObj.getTime())) return str;

      const parts = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
      }).formatToParts(dateObj);

      const map = {};
      parts.forEach(p => map[p.type] = p.value);
      return `${map.hour || '00'}:${map.minute || '00'}:${map.second || '00'} ${map.day || '01'}/${map.month || '01'}/${map.year || '2026'}`;
    } catch (e) {
      return str;
    }
  }

  /**
   * Chuyển đổi chuỗi ngày giờ (bất kỳ định dạng nào) sang đối tượng Date an toàn
   */
  parseDateString(dateInput) {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;
    const str = String(dateInput).trim();

    // Định dạng dd/MM/yyyy hoặc HH:mm:ss dd/MM/yyyy
    const ddmmyyyy = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (ddmmyyyy) {
      return new Date(parseInt(ddmmyyyy[3], 10), parseInt(ddmmyyyy[2], 10) - 1, parseInt(ddmmyyyy[1], 10));
    }

    // Định dạng yyyy-MM-dd hoặc yyyy-MM-ddTHH:mm:ss
    const yyyymmdd = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (yyyymmdd) {
      return new Date(parseInt(yyyymmdd[1], 10), parseInt(yyyymmdd[2], 10) - 1, parseInt(yyyymmdd[3], 10));
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  /**
   * Tính ngày đến hạn của kỳ trả nợ thứ monthNum (1, 2, ...) dựa trên ngày giải ngân
   * @param {string|Date} baseDisbursementDate - Ngày giải ngân của khoản vay
   * @param {number} monthNum - Kỳ trả nợ (1 = kỳ đầu tiên, ...)
   * @returns {string} - Chuỗi định dạng YYYY-MM-DD
   */
  getLoanInstallmentDueDate(baseDisbursementDate, monthNum = 1) {
    const baseDate = this.parseDateString(baseDisbursementDate);
    const targetDay = baseDate.getDate();
    
    // Tính tháng và năm mục tiêu
    const targetMonthIndex = baseDate.getMonth() + monthNum;
    const tempDate = new Date(baseDate.getFullYear(), targetMonthIndex, 1);
    const targetYear = tempDate.getFullYear();
    const targetMonth = tempDate.getMonth();
    
    // Ngày cuối cùng của tháng mục tiêu
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualDay = Math.min(targetDay, daysInTargetMonth);
    
    const dueDate = new Date(targetYear, targetMonth, actualDay);
    const yyyy = dueDate.getFullYear();
    const mm = String(dueDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dueDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Lấy chuỗi timestamp hiện tại theo múi giờ GMT+7 chuẩn (HH:mm:ss dd/MM/yyyy)
   */
  nowGMT7String() {
    return this.formatDateTime(new Date());
  }

  /**
   * Lấy chuỗi ngày hiện tại theo múi giờ GMT+7 chuẩn (dd/MM/yyyy)
   */
  todayGMT7String() {
    return this.formatDate(new Date());
  }

  /**
   * Sinh mã giao dịch thuần số ngắn gọn (8 chữ số), không tiền tố chữ cái
   */
  generateTxnId() {
    const timePart = Math.floor((Date.now() / 1000) % 10000);
    const randPart = Math.floor(1000 + Math.random() * 9000);
    return `${timePart}${randPart}`;
  }

  /**
   * Định dạng mã giao dịch để luôn hiển thị thuần số gọn gàng, loại bỏ các tiền tố như TXN-, TXN-SAV-, TXN-CARD-
   */
  formatTxnId(id) {
    if (!id && id !== 0) return '';
    const str = String(id).trim();
    const cleanDigits = str.replace(/^[A-Za-z_-]+/g, '').replace(/\D/g, '');
    return cleanDigits || str;
  }

  // Hàm hỗ trợ ghi nhật ký hệ thống (Audit log)
  addAuditLog(user, action) {
    const log = {
      id: 'LOG-' + Date.now(),
      user: user || 'system',
      action: action,
      timestamp: this.nowGMT7String()
    };
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.saveSessionBusinessData();

    if (typeof window !== 'undefined' && window.BankApiService && window.BankApiService.recordAuditLog) {
      window.BankApiService.recordAuditLog(user || 'system', action).catch(() => {});
    }
  }
}

export const store = new BankStore();


