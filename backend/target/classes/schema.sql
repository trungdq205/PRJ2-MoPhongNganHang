-- Optimized Database Schema Script for MySQL (quangtrung_bank)
-- Phiên bản bảo mật cấp ngân hàng: BCrypt password, Account lockout

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- BCrypt hash (60 ký tự, tăng lên 255 để dự phòng)
    role VARCHAR(20) NOT NULL, -- CUSTOMER, TELLER, ADMIN
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    failed_login_attempts INT NOT NULL DEFAULT 0, -- Số lần nhập sai mật khẩu liên tiếp
    account_locked_until DATETIME NULL, -- Thời điểm mở khóa tài khoản (null = không khóa)
    last_failed_login DATETIME NULL, -- Thời điểm đăng nhập sai gần nhất
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    user_id BIGINT UNIQUE,
    id_card VARCHAR(20) NOT NULL UNIQUE,
    address VARCHAR(255),
    kyc_status VARCHAR(20) DEFAULT 'NOT_VERIFIED', -- NOT_VERIFIED, PENDING, VERIFIED, REJECTED
    id_card_front LONGTEXT NULL,
    id_card_back LONGTEXT NULL,
    selfie_photo LONGTEXT NULL,
    kyc_verified_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tellers (
    id VARCHAR(50) PRIMARY KEY,
    user_id BIGINT UNIQUE,
    staff_code VARCHAR(20) NOT NULL UNIQUE,
    branch VARCHAR(100) DEFAULT 'Hội Sở QuangTrung Bank',
    permissions TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_no VARCHAR(20) NOT NULL UNIQUE,
    customer_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- PAYMENT, SAVINGS
    balance DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'VND',
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, LOCKED, CLOSED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_acc_customer (customer_id),
    INDEX idx_acc_no (account_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    from_account VARCHAR(50) NOT NULL,
    from_name VARCHAR(100) NOT NULL,
    to_account VARCHAR(50) NOT NULL,
    to_name VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0.00,
    type VARCHAR(20) NOT NULL, -- TRANSFER, DEPOSIT, WITHDRAW
    content VARCHAR(255),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    INDEX idx_from_acc_time (from_account, timestamp DESC),
    INDEX idx_to_acc_time (to_account, timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS atm_codes (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    customer_id VARCHAR(50) NOT NULL,
    account_no VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL, -- WITHDRAW, DEPOSIT
    amount DECIMAL(15, 2) NOT NULL,
    pin VARCHAR(20) DEFAULT '1234',
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED, EXPIRED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (account_no) REFERENCES accounts(account_no) ON DELETE CASCADE,
    INDEX idx_atm_code_lookup (code, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    account_no VARCHAR(30),
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RESOLVED, REJECTED
    assigned_to VARCHAR(50),
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user` VARCHAR(50) NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    account_no VARCHAR(50),
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500),
    amount DECIMAL(15, 2) DEFAULT 0.00,
    balance_after DECIMAL(15, 2) DEFAULT 0.00,
    type VARCHAR(20) NOT NULL DEFAULT 'MONEY_IN',
    recipient_role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_cust_time (customer_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

