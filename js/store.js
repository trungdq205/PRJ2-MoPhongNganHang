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
      cardIssuanceFee: 50000,
      freeTransferForEkyc: true
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
    { id: 'PERM_VERIFY_EKYC', name: 'Thẩm định & Phê duyệt eKYC', category: 'Khách Hàng & Định Danh', desc: 'Phê duyệt trạng thái định danh điện tử CCCD và khuôn mặt' },

    // Nhóm 2: Tài khoản & Tiền gửi
    { id: 'PERM_MANAGE_ACCOUNT', name: 'Khóa / Mở / Đóng tài khoản', category: 'Tài Khoản & Tiền Gửi', desc: 'Thay đổi trạng thái hoạt động của tài khoản thanh toán' },
    { id: 'PERM_OPEN_SAVINGS', name: 'Mở sổ & Tất toán Tiết kiệm', category: 'Tài Khoản & Tiền Gửi', desc: 'Thực hiện nghiệp vụ gửi tiền có kỳ hạn / không kỳ hạn tại quầy' },
    { id: 'PERM_MANAGE_CARDS', name: 'Phát hành & Quản lý Thẻ ATM/Debit', category: 'Tài Khoản & Tiền Gửi', desc: 'Phát hành thẻ, cấp lại PIN, khóa thẻ và cấu hình hạn mức' },

    // Nhóm 3: Tín dụng & Cho vay
    { id: 'PERM_REVIEW_LOANS', name: 'Tiếp nhận & Thẩm định vay vốn', category: 'Tín Dụng & Cho Vay', desc: 'Xem hồ sơ xin vay, thẩm định nguồn thu và lập tờ trình tín dụng' },
    { id: 'PERM_VERIFY_COLLATERAL', name: 'Kiểm tra & Thu giữ TSBĐ gốc', category: 'Tín Dụng & Cho Vay', desc: 'Kiểm tra sổ đỏ, cà vẹt gốc tại quầy và lập biên bản niêm phong kho quỹ' },
    { id: 'PERM_APPROVE_LOANS', name: 'Phê duyệt & Giải ngân khoản vay', category: 'Tín Dụng & Cho Vay', desc: 'Thẩm quyền quyết định giải ngân tiền vay trực tiếp vào TK khách hàng' },

    // Nhóm 4: Chăm sóc & Vận hành
    { id: 'PERM_HANDLE_TICKETS', name: 'Xử lý khiếu nại & Hỗ trợ KH', category: 'Chăm Sóc & Vận Hành', desc: 'Tiếp nhận phản hồi và xử lý các ticket yêu cầu hỗ trợ' },

    // Nhóm 5: Quản trị & Giám sát
    { id: 'PERM_VIEW_REPORTS', name: 'Xem báo cáo thống kê & Tài chính', category: 'Quản Trị & Giám Sát', desc: 'Xem biểu đồ thanh khoản, doanh thu và báo cáo phân tích' },
    { id: 'PERM_MANAGE_TELLERS', name: 'Quản lý nhân sự & Phân quyền', category: 'Quản Trị & Giám Sát', desc: 'Thêm, sửa, khóa nhân viên và thiết lập ma trận quyền' },
    { id: 'PERM_SYSTEM_CONFIG', name: 'Cấu hình tham số & Biểu phí hệ thống', category: 'Quản Trị & Giám Sát', desc: 'Cài đặt lãi suất, hạn mức và biểu phí toàn ngân hàng' }
  ],
  roleTemplates: [
    {
      id: 'FRONT_TELLER',
      title: 'Giao Dịch Viên Quầy',
      desc: 'Phục vụ khách hàng tại quầy: Mở TK, gửi tiết kiệm, phát hành thẻ, xử lý khiếu nại',
      badgeClass: 'badge-teller',
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_HANDLE_TICKETS']
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
      desc: 'Kiểm soát phê duyệt cấp tín dụng, giải ngân, duyệt eKYC và xem báo cáo chi nhánh',
      badgeClass: 'badge-admin',
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_VERIFY_EKYC', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS', 'PERM_HANDLE_TICKETS', 'PERM_VIEW_REPORTS']
    }
  ],
  customers: [
    {
      id: 'CUST-1001',
      username: 'customer1',
      password: 'Abc@1234',
      role: 'CUSTOMER',
      fullName: 'Nguyễn Văn An',
      idCard: '001098123456',
      phone: '0901234567',
      email: 'an.nguyen@example.com',
      address: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh',
      kycStatus: 'VERIFIED', // VERIFIED, NOT_VERIFIED, PENDING, REJECTED
      idCardFront: null,
      idCardBack: null,
      selfiePhoto: null,
      kycVerifiedAt: '2025-01-15 10:00:00',
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      accounts: [
        {
          accountNo: '1000123456',
          type: 'PAYMENT', // PAYMENT: Thanh toán, SAVINGS: Tiết kiệm
          balance: 250000000,
          currency: 'VNĐ',
          status: 'ACTIVE', // ACTIVE: Hoạt động, LOCKED: Khóa, CLOSED: Đóng
          createdAt: '2025-01-15'
        }
      ],
      cards: [
        {
          id: 'CARD-1001-1',
          cardNumber: '4532990011228899',
          maskedNumber: '4532 •••• •••• 8899',
          cardHolder: 'NGUYEN VAN AN',
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
          linkedAccountNo: '1000123456',
          issuedAt: '2024-01-15'
        },
        {
          id: 'CARD-1001-2',
          cardNumber: '9704220055667788',
          maskedNumber: '9704 •••• •••• 7788',
          cardHolder: 'NGUYEN VAN AN',
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
          linkedAccountNo: '1000123456',
          issuedAt: '2024-06-20'
        }
      ]
    },
    {
      id: 'CUST-1002',
      username: 'customer2',
      password: 'Abc@1234',
      role: 'CUSTOMER',
      fullName: 'Trần Thị Bình',
      idCard: '001098654321',
      phone: '0988765432',
      email: 'binh.tran@example.com',
      address: '456 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      kycStatus: 'NOT_VERIFIED',
      idCardFront: null,
      idCardBack: null,
      selfiePhoto: null,
      kycVerifiedAt: null,
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      accounts: [
        {
          accountNo: '1000987654',
          type: 'PAYMENT',
          balance: 85000000,
          currency: 'VNĐ',
          status: 'ACTIVE',
          createdAt: '2025-01-20'
        }
      ],
      cards: [
        {
          cardNumber: '5241 •••• •••• 1234',
          cardHolder: 'TRAN THI BINH',
          cardType: 'DEBIT_NAPAS',
          expDate: '10/27',
          status: 'ACTIVE',
          dailyLimit: 50000000,
          isInternational: false
        }
      ]
    },
    {
      id: 'CUST-1003',
      username: 'customer3',
      password: 'Abc@1234',
      role: 'CUSTOMER',
      fullName: 'Lê Hoàng Nam',
      idCard: '001098456789',
      phone: '0912345678',
      email: 'nam.le@example.com',
      address: '789 Đường Cầu Giấy, Quận Cầu Giấy, Hà Nội',
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      accounts: [
        {
          accountNo: '1000456789',
          type: 'PAYMENT',
          balance: 15000000,
          currency: 'VND',
          status: 'ACTIVE',
          createdAt: '2025-05-20'
        }
      ],
      cards: []
    }
  ],
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
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS', 'PERM_HANDLE_TICKETS']
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
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS', 'PERM_HANDLE_TICKETS']
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
      permissions: ['PERM_CREATE_CUSTOMER', 'PERM_EDIT_CUSTOMER', 'PERM_VERIFY_EKYC', 'PERM_MANAGE_ACCOUNT', 'PERM_OPEN_SAVINGS', 'PERM_MANAGE_CARDS', 'PERM_REVIEW_LOANS', 'PERM_VERIFY_COLLATERAL', 'PERM_APPROVE_LOANS', 'PERM_HANDLE_TICKETS', 'PERM_VIEW_REPORTS']
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
  transactions: [
    {
      id: 'TXN-CARD-8801',
      fromAccount: '1000123456',
      fromName: 'Nguyễn Văn An',
      toAccount: 'POS-SHOPEE-VN',
      toName: 'Shopee E-Commerce Vietnam',
      amount: 1450000,
      fee: 0,
      type: 'CARD_POS',
      channel: 'ONLINE',
      cardNumber: '4532990011228899',
      merchantName: 'Shopee Official Store VN',
      terminalId: 'POS-ONLINE-SP99',
      traceNo: 'TRC892102',
      authCode: 'AUTH7741',
      content: 'Thanh toán trực tuyến đơn hàng Shopee #SPX882910',
      timestamp: '2026-08-14 19:45:10',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-CARD-8802',
      fromAccount: '1000123456',
      fromName: 'Nguyễn Văn An',
      toAccount: 'POS-HIGHLANDS',
      toName: 'Highlands Coffee - Vincom Mega Mall',
      amount: 125000,
      fee: 0,
      type: 'CARD_POS',
      channel: 'POS',
      cardNumber: '4532990011228899',
      merchantName: 'Highlands Coffee #045 Vincom',
      terminalId: 'POS-HL-VC02',
      traceNo: 'TRC892103',
      authCode: 'AUTH5512',
      content: 'Quẹt thẻ Contactless tại Highlands Coffee',
      timestamp: '2026-08-15 08:30:22',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-CARD-8803',
      fromAccount: '1000123456',
      fromName: 'Nguyễn Văn An',
      toAccount: 'ATM-QTB-01',
      toName: 'Cây ATM QuangTrung Bank - Chi nhánh Hoàn Kiếm',
      amount: 2000000,
      fee: 1100,
      type: 'CARD_ATM',
      channel: 'ATM',
      cardNumber: '4532990011228899',
      merchantName: 'ATM QuangTrung Bank Hoan Kiem',
      terminalId: 'ATM-HN-HK01',
      traceNo: 'TRC892104',
      authCode: 'AUTH9933',
      content: 'Rút tiền mặt tại ATM bằng thẻ Visa Platinum',
      timestamp: '2026-08-16 11:15:00',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-CARD-8804',
      fromAccount: '1000123456',
      fromName: 'Nguyễn Văn An',
      toAccount: 'POS-WINMART',
      toName: 'WinMart+ Times City',
      amount: 485000,
      fee: 0,
      type: 'CARD_POS',
      channel: 'POS',
      cardNumber: '4532990011228899',
      merchantName: 'WinMart Plus Times City',
      terminalId: 'POS-WM-TC01',
      traceNo: 'TRC892105',
      authCode: 'AUTH3319',
      content: 'Thanh toán mua hàng tạp hóa siêu thị WinMart',
      timestamp: '2026-08-16 18:20:45',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-90281',
      fromAccount: '1000123456',
      fromName: 'Nguyễn Văn An',
      toAccount: '1000987654',
      toName: 'Trần Thị Bình',
      amount: 5000000,
      fee: 0,
      type: 'TRANSFER', // TRANSFER: Chuyển khoản, DEPOSIT: Nạp tiền, WITHDRAW: Rút tiền, INTEREST: Tiền lãi
      content: 'Chuyển tiền mua máy tính',
      timestamp: '2026-08-01 10:30:15',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-90282',
      fromAccount: 'HỆ THỐNG',
      fromName: 'Ngân hàng QuangTrung Bank',
      toAccount: '1000123456',
      toName: 'Nguyễn Văn An',
      amount: 45000000,
      fee: 0,
      type: 'DEPOSIT',
      content: 'Nhận lương tháng 07/2026 từ Công ty TechCorp',
      timestamp: '2026-08-02 08:15:00',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-90283',
      fromAccount: '1000987654',
      fromName: 'Trần Thị Bình',
      toAccount: '1000456789',
      toName: 'Lê Hoàng Nam',
      amount: 2500000,
      fee: 0,
      type: 'TRANSFER',
      content: 'Thanh toán tiền nhà',
      timestamp: '2026-08-03 14:20:00',
      status: 'SUCCESS'
    }
  ],
  tickets: [
    {
      id: 'TCK-101',
      customerId: 'CUST-1001',
      customerName: 'Nguyễn Văn An',
      accountNo: '1000123456',
      subject: 'Yêu cầu nâng hạn mức chuyển tiền trực tuyến',
      content: 'Tôi muốn nâng hạn mức chuyển khoản từ 100M/ngày lên 500M/ngày để thực hiện giao dịch bất động sản.',
      status: 'PENDING', // PENDING: Chờ xử lý, PROCESSING: Đang xử lý, RESOLVED: Đã giải quyết, REJECTED: Từ chối
      createdAt: '2026-08-03 09:00:00',
      assignedTo: 'GDV001',
      response: ''
    },
    {
      id: 'TCK-102',
      customerId: 'CUST-1002',
      customerName: 'Trần Thị Bình',
      accountNo: '1000987654',
      subject: 'Thắc mắc giao dịch trừ tiền không rõ lý do',
      content: 'Tài khoản của tôi bị trừ 50,000 VND vào ngày 01/08. Nhờ GDV hỗ trợ giải thích.',
      status: 'RESOLVED',
      createdAt: '2026-08-01 11:45:00',
      assignedTo: 'GDV002',
      response: 'Đã kiểm tra: Đây là phí duy trì dịch vụ SMS Banking định kỳ hàng tháng. Đã giải thích cho KH.'
    }
  ],
  auditLogs: [
    { id: 'LOG-1', user: 'admin', action: 'HỆ THỐNG Khởi tạo phiên bản 1.0', timestamp: '2026-08-03 08:00:00' }
  ],
  atmCodes: [
    {
      id: 'ATMC-892104',
      code: '892104',
      type: 'WITHDRAW',
      customerId: 'CUST-1001',
      customerName: 'Nguyễn Văn An',
      accountNo: '1000123456',
      amount: 1000000,
      pin: '1234',
      status: 'PENDING', // PENDING: Chờ rút, COMPLETED: Hoàn tất, CANCELLED: Hủy, EXPIRED: Hết hạn
      createdAt: '2026-08-07 08:30:00',
      completedAt: null
    }
  ],
  savingsAccounts: [
    {
      id: 'SAV-10821',
      customerId: 'CUST-1001',
      customerName: 'Nguyễn Văn An',
      savingsNo: '880011',
      depositAmount: 100000000,
      termMonths: 6,
      interestRate: 6.5,
      expectedInterest: 3250000,
      renewType: 'AUTO_ROLLOVER_ALL', // AUTO_ROLLOVER_ALL, ROLLOVER_PRINCIPAL, PAY_TO_PAYMENT_ACC
      sourceAccountNo: '1000123456',
      status: 'ACTIVE', // ACTIVE: Đang gửi, MATURED: Đã đáo hạn, CLOSED_EARLY: Tất toán trước hạn
      createdAt: '2026-06-01',
      maturityDate: '2026-12-01'
    },
    {
      id: 'SAV-10822',
      customerId: 'CUST-1002',
      customerName: 'Trần Thị Bình',
      savingsNo: '880022',
      depositAmount: 50000000,
      termMonths: 12,
      interestRate: 7.2,
      expectedInterest: 3600000,
      renewType: 'PAY_TO_PAYMENT_ACC',
      sourceAccountNo: '1000987654',
      status: 'ACTIVE',
      createdAt: '2026-01-15',
      maturityDate: '2027-01-15'
    }
  ],
  loanPackages: [
    { id: 'MORTGAGE', name: 'Vay Mua Nhà / Bất Động Sản', baseRate: 7.5, maxTerm: 240, maxAmount: 10000000000, desc: 'Lãi suất ưu đãi từ 7.5%/năm, thời hạn lên đến 20 năm, thế chấp bằng chính BĐS' },
    { id: 'CAR', name: 'Vay Mua Ô Tô Trả Góp', baseRate: 8.5, maxTerm: 84, maxAmount: 2000000000, desc: 'Lãi suất 8.5%/năm, tài trợ đến 85% giá trị xe, phê duyệt hồ sơ nhanh chóng' },
    { id: 'CONSUMER', name: 'Vay Tiêu Dùng Tín Chấp', baseRate: 10.5, maxTerm: 60, maxAmount: 500000000, desc: 'Không cần tài sản bảo đảm, duyệt vay dựa trên thu nhập lương chuyển khoản' },
    { id: 'BUSINESS', name: 'Vay Sản Xuất Kinh Doanh', baseRate: 8.0, maxTerm: 120, maxAmount: 5000000000, desc: 'Bổ sung vốn lưu động linh hoạt, lãi suất cạnh tranh cho hộ kinh doanh' },
    { id: 'OVERDRAFT', name: 'Cấp Hạn Mức Thấu Chi Tài Khoản', baseRate: 11.0, maxTerm: 12, maxAmount: 100000000, desc: 'Chi tiêu vượt số dư tài khoản thanh toán, tính lãi theo ngày thực tế' }
  ],
  loans: [
    {
      id: 'LOAN-701',
      contractNo: 'HDTD-2026-0881',
      customerId: 'CUST-1001',
      customerName: 'Nguyễn Văn An',
      accountNo: '1000123456',
      loanType: 'CONSUMER', // CONSUMER, CAR, MORTGAGE, BUSINESS, OVERDRAFT
      title: 'Vay tiêu dùng mua sắm nội thất gia đình',
      principalAmount: 120000000,
      remainingBalance: 90000000,
      termMonths: 12,
      interestRate: 9.5, // %/năm
      repaymentMethod: 'REDUCING_BALANCE', // REDUCING_BALANCE (Dư nợ giảm dần), ANNUITY (Góp đều)
      monthlyPayment: 10950000,
      nextDueDate: '2026-09-05',
      installmentPaidCount: 3,
      status: 'ACTIVE', // PENDING, ACTIVE, REJECTED, PAID_OFF
      appliedAt: '2026-05-01 09:30:00',
      approvedAt: '2026-05-02 14:15:00',
      approvedBy: 'Phạm Minh Đức (GDV001)',
      income: 35000000,
      incomeSource: 'Lương chuyển khoản Công ty TechCorp',
      collateral: 'Không (Tín chấp theo lương)',
      purpose: 'Mua sắm thiết bị nội thất và điện máy thông minh',
      rejectionReason: ''
    },
    {
      id: 'LOAN-702',
      contractNo: 'HDTD-2026-0912',
      customerId: 'CUST-1001',
      customerName: 'Nguyễn Văn An',
      accountNo: '1000123456',
      loanType: 'CAR',
      title: 'Vay mua xe ô tô điện VinFast VF8',
      principalAmount: 400000000,
      remainingBalance: 400000000,
      termMonths: 48,
      interestRate: 8.5,
      repaymentMethod: 'REDUCING_BALANCE',
      monthlyPayment: 11166667,
      nextDueDate: 'Chờ giải ngân',
      installmentPaidCount: 0,
      status: 'PENDING',
      appliedAt: '2026-08-16 10:20:00',
      approvedAt: null,
      approvedBy: null,
      income: 35000000,
      incomeSource: 'Hợp đồng lao động & Sao kê lương',
      collateral: 'Cà vẹt xe ô tô VinFast VF8 biển số 30K-889.99',
      purpose: 'Vay mua xe phục vụ đi lại gia đình',
      rejectionReason: ''
    },
    {
      id: 'LOAN-703',
      contractNo: 'HDTD-2025-0451',
      customerId: 'CUST-1002',
      customerName: 'Trần Thị Bình',
      accountNo: '1000987654',
      loanType: 'MORTGAGE',
      title: 'Vay mua nhà căn hộ chung cư EcoGreen',
      principalAmount: 1500000000,
      remainingBalance: 1425000000,
      termMonths: 120,
      interestRate: 7.5,
      repaymentMethod: 'ANNUITY',
      monthlyPayment: 17800000,
      nextDueDate: '2026-09-10',
      installmentPaidCount: 6,
      status: 'ACTIVE',
      appliedAt: '2026-02-01 08:30:00',
      approvedAt: '2026-02-03 16:00:00',
      approvedBy: 'Võ Thu Hà (GDV002)',
      income: 45000000,
      incomeSource: 'Kinh doanh cửa hàng mỹ phẩm & bất động sản',
      collateral: 'Sổ hồng căn hộ A12-08 EcoGreen Quận 7',
      purpose: 'Nhận chuyển nhượng căn hộ chung cư',
      rejectionReason: ''
    }
  ],
  beneficiaries: [
    {
      id: 'BENEF-001',
      customerId: 'CUST-1001',
      accountNo: '1000987654',
      name: 'Trần Thị Bình',
      bankName: 'QuangTrung Bank',
      nickname: 'Bình (Đồng nghiệp)'
    },
    {
      id: 'BENEF-002',
      customerId: 'CUST-1001',
      accountNo: '1000456789',
      name: 'Lê Hoàng Nam',
      bankName: 'QuangTrung Bank',
      nickname: 'Nam (Chủ nhà)'
    }
  ],
  savingsInterestRates: [
    { term: 1, label: '1 Tháng', rate: 4.5 },
    { term: 3, label: '3 Tháng', rate: 5.2 },
    { term: 6, label: '6 Tháng', rate: 6.5 },
    { term: 12, label: '12 Tháng', rate: 7.2 },
    { term: 24, label: '24 Tháng', rate: 7.8 }
  ]
};

