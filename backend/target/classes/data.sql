-- Seed Data for MySQL QuangTrung Bank
-- Mật khẩu mặc định: Abc@1234 (đã được mã hóa BCrypt an toàn trước khi nạp vào CSDL)

INSERT IGNORE INTO users (id, username, password, role, full_name, email, phone, failed_login_attempts) VALUES 
(1, 'customer1', '$2a$12$JS50NeKjFVGuf2fbcsGX.eYONBJX/YuRn0e2qvQHqYM4NqEljgWpy', 'CUSTOMER', 'Nguyễn Văn An', 'an.nguyen@example.com', '0901234567', 0),
(2, 'customer2', '$2a$12$JS50NeKjFVGuf2fbcsGX.eYONBJX/YuRn0e2qvQHqYM4NqEljgWpy', 'CUSTOMER', 'Trần Thị Bình', 'binh.tran@example.com', '0987654321', 0),
(3, 'teller1', '$2a$12$JS50NeKjFVGuf2fbcsGX.eYONBJX/YuRn0e2qvQHqYM4NqEljgWpy', 'TELLER', 'Phạm Minh Đức', 'duc.pm@quangtrungbank.com', '0933445566', 0),
(4, 'admin', '$2a$12$JS50NeKjFVGuf2fbcsGX.eYONBJX/YuRn0e2qvQHqYM4NqEljgWpy', 'ADMIN', 'Lê Quang Trưởng', 'admin@quangtrungbank.com', '0900000000', 0);

INSERT IGNORE INTO customers (id, user_id, id_card, address) VALUES
('CUST-1001', 1, '001098123456', '123 Đường Lê Lợi, Quận 1, TP. HCM'),
('CUST-1002', 2, '001098654321', '456 Đường Nguyễn Huệ, Quận 3, TP. HCM');

INSERT IGNORE INTO tellers (id, user_id, staff_code, branch, permissions) VALUES
('TELLER-001', 3, 'GDV001', 'Hội Sở QuangTrung Bank', 'PERM_CREATE_CUSTOMER,PERM_EDIT_CUSTOMER,PERM_MANAGE_ACCOUNT,PERM_HANDLE_TICKETS');

INSERT IGNORE INTO accounts (id, account_no, customer_id, type, balance, currency, status, created_at) VALUES
(1, '1000123456', 'CUST-1001', 'PAYMENT', 250000000.00, 'VND', 'ACTIVE', '2025-01-15 08:00:00'),
(3, '1000987654', 'CUST-1002', 'PAYMENT', 85500000.00, 'VND', 'ACTIVE', '2025-03-10 14:15:00');

INSERT IGNORE INTO transactions (id, from_account, from_name, to_account, to_name, amount, fee, type, content, timestamp, status) VALUES
('TXN-90281', '1000123456', 'Nguyễn Văn An', '1000987654', 'Trần Thị Bình', 5000000.00, 0.00, 'TRANSFER', 'Chuyển tiền mua máy tính', '2026-08-01 10:30:15', 'SUCCESS'),
('TXN-90282', 'HỆ THỐNG', 'Ngân hàng QuangTrung Bank', '1000123456', 'Nguyễn Văn An', 45000000.00, 0.00, 'DEPOSIT', 'Nhận lương tháng 07/2026', '2026-08-02 08:15:00', 'SUCCESS');

INSERT IGNORE INTO atm_codes (id, code, customer_id, account_no, type, amount, pin, status, created_at) VALUES
('ATMC-892104', '892104', 'CUST-1001', '1000123456', 'WITHDRAW', 1000000.00, '1234', 'PENDING', '2026-08-07 08:30:00');

INSERT IGNORE INTO support_tickets (id, customer_id, customer_name, account_no, subject, content, status, assigned_to, response, created_at) VALUES
('TCK-101', 'CUST-1001', 'Nguyễn Văn An', '1000123456', 'Yêu cầu nâng hạn mức chuyển tiền', 'Tôi muốn nâng hạn mức chuyển khoản từ 100M lên 500M/ngày', 'PENDING', 'GDV001', '', '2026-08-03 09:00:00');

INSERT IGNORE INTO savings_interest_rates (id, term_months, label, annual_rate, min_amount, effective_from, is_active) VALUES
(1, 0, 'Không kỳ hạn', 0.20, 100000.00, '2026-01-01', true),
(2, 1, '1 Tháng', 4.50, 1000000.00, '2026-01-01', true),
(3, 3, '3 Tháng', 5.20, 1000000.00, '2026-01-01', true),
(4, 6, '6 Tháng', 6.50, 1000000.00, '2026-01-01', true),
(5, 12, '12 Tháng', 7.20, 1000000.00, '2026-01-01', true),
(6, 24, '24 Tháng', 7.80, 1000000.00, '2026-01-01', true),
(7, 36, '36 Tháng', 8.00, 5000000.00, '2026-01-01', true);

INSERT IGNORE INTO audit_logs (id, `user`, action, timestamp) VALUES
(1, 'system', 'Khởi tạo CSDL MySQL tối ưu cho QuangTrung Bank', '2026-08-03 08:00:00');