class BankStore {
  constructor() {
    this.cleanLegacyBusinessStorage();
    this.systemConfig = this.loadSystemConfig();
    this.data = JSON.parse(JSON.stringify(initialSeedData)); // In-memory runtime state
    this.loadSessionBusinessData(); // Khôi phục dữ liệu nghiệp vụ trong phiên (sessionStorage)
  }

  /**
   * Khôi phục dữ liệu giao dịch & biến động số dư trong phiên làm việc (sessionStorage)
   */
  loadSessionBusinessData() {
    try {
      const raw = sessionStorage.getItem('QUANGTRUNG_BANK_SESSION_BUSINESS_DATA');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.customers && Array.isArray(parsed.customers)) {
        parsed.customers.forEach(c => {
          if (c.accounts && Array.isArray(c.accounts)) {
            c.accounts = c.accounts.filter(a => a.accountNo !== '8888123456');
          }
        });
        this.data.customers = parsed.customers;
      }
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        this.data.transactions = parsed.transactions.filter(t => t.fromAccount !== '8888123456' && t.toAccount !== '8888123456');
      }
      if (parsed.savingsAccounts && Array.isArray(parsed.savingsAccounts)) {
        parsed.savingsAccounts.forEach(s => {
          if (s.savingsNo) s.savingsNo = String(s.savingsNo).replace(/^STK-?/i, '');
        });
        this.data.savingsAccounts = parsed.savingsAccounts;
      }
      if (this.data.savingsAccounts && Array.isArray(this.data.savingsAccounts)) {
        this.data.savingsAccounts.forEach(s => {
          if (s.savingsNo) s.savingsNo = String(s.savingsNo).replace(/^STK-?/i, '');
        });
      }
      if (parsed.currentUser) {
        this.data.currentUser = parsed.currentUser;
      }
    } catch (e) {
      console.warn('Không thể đọc dữ liệu phiên làm việc:', e);
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
        transactions: this.data.transactions
      };
      sessionStorage.setItem('QUANGTRUNG_BANK_SESSION_BUSINESS_DATA', JSON.stringify(payload));
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

  // Hàm hỗ trợ ghi nhật ký hệ thống (Audit log)
  addAuditLog(user, action) {
    const log = {
      id: 'LOG-' + Date.now(),
      user: user,
      action: action,
      timestamp: this.nowGMT7String()
    };
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(log);
  }
}

export const store = new BankStore();


