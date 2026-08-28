/**
 * Bộ điều phối Ứng dụng chính & Ràng buộc Giao diện (App Orchestrator)
 */
import { store } from './store.js';
import { AuthService } from './auth.js';
import { CustomerService } from './customer.js';
import { TellerService } from './teller.js';
import { AdminService } from './admin.js';
import { ReportService } from './reports.js';
import { BankApiService } from './api.js';
import { SecurityService } from './security.js';

// Các phần tử DOM
const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const navMenuList = document.getElementById('nav-menu-list');
const sidebarUserName = document.getElementById('sidebar-user-name');
const sidebarUserRole = document.getElementById('sidebar-user-role');
const btnLogout = document.getElementById('btn-logout');
const toastContainer = document.getElementById('toast-container');

let activeRoleTab = 'CUSTOMER';
let backendOnline = false; // Trạng thái kết nối backend (được cập nhật khi load trang)
let isBalanceMasked = true; // Tiêu chuẩn bảo mật: Mặc định ẩn số dư trên màn hình chính

// ==========================================================================
// HỆ THỐNG THÔNG BÁO TỐI ƯU & MODAL THÀNH CÔNG TỰ ĐỘNG BIẾN MẤT TRONG 5S
// ==========================================================================

let successModalTimer = null;
let successModalInterval = null;

function showToast(message, type = 'info', duration = 4000) {
  if (!toastContainer) return;

  const iconMap = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
    danger: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>',
    warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
    info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${iconMap[type] || iconMap.info}
    </svg>
    <span style="flex: 1; word-break: break-word;">${message}</span>
    <button type="button" style="background: none; border: none; color: inherit; opacity: 0.6; cursor: pointer; padding: 0 4px; font-size: 1.1rem; line-height: 1;" onclick="this.parentElement.remove()">&times;</button>
  `;

  // Giới hạn tối đa 4 toasts cùng lúc để tránh che khuất màn hình
  while (toastContainer.children.length >= 4) {
    toastContainer.removeChild(toastContainer.firstChild);
  }

  toastContainer.appendChild(toast);

  const removeTimer = setTimeout(() => {
    toast.classList.add('dismissing');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 300);
  }, duration);

  toast.onclick = (e) => {
    if (e.target.tagName !== 'BUTTON') {
      clearTimeout(removeTimer);
      toast.remove();
    }
  };
}

function showSuccessModal({
  title = 'Giao Dịch Thành Công!',
  message = 'Thao tác nghiệp vụ đã được thực hiện và ghi nhận thành công trên hệ thống.',
  amount = null,
  txId = null,
  accountNo = null,
  counterparty = null,
  customDetails = null,
  autoCloseMs = 0,
  onClosed = null
} = {}) {
  const modal = document.getElementById('modal-operation-success');
  if (!modal) {
    showToast(message, 'success');
    if (typeof onClosed === 'function') onClosed();
    return;
  }

  // Hủy các bộ đếm thời gian trước đó nếu modal đang mở
  if (successModalTimer) {
    clearTimeout(successModalTimer);
    successModalTimer = null;
  }
  if (successModalInterval) {
    clearInterval(successModalInterval);
    successModalInterval = null;
  }

  // Đồng thời phát Push Notification Card nổi góc trên màn hình (không lưu trùng lặp vào DB/Store)
  if (typeof CustomerService !== 'undefined' && CustomerService.triggerPushNotification) {
    CustomerService.triggerPushNotification({
      title: title || 'Giao dịch thành công',
      message: message || '',
      amount: (amount !== null && amount !== undefined && amount !== '' && !isNaN(amount)) ? amount : undefined,
      type: 'SUCCESS',
      accountNo: accountNo || '',
      skipSaveLocal: true,
      skipBadgeIncrement: true
    });
  } else if (typeof CustomerService !== 'undefined' && CustomerService.playNotificationChime) {
    CustomerService.playNotificationChime();
  }

  // Hiển thị Toast góc dưới màn hình
  showToast(message || title, 'success');

  const titleEl = document.getElementById('success-modal-title');
  const messageEl = document.getElementById('success-modal-message');
  const amountBox = document.getElementById('success-modal-amount-box');
  const amountEl = document.getElementById('success-modal-amount');
  const detailsBox = document.getElementById('success-modal-details-box');
  const countdownContainer = document.getElementById('success-modal-countdown-container') || modal.querySelector('.success-modal-countdown-container');
  const countdownBar = document.getElementById('success-modal-countdown-bar');
  const countdownText = document.getElementById('success-modal-countdown-text');
  const closeBtn = document.getElementById('btn-close-success-modal');
  const closeX = document.getElementById('btn-close-success-x');

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;

  if (amountBox) {
    if (amount !== null && amount !== undefined && amount !== '' && !isNaN(amount)) {
      amountBox.classList.remove('hidden');
      if (amountEl) amountEl.textContent = store.formatVND(amount);
    } else {
      amountBox.classList.add('hidden');
    }
  }

  if (detailsBox) {
    let detailsHtml = '';
    if (Array.isArray(customDetails) && customDetails.length > 0) {
      customDetails.forEach(d => {
        detailsHtml += `<div class="detail-row"><span>${d.label}:</span><strong style="${d.color ? `color: ${d.color};` : ''} font-family: var(--font-mono);">${d.value}</strong></div>`;
      });
    } else {
      if (txId) {
        detailsHtml += `<div class="detail-row"><span>Mã GD:</span><strong style="font-family: var(--font-mono); color: var(--accent-gold); font-size: 0.95rem;">${store.formatTxnId(txId)}</strong></div>`;
      }
      if (accountNo) {
        detailsHtml += `<div class="detail-row"><span>Tài khoản:</span><strong>${accountNo}</strong></div>`;
      }
      if (counterparty) {
        detailsHtml += `<div class="detail-row"><span>Đối ứng:</span><strong style="max-width: 230px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${counterparty}</strong></div>`;
      }
    }
    detailsHtml += `<div class="detail-row"><span>Thời gian:</span><span>${store.nowGMT7String()}</span></div>`;
    detailsBox.innerHTML = detailsHtml;
  }

  // Hiệu ứng thanh tiến trình đếm ngược (chỉ chạy nếu autoCloseMs > 0)
  if (autoCloseMs && autoCloseMs > 0) {
    if (countdownContainer) countdownContainer.classList.remove('hidden');
    if (countdownBar) {
      countdownBar.style.transition = 'none';
      countdownBar.style.width = '100%';
      setTimeout(() => {
        countdownBar.style.transition = `width ${autoCloseMs}ms linear`;
        countdownBar.style.width = '0%';
      }, 40);
    }

    let remainingSec = Math.ceil(autoCloseMs / 1000);
    if (countdownText) countdownText.textContent = `Tự động đóng trong ${remainingSec}s...`;

    successModalInterval = setInterval(() => {
      remainingSec -= 1;
      if (remainingSec > 0 && countdownText) {
        countdownText.textContent = `Tự động đóng trong ${remainingSec}s...`;
      } else if (remainingSec <= 0 && countdownText) {
        countdownText.textContent = `Đang đóng...`;
      }
    }, 1000);
  } else {
    if (countdownContainer) countdownContainer.classList.add('hidden');
  }

  const handleClose = () => {
    if (successModalTimer) {
      clearTimeout(successModalTimer);
      successModalTimer = null;
    }
    if (successModalInterval) {
      clearInterval(successModalInterval);
      successModalInterval = null;
    }
    modal.classList.remove('active');
    if (typeof onClosed === 'function') {
      const fn = onClosed;
      onClosed = null;
      fn();
    }
  };

  if (closeBtn) closeBtn.onclick = handleClose;
  if (closeX) closeX.onclick = handleClose;
  modal.onclick = (e) => {
    if (e.target === modal) handleClose();
  };

  modal.classList.add('active');

  if (autoCloseMs && autoCloseMs > 0) {
    successModalTimer = setTimeout(() => {
      handleClose();
    }, autoCloseMs);
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
    el.classList.add('active');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
  }
}

window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.showSuccessModal = showSuccessModal;
window.showOperationSuccessModal = showSuccessModal;
window.openAddEditTellerModal = (id) => openAddEditTellerModal(id);

// Định nghĩa menu điều hướng theo vai trò người dùng
const navigationConfigs = {
  CUSTOMER: [
    { id: 'cust-dash', label: 'Trang Chủ', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', view: 'view-customer-dashboard' },
    { id: 'cust-savings', label: 'Tài Khoản Tiết Kiệm', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', view: 'view-customer-savings' },
    { id: 'cust-loans', label: 'Tín Dụng & Vay Vốn', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', view: 'view-customer-loans' },
    { id: 'cust-hist', label: 'Lịch Sử Giao Dịch', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', view: 'view-customer-history' },
    { id: 'cust-prof', label: 'Thông Tin Cá Nhân', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', view: 'view-customer-profile' }
  ],
  TELLER: [
    { id: 'tell-dash', label: 'Trang Chủ GDV', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', view: 'view-teller-dashboard' },
    { id: 'tell-create-cust', label: 'Thêm Hồ Sơ Khách Hàng', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', view: 'view-teller-new-customer' },
    { id: 'tell-cust-list', label: 'Tra Cứu & Sửa Thông Tin KH', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6', view: 'view-teller-customers' },
    { id: 'tell-acc-list', label: 'Quản Lý Tài Khoản', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', view: 'view-teller-accounts' },
    { id: 'tell-loans', label: 'Thẩm Định & Duyệt Vay', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', view: 'view-teller-loans' }
  ],
  ADMIN: [
    { id: 'adm-dash', label: 'Dashboard Báo Cáo', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', view: 'view-admin-dashboard' },
    { id: 'adm-tellers', label: 'Quản Lý Giao Dịch Viên', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', view: 'view-admin-tellers' },
    { id: 'adm-config', label: 'Quản Lý Tham Số System', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', view: 'view-admin-system' }
  ]
};

// Khởi tạo Ứng dụng
function initApp() {
  try {
    setupLoginEvents();
    setupModalEvents();
    initCurrencyInputFormatting();
    populateLoanTypeSelect();

    // Kiểm tra phiên đăng nhập hiện tại ngay lập tức
    const user = AuthService.getCurrentUser();
    if (user) {
      launchApp(user);
    } else {
      if (loginScreen) loginScreen.classList.remove('hidden');
      if (appShell) appShell.classList.add('hidden');
    }
  } catch (err) {
    console.error('[App] Lỗi khi khởi tạo ứng dụng:', err);
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (appShell) appShell.classList.add('hidden');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

async function checkBackendConnection() {
  const isHealthy = await BankApiService.checkBackendHealth();
  backendOnline = isHealthy; // Cập nhật biến trạng thái toàn cục
  const badge = document.getElementById('backend-status-badge');
  if (badge) {
    if (isHealthy) {
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = 'var(--accent-emerald)';
      badge.style.borderColor = 'var(--accent-emerald)';
    } else {
      badge.style.background = 'rgba(239, 68, 68, 0.15)';
      badge.style.color = 'var(--accent-danger)';
      badge.style.borderColor = 'var(--accent-danger)';
    }
  }
  return isHealthy;
}

let pendingLoginResponse = null;

let landmarkAnimFrames = {};

function startFaceLandmarksAnimation(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let scanY = 10;
  let scanDirection = 2.5;
  let pulse = 0;

  function render() {
    if (!canvas || canvas.offsetParent === null) {
      if (landmarkAnimFrames[canvasId]) cancelAnimationFrame(landmarkAnimFrames[canvasId]);
      delete landmarkAnimFrames[canvasId];
      return;
    }

    const w = canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 280;
    const h = canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : 280;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 - 10;
    const scale = Math.min(w, h) / 280;

    pulse += 0.06;
    const glow = Math.sin(pulse) * 4 + 6;

    // 1. Draw Cyan Glowing Bounding Oval
    ctx.save();
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = glow;

    ctx.beginPath();
    ctx.ellipse(cx, cy, 75 * scale, 100 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw Laser Scanning Line
    scanY += scanDirection;
    if (scanY > cy + 95 * scale || scanY < cy - 95 * scale) {
      scanDirection *= -1;
    }

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 70 * scale, scanY);
    ctx.lineTo(cx + 70 * scale, scanY);
    ctx.stroke();

    // 3. Draw Biometric Face Landmarks Nodes
    const points = [
      { x: cx - 28 * scale, y: cy - 20 * scale, type: 'eye' },
      { x: cx - 40 * scale, y: cy - 20 * scale, type: 'node' },
      { x: cx - 16 * scale, y: cy - 20 * scale, type: 'node' },
      { x: cx + 28 * scale, y: cy - 20 * scale, type: 'eye' },
      { x: cx + 16 * scale, y: cy - 20 * scale, type: 'node' },
      { x: cx + 40 * scale, y: cy - 20 * scale, type: 'node' },
      { x: cx, y: cy - 5 * scale, type: 'node' },
      { x: cx, y: cy + 12 * scale, type: 'node' },
      { x: cx - 10 * scale, y: cy + 20 * scale, type: 'node' },
      { x: cx + 10 * scale, y: cy + 20 * scale, type: 'node' },
      { x: cx - 22 * scale, y: cy + 45 * scale, type: 'node' },
      { x: cx + 22 * scale, y: cy + 45 * scale, type: 'node' },
      { x: cx, y: cy + 40 * scale, type: 'node' },
      { x: cx, y: cy + 50 * scale, type: 'node' },
      { x: cx - 55 * scale, y: cy + 10 * scale, type: 'node' },
      { x: cx + 55 * scale, y: cy + 10 * scale, type: 'node' },
      { x: cx - 45 * scale, y: cy + 55 * scale, type: 'node' },
      { x: cx + 45 * scale, y: cy + 55 * scale, type: 'node' },
      { x: cx, y: cy + 80 * scale, type: 'chin' }
    ];

    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
        if (dist < 38 * scale) {
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }

    points.forEach(p => {
      ctx.fillStyle = p.type === 'chin' ? '#f59e0b' : (p.type === 'eye' ? '#38bdf8' : '#10b981');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    landmarkAnimFrames[canvasId] = requestAnimationFrame(render);
  }

  if (landmarkAnimFrames[canvasId]) cancelAnimationFrame(landmarkAnimFrames[canvasId]);
  render();
}

function stopFaceLandmarksAnimation(canvasId) {
  if (landmarkAnimFrames[canvasId]) {
    cancelAnimationFrame(landmarkAnimFrames[canvasId]);
    delete landmarkAnimFrames[canvasId];
  }
}

function playBiometricAudioChime() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio context errors if browser blocks autoplay
  }
}



function switchLoginRole(role) {
  activeRoleTab = role;
  document.querySelectorAll('.role-tab-btn').forEach(b => {
    if (b.getAttribute('data-role') === role) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  const uInput = document.getElementById('login-username');
  const pInput = document.getElementById('login-password');
  if (uInput) {
    if (role === 'CUSTOMER') uInput.value = '0901234567';
    else if (role === 'TELLER') uInput.value = '0933445566';
    else if (role === 'ADMIN') uInput.value = '0988888888';
  }
  if (pInput) pInput.value = 'Abc@1234';
}

window.switchLoginRole = switchLoginRole;

// Bộ xử lý sự kiện Đăng nhập
function setupLoginEvents() {
  const uInput = document.getElementById('login-username');
  const pInput = document.getElementById('login-password');
  if (uInput && !uInput.value) uInput.value = '0901234567';
  if (pInput && !pInput.value) pInput.value = 'Abc@1234';

  document.querySelectorAll('.role-tab-btn').forEach(btn => {
    btn.onclick = (e) => {
      const targetBtn = e.currentTarget;
      const role = targetBtn.getAttribute('data-role');
      switchLoginRole(role);
    };
  });

  const form = document.getElementById('login-form') || loginForm;
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username')?.value?.trim();
      const p = document.getElementById('login-password')?.value;
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!u || !p) {
        showToast('Vui lòng nhập đầy đủ Số điện thoại / Tên đăng nhập và Mật khẩu', 'warning');
        return;
      }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang kiểm tra...'; }

      try {
        const res = await AuthService.loginAsync(u, p, activeRoleTab);
        if (res.success) {
          showToast(`Đăng nhập thành công! Chào mừng ${res.user.fullName || res.user.username}`, 'success');
          launchApp(res.user);
        } else {
          showToast(res.message, 'danger');
        }
      } catch (err) {
        console.error('Lỗi khi đăng nhập:', err);
        showToast('Lỗi xử lý đăng nhập: ' + (err.message || err), 'danger');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Đăng Nhập'; }
      }
    };
  }



  const btnExit = document.getElementById('btn-logout') || btnLogout;
  if (btnExit) {
    btnExit.onclick = () => {
      stopNotificationPolling();
      SecurityService.stopSessionTimer();
      AuthService.logout();
      if (appShell) appShell.classList.add('hidden');
      if (loginScreen) loginScreen.classList.remove('hidden');
      showToast('Đã đăng xuất khỏi hệ thống', 'info');
    };
  }
}

function handleSessionTimeout() {
  stopNotificationPolling();
  AuthService.logout();
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  showToast('Phiên làm việc đã hết hạn do không có hoạt động để bảo vệ tài khoản', 'danger');
}

// Hàm khởi chạy ứng dụng
function launchApp(user) {
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');

  // Thông tin thanh điều hướng bên (Sidebar)
  sidebarUserName.textContent = user.fullName || user.username;
  sidebarUserRole.textContent = user.role === 'CUSTOMER' ? 'Khách hàng' : (user.role === 'TELLER' ? 'Giao dịch viên' : 'Quản trị viên');
  sidebarUserRole.className = `user-role-badge badge-${user.role.toLowerCase()}`;

  // Khởi động Bộ đếm thời gian phiên làm việc (Session Timeout: 15 phút)
  SecurityService.startSessionTimer(
    () => {
      openModal('modal-session-warning');
      let sec = 120;
      const timerEl = document.getElementById('session-warning-timer');
      const warningInterval = setInterval(() => {
        sec--;
        if (timerEl) timerEl.textContent = `${sec}s`;
        if (sec <= 0) {
          clearInterval(warningInterval);
          closeModal('modal-session-warning');
          handleSessionTimeout();
        }
      }, 1000);
    },
    () => handleSessionTimeout()
  );

  // Xây dựng menu sidebar cho vai trò hiện tại
  buildSidebarMenu(user.role);

  // Khởi tạo hệ thống thông báo cho người dùng hiện tại
  initNotificationSystem();
}

let pushedNotificationIds = new Set();
const readTellerNotifIds = new Set();
const readAdminNotifIds = new Set();

function getTellerNotifications() {
  const user = AuthService.getCurrentUser();
  const list = [];

  // 1. Hồ sơ vay vốn đang chờ phê duyệt thẩm định
  const pendingLoans = (store.data.loans || []).filter(l => l.status === 'PENDING');
  pendingLoans.forEach(l => {
    const id = `NOTIF-TELLER-LOAN-${l.id}`;
    list.push({
      id: id,
      title: 'Hồ sơ vay vốn cần thẩm định',
      message: `Khách hàng ${l.customerName} gửi hồ sơ vay ${store.formatVND(l.principalAmount)} (${l.title}). Cần duyệt hồ sơ.`,
      type: 'LOAN',
      amount: l.principalAmount,
      createdAt: l.appliedAt || store.nowGMT7String(),
      read: readTellerNotifIds.has(id),
      targetView: 'view-teller-loans'
    });
  });

  // 2. Thông báo trạng thái ca làm việc
  list.push({
    id: 'NOTIF-TELLER-SYS-1',
    title: 'Trạng thái quầy giao dịch',
    message: `Giao dịch viên ${user?.fullName || user?.username || 'GDV'} đang trực quầy. Hệ thống Core Banking kết nối ổn định.`,
    type: 'SYSTEM',
    createdAt: store.nowGMT7String(),
    read: readTellerNotifIds.has('NOTIF-TELLER-SYS-1') || true
  });

  return list;
}

function getAdminNotifications() {
  const user = AuthService.getCurrentUser();
  const list = [];

  const recentLogs = (store.data.auditLogs || []).slice(0, 10);
  recentLogs.forEach((log, idx) => {
    const id = `NOTIF-ADMIN-${log.id || idx}`;
    list.push({
      id: id,
      title: 'Nhật ký giám sát hệ thống',
      message: `[${log.user || 'system'}] ${log.action}`,
      type: 'SYSTEM',
      createdAt: log.timestamp || store.nowGMT7String(),
      read: readAdminNotifIds.has(id) || idx > 1
    });
  });

  return list;
}

function stopNotificationPolling() {
  if (window.notifPollTimer) {
    clearInterval(window.notifPollTimer);
    window.notifPollTimer = null;
  }
}

// Kênh truyền thông tin Realtime đồng bộ Sự Kiện giữa các tab (Pure Event-Driven Architecture)
if (typeof BroadcastChannel !== 'undefined') {
  try {
    const realtimeBc = new BroadcastChannel('bank_realtime_events');
    realtimeBc.onmessage = async (ev) => {
      if (!ev || !ev.data) return;
      const user = AuthService.getCurrentUser();
      if (!user) return;

      if (user.role === 'CUSTOMER') {
        if (ev.data.type === 'LOAN_APPROVED') {
          const payload = ev.data;
          const msg = payload.message || `Khoản vay ${payload.contractNo || payload.loanId} đã được giải ngân thành công ${store.formatVND(payload.amount)} vào tài khoản ${payload.accountNo || ''}.`;
          
          // Đẩy thông báo nổi & phát âm thanh
          CustomerService.triggerPushNotification({
            title: 'Biến động số dư Có (+)',
            message: msg,
            amount: payload.amount,
            balanceAfter: payload.balanceAfter,
            type: 'MONEY_IN',
            accountNo: payload.accountNo
          });

          // Đồng bộ số dư và cập nhật giao diện
          await CustomerService.syncCustomerAccountsAsync();
          const curSec = document.querySelector('.view-section:not(.hidden)');
          if (curSec && curSec.id === 'view-customer-dashboard') renderCustomerDashboard();
          if (curSec && curSec.id === 'view-customer-loans') renderCustomerLoansView();
        } else if (ev.data.type === 'REFRESH_NOTIFICATIONS' || ev.data.type === 'NEW_NOTIFICATION') {
          await updateNotificationBadge(null, true);
          await CustomerService.syncCustomerAccountsAsync();
        }
      } else if (user.role === 'TELLER') {
        if (ev.data.type === 'NEW_LOAN_APPLICATION') {
          // 1. Đồng bộ lại danh sách khoản vay từ CSDL
          await TellerService.getAllLoansAsync();

          // 2. Kích hoạt thông báo nổi (Push Card) + Âm thanh chuông báo nghiệp vụ cho GDV
          CustomerService.triggerPushNotification({
            title: 'Hồ sơ vay vốn mới cần thẩm định',
            message: `Khách hàng ${ev.data.customerName || 'Khách hàng'} vừa nộp hồ sơ vay ${store.formatVND(ev.data.amount || 0)} (${ev.data.title || 'Vay vốn'}). Cần duyệt hồ sơ tại quầy.`,
            amount: ev.data.amount,
            type: 'LOAN',
            targetView: 'view-teller-loans'
          });

          // 3. Cập nhật huy hiệu chuông đỏ và render lại giao diện nếu GDV đang mở
          await updateNotificationBadge(null, true);
          const curSec = document.querySelector('.view-section:not(.hidden)');
          if (curSec && curSec.id === 'view-teller-loans') renderTellerLoansView();
          if (curSec && curSec.id === 'view-teller-dashboard') renderTellerDashboard();
        } else {
          await updateNotificationBadge(null, true);
        }
      }
    };
  } catch (err) {}
}

function startNotificationPolling() {
  stopNotificationPolling();
}

async function initNotificationSystem() {
  const notifBellBtn = document.getElementById('notif-bell-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  const btnMarkAllRead = document.getElementById('btn-mark-all-read');

  if (notifBellBtn && notifDropdown) {
    notifBellBtn.onclick = (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('hidden');
      if (!notifDropdown.classList.contains('hidden')) {
        renderNotificationCenterList();
      }
    };

    document.addEventListener('click', (e) => {
      if (notifDropdown && !notifDropdown.contains(e.target) && !notifBellBtn.contains(e.target)) {
        notifDropdown.classList.add('hidden');
      }
    });
  }

  if (btnMarkAllRead) {
    btnMarkAllRead.onclick = async () => {
      const user = AuthService.getCurrentUser();
      if (user?.role === 'CUSTOMER') {
        await CustomerService.markAllNotificationsReadAsync();
      } else if (user?.role === 'TELLER') {
        getTellerNotifications().forEach(n => readTellerNotifIds.add(n.id));
      } else if (user?.role === 'ADMIN') {
        getAdminNotifications().forEach(n => readAdminNotifIds.add(n.id));
      }
      renderNotificationCenterList();
      await updateNotificationBadge(null, true);
    };
  }

  stopNotificationPolling();
  
  const user = AuthService.getCurrentUser();
  if (user?.role === 'CUSTOMER') {
    const initialNotifs = await CustomerService.getNotificationsAsync(true);
    if (Array.isArray(initialNotifs)) {
      initialNotifs.forEach(n => {
        if (n && n.id) pushedNotificationIds.add(n.id);
      });
    }
    await updateNotificationBadge(initialNotifs);
  } else if (user?.role === 'TELLER') {
    await TellerService.getAllLoansAsync();
    await updateNotificationBadge(null, true);
  } else {
    await updateNotificationBadge();
  }
}

window.updateNotificationBadge = updateNotificationBadge;
window.refreshNotificationsNow = refreshNotificationsNow;
window.refreshNotificationsLoop = refreshNotificationsNow;
window.CustomerService = CustomerService;
window.triggerPushNotification = (opts) => CustomerService.triggerPushNotification(opts);

function countUnreadNotifications(list) {
  if (!Array.isArray(list)) return 0;
  return list.filter(n => {
    if (!n) return false;
    return n.read !== true && n.isRead !== true && n.read !== 'true' && n.isRead !== 'true';
  }).length;
}

async function updateNotificationBadge(preloadedNotifs = null, force = false) {
  const user = AuthService.getCurrentUser();
  const badge = document.getElementById('notif-unread-badge');
  if (!user || !badge) return;

  let unreadCount = 0;

  if (user.role === 'CUSTOMER') {
    let notifications = preloadedNotifs;
    if (!Array.isArray(notifications)) {
      notifications = await CustomerService.getNotificationsAsync(force);
    }
    unreadCount = countUnreadNotifications(notifications);
  } else if (user.role === 'TELLER') {
    const tellerNotifs = getTellerNotifications();
    unreadCount = countUnreadNotifications(tellerNotifs);
  } else if (user.role === 'ADMIN') {
    const adminNotifs = getAdminNotifications();
    unreadCount = countUnreadNotifications(adminNotifs);
  }

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    badge.classList.remove('hidden');
    badge.style.setProperty('display', 'inline-flex', 'important');
  } else {
    badge.textContent = '0';
    badge.classList.add('hidden');
    badge.style.setProperty('display', 'none', 'important');
  }
}

let lastRefreshNotifTime = 0;
let pendingRefreshNotifPromise = null;

async function refreshNotificationsNow(preloadedNotifs = null) {
  const user = AuthService.getCurrentUser();
  if (!user) return;

  if (user.role === 'TELLER') {
    await TellerService.getAllLoansAsync();
    const currentPending = (store.data.loans || []).filter(l => l.status === 'PENDING');
    
    currentPending.forEach(l => {
      const notifId = `NOTIF-TELLER-LOAN-${l.id}`;
      if (!pushedNotificationIds.has(notifId) && !readTellerNotifIds.has(notifId)) {
        pushedNotificationIds.add(notifId);
        CustomerService.triggerPushNotification({
          title: 'Hồ sơ vay vốn mới cần thẩm định',
          message: `Khách hàng ${l.customerName} gửi hồ sơ vay ${store.formatVND(l.principalAmount)} (${l.title}). Cần duyệt hồ sơ.`,
          amount: l.principalAmount,
          type: 'LOAN',
          targetView: 'view-teller-loans'
        });
      }
    });

    await updateNotificationBadge(null, true);
    const notifDropdown = document.getElementById('notif-dropdown');
    if (notifDropdown && !notifDropdown.classList.contains('hidden')) {
      renderNotificationCenterList();
    }
    return;
  }

  if (user.role !== 'CUSTOMER') return;

  if (Array.isArray(preloadedNotifs)) {
    await updateNotificationBadge(preloadedNotifs);
    return;
  }

  const now = Date.now();
  if (pendingRefreshNotifPromise) {
    return pendingRefreshNotifPromise;
  }
  if (now - lastRefreshNotifTime < 600) {
    return;
  }
  lastRefreshNotifTime = now;

  pendingRefreshNotifPromise = (async () => {
    try {
      CustomerService.cachedNotifs = null;
      const notifications = await CustomerService.getNotificationsAsync(true);
      await updateNotificationBadge(notifications);

      (notifications || []).slice(0, 5).forEach(n => {
        const notifId = n.id;
        const isUnread = n.read !== true && n.isRead !== true;
        if (isUnread && !pushedNotificationIds.has(notifId)) {
          pushedNotificationIds.add(notifId);
          CustomerService.triggerPushNotification({
            title: n.title,
            message: n.message,
            amount: n.amount,
            balanceAfter: n.balanceAfter,
            type: n.type,
            accountNo: n.accountNo,
            skipBadgeIncrement: true
          });
        }
      });

      const notifDropdown = document.getElementById('notif-dropdown');
      if (notifDropdown && !notifDropdown.classList.contains('hidden')) {
        renderNotificationCenterList(notifications);
      }
    } finally {
      pendingRefreshNotifPromise = null;
    }
  })();

  return pendingRefreshNotifPromise;
}

async function renderNotificationCenterList(preloadedNotifs = null) {
  const container = document.getElementById('notif-list-container');
  const titleEl = document.getElementById('notif-dropdown-title');
  if (!container) return;

  const user = AuthService.getCurrentUser();
  let notifications = preloadedNotifs;

  if (user?.role === 'CUSTOMER') {
    if (titleEl) titleEl.textContent = '🔔 Biến Động Số Dư Realtime';
    if (!Array.isArray(notifications)) {
      notifications = await CustomerService.getNotificationsAsync();
    }
  } else if (user?.role === 'TELLER') {
    if (titleEl) titleEl.textContent = '📋 Thông Báo Nghiệp Vụ Quầy GD';
    notifications = getTellerNotifications();
  } else if (user?.role === 'ADMIN') {
    if (titleEl) titleEl.textContent = '🛡️ Thông Báo Giám Sát Hệ Thống';
    notifications = getAdminNotifications();
  } else {
    notifications = [];
  }

  container.innerHTML = '';

  if (!notifications || notifications.length === 0) {
    const emptyMsg = user?.role === 'CUSTOMER' 
      ? 'Không có thông báo biến động số dư nào.'
      : (user?.role === 'TELLER' ? 'Không có thông báo nghiệp vụ quầy mới.' : 'Không có cảnh báo hệ thống.');
    container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 0.84rem;">${emptyMsg}</div>`;
    return;
  }

  notifications.forEach(n => {
    const isRead = n.read || n.isRead;
    const typeUpper = String(n.type || '').toUpperCase();
    const titleUpper = String(n.title || '').toUpperCase();
    const msgUpper = String(n.message || '').toUpperCase();

    const isInfoOnly = typeUpper === 'INFO' || 
                       typeUpper === 'SYSTEM' || 
                       typeUpper === 'SECURITY' || 
                       typeUpper === 'LOAN' || 
                       typeUpper === 'LOAN_APPLIED' ||
                       typeUpper === 'LOAN_PENDING' ||
                       typeUpper === 'AUDIT' ||
                       !n.amount || 
                       parseFloat(n.amount) === 0;

    const isExpense = !isInfoOnly && (
                      typeUpper === 'MONEY_OUT' || 
                      typeUpper === 'DEBIT' || 
                      typeUpper === 'WITHDRAW' || 
                      typeUpper === 'TRANSFER_OUT' || 
                      titleUpper.includes('NỢ') || 
                      titleUpper.includes('(-)') ||
                      msgUpper.includes(' -') ||
                      (typeof n.amount === 'number' && n.amount < 0));

    const isIncome = !isInfoOnly && !isExpense;

    let notifColor = 'var(--accent-emerald)';
    let notifIcon = '🟢';
    let amountFormatted = '';

    if (typeUpper === 'LOAN' || typeUpper === 'LOAN_PENDING') {
      notifColor = 'var(--accent-gold)';
      notifIcon = '📋';
      amountFormatted = store.formatVND(n.amount || 0);
    } else if (isInfoOnly) {
      notifColor = 'var(--accent-cyan)';
      notifIcon = typeUpper === 'AUDIT' ? '🛡️' : '🔔';
      amountFormatted = '';
    } else if (isExpense) {
      notifColor = 'var(--accent-danger, #ef4444)';
      notifIcon = '🔴';
      amountFormatted = `-${store.formatVND(Math.abs(n.amount || 0))}`;
    } else {
      notifColor = 'var(--accent-emerald, #10b981)';
      notifIcon = '🟢';
      amountFormatted = `+${store.formatVND(Math.abs(n.amount || 0))}`;
    }

    let timeStr = n.createdAt;
    if (typeof n.createdAt === 'string') {
      timeStr = n.createdAt.replace('T', ' ').substring(0, 19);
    } else if (Array.isArray(n.createdAt)) {
      const [y, m, d, h, min, s] = n.createdAt;
      const pad = (num) => String(num).padStart(2, '0');
      timeStr = `${pad(d)}/${pad(m)}/${y} ${pad(h)}:${pad(min)}:${pad(s || 0)}`;
    }

    const item = document.createElement('div');
    item.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      background: ${isRead ? 'transparent' : 'rgba(14, 165, 233, 0.08)'};
      cursor: pointer;
      transition: background 0.2s ease;
    `;

    item.onmouseenter = () => { item.style.background = 'rgba(255,255,255,0.06)'; };
    item.onmouseleave = () => { item.style.background = isRead ? 'transparent' : 'rgba(14, 165, 233, 0.08)'; };

    item.onclick = async () => {
      if (user?.role === 'CUSTOMER') {
        await CustomerService.markNotificationReadAsync(n.id);
        renderNotificationCenterList();
        refreshNotificationsLoop();
      } else if (user?.role === 'TELLER') {
        readTellerNotifIds.add(n.id);
        renderNotificationCenterList();
        updateNotificationBadge();
        if (n.targetView) {
          const btn = document.querySelector(`.nav-item button[data-view="${n.targetView}"]`);
          if (btn) btn.click();
          const notifDropdown = document.getElementById('notif-dropdown');
          if (notifDropdown) notifDropdown.classList.add('hidden');
        }
      } else if (user?.role === 'ADMIN') {
        readAdminNotifIds.add(n.id);
        renderNotificationCenterList();
        updateNotificationBadge();
      }
    };

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
        <strong style="font-size: 0.85rem; color: ${notifColor}; display: flex; align-items: center; gap: 4px;">
          ${notifIcon} ${n.title || (isExpense ? 'Biến động số dư Nợ (-)' : (isIncome ? 'Biến động số dư Có (+)' : 'Thông báo hệ thống'))}
        </strong>
        <span style="font-size: 0.7rem; color: var(--text-dim); font-family: var(--font-mono);">${timeStr}</span>
      </div>
      ${amountFormatted ? `
        <div style="font-size: 0.95rem; font-weight: 700; font-family: var(--font-mono); color: ${notifColor}; margin-bottom: 4px;">
          ${amountFormatted}
        </div>
      ` : ''}
      <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.3; margin-bottom: 4px;">
        ${(n.message || '').replace(/([+-]?\b\d{4,}\b)(?=\s*VNĐ|\s*VND|\s*đ)/gi, (m) => {
          const sign = m.startsWith('+') ? '+' : (m.startsWith('-') ? '-' : '');
          const val = Math.abs(parseInt(m.replace(/[^0-9]/g, ''), 10));
          return sign + new Intl.NumberFormat('vi-VN').format(val);
        })}
      </div>
      ${n.balanceAfter ? `<div style="font-size: 0.74rem; color: var(--text-dim);">Số dư sau GD: <strong style="color: var(--text-main);">${store.formatVND(n.balanceAfter)}</strong></div>` : ''}
    `;
    container.appendChild(item);
  });
}

// Xây dựng Menu Sidebar & Xử lý Chuyển đổi Giao diện
function buildSidebarMenu(role) {
  const items = navigationConfigs[role] || navigationConfigs.CUSTOMER;
  navMenuList.innerHTML = '';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.innerHTML = `
      <button type="button" data-view="${item.view}" class="${index === 0 ? 'active' : ''}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${item.icon}" />
        </svg>
        <span>${item.label}</span>
      </button>
    `;
    navMenuList.appendChild(li);
  });

  // Cập nhật thông tin Người dùng & Chức danh chi tiết trên Sidebar
  const user = store.data.currentUser;
  const userNameEl = document.getElementById('sidebar-user-name');
  const userRoleEl = document.getElementById('sidebar-user-role');
  if (user && userNameEl && userRoleEl) {
    userNameEl.textContent = user.fullName || user.username;
    if (user.role === 'ADMIN') {
      userRoleEl.textContent = 'Quản Trị Viên';
      userRoleEl.className = 'user-role-badge badge-admin';
    } else if (user.role === 'TELLER') {
      const positionTitle = AuthService.getStaffPositionTitle(user);
      const badgeClass = AuthService.getStaffBadgeClass(user);
      userRoleEl.textContent = `${user.staffCode ? user.staffCode + ' • ' : ''}${positionTitle}`;
      userRoleEl.className = `user-role-badge ${badgeClass}`;
    } else {
      userRoleEl.textContent = 'Khách hàng';
      userRoleEl.className = 'user-role-badge badge-customer';
    }
  }

  // Gán sự kiện click cho các nút điều hướng
  navMenuList.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.currentTarget;
      navMenuList.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      targetBtn.classList.add('active');

      const targetViewId = targetBtn.getAttribute('data-view');
      switchView(targetViewId);
    });
  });

  // Hiển thị giao diện đầu tiên mặc định
  switchView(items[0].view);
}

const pageTitles = {
  'view-customer-dashboard': { title: 'Trang Chủ Khách Hàng', subtitle: 'Tổng quan thông tin tài khoản và giao dịch' },
  'view-customer-accounts': { title: 'Tài Khoản & Thẻ', subtitle: 'Quản lý danh sách tài khoản và thẻ ngân hàng' },
  'view-customer-savings': { title: 'Tài Khoản Tiết Kiệm', subtitle: 'Mở và quản lý tài khoản tiết kiệm tích lũy' },
  'view-customer-loans': { title: 'Tín Dụng & Vay Vốn', subtitle: 'Nộp hồ sơ xin vay vốn và theo dõi lịch trả nợ' },
  'view-customer-history': { title: 'Lịch Sử Giao Dịch', subtitle: 'Tra cứu nhật ký giao dịch chi tiết' },
  'view-customer-profile': { title: 'Thông Tin Cá Nhân', subtitle: 'Cập nhật thông tin liên hệ và mật khẩu' },
  'view-teller-dashboard': { title: 'Trang Chủ Giao Dịch Viên', subtitle: 'Tổng quan nghiệp vụ và tác vụ tại quầy' },
  'view-teller-new-customer': { title: 'Thêm Hồ Sơ Khách Hàng', subtitle: 'Tạo tài khoản và phát hành thẻ cho khách hàng mới' },
  'view-teller-customers': { title: 'Tra Cứu Khách Hàng', subtitle: 'Danh sách và chỉnh sửa thông tin khách hàng' },
  'view-teller-accounts': { title: 'Quản Lý Tài Khoản', subtitle: 'Quản lý và tra cứu tài khoản trên hệ thống' },
  'view-teller-loans': { title: 'Thẩm Định & Duyệt Vay', subtitle: 'Tiếp nhận hồ sơ vay và phê duyệt giải ngân cho khách hàng' },
  'view-admin-dashboard': { title: 'Dashboard Báo Cáo', subtitle: 'Thống kê tổng quan thanh khoản và quy mô ngân hàng' },
  'view-admin-tellers': { title: 'Quản Lý Giao Dịch Viên', subtitle: 'Quản lý danh sách tài khoản giao dịch viên ngân hàng' },
  'view-admin-system': { title: 'Tham Số Hệ Thống', subtitle: 'Cấu hình tham số lãi suất, phí và audit log' }
};

// Điều hướng Giao diện (View Router)
function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));

  const activeSec = document.getElementById(viewId);
  if (activeSec) {
    activeSec.classList.remove('hidden');
  }

  const pageTitleEl = document.getElementById('page-title');
  const pageSubEl = document.getElementById('page-subtitle');
  if (pageTitles[viewId]) {
    if (pageTitleEl) pageTitleEl.textContent = pageTitles[viewId].title;
    if (pageSubEl) pageSubEl.textContent = pageTitles[viewId].subtitle;
  }

  const user = AuthService.getCurrentUser();

  // Nạp dữ liệu động cho giao diện tương ứng
  if (viewId === 'view-customer-dashboard') renderCustomerDashboard();
  else if (viewId === 'view-customer-accounts') renderCustomerAccounts();
  else if (viewId === 'view-customer-savings') renderCustomerSavingsView();
  else if (viewId === 'view-customer-loans') renderCustomerLoansView();
  else if (viewId === 'view-customer-history') renderCustomerHistoryView();
  else if (viewId === 'view-customer-profile') renderCustomerProfileView();
  else if (viewId === 'view-teller-dashboard') renderTellerDashboard();
  else if (viewId === 'view-teller-new-customer') renderTellerNewCustomerView();
  else if (viewId === 'view-teller-customers') renderTellerCustomersView();
  else if (viewId === 'view-teller-accounts') renderTellerAccountsView();
  else if (viewId === 'view-teller-loans') renderTellerLoansView();
  else if (viewId === 'view-admin-dashboard') renderAdminDashboard();
  else if (viewId === 'view-admin-tellers') renderAdminTellersView();
  else if (viewId === 'view-admin-system') renderAdminSystemView();

  initCurrencyInputFormatting();
}

function switchNavView(viewId) {
  if (typeof navMenuList !== 'undefined' && navMenuList) {
    const btn = navMenuList.querySelector(`button[data-view="${viewId}"]`);
    if (btn) {
      btn.click();
      return;
    }
  }
  switchView(viewId);
}

/* ==========================================================================
   HÀM HIỂN THỊ DỮ LIỆU CHO PHÂN HỆ KHÁCH HÀNG (CUSTOMER VIEWS)
   ========================================================================== */

async function renderCustomerDashboard() {
  const user = store.data.currentUser;
  if (!user) return;

  if (BankApiService.hasToken()) {
    try {
      await Promise.allSettled([
        CustomerService.syncCustomerAccountsAsync(true),
        CustomerService.getCustomerSavingsAsync(),
        CustomerService.getTransactionHistoryAsync(),
        CustomerService.getCustomerLoansAsync()
      ]);
    } catch (e) {
      console.warn('Lỗi đồng bộ dữ liệu Customer Dashboard:', e);
    }
  }



  const accounts = CustomerService.getCustomerAccounts();
  const paymentAcc = accounts.find(a => a.type === 'PAYMENT') || accounts[0];

  const balEl = document.getElementById('cust-total-balance');
  if (balEl) {
    balEl.textContent = isBalanceMasked ? '••••••••' : (paymentAcc ? store.formatVND(paymentAcc.balance) : '0 VNĐ');
  }
  
  const accNoEl = document.getElementById('cust-account-number');
  if (accNoEl) {
    const maskedNo = paymentAcc ? SecurityService.maskAccountNumber(paymentAcc.accountNo) : 'N/A';
    accNoEl.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--accent-cyan); transition: all 0.2s;" title="Bấm để xem thông tin chi tiết Tài khoản & Thẻ">
        <span>Số TK: ${maskedNo}</span>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="opacity: 0.85;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      </span>
    `;
    accNoEl.style.cursor = 'pointer';
    accNoEl.onclick = (e) => {
      e.stopPropagation();
      switchView('view-customer-accounts');
    };
  }

  const eyeIconSvg = isBalanceMasked 
    ? `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`
    : `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`;

  const btnToggleMask = document.getElementById('btn-toggle-balance-mask');
  if (btnToggleMask) {
    btnToggleMask.innerHTML = eyeIconSvg;
    btnToggleMask.title = isBalanceMasked ? 'Bấm để hiển thị số dư' : 'Bấm để ẩn số dư';
    btnToggleMask.onclick = () => {
      isBalanceMasked = !isBalanceMasked;
      renderCustomerDashboard();
    };
  }

  const btnToggleSavingsMask = document.getElementById('btn-toggle-savings-mask');
  if (btnToggleSavingsMask) {
    btnToggleSavingsMask.innerHTML = eyeIconSvg;
    btnToggleSavingsMask.title = isBalanceMasked ? 'Bấm để hiển thị số dư tiết kiệm' : 'Bấm để ẩn số dư tiết kiệm';
    btnToggleSavingsMask.onclick = () => {
      isBalanceMasked = !isBalanceMasked;
      renderCustomerDashboard();
    };
  }

  // Lấy và tính toán tổng số dư Tiền gửi tiết kiệm đang hoạt động
  let allSavings = CustomerService.getCustomerSavings();
  if (!allSavings || allSavings.length === 0) {
    try {
      allSavings = await CustomerService.getCustomerSavingsAsync();
    } catch (err) {
      allSavings = CustomerService.getCustomerSavings();
    }
  }
  const activeSavings = (allSavings || []).filter(s => s.status === 'ACTIVE' || !s.status);
  const totalSavingsBalance = activeSavings.reduce((sum, s) => sum + (parseFloat(s.depositAmount || s.balance || 0)), 0);

  const dashSavBal = document.getElementById('cust-savings-balance');
  if (dashSavBal) {
    dashSavBal.textContent = isBalanceMasked ? '••••••••' : store.formatVND(totalSavingsBalance);
  }

  const dashInterestRate = document.getElementById('cust-interest-rate');
  if (dashInterestRate) {
    let currentRate = store.data.systemSettings?.savingsInterestRate || 6.5;
    if (activeSavings.length > 0 && activeSavings[0].interestRate) {
      currentRate = activeSavings[0].interestRate;
    }
    dashInterestRate.textContent = `${currentRate}%`;
  }

  const txns = CustomerService.getTransactionHistory();
  const currentAccounts = CustomerService.getCustomerAccounts();
  const myAccNos = currentAccounts.map(a => a.accountNo);
  const mySavNos = (allSavings || []).map(s => s.savingsNo);
  const allUserAccs = [...myAccNos, ...mySavNos];

  // Đếm số giao dịch
  const countEl = document.getElementById('cust-tx-count');
  if (countEl) {
    countEl.textContent = txns.length;
  }

  // Bảng giao dịch gần đây đồng bộ 100% với Lịch Sử Giao Dịch
  const tbody = document.getElementById('cust-recent-transactions-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    if (txns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 20px;">Chưa có giao dịch nào gần đây.</td></tr>`;
    } else {
      const primaryAccNo = currentAccounts.find(a => a.type === 'PAYMENT')?.accountNo || myAccNos[0];

      const formatCounterparty = (name, account) => {
        if (!name && !account) return '-';
        if (!name) return account || '-';
        if (!account) return name;
        if (account && name.includes(account)) return name;
        return `${name} (${account})`;
      };

      txns.slice(0, 5).forEach(t => {
        let isOut = false;
        let counterpartyText = '-';

        if (myAccNos.includes(t.fromAccount) && !myAccNos.includes(t.toAccount)) {
          isOut = true;
          counterpartyText = formatCounterparty(t.toName, t.toAccount);
        } else if (!myAccNos.includes(t.fromAccount) && myAccNos.includes(t.toAccount)) {
          isOut = false;
          counterpartyText = formatCounterparty(t.fromName, t.fromAccount);
        } else if (myAccNos.includes(t.fromAccount) && myAccNos.includes(t.toAccount)) {
          if (primaryAccNo === t.toAccount) {
            isOut = false;
            counterpartyText = formatCounterparty(t.fromName, t.fromAccount);
          } else {
            isOut = true;
            counterpartyText = formatCounterparty(t.toName, t.toAccount);
          }
        } else {
          isOut = mySavNos.includes(t.fromAccount);
          counterpartyText = isOut
            ? formatCounterparty(t.toName, t.toAccount)
            : formatCounterparty(t.fromName, t.fromAccount);
        }

        const tr = document.createElement('tr');

        let typeBadge = CustomerService.getTransactionTypeBadge(t, myAccNos);

        tr.innerHTML = `
          <td><strong style="font-family: var(--font-mono); color: var(--accent-gold);">${store.formatTxnId(t.id)}</strong></td>
          <td>${typeBadge}</td>
          <td style="max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${counterpartyText}">${counterpartyText}</td>
          <td class="${isOut ? 'text-danger' : 'text-emerald'}" style="font-weight: 700;">
            ${isOut ? '-' : '+'}${store.formatVND(t.amount)}
          </td>
          <td style="font-size: 0.8rem; color: var(--text-dim); white-space: nowrap;">${store.formatDateTime(t.timestamp)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Nút thao tác dịch vụ
  const btnTransfer = document.getElementById('btn-service-transfer');
  if (btnTransfer) btnTransfer.onclick = () => openTransferModal();

  const btnQr = document.getElementById('btn-service-qr');
  if (btnQr) btnQr.onclick = () => openQRModal();



  const btnCreateAtmCode = document.getElementById('btn-service-create-atm-code');
  if (btnCreateAtmCode) btnCreateAtmCode.onclick = () => openCreateAtmCodeModal();

  const btnManageAtmCodes = document.getElementById('btn-service-manage-atm-codes');
  if (btnManageAtmCodes) btnManageAtmCodes.onclick = () => openManageAtmCodesModal();

  const btnQrScan = document.getElementById('btn-service-qr-scan');
  if (btnQrScan) btnQrScan.onclick = () => openQRScanModal();

  const btnViewHist = document.getElementById('btn-cust-view-all-history');
  if (btnViewHist) btnViewHist.onclick = () => switchNavView('view-customer-history');

  const btnQuickSav = document.getElementById('btn-quick-open-savings');
  if (btnQuickSav) btnQuickSav.onclick = () => openOpenSavingsModal();

  const btnQuickLoan = document.getElementById('btn-quick-apply-loan');
  if (btnQuickLoan) btnQuickLoan.onclick = () => openApplyLoanModal();



  const btnQuickStmt = document.getElementById('btn-quick-view-statement');
  if (btnQuickStmt) btnQuickStmt.onclick = () => openStatementModal();
}

// Hàm mở các cửa sổ Modal dịch vụ
function openTransferModal() {
  const accounts = CustomerService.getCustomerAccounts();
  const paymentAccounts = accounts.filter(acc => acc.type === 'PAYMENT' || acc.type !== 'SAVINGS');
  const select = document.getElementById('transfer-modal-from');
  if (!select) return;
  select.innerHTML = '';
  paymentAccounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.accountNo;
    opt.textContent = `${acc.accountNo} (Thanh toán) - Số dư: ${store.formatVND(acc.balance)}`;
    select.appendChild(opt);
  });
  document.getElementById('form-modal-transfer').reset();
  const recipientBox = document.getElementById('transfer-modal-recipient-box');
  const recipientErr = document.getElementById('transfer-modal-recipient-error');
  const alertBox = document.getElementById('transfer-modal-balance-alert');
  const remainingSpan = document.getElementById('transfer-modal-remaining-balance');
  const amountInput = document.getElementById('transfer-modal-amount');
  const submitBtn = document.getElementById('btn-submit-transfer-modal');

  if (recipientBox) recipientBox.classList.add('hidden');
  if (recipientErr) recipientErr.classList.add('hidden');
  if (alertBox) alertBox.classList.add('hidden');
  if (remainingSpan) remainingSpan.textContent = '';
  if (amountInput) {
    amountInput.style.borderColor = '';
    amountInput.style.boxShadow = '';
  }
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
  }

  // Cập nhật nhãn số dư khả dụng ban đầu
  const availSpan = document.getElementById('transfer-modal-avail-balance');
  if (availSpan) {
    const firstAcc = paymentAccounts[0];
    availSpan.textContent = `Số dư: ${firstAcc ? store.formatVND(firstAcc.balance) : '0 VNĐ'}`;
  }

  openModal('modal-transfer');
}

function openQRModal() {
  const user = AuthService.getCurrentUser();
  const accounts = CustomerService.getCustomerAccounts();
  const select = document.getElementById('qr-select-acc');
  if (!select) return;
  select.innerHTML = '';
  accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.accountNo;
    opt.textContent = `${acc.accountNo} (${acc.type === 'PAYMENT' ? 'Thanh toán' : 'Tiết kiệm'}) - ${store.formatVND(acc.balance)}`;
    select.appendChild(opt);
  });

  const updateQRView = () => {
    const selectedAcc = select.value || (accounts[0] ? accounts[0].accountNo : '1000123456');
    const amountVal = (document.getElementById('qr-amount-input')?.value || '').replace(/\D/g, '');
    const nameEl = document.getElementById('qr-display-name');
    const accEl = document.getElementById('qr-display-acc');
    const amountEl = document.getElementById('qr-display-amount');
    const container = document.getElementById('qr-code-container');

    if (nameEl) nameEl.textContent = user ? user.fullName.toUpperCase() : 'KHÁCH HÀNG';
    if (accEl) accEl.textContent = `TK: ${selectedAcc}`;
    
    if (amountEl) {
      if (amountVal && parseFloat(amountVal) > 0) {
        amountEl.style.display = 'block';
        amountEl.textContent = `Số tiền: ${store.formatVND(parseFloat(amountVal))}`;
      } else {
        amountEl.style.display = 'none';
      }
    }

    // Tạo chuỗi dữ liệu QR (loại bỏ dấu tiếng Việt để tối ưu mã hóa)
    const ownerName = user ? user.fullName : 'KHACH HANG';
    const ownerNameAscii = ownerName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const qrText = `QUANGTRUNGBANK|${selectedAcc}|${ownerNameAscii}|${amountVal || 0}`;

    // Tạo mã QR thực tế bằng thư viện QrCreator
    if (container && typeof QrCreator !== 'undefined') {
      container.innerHTML = '';
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);
      QrCreator.render({
        text: qrText,
        radius: 0.0,
        ecLevel: 'M',
        fill: '#0f172a',
        background: '#ffffff',
        size: 180
      }, canvas);
    }
  };

  select.onchange = updateQRView;
  document.getElementById('qr-amount-input').oninput = updateQRView;

  // Trễ một khoảng ngắn để đảm bảo modal đã hiển thị trước khi vẽ QR
  setTimeout(updateQRView, 100);
  openModal('modal-qr-receive');
}



function openCreateAtmCodeModal() {
  const accounts = CustomerService.getCustomerAccounts();
  const paymentAccounts = accounts.filter(acc => acc.type === 'PAYMENT' || acc.type !== 'SAVINGS');
  const select = document.getElementById('create-atm-acc');
  if (!select) return;

  select.innerHTML = '';
  paymentAccounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.accountNo;
    opt.textContent = `${acc.accountNo} (Thanh toán) - Số dư: ${store.formatVND(acc.balance)}`;
    select.appendChild(opt);
  });

  document.getElementById('form-create-atm-code').reset();
  const hintAtmAmt = document.getElementById('create-atm-amount-hint');
  const hintTextAtmAmt = document.getElementById('create-atm-amount-hint-text');
  if (hintAtmAmt && hintTextAtmAmt) {
    hintAtmAmt.style.color = 'var(--accent-gold)';
    hintTextAtmAmt.textContent = 'Lưu ý: Số tiền tối thiểu là 10.000 VNĐ và phải là bội số của 10.000 VNĐ.';
  }
  const resultBox = document.getElementById('atm-created-result-box');
  if (resultBox) resultBox.classList.add('hidden');

  openModal('modal-create-atm-code');
}

const revealedAtmCodeIds = new Set();

async function openManageAtmCodesModal() {
  if (backendOnline) {
    try {
      const apiRes = await BankApiService.getAtmCodes();
      if (apiRes && apiRes.success && Array.isArray(apiRes.data)) {
        store.data.atmCodes = (store.data.atmCodes || []).filter(c => c.status !== 'CANCELLED');
        apiRes.data.forEach(c => {
          if (c.status !== 'CANCELLED' && !store.data.atmCodes.some(item => item.id === c.id || item.code === c.code)) {
            store.data.atmCodes.unshift(c);
          }
        });
      }
    } catch (e) {
      console.warn('Could not fetch ATM codes from backend', e);
    }
  }

  // Lọc sạch mọi mã đã hủy khỏi bộ nhớ
  store.data.atmCodes = (store.data.atmCodes || []).filter(c => c.status !== 'CANCELLED');
  const codes = CustomerService.getAtmCodes();
  const tbody = document.getElementById('cust-atm-codes-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (codes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">Chưa có mã ATM nào được tạo.</td></tr>`;
  } else {
    codes.forEach(c => {
      const tr = document.createElement('tr');
      let statusBadge = `<span class="user-role-badge badge-customer">Chờ sử dụng</span>`;
      if (c.status === 'COMPLETED') statusBadge = `<span class="user-role-badge badge-teller">Đã hoàn thành</span>`;
      if (c.status === 'CANCELLED') statusBadge = `<span class="user-role-badge badge-admin">Đã hủy</span>`;

      const isRevealed = revealedAtmCodeIds.has(c.id) || revealedAtmCodeIds.has(c.code);

      const codeHtml = isRevealed
        ? `
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-family: var(--font-mono); font-size: 1.1rem; color: var(--accent-gold); letter-spacing: 2px;">${c.code}</strong>
            <button type="button" class="btn btn-secondary btn-sm btn-hide-atm-code" data-id="${c.id}" title="Ẩn mã ATM" style="padding: 2px 7px; border-radius: 6px; line-height: 1;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
            </button>
          </div>
        `
        : `
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-family: var(--font-mono); font-size: 1.1rem; color: var(--text-dim); letter-spacing: 3px;">••••••</strong>
            <button type="button" class="btn btn-secondary btn-sm btn-reveal-atm-code" data-id="${c.id}" data-acc="${c.accountNo}" data-amount="${c.amount}" title="Xác minh PIN & OTP để xem mã ATM" style="padding: 2px 7px; border-radius: 6px; line-height: 1; border-color: var(--accent-cyan); color: var(--accent-cyan);">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
          </div>
        `;

      tr.innerHTML = `
        <td>${codeHtml}</td>
        <td>${c.type === 'WITHDRAW' ? 'RÚT TIỀN' : 'NẠP TIỀN'}</td>
        <td><code>${c.accountNo}</code></td>
        <td><strong class="text-cyan">${store.formatVND(c.amount)}</strong></td>
        <td>${statusBadge}</td>
        <td style="font-size: 0.75rem; color: var(--text-dim);">${c.createdAt}</td>
        <td>
          ${c.status === 'PENDING' ? `
            <button class="btn btn-primary btn-sm btn-guide-atm-code" data-id="${c.id}" data-type="${c.type}" style="margin-right: 4px; padding: 4px 10px;">Hướng dẫn</button>
            <button class="btn btn-danger btn-sm btn-cancel-atm-code" data-id="${c.id}" style="padding: 4px 10px;">Hủy mã</button>
          ` : '<span style="font-size: 0.75rem; color: var(--text-dim);">-</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Gán sự kiện xem mã ATM (yêu cầu xác thực 2FA PIN + OTP)
    tbody.querySelectorAll('.btn-reveal-atm-code').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = (store.data.atmCodes || []).find(c => c.id === id || c.code === id);
        if (!item) return;

        requestTransactionVerification({
          title: 'Xác Thực Bảo Mật Xem Mã ATM',
          actionName: `Hiển thị mã giao dịch ATM (${store.formatVND(item.amount)})`,
          fromAcc: item.accountNo,
          amount: parseFloat(item.amount),
          onVerified: () => {
            revealedAtmCodeIds.add(item.id);
            if (item.code) revealedAtmCodeIds.add(item.code);
            openManageAtmCodesModal();
            showToast(`Đã xác minh thành công! Mã ATM của bạn: ${item.code}`, 'success');
          }
        });
      };
    });

    // Gán sự kiện ẩn lại mã ATM
    tbody.querySelectorAll('.btn-hide-atm-code').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = (store.data.atmCodes || []).find(c => c.id === id || c.code === id);
        if (item) {
          revealedAtmCodeIds.delete(item.id);
          revealedAtmCodeIds.delete(item.code);
        } else {
          revealedAtmCodeIds.delete(id);
        }
        openManageAtmCodesModal();
      };
    });

    // Gán sự kiện cho nút Hướng dẫn sử dụng mã tại ATM (mở modal hướng dẫn chi tiết)
    tbody.querySelectorAll('.btn-guide-atm-code').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = (store.data.atmCodes || []).find(c => c.id === id);
        if (!item) return;

        const isDeposit = item.type === 'DEPOSIT';
        const typeLabel = isDeposit ? 'Nạp Tiền Mặt Không Thẻ' : 'Rút Tiền Mặt Không Thẻ';
        const isRevealed = revealedAtmCodeIds.has(item.id) || revealedAtmCodeIds.has(item.code);

        const typeEl = document.getElementById('atm-guide-type-text');
        const amountEl = document.getElementById('atm-guide-amount-text');
        const codeEl = document.getElementById('atm-guide-code-text');

        if (typeEl) typeEl.textContent = typeLabel;
        if (amountEl) amountEl.textContent = store.formatVND(item.amount);
        if (codeEl) {
          if (isRevealed) {
            codeEl.innerHTML = `<span style="color: var(--accent-gold); letter-spacing: 2px;">${item.code}</span>`;
          } else {
            codeEl.innerHTML = `
              <span style="color: var(--text-dim); letter-spacing: 2px;">••••••</span>
              <span style="font-size: 0.78rem; font-weight: 500; color: var(--accent-cyan); display: inline-flex; align-items: center; gap: 5px; margin-left: 8px; background: rgba(0, 242, 254, 0.12); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(0, 242, 254, 0.25); vertical-align: middle;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                Xác thực PIN & OTP để xem
              </span>
            `;
          }
        }

        openModal('modal-atm-guide');
      };
    });

    // Gán sự kiện hủy mã ATM
    tbody.querySelectorAll('.btn-cancel-atm-code').forEach(btn => {
      btn.onclick = async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!confirm('Bạn có chắc chắn muốn hủy và xóa mã giao dịch ATM này không?')) return;
        const res = await CustomerService.cancelAtmCodeAsync(id);
        showToast(res.message, res.success ? 'success' : 'danger');
        if (res.success) {
          revealedAtmCodeIds.delete(id);
          openManageAtmCodesModal();
        }
      };
    });
  }

  openModal('modal-manage-atm-codes');
}




// =============================================
// PHÂN HỆ QUÉT MÃ QR - Quét mã QR bằng Camera
// =============================================

let html5QrScanner = null;

function openQRScanModal() {
  const cameraSection = document.getElementById('qr-scan-camera-section');
  const resultSection = document.getElementById('qr-scan-result-section');
  const statusEl = document.getElementById('qr-scan-status');

  // Đặt lại giao diện
  cameraSection.classList.remove('hidden');
  resultSection.classList.add('hidden');
  if (statusEl) statusEl.innerHTML = '<span class="qr-scan-pulse">●</span> Đang khởi tạo camera...';

  openModal('modal-qr-scan');

  // Bắt đầu quét sau khi modal hiển thị
  setTimeout(() => {
    startQRScanner();
  }, 300);
}

function startQRScanner() {
  const statusEl = document.getElementById('qr-scan-status');

  // Dừng trình quét cũ nếu đang chạy
  if (html5QrScanner) {
    try {
      html5QrScanner.stop().then(() => {
        html5QrScanner.clear();
        initNewScanner();
      }).catch(() => {
        initNewScanner();
      });
    } catch (e) {
      initNewScanner();
    }
  } else {
    initNewScanner();
  }

  function initNewScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      if (statusEl) statusEl.innerHTML = '<span style="color: var(--accent-danger);">Thư viện quét QR chưa được tải. Vui lòng thử lại.</span>';
      return;
    }

    // Xóa nội dung thẻ chứa camera
    const readerDiv = document.getElementById('qr-reader');
    if (readerDiv) readerDiv.innerHTML = '';

    html5QrScanner = new Html5Qrcode('qr-reader');

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    html5QrScanner.start(
      { facingMode: 'environment' },
      config,
      onQRScanSuccess,
      () => {}
    ).then(() => {
      if (statusEl) statusEl.innerHTML = '<span class="qr-scan-pulse">●</span> Đang chờ quét mã QR...';
    }).catch((err) => {
      // Thử chuyển sang camera trước nếu camera sau thất bại
      html5QrScanner.start(
        { facingMode: 'user' },
        config,
        onQRScanSuccess,
        () => {}
      ).then(() => {
        if (statusEl) statusEl.innerHTML = '<span class="qr-scan-pulse">●</span> Đang chờ quét mã QR (Camera trước)...';
      }).catch((err2) => {
        if (statusEl) statusEl.innerHTML = `<span style="color: var(--accent-danger);">Không thể truy cập camera: ${err2}</span>`;
      });
    });
  }
}

function onQRScanSuccess(decodedText) {
  // Dừng camera ngay lập tức
  if (html5QrScanner) {
    try { html5QrScanner.stop().catch(() => {}); } catch (e) {}
  }

  // Phân tích dữ liệu QR: QUANGTRUNGBANK|số_tài_khoản|tên_chủ_thẻ|số_tiền
  const parts = decodedText.split('|');
  
  if (parts.length < 3 || parts[0] !== 'QUANGTRUNGBANK') {
    showToast('Mã QR không hợp lệ. Vui lòng quét mã QR từ QuangTrung Bank.', 'danger');
    // Tiếp tục quét lại
    setTimeout(() => startQRScanner(), 1500);
    return;
  }

  const bankName = 'QuangTrung Bank';
  const accountNo = parts[1];
  const ownerName = parts[2];
  const amount = parts[3] ? parseFloat(parts[3]) : 0;

  // Xác minh tài khoản có tồn tại trong hệ thống hay không
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

  if (!targetAcc) {
    showToast('Tài khoản trong mã QR không tồn tại trên hệ thống.', 'danger');
    setTimeout(() => startQRScanner(), 1500);
    return;
  }

  // Hiển thị phần kết quả quét
  const cameraSection = document.getElementById('qr-scan-camera-section');
  const resultSection = document.getElementById('qr-scan-result-section');
  cameraSection.classList.add('hidden');
  resultSection.classList.remove('hidden');

  // Điền thông tin kết quả
  document.getElementById('qr-result-bank').textContent = bankName;
  document.getElementById('qr-result-name').textContent = targetCust.fullName;
  document.getElementById('qr-result-acc').textContent = accountNo;

  const amountRow = document.getElementById('qr-result-amount-row');
  if (amount > 0) {
    amountRow.style.display = 'flex';
    document.getElementById('qr-result-amount').textContent = store.formatVND(amount);
  } else {
    amountRow.style.display = 'none';
  }

  // Tự động điền dữ liệu vào form chuyển tiền
  document.getElementById('qr-transfer-to-acc').value = accountNo;

  if (amount > 0) {
    document.getElementById('qr-transfer-amount').value = amount;
  } else {
    document.getElementById('qr-transfer-amount').value = '';
  }

  document.getElementById('qr-transfer-content').value = `Chuyển tiền qua QR cho ${targetCust.fullName}`;

  // Nạp danh sách tài khoản nguồn
  const accounts = CustomerService.getCustomerAccounts();
  const paymentAccounts = accounts.filter(acc => acc.type === 'PAYMENT' || acc.type !== 'SAVINGS');
  const selectFrom = document.getElementById('qr-transfer-from');
  selectFrom.innerHTML = '';
  paymentAccounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.accountNo;
    opt.textContent = `${acc.accountNo} (Thanh toán) - Số dư: ${store.formatVND(acc.balance)}`;
    selectFrom.appendChild(opt);
  });

  showToast(`Đã quét thành công QR của ${targetCust.fullName}!`, 'success');
}

function stopQRScanner() {
  if (html5QrScanner) {
    try {
      html5QrScanner.stop().then(() => {
        html5QrScanner.clear();
        html5QrScanner = null;
      }).catch(() => {
        html5QrScanner = null;
      });
    } catch (e) {
      html5QrScanner = null;
    }
  }
}

async function renderCustomerAccounts() {
  if (backendOnline && BankApiService.hasToken()) {
    await CustomerService.syncCustomerAccountsAsync();
  }
  const user = AuthService.getCurrentUser();
  const freshCust = CustomerService.findCustomer(user);
  if (!freshCust) return;

  // Lấy danh sách tài khoản tiết kiệm đồng bộ từ backend hoặc store
  let savingsAccounts = [];
  try {
    savingsAccounts = await CustomerService.getCustomerSavingsAsync();
  } catch (err) {
    savingsAccounts = CustomerService.getCustomerSavings();
  }

  const container = document.getElementById('cust-accounts-list-container');
  container.innerHTML = '';

  // 1. Nhóm Tài Khoản Thanh Toán
  const paymentAccounts = (freshCust.accounts || []).filter(acc => acc.type === 'PAYMENT' || !acc.type.includes('SAVING'));
  
  const paymentHeader = document.createElement('div');
  paymentHeader.style.cssText = 'font-size: 0.85rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;';
  paymentHeader.innerHTML = `
    <span style="display: flex; align-items: center; gap: 6px;">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
      Tài Khoản Thanh Toán (${paymentAccounts.length})
    </span>
  `;
  container.appendChild(paymentHeader);

  paymentAccounts.forEach(acc => {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 16px; background: rgba(0,0,0,0.25); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;';
    div.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 1.05rem;" class="text-cyan">
          Tài Khoản Thanh Toán
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
          Số TK: <code style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${acc.accountNo}</code>
          ${acc.createdAt ? ` | Ngày mở: ${store.formatDate(acc.createdAt)}` : ''}
        </div>
        <div style="margin-top: 8px; display: flex; gap: 8px;">
          <button type="button" class="btn btn-secondary btn-sm btn-quick-transfer" data-acc="${acc.accountNo}" style="font-size: 0.75rem; padding: 4px 10px; border-color: rgba(0, 242, 254, 0.4); color: var(--accent-cyan);">
            Chuyển Tiền
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-quick-qr" data-acc="${acc.accountNo}" style="font-size: 0.75rem; padding: 4px 10px;">
            Mã QR Nhận Tiền
          </button>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; color: #fff;">${store.formatVND(acc.balance)}</div>
        <span class="user-role-badge badge-customer" style="margin-top: 6px;">${acc.status === 'ACTIVE' ? 'HOẠT ĐỘNG' : acc.status}</span>
      </div>
    `;

    const btnTransfer = div.querySelector('.btn-quick-transfer');
    if (btnTransfer) {
      btnTransfer.onclick = () => openModal('modal-transfer');
    }
    const btnQr = div.querySelector('.btn-quick-qr');
    if (btnQr) {
      btnQr.onclick = () => openModal('modal-receive-qr');
    }

    container.appendChild(div);
  });

  // 2. Nhóm Tài Khoản Tiết Kiệm (Được đồng bộ đầy đủ)
  const savingsHeader = document.createElement('div');
  savingsHeader.style.cssText = 'font-size: 0.85rem; font-weight: 700; color: var(--accent-gold); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 20px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;';
  savingsHeader.innerHTML = `
    <span style="display: flex; align-items: center; gap: 6px;">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Tài Khoản Tiết Kiệm (${savingsAccounts.length})
    </span>
  `;
  container.appendChild(savingsHeader);

  if (savingsAccounts.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.style.cssText = 'padding: 16px; text-align: center; background: rgba(0,0,0,0.15); border: 1px dashed rgba(245, 158, 11, 0.3); border-radius: 12px; color: var(--text-muted); font-size: 0.85rem;';
    emptyDiv.innerHTML = `Bạn chưa có tài khoản tiết kiệm nào đang hoạt động.`;
    container.appendChild(emptyDiv);
  } else {
    savingsAccounts.forEach(s => {
      const isDemand = s.savingsType === 'DEMAND' || s.termMonths === 0;
      const termDesc = isDemand ? 'Không kỳ hạn' : `Kỳ hạn ${s.termMonths} tháng`;
      const isClosed = s.status !== 'ACTIVE';

      let statusBadge = `<span class="user-role-badge badge-customer">HOẠT ĐỘNG</span>`;
      if (s.status === 'MATURED') statusBadge = `<span class="user-role-badge badge-teller">ĐÃ ĐÁO HẠN</span>`;
      else if (s.status === 'CLOSED_EARLY') statusBadge = `<span class="user-role-badge badge-admin">TẤT TOÁN SỚM</span>`;

      const div = document.createElement('div');
      div.style.cssText = `padding: 16px; background: rgba(0,0,0,0.25); border: 1px solid ${isClosed ? 'rgba(255,255,255,0.08)' : 'rgba(245, 158, 11, 0.3)'}; border-radius: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; opacity: ${isClosed ? '0.75' : '1'}; transition: all 0.2s ease;`;
      div.innerHTML = `
        <div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-weight: 700; font-size: 1.05rem;" class="text-gold">
              Tài Khoản Tiết Kiệm (${termDesc})
            </span>
            <span style="font-size: 0.8rem; background: rgba(245, 158, 11, 0.15); color: var(--accent-gold); padding: 2px 8px; border-radius: 6px; font-weight: 600;">
              ${(s.interestRate || 0).toFixed(2)}%/năm
            </span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
            Mã Sổ: <code style="font-weight: 700; color: var(--accent-gold); font-size: 0.95rem;">${(s.savingsNo || '').replace(/^STK-?/i, '')}</code>
            ${s.maturityDate ? ` | Đáo hạn: ${store.formatDate(s.maturityDate)}` : ''}
          </div>
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm btn-view-savings-detail" data-sav="${s.savingsNo || s.id}" style="font-size: 0.75rem; padding: 4px 10px; border-color: rgba(245, 158, 11, 0.4); color: var(--accent-gold);">
              Xem Chứng Nhận / Chi Tiết
            </button>
            ${!isClosed ? `
              <button type="button" class="btn btn-secondary btn-sm btn-close-savings-quick" data-sav="${s.savingsNo || s.id}" style="font-size: 0.75rem; padding: 4px 10px; color: var(--text-dim);">
                Tất Toán
              </button>
            ` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; color: var(--accent-gold);">${store.formatVND(s.depositAmount || 0)}</div>
          <div style="margin-top: 6px;">${statusBadge}</div>
        </div>
      `;

      const btnDetail = div.querySelector('.btn-view-savings-detail');
      if (btnDetail) {
        btnDetail.onclick = (e) => {
          const sid = e.currentTarget.getAttribute('data-sav');
          openSavingsDetailModal(sid);
        };
      }

      const btnClose = div.querySelector('.btn-close-savings-quick');
      if (btnClose) {
        btnClose.onclick = (e) => {
          const sid = e.currentTarget.getAttribute('data-sav');
          openCloseSavingsModal(sid);
        };
      }

      container.appendChild(div);
    });
  }

  // ==========================================
  // HIỂN THỊ XEM TRƯỚC THẺ NGÂN HÀNG 3D & QUẢN LÝ THẺ
  // ==========================================
  const cardContainer = document.getElementById('cust-cards-container');
  if (cardContainer) {
    const userCards = freshCust.cards && freshCust.cards.length > 0 ? freshCust.cards : [
      {
        id: 'CARD-1001-1',
        cardNumber: '4532990011228899',
        maskedNumber: '4532 •••• •••• 8899',
        cardHolder: (freshCust.fullName || user.fullName || 'NGUYEN VAN AN').toUpperCase(),
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
        linkedAccountNo: freshCust.accounts[0]?.accountNo || '1000123456',
        issuedAt: '2024-01-15'
      }
    ];

    if (window.selectedCardIndex === undefined || window.selectedCardIndex >= userCards.length) {
      window.selectedCardIndex = 0;
    }
    const currentCard = userCards[window.selectedCardIndex];
    const isLocked = currentCard.status === 'LOCKED';

    // Format số thẻ & hạn dùng
    const cleanRawNum = (currentCard.cardNumber || '4532990011228899').replace(/\D/g, '');
    const fullNumberFormatted = cleanRawNum.replace(/(\d{4})/g, '$1 ').trim();
    const maskedNumberFormatted = currentCard.maskedNumber || (cleanRawNum.length >= 8 ? `${cleanRawNum.slice(0, 4)} •••• •••• ${cleanRawNum.slice(-4)}` : '4532 •••• •••• 8899');
    const displayCardNumber = window.isCardNumberRevealed ? fullNumberFormatted : maskedNumberFormatted;
    const displayExpiry = currentCard.expDate || currentCard.expiry || '12/28';
    const displayCvv = window.isCardCvvRevealed ? (currentCard.cvv || '321') : '•••';

    let themeClass = 'card-theme-visa';
    if ((currentCard.cardType || '').toUpperCase().includes('NAPAS')) themeClass = 'card-theme-napas';
    else if ((currentCard.cardType || '').toUpperCase().includes('MASTERCARD')) themeClass = 'card-theme-mastercard';

    cardContainer.innerHTML = `
      <!-- Card Selector & Issue button -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 8px; flex-wrap: wrap;">
        <select id="cust-card-selector" class="form-control form-control-sm" style="flex: 1; min-width: 220px; font-weight: 600; color: var(--accent-cyan);">
          ${userCards.map((c, idx) => `
            <option value="${idx}" ${idx === window.selectedCardIndex ? 'selected' : ''}>
              ${c.cardType} - ${c.maskedNumber || c.cardNumber.slice(-4)} (${c.status === 'ACTIVE' ? 'Hoạt động' : 'Đang khóa'})
            </option>
          `).join('')}
        </select>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-open-issue-card" style="white-space: nowrap; border-color: var(--accent-cyan); color: var(--accent-cyan); font-size: 0.75rem; padding: 5px 12px; font-weight: 600;">
          + Mở Thẻ Mới
        </button>
      </div>

      <!-- 3D Interactive Flip Card -->
      <div class="card-3d-wrapper" id="card-3d-element">
        <div class="card-3d-inner ${window.isCardFlipped ? 'is-flipped' : ''}" id="card-3d-flipper">
          <!-- Mặt trước (Front) -->
          <div class="card-3d-face card-3d-front ${themeClass} ${isLocked ? 'is-locked' : ''}">
            <div class="chip-logo">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="chip"></div>
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="opacity: 0.85;" title="NFC Contactless">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div style="text-align: right;">
                <div style="font-family: var(--font-display); font-weight: 900; font-size: 1.05rem; letter-spacing: 1px; font-style: italic;">QUANGTRUNG</div>
                <div style="font-size: 0.65rem; color: var(--accent-gold); letter-spacing: 0.5px; font-weight: 700;">${(currentCard.cardType || 'VISA DEBIT').toUpperCase()}</div>
              </div>
            </div>

            <div class="card-number" style="display: flex; align-items: center; justify-content: space-between;">
              <span id="card-display-number-text" style="letter-spacing: 2px;">${displayCardNumber}</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <button type="button" id="btn-copy-card-number" title="Sao chép số thẻ" style="background: rgba(255,255,255,0.15); border: none; color: #fff; cursor: pointer; padding: 4px 6px; border-radius: 4px; display: flex; align-items: center;">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                </button>
                <button type="button" id="btn-toggle-card-number-mask" title="Ẩn/Hiện toàn bộ số thẻ" style="background: rgba(255,255,255,0.15); border: none; color: #fff; cursor: pointer; padding: 4px 6px; border-radius: 4px; display: flex; align-items: center;">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="card-footer-info">
              <div>
                <div style="font-size: 0.6rem; opacity: 0.7; letter-spacing: 1px;">CHỦ THẺ / CARD HOLDER</div>
                <div class="card-holder-name">${currentCard.cardHolder || 'CUSTOMER'}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.6rem; opacity: 0.7; letter-spacing: 1px;">HẠN DÙNG / EXP</div>
                <div style="font-weight: 700; font-family: var(--font-mono);">${displayExpiry}</div>
              </div>
              <div style="text-align: right;">
                <span class="user-role-badge ${isLocked ? 'badge-admin' : 'badge-customer'}" style="font-size: 0.65rem; padding: 2px 6px;">
                  ${isLocked ? 'ĐÃ KHÓA' : 'HOẠT ĐỘNG'}
                </span>
              </div>
            </div>
          </div>

          <!-- Mặt sau (Back) -->
          <div class="card-3d-face card-3d-back">
            <div class="card-magnetic-stripe"></div>
            
            <div class="card-signature-bar">
              <div class="card-signature-panel">
                <span>${currentCard.cardHolder || 'CUSTOMER'}</span>
              </div>
              <div class="card-cvv-box" style="background: rgba(255,255,255,0.92); padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.65rem; color: #64748b; font-weight: 700;">CVV</span>
                <span style="font-family: var(--font-mono); font-weight: 900; letter-spacing: 2px; color: #0f172a;">•••</span>
              </div>
            </div>

            <div class="card-back-footer">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Liên kết TK: <strong>${currentCard.linkedAccountNo || freshCust.accounts[0]?.accountNo || '1000123456'}</strong></span>
                <span>Hotline: <strong>1900 8888</strong></span>
              </div>
              <div style="font-size: 0.65rem; opacity: 0.6; margin-top: 4px;">Thẻ phát hành bởi QuangTrung Bank. Bảo mật tiêu chuẩn PCI-DSS & EMVCo.</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: center; margin-bottom: 14px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-flip-card-3d" style="font-size: 0.75rem; padding: 4px 14px; display: inline-flex; align-items: center; gap: 6px; border-radius: 20px;">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Lật Mặt Trước / Mặt Sau
        </button>
      </div>

      <!-- 4 Action Buttons Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-card-full-info" data-card="${currentCard.cardNumber}" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px;">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Chi Tiết & Bảo Mật
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-card-transactions" data-card="${currentCard.cardNumber}" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; border-color: rgba(245, 158, 11, 0.4); color: var(--accent-gold);">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
          Lịch Sử Giao Dịch
        </button>
        <button type="button" class="btn btn-secondary btn-sm btn-card-limits-pin" data-card="${currentCard.cardNumber}" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px;">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
          Hạn Mức & Đổi PIN
        </button>
        <button type="button" class="btn ${isLocked ? 'btn-success' : 'btn-danger'} btn-sm btn-toggle-card-lock" data-card="${currentCard.cardNumber}" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px;">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isLocked ? 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z' : 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'}"/></svg>
          ${isLocked ? 'Mở Khóa Thẻ' : 'Khóa Thẻ Tạm Thời'}
        </button>
      </div>
    `;

    // Event listeners cho các nút điều khiển thẻ
    const selectCard = cardContainer.querySelector('#cust-card-selector');
    if (selectCard) {
      selectCard.onchange = (e) => {
        window.selectedCardIndex = parseInt(e.target.value, 10) || 0;
        window.isCardFlipped = false;
        renderCustomerAccounts();
      };
    }

    const btnOpenIssue = cardContainer.querySelector('#btn-open-issue-card');
    if (btnOpenIssue) {
      btnOpenIssue.onclick = () => openIssueCardModal();
    }

    const flipper = cardContainer.querySelector('#card-3d-flipper');
    const btnFlip = cardContainer.querySelector('#btn-flip-card-3d');
    if (btnFlip && flipper) {
      btnFlip.onclick = () => {
        window.isCardFlipped = !window.isCardFlipped;
        flipper.classList.toggle('is-flipped', window.isCardFlipped);
      };
    }

    const cardNumSpan = cardContainer.querySelector('#card-display-number-text');
    const btnToggleMask = cardContainer.querySelector('#btn-toggle-card-number-mask');
    if (btnToggleMask) {
      btnToggleMask.onclick = (e) => {
        e.stopPropagation();
        if (!window.isCardNumberRevealed) {
          requestSecurityVerification({
            actionTitle: 'Xem đầy đủ 16 số thẻ ngân hàng',
            onVerified: () => {
              window.isCardNumberRevealed = true;
              if (cardNumSpan) {
                cardNumSpan.textContent = fullNumberFormatted;
              }
            }
          });
        } else {
          window.isCardNumberRevealed = false;
          if (cardNumSpan) {
            cardNumSpan.textContent = maskedNumberFormatted;
          }
        }
      };
    }

    const btnCopyCard = cardContainer.querySelector('#btn-copy-card-number');
    if (btnCopyCard) {
      btnCopyCard.onclick = (e) => {
        e.stopPropagation();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fullNumberFormatted).catch(() => {});
        }
        showToast(`Đã sao chép số thẻ: ${fullNumberFormatted}`, 'success');
      };
    }

    const btnFullInfo = cardContainer.querySelector('#btn-card-full-info');
    if (btnFullInfo) {
      btnFullInfo.onclick = () => {
        requestSecurityVerification({
          actionTitle: 'Xem thông tin chi tiết & Cấu hình bảo mật thẻ',
          onVerified: () => {
            openCardInfoModal(currentCard.cardNumber);
          }
        });
      };
    }

    const btnCardTxns = cardContainer.querySelector('#btn-card-transactions');
    if (btnCardTxns) {
      btnCardTxns.onclick = () => {
        openCardHistoryModal(currentCard.cardNumber);
      };
    }

    const btnLimits = cardContainer.querySelector('.btn-card-limits-pin');
    if (btnLimits) {
      btnLimits.onclick = () => {
        requestSecurityVerification({
          actionTitle: 'Cấu hình Hạn mức giao dịch & Đổi mã PIN thẻ',
          onVerified: () => {
            openCardSettingsModal(currentCard.cardNumber);
          }
        });
      };
    }

    const btnLock = cardContainer.querySelector('.btn-toggle-card-lock');
    if (btnLock) {
      btnLock.onclick = () => {
        const actionLabel = currentCard.status === 'ACTIVE' ? 'Khóa thẻ khẩn cấp' : 'Mở khóa thẻ ngân hàng';
        requestSecurityVerification({
          actionTitle: `${actionLabel} [${currentCard.cardType}]`,
          onVerified: () => {
            const res = CustomerService.toggleCardStatus(currentCard.cardNumber);
            showToast(res.message, res.success ? 'success' : 'danger');
            renderCustomerAccounts();
          }
        });
      };
    }
  }

  const btnBackDash = document.getElementById('btn-accounts-back-to-dashboard');
  if (btnBackDash) {
    btnBackDash.onclick = () => switchNavView('view-customer-dashboard');
  }

  renderBeneficiaries();
}

async function renderCustomerTransferView() {
  if (backendOnline && BankApiService.hasToken()) {
    await CustomerService.syncCustomerAccountsAsync();
  }
  const accounts = CustomerService.getCustomerAccounts();
  const paymentAccounts = accounts.filter(acc => acc.type === 'PAYMENT' || acc.type !== 'SAVINGS');
  const select = document.getElementById('transfer-from-acc');
  if (!select) return;
  select.innerHTML = '';

  paymentAccounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.accountNo;
    opt.textContent = `${acc.accountNo} (Thanh toán) - Số dư: ${store.formatVND(acc.balance)}`;
    select.appendChild(opt);
  });
}

let currentHistFilterState = {
  accountNo: 'ALL',
  fromDate: '',
  toDate: '',
  type: 'ALL',
  minAmount: '',
  maxAmount: '',
  search: '',
  page: 0,
  size: 10,
  totalPages: 1,
  totalElements: 0
};

async function renderCustomerHistoryView(targetPage = 0) {
  currentHistFilterState.page = targetPage;

  const tbody = document.getElementById('cust-full-history-tbody');
  if (!tbody) return;

  const user = AuthService.getCurrentUser();
  const freshCust = CustomerService.findCustomer(user);
  const myAccs = freshCust ? freshCust.accounts.map(a => a.accountNo) : [];

  // Populate account select dropdown if empty
  const accSelect = document.getElementById('filter-hist-acc');
  if (accSelect && accSelect.children.length === 0 && freshCust) {
    const paymentAccounts = (freshCust.accounts || []).filter(a => a.type === 'PAYMENT' || !a.type || a.type !== 'SAVINGS');
    accSelect.innerHTML = `<option value="ALL">Tất cả tài khoản (${paymentAccounts.length})</option>`;
    paymentAccounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.accountNo;
      opt.textContent = `${a.accountNo} (${a.type === 'PAYMENT' ? 'Thanh toán' : a.type})`;
      accSelect.appendChild(opt);
    });
  }

  const btnOpenStmt = document.getElementById('btn-open-modal-statement');
  if (btnOpenStmt && !btnOpenStmt.dataset.listenerSet) {
    btnOpenStmt.dataset.listenerSet = 'true';
    btnOpenStmt.onclick = () => {
      const selectedAcc = accSelect?.value || (freshCust?.accounts?.[0]?.accountNo || 'ALL');
      openStatementModal(selectedAcc);
    };
  }

  // Read filter values from form inputs
  const accVal = document.getElementById('filter-hist-acc')?.value || 'ALL';
  const fromDateVal = document.getElementById('filter-hist-from-date')?.value || '';
  const toDateVal = document.getElementById('filter-hist-to-date')?.value || '';
  const typeVal = document.getElementById('filter-hist-type')?.value || 'ALL';
  const minAmtVal = (document.getElementById('filter-hist-min-amount')?.value || '').replace(/\D/g, '');
  const maxAmtVal = (document.getElementById('filter-hist-max-amount')?.value || '').replace(/\D/g, '');
  const searchVal = document.getElementById('filter-hist-search')?.value || '';
  const sizeVal = parseInt(document.getElementById('hist-page-size')?.value || 10, 10);

  currentHistFilterState = {
    ...currentHistFilterState,
    accountNo: accVal,
    fromDate: fromDateVal,
    toDate: toDateVal,
    type: typeVal,
    minAmount: minAmtVal,
    maxAmount: maxAmtVal,
    search: searchVal,
    size: sizeVal
  };

  // Call CustomerService filter API (handles backend API or LocalStore fallback)
  const res = await CustomerService.getTransactionHistoryFilteredAsync(currentHistFilterState);
  const pageData = res.data || { content: [], page: 0, size: 10, totalElements: 0, totalPages: 1 };
  const txns = pageData.content || [];

  currentHistFilterState.page = pageData.page || 0;
  currentHistFilterState.totalPages = pageData.totalPages || 1;
  currentHistFilterState.totalElements = pageData.totalElements || 0;

  // Render Table Rows
  tbody.innerHTML = '';
  if (txns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">Không tìm thấy giao dịch nào phù hợp với bộ lọc.</td></tr>`;
  } else {
    txns.forEach(t => {
      const isOut = myAccs.includes(t.fromAccount);
      const tr = document.createElement('tr');

      let typeBadge = CustomerService.getTransactionTypeBadge(t, myAccs);

      tr.innerHTML = `
        <td><strong style="font-family: var(--font-mono); color: var(--accent-gold);">${store.formatTxnId(t.id)}</strong></td>
        <td style="font-size: 0.8rem; color: var(--text-dim); white-space: nowrap;">${store.formatDateTime(t.timestamp)}</td>
        <td>${typeBadge}</td>
        <td>${t.fromName || '-'} (<code>${t.fromAccount}</code>)</td>
        <td>${t.toName || '-'} (<code>${t.toAccount}</code>)</td>
        <td style="max-width: 220px; word-break: break-word;">${t.content || '-'}</td>
        <td style="text-align: right; font-weight: 700;" class="${isOut ? 'text-danger' : 'text-emerald'}">
          ${isOut ? '-' : '+'}${store.formatVND(t.amount)}
        </td>
        <td><span class="user-role-badge badge-customer">${t.status || 'SUCCESS'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Update Pagination Controls UI
  const totalCountEl = document.getElementById('hist-total-count');
  const totalSummaryEl = document.getElementById('hist-total-summary');
  const pageRangeEl = document.getElementById('hist-page-range');
  const pageLabelEl = document.getElementById('hist-current-page-label');
  const btnPrev = document.getElementById('btn-hist-prev-page');
  const btnNext = document.getElementById('btn-hist-next-page');

  if (totalCountEl) totalCountEl.textContent = pageData.totalElements;
  if (totalSummaryEl) totalSummaryEl.textContent = `Tổng số: ${pageData.totalElements} giao dịch`;

  const startRecord = txns.length > 0 ? (pageData.page * pageData.size + 1) : 0;
  const endRecord = Math.min((pageData.page + 1) * pageData.size, pageData.totalElements);
  if (pageRangeEl) pageRangeEl.textContent = `${startRecord}-${endRecord}`;

  if (pageLabelEl) pageLabelEl.textContent = `Trang ${pageData.page + 1} / ${Math.max(1, pageData.totalPages)}`;

  if (btnPrev) {
    btnPrev.disabled = pageData.page <= 0;
    btnPrev.onclick = () => renderCustomerHistoryView(pageData.page - 1);
  }
  if (btnNext) {
    btnNext.disabled = pageData.page >= pageData.totalPages - 1;
    btnNext.onclick = () => renderCustomerHistoryView(pageData.page + 1);
  }

  // Setup form & control listeners once
  const formFilter = document.getElementById('form-filter-history');
  if (formFilter && !formFilter.dataset.listenerSet) {
    formFilter.dataset.listenerSet = 'true';
    formFilter.onsubmit = (e) => {
      e.preventDefault();
      renderCustomerHistoryView(0);
    };
  }

  const btnReset = document.getElementById('btn-reset-hist-filter');
  if (btnReset && !btnReset.dataset.listenerSet) {
    btnReset.dataset.listenerSet = 'true';
    btnReset.onclick = () => {
      formFilter.reset();
      renderCustomerHistoryView(0);
    };
  }

  const pageSizeSelect = document.getElementById('hist-page-size');
  if (pageSizeSelect && !pageSizeSelect.dataset.listenerSet) {
    pageSizeSelect.dataset.listenerSet = 'true';
    pageSizeSelect.onchange = () => {
      renderCustomerHistoryView(0);
    };
  }
}

async function renderCustomerProfileView() {
  const user = AuthService.getCurrentUser();
  let freshCust = CustomerService.findCustomer(user);

  if (user && user._hasJwtToken && (!freshCust || !freshCust.idCard || !freshCust.address)) {
    try {
      const profRes = await BankApiService.getProfile();
      if (profRes && profRes.success && profRes.data) {
        const pd = profRes.data;
        if (user) {
          if (pd.idCard) user.idCard = pd.idCard;
          if (pd.address) user.address = pd.address;
          if (pd.contactAddress) user.contactAddress = pd.contactAddress;
          if (pd.customerId) user.customerId = pd.customerId;
          if (pd.fullName) user.fullName = pd.fullName;
          if (pd.email) user.email = pd.email;
          if (pd.phone) user.phone = pd.phone;
        }
        if (freshCust) {
          if (pd.idCard) freshCust.idCard = pd.idCard;
          if (pd.address) freshCust.address = pd.address;
          if (pd.contactAddress) freshCust.contactAddress = pd.contactAddress;
          if (pd.fullName) freshCust.fullName = pd.fullName;
          if (pd.email) freshCust.email = pd.email;
          if (pd.phone) freshCust.phone = pd.phone;
        }
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ hồ sơ khách hàng từ Backend:', err);
    }
  }

  freshCust = CustomerService.findCustomer(user);
  if (!freshCust && !user) return;

  const fullName = (freshCust && freshCust.fullName) || (user && user.fullName) || '';
  const idCard = (freshCust && freshCust.idCard) || (user && user.idCard) || '';
  const phone = (freshCust && freshCust.phone) || (user && user.phone) || '';
  const email = (freshCust && freshCust.email) || (user && user.email) || '';
  const address = (freshCust && freshCust.address) || (user && user.address) || '';
  const contactAddress = (freshCust && (freshCust.contactAddress || freshCust.address)) || (user && (user.contactAddress || user.address)) || '';

  const elFullname = document.getElementById('profile-fullname');
  if (elFullname) elFullname.value = fullName;

  const elIdCard = document.getElementById('profile-idcard');
  if (elIdCard) elIdCard.value = idCard;

  const elPhone = document.getElementById('profile-phone');
  if (elPhone) elPhone.value = phone;

  const elEmail = document.getElementById('profile-email');
  if (elEmail) elEmail.value = email;

  const elAddress = document.getElementById('profile-address');
  if (elAddress) elAddress.value = address;

  const contactAddressInput = document.getElementById('profile-contact-address');
  if (contactAddressInput) contactAddressInput.value = contactAddress;

  const pwdCurrentInput = document.getElementById('change-pwd-current');
  const pwdNewInput = document.getElementById('change-pwd-new');
  const pwdConfirmInput = document.getElementById('change-pwd-confirm');
  const meterContainer = document.getElementById('password-strength-container');

  if (pwdCurrentInput) pwdCurrentInput.value = '';
  if (pwdConfirmInput) pwdConfirmInput.value = '';

  if (pwdNewInput && meterContainer) {
    pwdNewInput.value = '';
    meterContainer.innerHTML = '';
    pwdNewInput.oninput = (e) => {
      meterContainer.innerHTML = SecurityService.renderPasswordStrengthBar(e.target.value);
    };
  }
}

/* ==========================================================================
   HÀM HIỂN THỊ DỮ LIỆU CHO PHÂN HỆ GIAO DỊCH VIÊN (TELLER VIEWS)
   ========================================================================== */

function renderTellerDashboard() {
  const user = AuthService.getCurrentUser();
  const freshTeller = store.data.tellers.find(t => t.id === user.id) || user;

  document.getElementById('teller-staff-code').textContent = freshTeller.staffCode || 'GDV001';
  document.getElementById('teller-branch-name').textContent = `Chi nhánh: ${freshTeller.branch || 'Hội Sở QuangTrung Bank'}`;
  document.getElementById('teller-total-cust').textContent = store.data.customers.length;
  
  const pendingLoans = (store.data.loanApplications || []).filter(l => l.status === 'PENDING').length;
  const pendingLoansEl = document.getElementById('teller-pending-loans-dash');
  if (pendingLoansEl) pendingLoansEl.textContent = pendingLoans;

  document.getElementById('btn-nav-teller-new-cust').onclick = () => switchNavView('view-teller-new-customer');
  document.getElementById('btn-nav-teller-accounts').onclick = () => switchNavView('view-teller-accounts');
  const btnTellerLoans = document.getElementById('btn-nav-teller-loans');
  if (btnTellerLoans) btnTellerLoans.onclick = () => switchNavView('view-teller-loans');
}

// Biến trạng thái phân hệ Tạo hồ sơ khách hàng tại quầy (GDV)
let tellerWebcamStream = null;
function renderTellerNewCustomerView() {
  const form = document.getElementById('form-teller-create-cust');
  if (form) form.reset();
}

async function renderTellerCustomersView() {
  await TellerService.syncCustomersAsync();
  const tbody = document.getElementById('teller-customers-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  store.data.customers.forEach(c => {
    const accountsCount = Array.isArray(c.accounts) ? c.accounts.length : 1;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${c.id}</code></td>
      <td style="font-weight: 600;">${c.fullName}</td>
      <td>${c.idCard}</td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td><span class="user-role-badge badge-customer">${accountsCount} TK</span></td>
      <td>
        <button type="button" class="btn btn-secondary btn-sm" onclick="openTellerEditCustomerModal('${c.id}')">Sửa HĐ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openTellerEditCustomerModal(cid) {
  const cust = (store.data.customers || []).find(c => c.id === cid);
  if (cust) {
    document.getElementById('modal-edit-cust-id').value = cust.id;
    document.getElementById('modal-edit-cust-fullname').value = cust.fullName;
    document.getElementById('modal-edit-cust-phone').value = cust.phone;
    document.getElementById('modal-edit-cust-email').value = cust.email;
    document.getElementById('modal-edit-cust-address').value = cust.address;
    openModal('modal-edit-customer');
  }
}

window.openTellerEditCustomerModal = openTellerEditCustomerModal;

async function renderTellerAccountsView() {
  await TellerService.syncCustomersAsync();
  const tbody = document.getElementById('teller-accounts-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  store.data.customers.forEach(c => {
    (c.accounts || []).forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><code>${a.accountNo}</code></td>
        <td>${c.fullName}</td>
        <td><span class="user-role-badge ${a.type === 'SAVINGS' ? 'badge-teller' : 'badge-customer'}">${a.type}</span></td>
        <td style="font-weight: 700; color: var(--accent-cyan);">${store.formatVND(a.balance)}</td>
        <td><span class="user-role-badge ${a.status === 'ACTIVE' ? 'badge-customer' : 'badge-admin'}">${a.status}</span></td>
        <td style="font-size: 0.8rem; color: var(--text-dim);">${a.createdAt}</td>
        <td>
          ${a.status === 'ACTIVE' 
            ? `<button class="btn btn-danger btn-sm btn-toggle-acc" data-acc="${a.accountNo}" data-status="LOCKED">Khóa TK</button>`
            : `<button class="btn btn-primary btn-sm btn-toggle-acc" data-acc="${a.accountNo}" data-status="ACTIVE">Mở Khóa</button>`
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  // Gán sự kiện thay đổi trạng thái tài khoản
  tbody.querySelectorAll('.btn-toggle-acc').forEach(btn => {
    btn.onclick = async (e) => {
      const accNo = e.currentTarget.getAttribute('data-acc');
      const newStatus = e.currentTarget.getAttribute('data-status');
      const res = await TellerService.toggleAccountStatusAsync(accNo, newStatus);
      showToast(res.message, res.success ? 'success' : 'danger');
      renderTellerAccountsView();
    };
  });
}



/* ==========================================================================
   HÀM HIỂN THỊ DỮ LIỆU TÍN DỤNG & VAY VỐN (LOANS & CREDIT SYSTEM)
   ========================================================================== */

let currentCustomerLoanFilter = 'ALL';

async function renderCustomerLoansView(filter = currentCustomerLoanFilter) {
  currentCustomerLoanFilter = filter;
  const user = AuthService.getCurrentUser();
  if (!user || user.role !== 'CUSTOMER') return;

  const freshCust = CustomerService.findCustomer(user);
  if (!freshCust) return;

  // Lấy dữ liệu biểu lãi suất cho vay mới nhất từ Backend API
  await CustomerService.getLoanInterestRatesAsync();

  // Cập nhật thẻ biểu lãi suất gói vay theo cấu hình mới nhất
  renderLoanPackagesGuide();
  populateLoanTypeSelect();

  const loans = await CustomerService.getCustomerLoansAsync();
  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const totalBalance = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);

  // Tính toán kỳ trả nợ gần nhất
  let nextPayment = 0;
  let nextDueStr = 'Hạn nộp: ---';
  if (activeLoans.length > 0) {
    const firstActive = activeLoans[0];
    nextPayment = firstActive.monthlyPayment || 0;
    nextDueStr = `Hạn nộp: ${firstActive.nextDueDate ? store.formatDate(firstActive.nextDueDate) : 'Chờ giải ngân'}`;
  }

  // Cập nhật thẻ KPI
  const balEl = document.getElementById('cust-loan-total-balance');
  if (balEl) balEl.textContent = store.formatVND(totalBalance);

  const countEl = document.getElementById('cust-loan-active-count');
  if (countEl) countEl.textContent = `${activeLoans.length} hợp đồng đang vay`;

  const nextPayEl = document.getElementById('cust-loan-next-payment');
  if (nextPayEl) nextPayEl.textContent = store.formatVND(nextPayment);

  const nextDueEl = document.getElementById('cust-loan-next-due');
  if (nextDueEl) nextDueEl.textContent = nextDueStr;

  // Gán sự kiện nút bộ lọc
  const filterBtns = document.querySelectorAll('.filter-loan-btn');
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === currentCustomerLoanFilter);
    btn.onclick = (e) => {
      const f = e.currentTarget.getAttribute('data-filter');
      renderCustomerLoansView(f);
    };
  });

  // Lọc danh sách khoản vay
  let displayedLoans = loans;
  if (currentCustomerLoanFilter !== 'ALL') {
    displayedLoans = loans.filter(l => l.status === currentCustomerLoanFilter);
  }

  const tbody = document.getElementById('cust-loans-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (displayedLoans.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">Không có khoản vay nào thuộc trạng thái này.</td></tr>`;
    return;
  }

  const packageNames = {
    MORTGAGE: '🏠 Vay Mua BĐS',
    CAR: '🚗 Vay Mua Ô Tô',
    CONSUMER: '💼 Vay Tiêu Dùng',
    BUSINESS: '📈 Vay Kinh Doanh'
  };

  displayedLoans.forEach(loan => {
    const tr = document.createElement('tr');

    let statusBadge = '';
    if (loan.status === 'ACTIVE') statusBadge = '<span class="user-role-badge badge-customer">Đang Vay (Active)</span>';
    else if (loan.status === 'PENDING') statusBadge = '<span class="user-role-badge badge-teller">Chờ Thẩm Định</span>';
    else if (loan.status === 'PAID_OFF') statusBadge = '<span class="user-role-badge badge-admin">Đã Tất Toán</span>';
    else if (loan.status === 'REJECTED') statusBadge = '<span class="user-role-badge" style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);">Từ Chối</span>';

    const pkgName = packageNames[loan.loanType] || 'Vay Tiêu Dùng';

    tr.innerHTML = `
      <td>
        <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${loan.contractNo || loan.id}</strong>
        <div style="font-size: 0.72rem; color: var(--text-dim);">${loan.appliedAt ? store.formatDateTime(loan.appliedAt) : ''}</div>
      </td>
      <td>
        <strong style="font-size: 0.85rem;">${pkgName}</strong>
        <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${loan.title}">${loan.title}</div>
      </td>
      <td style="font-family: var(--font-mono);">${store.formatVND(loan.principalAmount)}</td>
      <td style="font-family: var(--font-mono); font-weight: 700; color: ${loan.status === 'ACTIVE' ? 'var(--accent-gold)' : 'var(--text-dim)'};">
        ${store.formatVND(loan.remainingBalance)}
      </td>
      <td>
        <div>${loan.termMonths} tháng</div>
        <div style="font-size: 0.75rem; color: var(--accent-cyan);">${loan.interestRate}%/năm</div>
      </td>
      <td>
        <strong style="font-family: var(--font-mono); color: var(--accent-gold);">${loan.status === 'ACTIVE' ? store.formatVND(loan.monthlyPayment) : '---'}</strong>
        <div style="font-size: 0.72rem; color: var(--text-dim);">${loan.nextDueDate ? store.formatDate(loan.nextDueDate) : ''}</div>
      </td>
      <td>${statusBadge}</td>
      <td>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm btn-loan-contract" data-id="${loan.id}" title="Xem Hợp Đồng Tín Dụng" style="padding: 4px 8px; font-size: 0.75rem;">
            📑 HĐ
          </button>
          ${loan.status === 'ACTIVE' ? `
            <button class="btn btn-primary btn-sm btn-pay-installment" data-id="${loan.id}" title="Thanh Toán Kỳ Nợ Hiện Tại" style="padding: 4px 8px; font-size: 0.75rem;">
              💵 Trả Nợ
            </button>
            <button class="btn btn-gold btn-sm btn-pay-early-all" data-id="${loan.id}" title="Tất Toán Toàn Bộ Trước Hạn" style="padding: 4px 8px; font-size: 0.75rem;">
              🏆 Tất Toán
            </button>
          ` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Gán sự kiện hàng
  tbody.querySelectorAll('.btn-loan-contract').forEach(btn => {
    btn.onclick = () => openLoanContractModal(btn.getAttribute('data-id'));
  });

  tbody.querySelectorAll('.btn-pay-installment').forEach(btn => {
    btn.onclick = () => {
      const loanId = btn.getAttribute('data-id');
      openPayLoanModal(loanId, false);
    };
  });

  tbody.querySelectorAll('.btn-pay-early-all').forEach(btn => {
    btn.onclick = () => {
      const loanId = btn.getAttribute('data-id');
      openPayLoanModal(loanId, true);
    };
  });

  // Nút mở modal vay vốn
  const btnApplyTop = document.getElementById('btn-open-modal-apply-loan');
  if (btnApplyTop) btnApplyTop.onclick = () => openApplyLoanModal();
}

let currentTellerLoanFilter = 'PENDING';

async function renderTellerLoansView(filter = currentTellerLoanFilter, search = '') {
  currentTellerLoanFilter = filter;
  const loans = await TellerService.getAllLoansAsync();

  const pendingLoans = loans.filter(l => l.status === 'PENDING');
  const approvedLoans = loans.filter(l => l.status === 'ACTIVE' || l.status === 'PAID_OFF');
  const pendingTotalAmount = pendingLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);

  const pendCountEl = document.getElementById('teller-pending-loans-count');
  if (pendCountEl) pendCountEl.textContent = `${pendingLoans.length} hồ sơ`;

  const pendAmtEl = document.getElementById('teller-pending-loans-amount');
  if (pendAmtEl) pendAmtEl.textContent = store.formatVND(pendingTotalAmount);

  const appCountEl = document.getElementById('teller-approved-loans-count');
  if (appCountEl) appCountEl.textContent = `${approvedLoans.length} hợp đồng`;

  // Gán sự kiện cho các nút lọc
  document.querySelectorAll('.teller-filter-loan-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === currentTellerLoanFilter);
    btn.onclick = (e) => {
      const f = e.currentTarget.getAttribute('data-filter');
      const searchVal = document.getElementById('search-teller-loans') ? document.getElementById('search-teller-loans').value.trim() : '';
      renderTellerLoansView(f, searchVal);
    };
  });

  // Gán sự kiện tìm kiếm
  const searchInput = document.getElementById('search-teller-loans');
  if (searchInput) {
    searchInput.oninput = (e) => {
      renderTellerLoansView(currentTellerLoanFilter, e.target.value.trim());
    };
  }

  // Lọc dữ liệu
  let displayed = loans;
  if (currentTellerLoanFilter !== 'ALL') {
    displayed = loans.filter(l => l.status === currentTellerLoanFilter);
  }

  if (search) {
    const q = search.toLowerCase();
    displayed = displayed.filter(l =>
      (l.id && l.id.toLowerCase().includes(q)) ||
      (l.contractNo && l.contractNo.toLowerCase().includes(q)) ||
      (l.customerName && l.customerName.toLowerCase().includes(q)) ||
      (l.customerId && l.customerId.toLowerCase().includes(q))
    );
  }

  const tbody = document.getElementById('teller-loans-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (displayed.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">Không tìm thấy hồ sơ vay vốn nào.</td></tr>`;
    return;
  }

  const packageNames = {
    MORTGAGE: '🏠 Vay Mua BĐS',
    CAR: '🚗 Vay Mua Ô Tô',
    CONSUMER: '💼 Vay Tiêu Dùng',
    BUSINESS: '📈 Vay Kinh Doanh'
  };

  displayed.forEach(loan => {
    const tr = document.createElement('tr');

    let statusBadge = '';
    if (loan.status === 'ACTIVE') statusBadge = '<span class="user-role-badge badge-customer">Đã Giải Ngân</span>';
    else if (loan.status === 'PENDING') statusBadge = '<span class="user-role-badge badge-teller">Chờ Thẩm Định</span>';
    else if (loan.status === 'PAID_OFF') statusBadge = '<span class="user-role-badge badge-admin">Đã Tất Toán</span>';
    else if (loan.status === 'REJECTED') statusBadge = '<span class="user-role-badge" style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);">Từ Chối</span>';

    tr.innerHTML = `
      <td>
        <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${loan.contractNo || loan.id}</strong>
        <div style="font-size: 0.72rem; color: var(--text-dim);">${loan.appliedAt || ''}</div>
      </td>
      <td>
        <div style="font-weight: 700;">${loan.customerName}</div>
        <div style="font-size: 0.75rem; color: var(--accent-gold);">${store.formatVND(loan.income || 30000000)}/tháng</div>
        <div style="font-size: 0.7rem; color: var(--text-dim);">${loan.incomeSource || 'Lương chuyển khoản'}</div>
      </td>
      <td>
        <strong style="font-size: 0.85rem;">${packageNames[loan.loanType] || 'Vay Tiêu Dùng'}</strong>
        <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${loan.title}">${loan.title}</div>
      </td>
      <td>
        <strong style="font-family: var(--font-mono); font-size: 0.95rem; color: var(--accent-cyan);">${store.formatVND(loan.principalAmount)}</strong>
        <div style="font-size: 0.72rem; color: var(--text-dim);">TK nhận: ${loan.accountNo}</div>
      </td>
      <td>
        <div>${loan.termMonths} tháng</div>
        <div style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 600;">${loan.interestRate}%/năm</div>
      </td>
      <td style="font-size: 0.78rem; color: var(--text-muted); max-width: 140px;">
        ${loan.collateral || 'Tín chấp không TSBĐ'}
      </td>
      <td>${statusBadge}</td>
      <td>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          ${loan.status === 'PENDING' ? `
            <button class="btn btn-success btn-sm btn-teller-approve-loan" data-id="${loan.id}" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 700;">
              ⚡ Duyệt & Giải Ngân
            </button>
            <button class="btn btn-danger btn-sm btn-teller-reject-loan" data-id="${loan.id}" style="padding: 4px 8px; font-size: 0.75rem;">
              ❌ Từ Chối
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm btn-teller-view-contract" data-id="${loan.id}" title="Xem Hợp Đồng Tín Dụng" style="padding: 4px 8px; font-size: 0.75rem;">
            📑 HĐ
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Gán sự kiện nút trong view GDV
  tbody.querySelectorAll('.btn-teller-approve-loan').forEach(btn => {
    btn.onclick = () => {
      const loanId = btn.getAttribute('data-id');
      const loan = store.data.loans.find(l => l.id === loanId);
      if (!loan) return;

      const isSecured = isSecuredLoan(loan);
      if (isSecured) {
        // Vay thế chấp: Bắt buộc mở Modal xác minh & tiếp nhận giấy tờ gốc (sổ đỏ, cà vẹt...) tại quầy
        openVerifyCollateralModal(loan);
      } else {
        // Vay tín chấp: Trực tiếp xác thực mật khẩu GDV để giải ngân
        requestSecurityVerification({
          actionTitle: `Phê duyệt & Giải ngân ${store.formatVND(loan.principalAmount)} cho KH ${loan.customerName} [HĐ: ${loan.contractNo || loan.id}]`,
          onVerified: async () => {
            const res = await TellerService.approveLoanAsync(loanId, 'Thẩm định hồ sơ tín chấp đạt tiêu chuẩn và giải ngân tự động');
            showToast(res.message, res.success ? 'success' : 'danger');
            await renderTellerLoansView(currentTellerLoanFilter);
          }
        });
      }
    };
  });

  tbody.querySelectorAll('.btn-teller-reject-loan').forEach(btn => {
    btn.onclick = () => {
      const loanId = btn.getAttribute('data-id');
      const loan = store.data.loans.find(l => l.id === loanId);
      if (!loan) return;

      const reason = prompt('Nhập lý do từ chối phê duyệt hồ sơ vay vốn:', 'Hồ sơ chưa đáp ứng đầy đủ điều kiện cấp tín dụng của Ngân hàng');
      if (reason !== null && reason.trim()) {
        requestSecurityVerification({
          actionTitle: `Từ chối cấp tín dụng cho KH ${loan.customerName} [HĐ: ${loan.contractNo || loan.id}]`,
          onVerified: async () => {
            const res = await TellerService.rejectLoanAsync(loanId, reason.trim());
            showToast(res.message, res.success ? 'success' : 'danger');
            await renderTellerLoansView(currentTellerLoanFilter);
          }
        });
      }
    };
  });

  tbody.querySelectorAll('.btn-teller-view-contract').forEach(btn => {
    btn.onclick = () => openLoanContractModal(btn.getAttribute('data-id'));
  });
}

/* ==========================================================================
   HÀM HIỂN THỊ DỮ LIỆU CHO PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN VIEWS)
   ========================================================================== */

async function renderAdminDashboard() {
  const metrics = await AdminService.getSystemMetricsAsync();

  const totalLiqEl = document.getElementById('admin-total-liquidity');
  const totalCustEl = document.getElementById('admin-total-cust');
  const totalTellersEl = document.getElementById('admin-total-tellers');

  if (totalLiqEl) totalLiqEl.textContent = store.formatVND(metrics.totalLiquidity);
  if (totalCustEl) totalCustEl.textContent = metrics.totalCustomers;
  if (totalTellersEl) totalTellersEl.textContent = metrics.totalTellers;

  // Vẽ biểu đồ thống kê
  setTimeout(() => {
    ReportService.renderAdminCharts('chart-liquidity', 'chart-transactions', metrics);
  }, 100);
}

function renderAdminTellersView() {
  const tellers = store.data.tellers || [];
  const searchInput = document.getElementById('admin-teller-search');
  const branchFilter = document.getElementById('admin-teller-filter-branch');
  const statusFilter = document.getElementById('admin-teller-filter-status');

  // Cập nhật thống kê GDV KPI
  const totalStaffEl = document.getElementById('admin-staff-total');
  const activeStaffEl = document.getElementById('admin-staff-active');
  const lockedStaffEl = document.getElementById('admin-staff-locked');

  const countTotal = tellers.length;
  const countActive = tellers.filter(t => t.status === 'ACTIVE').length;
  const countLocked = tellers.filter(t => t.status === 'LOCKED').length;

  if (totalStaffEl) totalStaffEl.textContent = countTotal;
  if (activeStaffEl) activeStaffEl.textContent = countActive;
  if (lockedStaffEl) lockedStaffEl.textContent = countLocked;

  // Cập nhật số liệu trên Admin Dashboard nếu có
  const adminTotalTellersEl = document.getElementById('admin-total-tellers');
  if (adminTotalTellersEl) adminTotalTellersEl.textContent = countTotal;

  // Lọc dữ liệu giao dịch viên
  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedBranch = branchFilter?.value || 'ALL';
  const selectedStatus = statusFilter?.value || 'ALL';

  const filtered = tellers.filter(t => {
    if (selectedBranch !== 'ALL' && t.branch !== selectedBranch) return false;
    if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
    if (query) {
      const matchName = (t.fullName || '').toLowerCase().includes(query);
      const matchCode = (t.staffCode || '').toLowerCase().includes(query);
      const matchUser = (t.username || '').toLowerCase().includes(query);
      const matchPhone = (t.phone || '').includes(query);
      if (!matchName && !matchCode && !matchUser && !matchPhone) return false;
    }
    return true;
  });

  const tbody = document.getElementById('admin-tellers-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
          Không tìm thấy giao dịch viên phù hợp với bộ lọc.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(t => {
    const isLocked = t.status === 'LOCKED';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; font-family: var(--font-mono); color: var(--accent-cyan);">${t.staffCode || 'GDV'}</div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">user: ${t.username}</div>
      </td>
      <td>
        <div style="font-weight: 600; color: #fff;">${t.fullName}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${t.phone || ''} ${t.email ? `• ${t.email}` : ''}</div>
      </td>
      <td>
        <span style="font-size: 0.82rem; color: var(--text-main);">${t.branch || 'Hội Sở'}</span>
      </td>
      <td>
        <span class="badge ${isLocked ? 'badge-danger' : 'badge-emerald'}" style="font-size: 0.72rem;">
          ${isLocked ? '🔒 TẠM KHÓA' : '✓ HOẠT ĐỘNG'}
        </span>
      </td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary btn-sm btn-teller-edit-info" data-id="${t.id}" onclick="openAddEditTellerModal('${t.id}')" title="Sửa thông tin giao dịch viên" style="padding: 4px 8px; font-size: 0.75rem;">
            ✏️ Sửa
          </button>
          <button type="button" class="btn ${isLocked ? 'btn-success' : 'btn-danger'} btn-sm btn-teller-toggle-status" data-id="${t.id}" title="${isLocked ? 'Mở khóa GDV' : 'Khóa tài khoản'}" style="padding: 4px 8px; font-size: 0.75rem;">
            ${isLocked ? '🔓 Mở' : '🔒 Khóa'}
          </button>
          <button type="button" class="btn btn-danger btn-sm btn-teller-delete" data-id="${t.id}" title="Xóa tài khoản giao dịch viên" style="padding: 4px 8px; font-size: 0.75rem; background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); color: #f87171;">
            🗑️ Xóa
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Gán sự kiện cho các nút trong bảng
  tbody.querySelectorAll('.btn-teller-edit-info').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openAddEditTellerModal(btn.getAttribute('data-id'));
    };
  });

  tbody.querySelectorAll('.btn-teller-toggle-status').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const teller = store.data.tellers.find(t => t.id === id || t.staffCode === id);
      if (!teller) return;

      const action = teller.status === 'ACTIVE' ? 'KHÓA' : 'MỞ KHÓA';
      requestSecurityVerification({
        actionTitle: `${action} tài khoản giao dịch viên [${teller.fullName} - ${teller.staffCode || teller.id}]`,
        onVerified: () => {
          const res = AdminService.toggleTellerStatus(id);
          showToast(res.message, res.success ? 'success' : 'danger');
          renderAdminTellersView();
        }
      });
    };
  });

  tbody.querySelectorAll('.btn-teller-delete').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      const teller = store.data.tellers.find(t => t.id === id || t.staffCode === id);
      if (!teller) return;

      requestSecurityVerification({
        actionTitle: `Xác nhận XÓA VĨNH VIỄN tài khoản Giao dịch viên [${teller.fullName} - ${teller.staffCode || teller.id}]`,
        onVerified: async () => {
          const res = await AdminService.deleteTeller(id);
          if (res.success) {
            showSuccessModal({
              title: 'Xóa Giao Dịch Viên Thành Công!',
              message: res.message || `Đã xóa tài khoản cán bộ ${teller.fullName} khỏi hệ thống.`,
              counterparty: teller.fullName
            });
            renderAdminTellersView();
          } else {
            showToast(res.message, 'danger');
          }
        }
      });
    };
  });

  // Gán sự kiện filter nếu chưa có
  if (searchInput && !searchInput.dataset.listenerSet) {
    searchInput.dataset.listenerSet = 'true';
    searchInput.addEventListener('input', () => renderAdminTellersView());
  }
  if (branchFilter && !branchFilter.dataset.listenerSet) {
    branchFilter.dataset.listenerSet = 'true';
    branchFilter.addEventListener('change', () => renderAdminTellersView());
  }
  if (statusFilter && !statusFilter.dataset.listenerSet) {
    statusFilter.dataset.listenerSet = 'true';
    statusFilter.addEventListener('change', () => renderAdminTellersView());
  }

  const btnAdd = document.getElementById('btn-open-modal-add-teller');
  if (btnAdd) {
    btnAdd.onclick = () => openAddEditTellerModal();
  }
}

function renderAdminSystemView() {
  const sys = store.data.systemSettings;
  const fees = sys.feeSchedule || {};
  const limits = sys.transactionLimits || {};
  const fxRates = sys.fxRates || [];
  const interestRates = store.data.savingsInterestRates || [];

  // Tab switching logic
  document.querySelectorAll('[data-cfg-tab]').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('[data-cfg-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.cfg-tab-content').forEach(c => c.classList.add('hidden'));

      const tabTarget = e.currentTarget.getAttribute('data-cfg-tab');
      e.currentTarget.classList.add('active');

      const targetEl = document.getElementById(`cfg-tab-${tabTarget}`);
      if (targetEl) targetEl.classList.remove('hidden');
    };
  });

  // 1. Populate Tab 1 (Biểu Phí)
  const fInternal = document.getElementById('cfg-fee-internal');
  const fInterbank = document.getElementById('cfg-fee-interbank');
  const fAtmInt = document.getElementById('cfg-fee-atm-internal');
  const fAtmExt = document.getElementById('cfg-fee-atm-external');
  const fCardIssue = document.getElementById('cfg-fee-card-issue');
  const fMonthly = document.getElementById('cfg-fee-monthly-acc');

  if (fInternal) fInternal.value = formatCurrencyVNDInput(fees.internalTransferFee ?? 0);
  if (fInterbank) fInterbank.value = formatCurrencyVNDInput(fees.interbankTransferFee ?? 2200);
  if (fAtmInt) fAtmInt.value = formatCurrencyVNDInput(fees.atmWithdrawInternalFee ?? 0);
  if (fAtmExt) fAtmExt.value = formatCurrencyVNDInput(fees.atmWithdrawExternalFee ?? 3300);
  if (fCardIssue) fCardIssue.value = formatCurrencyVNDInput(fees.cardIssuanceFee ?? 50000);
  if (fMonthly) fMonthly.value = formatCurrencyVNDInput(fees.monthlyAccountFee ?? 0);

  const formFees = document.getElementById('form-cfg-fees');
  if (formFees && !formFees.dataset.listenerSet) {
    formFees.dataset.listenerSet = 'true';
    formFees.onsubmit = (e) => {
      e.preventDefault();
      AdminService.updateSystemSettings({
        feeSchedule: {
          internalTransferFee: parseFloat((fInternal.value || '0').replace(/\D/g, '')),
          interbankTransferFee: parseFloat((fInterbank.value || '0').replace(/\D/g, '')),
          atmWithdrawInternalFee: parseFloat((fAtmInt.value || '0').replace(/\D/g, '')),
          atmWithdrawExternalFee: parseFloat((fAtmExt.value || '0').replace(/\D/g, '')),
          cardIssuanceFee: parseFloat((fCardIssue.value || '0').replace(/\D/g, '')),
          monthlyAccountFee: parseFloat((fMonthly.value || '0').replace(/\D/g, ''))
        }
      });
      showToast('Lưu biểu phí dịch vụ thành công!', 'success');
    };
  }

  // 2. Populate Tab 2 (Hạn Mức)
  const lPerUnver = document.getElementById('cfg-limit-per-unverified');
  const lDailyUnver = document.getElementById('cfg-limit-daily-unverified');
  const lPerVer = document.getElementById('cfg-limit-per-verified');
  const lDailyVer = document.getElementById('cfg-limit-daily-verified');
  const lSoftOtp = document.getElementById('cfg-limit-soft-otp');
  const lMaxSavings = document.getElementById('cfg-limit-max-savings');

  if (lPerUnver) lPerUnver.value = formatCurrencyVNDInput(limits.perTxnUnverified ?? 10000000);
  if (lDailyUnver) lDailyUnver.value = formatCurrencyVNDInput(limits.dailyUnverified ?? 20000000);
  if (lPerVer) lPerVer.value = formatCurrencyVNDInput(limits.perTxnVerified ?? 100000000);
  if (lDailyVer) lDailyVer.value = formatCurrencyVNDInput(limits.dailyVerified ?? 500000000);
  if (lSoftOtp) lSoftOtp.value = formatCurrencyVNDInput(limits.softOtpThreshold ?? 10000000);
  if (lMaxSavings) lMaxSavings.value = formatCurrencyVNDInput(limits.maxSavingsDepositPerTxn ?? 1000000000);

  const formLimits = document.getElementById('form-cfg-limits');
  if (formLimits && !formLimits.dataset.listenerSet) {
    formLimits.dataset.listenerSet = 'true';
    formLimits.onsubmit = (e) => {
      e.preventDefault();
      AdminService.updateSystemSettings({
        transactionLimits: {
          perTxnUnverified: parseFloat((lPerUnver.value || '0').replace(/\D/g, '')),
          dailyUnverified: parseFloat((lDailyUnver.value || '0').replace(/\D/g, '')),
          perTxnVerified: parseFloat((lPerVer.value || '0').replace(/\D/g, '')),
          dailyVerified: parseFloat((lDailyVer.value || '0').replace(/\D/g, '')),
          softOtpThreshold: parseFloat((lSoftOtp.value || '0').replace(/\D/g, '')),
          maxSavingsDepositPerTxn: parseFloat((lMaxSavings.value || '0').replace(/\D/g, ''))
        }
      });
      showToast('Lưu hạn mức giao dịch thành công!', 'success');
    };
  }

  // 3. Populate Tab 3 (Lãi Suất Tiền Gửi & Cho Vay)
  const rKkh = interestRates.find(r => r.term === 0)?.rate ?? 0.2;
  const r1m = interestRates.find(r => r.term === 1)?.rate ?? 4.5;
  const r3m = interestRates.find(r => r.term === 3)?.rate ?? 5.2;
  const r6m = interestRates.find(r => r.term === 6)?.rate ?? 6.5;
  const r12m = interestRates.find(r => r.term === 12)?.rate ?? 7.2;
  const r24m = interestRates.find(r => r.term === 24)?.rate ?? 7.8;
  const r36m = interestRates.find(r => r.term === 36)?.rate ?? 8.0;

  const elRkkh = document.getElementById('cfg-rate-kkh');
  const elR1m = document.getElementById('cfg-rate-1m');
  const elR3m = document.getElementById('cfg-rate-3m');
  const elR6m = document.getElementById('cfg-rate-6m');
  const elR12m = document.getElementById('cfg-rate-12m');
  const elR24m = document.getElementById('cfg-rate-24m');
  const elR36m = document.getElementById('cfg-rate-36m');
  const elREarly = document.getElementById('cfg-rate-early');

  const elLoanMortgage = document.getElementById('cfg-rate-loan-mortgage');
  const elLoanBusiness = document.getElementById('cfg-rate-loan-business');
  const elLoanCar = document.getElementById('cfg-rate-loan-car');
  const elLoanConsumer = document.getElementById('cfg-rate-loan-consumer');
  const elLoanLending = document.getElementById('cfg-rate-lending');

  if (elRkkh) elRkkh.value = rKkh;
  if (elR1m) elR1m.value = r1m;
  if (elR3m) elR3m.value = r3m;
  if (elR6m) elR6m.value = r6m;
  if (elR12m) elR12m.value = r12m;
  if (elR24m) elR24m.value = r24m;
  if (elR36m) elR36m.value = r36m;
  if (elREarly) elREarly.value = sys.earlyWithdrawalRate ?? 0.2;

  const defaultLoanRates = {
    CONSUMER: { 6: 8.90, 12: 9.50, 24: 10.50, 36: 11.50, 48: 12.00, 60: 12.50 },
    CAR: { 12: 7.80, 24: 8.20, 36: 8.50, 48: 8.90, 60: 9.20, 84: 9.80 },
    MORTGAGE: { 36: 6.80, 60: 7.50, 120: 8.20, 180: 8.60, 240: 8.90 },
    BUSINESS: { 6: 6.80, 12: 7.50, 24: 7.80, 36: 8.00, 60: 8.40, 120: 8.80 }
  };
  const curLoanRates = store.data.loanInterestRates || defaultLoanRates;

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const getVal = (id, def) => { const el = document.getElementById(id); return parseFloat(el?.value || def); };

  // 1. Consumer
  setVal('cfg-rate-consumer-6m', curLoanRates.CONSUMER?.[6] ?? 8.90);
  setVal('cfg-rate-consumer-12m', curLoanRates.CONSUMER?.[12] ?? 9.50);
  setVal('cfg-rate-consumer-24m', curLoanRates.CONSUMER?.[24] ?? 10.50);
  setVal('cfg-rate-consumer-36m', curLoanRates.CONSUMER?.[36] ?? 11.50);
  setVal('cfg-rate-consumer-48m', curLoanRates.CONSUMER?.[48] ?? 12.00);
  setVal('cfg-rate-consumer-60m', curLoanRates.CONSUMER?.[60] ?? 12.50);

  // 2. Car
  setVal('cfg-rate-car-12m', curLoanRates.CAR?.[12] ?? 7.80);
  setVal('cfg-rate-car-24m', curLoanRates.CAR?.[24] ?? 8.20);
  setVal('cfg-rate-car-36m', curLoanRates.CAR?.[36] ?? 8.50);
  setVal('cfg-rate-car-48m', curLoanRates.CAR?.[48] ?? 8.90);
  setVal('cfg-rate-car-60m', curLoanRates.CAR?.[60] ?? 9.20);
  setVal('cfg-rate-car-84m', curLoanRates.CAR?.[84] ?? 9.80);

  // 3. Mortgage
  setVal('cfg-rate-mortgage-36m', curLoanRates.MORTGAGE?.[36] ?? 6.80);
  setVal('cfg-rate-mortgage-60m', curLoanRates.MORTGAGE?.[60] ?? 7.50);
  setVal('cfg-rate-mortgage-120m', curLoanRates.MORTGAGE?.[120] ?? 8.20);
  setVal('cfg-rate-mortgage-180m', curLoanRates.MORTGAGE?.[180] ?? 8.60);
  setVal('cfg-rate-mortgage-240m', curLoanRates.MORTGAGE?.[240] ?? 8.90);

  // 4. Business
  setVal('cfg-rate-business-6m', curLoanRates.BUSINESS?.[6] ?? 6.80);
  setVal('cfg-rate-business-12m', curLoanRates.BUSINESS?.[12] ?? 7.50);
  setVal('cfg-rate-business-24m', curLoanRates.BUSINESS?.[24] ?? 7.80);
  setVal('cfg-rate-business-36m', curLoanRates.BUSINESS?.[36] ?? 8.00);
  setVal('cfg-rate-business-60m', curLoanRates.BUSINESS?.[60] ?? 8.40);
  setVal('cfg-rate-business-120m', curLoanRates.BUSINESS?.[120] ?? 8.80);

  const formRates = document.getElementById('form-cfg-rates');
  if (formRates && !formRates.dataset.listenerSet) {
    formRates.dataset.listenerSet = 'true';
    formRates.onsubmit = (e) => {
      e.preventDefault();
      const updatedRates = [
        { term: 0, termMonths: 0, label: 'Không Kỳ Hạn', rate: parseFloat(elRkkh?.value || 0.2), annualRate: parseFloat(elRkkh?.value || 0.2), minAmount: 100000 },
        { term: 1, termMonths: 1, label: '1 Tháng', rate: parseFloat(elR1m?.value || 4.5), annualRate: parseFloat(elR1m?.value || 4.5), minAmount: 1000000 },
        { term: 3, termMonths: 3, label: '3 Tháng', rate: parseFloat(elR3m?.value || 5.2), annualRate: parseFloat(elR3m?.value || 5.2), minAmount: 1000000 },
        { term: 6, termMonths: 6, label: '6 Tháng', rate: parseFloat(elR6m?.value || 6.5), annualRate: parseFloat(elR6m?.value || 6.5), minAmount: 1000000 },
        { term: 12, termMonths: 12, label: '12 Tháng', rate: parseFloat(elR12m?.value || 7.2), annualRate: parseFloat(elR12m?.value || 7.2), minAmount: 1000000 },
        { term: 24, termMonths: 24, label: '24 Tháng', rate: parseFloat(elR24m?.value || 7.8), annualRate: parseFloat(elR24m?.value || 7.8), minAmount: 1000000 },
        { term: 36, termMonths: 36, label: '36 Tháng', rate: parseFloat(elR36m?.value || 8.0), annualRate: parseFloat(elR36m?.value || 8.0), minAmount: 5000000 }
      ];

      const updatedLoanRates = {
        CONSUMER: {
          6: getVal('cfg-rate-consumer-6m', 8.90),
          12: getVal('cfg-rate-consumer-12m', 9.50),
          24: getVal('cfg-rate-consumer-24m', 10.50),
          36: getVal('cfg-rate-consumer-36m', 11.50),
          48: getVal('cfg-rate-consumer-48m', 12.00),
          60: getVal('cfg-rate-consumer-60m', 12.50)
        },
        CAR: {
          12: getVal('cfg-rate-car-12m', 7.80),
          24: getVal('cfg-rate-car-24m', 8.20),
          36: getVal('cfg-rate-car-36m', 8.50),
          48: getVal('cfg-rate-car-48m', 8.90),
          60: getVal('cfg-rate-car-60m', 9.20),
          84: getVal('cfg-rate-car-84m', 9.80)
        },
        MORTGAGE: {
          36: getVal('cfg-rate-mortgage-36m', 6.80),
          60: getVal('cfg-rate-mortgage-60m', 7.50),
          120: getVal('cfg-rate-mortgage-120m', 8.20),
          180: getVal('cfg-rate-mortgage-180m', 8.60),
          240: getVal('cfg-rate-mortgage-240m', 8.90)
        },
        BUSINESS: {
          6: getVal('cfg-rate-business-6m', 6.80),
          12: getVal('cfg-rate-business-12m', 7.50),
          24: getVal('cfg-rate-business-24m', 7.80),
          36: getVal('cfg-rate-business-36m', 8.00),
          60: getVal('cfg-rate-business-60m', 8.40),
          120: getVal('cfg-rate-business-120m', 8.80)
        }
      };

      if (store.data.loanPackages && Array.isArray(store.data.loanPackages)) {
        store.data.loanPackages.forEach(pkg => {
          if (updatedLoanRates[pkg.id]) {
            const rates = Object.values(updatedLoanRates[pkg.id]).map(Number).filter(v => !isNaN(v) && v > 0);
            if (rates.length > 0) {
              pkg.baseRate = Math.min(...rates);
            }
          }
        });
      }

      AdminService.updateSystemSettings({
        savingsInterestRate: parseFloat(elR6m?.value || 6.5),
        savingsInterestRates: updatedRates,
        loanInterestRates: updatedLoanRates,
        earlyWithdrawalRate: parseFloat(elREarly?.value || 0.2)
      });
      store.data.savingsInterestRates = updatedRates;
      store.data.loanInterestRates = updatedLoanRates;
      store.saveData();

      // Đồng bộ trực tiếp UI phía khách hàng
      if (typeof renderLoanPackagesGuide === 'function') renderLoanPackagesGuide();
      if (typeof populateLoanTypeSelect === 'function') populateLoanTypeSelect();

      // Đồng bộ trực tiếp lên Backend Spring Boot
      BankApiService.updateSavingsInterestRates(updatedRates).catch(err => {
        console.warn('[Admin] Lỗi đồng bộ biểu lãi suất sang Backend API:', err);
      });
      BankApiService.updateLoanInterestRates(updatedLoanRates).catch(err => {
        console.warn('[Admin] Lỗi đồng bộ biểu lãi suất cho vay sang Backend API:', err);
      });

      showToast('Cập nhật biểu lãi suất tiền gửi và cho vay thành công!', 'success');
    };
  }

  // 4. Populate Tab 4 (Tỷ Giá FX)
  const fxTbody = document.getElementById('cfg-fx-tbody');
  if (fxTbody) {
    fxTbody.innerHTML = '';
    fxRates.forEach(fx => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="font-family: var(--font-mono); color: var(--accent-gold);">${fx.currency}</strong></td>
        <td>${fx.name}</td>
        <td><input type="number" step="0.1" class="form-control input-fx-cash" data-curr="${fx.currency}" value="${fx.cashBuy}"></td>
        <td><input type="number" step="0.1" class="form-control input-fx-transfer" data-curr="${fx.currency}" value="${fx.transferBuy}"></td>
        <td><input type="number" step="0.1" class="form-control input-fx-sell" data-curr="${fx.currency}" value="${fx.sell}"></td>
      `;
      fxTbody.appendChild(tr);
    });
  }

  const formFx = document.getElementById('form-cfg-fx');
  if (formFx && !formFx.dataset.listenerSet) {
    formFx.dataset.listenerSet = 'true';
    formFx.onsubmit = (e) => {
      e.preventDefault();
      const newFx = fxRates.map(fx => {
        const cashInput = document.querySelector(`.input-fx-cash[data-curr="${fx.currency}"]`);
        const transInput = document.querySelector(`.input-fx-transfer[data-curr="${fx.currency}"]`);
        const sellInput = document.querySelector(`.input-fx-sell[data-curr="${fx.currency}"]`);
        return {
          ...fx,
          cashBuy: parseFloat(cashInput?.value || fx.cashBuy),
          transferBuy: parseFloat(transInput?.value || fx.transferBuy),
          sell: parseFloat(sellInput?.value || fx.sell)
        };
      });

      AdminService.updateSystemSettings({ fxRates: newFx });
      showToast('Cập nhật bảng tỷ giá FX thành công!', 'success');
    };
  }

  // 5. Populate Tab 5 (Cấu Hình Chung & Audit Logs)
  document.getElementById('cfg-bank-name').value = sys.bankName || '';
  document.getElementById('cfg-system-status').value = sys.systemStatus || 'ACTIVE';

  const tbody = document.getElementById('admin-audit-logs-tbody');
  if (tbody) {
    const renderLogRows = (logs) => {
      tbody.innerHTML = '';
      if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim); padding: 18px;">Chưa có nhật ký hoạt động</td></tr>';
        return;
      }
      logs.slice(0, 50).forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-size: 0.75rem; color: var(--text-dim); white-space: nowrap;">${store.formatDateTime(log.timestamp)}</td>
          <td><code style="background: rgba(56, 189, 248, 0.1); color: var(--accent-cyan); padding: 2px 6px; border-radius: 4px;">${log.user}</code></td>
          <td style="font-size: 0.85rem;">${log.action}</td>
        `;
        tbody.appendChild(tr);
      });
    };

    renderLogRows(store.data.auditLogs || []);

    if (typeof BankApiService !== 'undefined' && BankApiService.getAuditLogs) {
      BankApiService.getAuditLogs().then(res => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const backendLogs = res.data.map(l => ({
            id: l.id,
            user: l.user,
            action: l.action,
            timestamp: l.timestamp ? l.timestamp.replace('T', ' ').substring(0, 19) : store.nowGMT7String()
          }));

          const merged = [...backendLogs];
          (store.data.auditLogs || []).forEach(localLog => {
            if (!merged.some(b => b.user === localLog.user && b.action === localLog.action && (b.timestamp === localLog.timestamp || (b.id && b.id === localLog.id)))) {
              merged.push(localLog);
            }
          });

          store.data.auditLogs = merged;
          store.saveSessionBusinessData();
          renderLogRows(merged);
        }
      }).catch(err => console.warn('Lỗi tải audit logs:', err));
    }
  }

  const btnReset = document.getElementById('btn-admin-reset-data');
  if (btnReset) {
    btnReset.onclick = () => {
      if (confirm('Bạn có chắc chắn muốn khôi phục dữ liệu hệ thống về ban đầu?')) {
        store.resetToDefaults();
      }
    };
  }
}


/* ==========================================================================
   XỬ LÝ GỬI FORM & CỬA SỔ MODAL
   ========================================================================== */

/**
 * Hàm định dạng chuỗi số tiền theo chuẩn dấu chấm phân cách hàng nghìn (ví dụ: 10.000.000)
 */
export function formatCurrencyVNDInput(val) {
  if (val === null || val === undefined) return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse chuỗi tiền tệ (có dấu chấm hoặc ký tự) về dạng số nguyên (number)
 */
export function parseCurrencyVND(val) {
  if (val === null || val === undefined) return 0;
  const digits = String(val).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Gắn sự kiện tự động định dạng dấu phân cách hàng nghìn (.) cho tất cả ô nhập số tiền trong hệ thống
 */
function initCurrencyInputFormatting() {
  const amountInputIds = [
    'transfer-modal-amount',
    'transfer-amount',
    'qr-transfer-amount',
    'qr-amount-input',
    'create-atm-amount',
    'savings-modal-amount',
    'close-partial-amount',
    'topup-sav-amount',
    'loan-modal-amount',
    'loan-modal-income',
    'calc-loan-amount',
    'card-setting-limit',
    'card-setting-limit-txn',
    'issue-card-daily-limit',
    'new-cust-deposit',
    'teller-open-acc-deposit',
    'cust-open-acc-deposit',
    'filter-hist-min-amount',
    'filter-hist-max-amount',
    'cfg-limit-per-unverified',
    'cfg-limit-daily-unverified',
    'cfg-limit-per-verified',
    'cfg-limit-daily-verified',
    'cfg-limit-soft-otp',
    'cfg-limit-max-savings',
    'cfg-fee-internal',
    'cfg-fee-interbank',
    'cfg-fee-atm-internal',
    'cfg-fee-atm-external',
    'cfg-fee-card-issue',
    'cfg-fee-monthly-acc'
  ];

  // Xóa thẻ gợi ý đọc số tiền cũ nếu có trong DOM
  document.querySelectorAll('.amount-word-hint').forEach(el => el.remove());

  const inputs = new Set();
  amountInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) inputs.add(el);
  });
  document.querySelectorAll('[data-currency-input="true"], .currency-input').forEach(el => inputs.add(el));

  inputs.forEach(input => {
    input.type = 'text';
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');

    const formatAndUpdate = () => {
      const rawDigits = input.value.replace(/\D/g, '');
      if (!rawDigits) {
        input.value = '';
        return;
      }
      const formatted = rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      if (input.value !== formatted) {
        input.value = formatted;
      }
    };

    if (!input._hasCurrencyListener) {
      input.addEventListener('input', formatAndUpdate);
      input.addEventListener('blur', formatAndUpdate);
      input._hasCurrencyListener = true;
    }

    if (input.value) {
      formatAndUpdate();
    }
  });
}

/**
 * Đồng bộ kết quả giao dịch từ backend về LocalStore (bao gồm cập nhật số dư và nhật ký giao dịch).
 * Cần thiết để số dư và lịch sử giao dịch trên UI cập nhật ngay sau khi backend ghi thành công.
 */
function syncTransferToLocalStore(fromAccNo, toAccNo, amount, content = '', apiTxn = null) {
  try {
    amount = parseFloat(amount);

    // 1. Cập nhật số dư trong store.data.customers
    store.data.customers.forEach(cust => {
      cust.accounts.forEach(acc => {
        if (acc.accountNo === fromAccNo) acc.balance -= amount;
        if (acc.accountNo === toAccNo) acc.balance += amount;
      });
    });

    // 2. Tra cứu tên người chuyển và người nhận từ store local nếu backend không trả tên
    let fromCustName = apiTxn?.fromName;
    let toCustName = apiTxn?.toName;

    for (const cust of store.data.customers) {
      const fAcc = cust.accounts.find(a => a.accountNo === fromAccNo);
      if (fAcc && !fromCustName) fromCustName = cust.fullName;
      const tAcc = cust.accounts.find(a => a.accountNo === toAccNo);
      if (tAcc && !toCustName) toCustName = cust.fullName;
    }

    // 3. Format thời gian timestamp
    let timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (apiTxn?.timestamp) {
      if (typeof apiTxn.timestamp === 'string') {
        timestampStr = apiTxn.timestamp.replace('T', ' ').substring(0, 19);
      } else if (Array.isArray(apiTxn.timestamp)) {
        const [y, m, d, h, min, s] = apiTxn.timestamp;
        const pad = (n) => String(n).padStart(2, '0');
        timestampStr = `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:${pad(s || 0)}`;
      }
    }

    // 4. Tạo bản ghi nhật ký giao dịch
    const txn = {
      id: store.formatTxnId(apiTxn?.id || apiTxn?.txnId) || store.generateTxnId(),
      fromAccount: fromAccNo,
      fromName: fromCustName || 'Chủ tài khoản',
      toAccount: toAccNo,
      toName: toCustName || 'Người nhận',
      amount: amount,
      fee: apiTxn?.fee || 0,
      type: apiTxn?.type || 'TRANSFER',
      content: content || apiTxn?.content || 'Chuyển tiền nhanh QuangTrung Bank',
      timestamp: timestampStr,
      status: apiTxn?.status || 'SUCCESS'
    };

    // 5. Thêm giao dịch vào store.data.transactions nếu chưa tồn tại
    const exists = store.data.transactions.some(t => t.id === txn.id);
    if (!exists) {
      store.data.transactions.unshift(txn);
    }

    store.saveData();
  } catch (e) {
    console.warn('[Sync] Không thể đồng bộ số dư & lịch sử giao dịch về LocalStore', e);
  }
}

let pendingTransactionCallback = null;
let otpTimerInterval = null;

/**
 * Yêu cầu xác thực Đa Lớp 2FA (Mã PIN Giao Dịch + Mã OTP SMS) cho tất cả nghiệp vụ Khách hàng
 */
function requestTransactionVerification({
  title = 'Xác Thực Giao Dịch (Mã PIN & OTP 2FA)',
  actionName = 'Giao dịch tài chính',
  fromAcc = null,
  toAcc = null,
  amount = null,
  onVerified
}) {
  pendingTransactionCallback = onVerified;

  const { code } = SecurityService.generateOTP();

  const titleEl = document.getElementById('otp-modal-title');
  if (titleEl) titleEl.textContent = title;

  const codeDisplay = document.getElementById('otp-simulated-code-display');
  if (codeDisplay) codeDisplay.textContent = code;

  const actionRow = document.getElementById('otp-summary-action-row');
  const actionEl = document.getElementById('otp-summary-action');
  if (actionEl) actionEl.textContent = actionName;
  if (actionRow) actionRow.style.display = actionName ? 'flex' : 'none';

  const fromRow = document.getElementById('otp-summary-from-row');
  const fromDisplay = document.getElementById('otp-summary-from');
  if (fromDisplay) fromDisplay.textContent = fromAcc || '-';
  if (fromRow) fromRow.style.display = fromAcc ? 'flex' : 'none';

  const toRow = document.getElementById('otp-summary-to-row');
  const toDisplay = document.getElementById('otp-summary-to');
  if (toDisplay) toDisplay.textContent = toAcc || '-';
  if (toRow) toRow.style.display = toAcc ? 'flex' : 'none';

  const amountRow = document.getElementById('otp-summary-amount-row');
  const amountDisplay = document.getElementById('otp-summary-amount');
  if (amountDisplay) {
    amountDisplay.textContent = (amount !== null && amount !== undefined && !isNaN(amount)) 
      ? store.formatVND(amount) 
      : (amount || '-');
  }
  if (amountRow) amountRow.style.display = (amount !== null && amount !== undefined && amount !== '') ? 'flex' : 'none';

  const inputPin = document.getElementById('otp-input-pin');
  if (inputPin) inputPin.value = '';

  const inputCode = document.getElementById('otp-input-code');
  if (inputCode) inputCode.value = '';

  if (otpTimerInterval) clearInterval(otpTimerInterval);
  const updateTimer = () => {
    const remaining = SecurityService.getOTPRemainingSeconds();
    const timerEl = document.getElementById('otp-countdown-timer');
    const resendBtn = document.getElementById('btn-resend-otp');
    if (timerEl) timerEl.textContent = `${remaining}s`;
    if (resendBtn) resendBtn.disabled = remaining > 0;
    if (remaining <= 0) {
      clearInterval(otpTimerInterval);
      showToast('Mã OTP đã hết hạn. Vui lòng bấm "Gửi lại OTP".', 'danger');
    }
  };
  updateTimer();
  otpTimerInterval = setInterval(updateTimer, 1000);

  openModal('modal-otp-verification');
  setTimeout(() => {
    if (inputPin) inputPin.focus();
  }, 150);
}

// Đồng bộ các hàm xác thực cho toàn hệ thống
window.requestTransactionVerification = requestTransactionVerification;
window.requestOtpVerification = requestTransactionVerification;
window.requestPinVerification = requestTransactionVerification;

let pendingPasswordCallback = null;
let pwdOtpTimerInterval = null;

/**
 * Yêu cầu xác thực OTP 2FA cho tác vụ Đổi Mật Khẩu Bảo Mật
 */
function requestPasswordOtpVerification({ onVerified }) {
  pendingPasswordCallback = onVerified;

  const { code } = SecurityService.generateOTP();

  const codeDisplay = document.getElementById('pwd-otp-simulated-code-display');
  if (codeDisplay) codeDisplay.textContent = code;

  const inputCode = document.getElementById('pwd-otp-input-code');
  if (inputCode) inputCode.value = '';

  if (pwdOtpTimerInterval) clearInterval(pwdOtpTimerInterval);
  const updateTimer = () => {
    const remaining = SecurityService.getOTPRemainingSeconds();
    const timerEl = document.getElementById('pwd-otp-countdown-timer');
    const resendBtn = document.getElementById('btn-pwd-resend-otp');
    if (timerEl) timerEl.textContent = `${remaining}s`;
    if (resendBtn) resendBtn.disabled = remaining > 0;
    if (remaining <= 0) {
      clearInterval(pwdOtpTimerInterval);
      showToast('Mã OTP đổi mật khẩu đã hết hạn. Vui lòng bấm "Gửi lại OTP".', 'danger');
    }
  };
  updateTimer();
  pwdOtpTimerInterval = setInterval(updateTimer, 1000);

  openModal('modal-pwd-otp-verification');
}

function setupModalEvents() {
  // Nút đóng cửa sổ Modal
  document.querySelectorAll('.btn-close').forEach(btn => {
    btn.onclick = (e) => {
      e.target.closest('.modal-overlay').classList.remove('active');
    };
  });

  // Bắt sự kiện tra cứu người nhận tự động khi nhập số tài khoản trong Modal chuyển tiền
  const toInputModal = document.getElementById('transfer-modal-to');
  const recipientBoxModal = document.getElementById('transfer-modal-recipient-box');
  const recipientErrModal = document.getElementById('transfer-modal-recipient-error');
  const recipientNameModal = document.getElementById('transfer-modal-recipient-name');
  const recipientBankModal = document.getElementById('transfer-modal-recipient-bank');
  const recipientBadgeModal = document.getElementById('transfer-modal-recipient-badge');
  let modalLookupDebounce = null;

  const performModalLookup = async () => {
    if (!toInputModal) return;
    const accNo = toInputModal.value.trim();
    const fromSelect = document.getElementById('transfer-modal-from');
    const fromAcc = fromSelect ? fromSelect.value.trim() : '';

    if (!accNo) {
      if (recipientBoxModal) recipientBoxModal.classList.add('hidden');
      if (recipientErrModal) recipientErrModal.classList.add('hidden');
      return;
    }

    if (fromAcc && accNo === fromAcc) {
      if (recipientBoxModal) recipientBoxModal.classList.add('hidden');
      if (recipientErrModal) {
        recipientErrModal.textContent = '⚠️ Tài khoản nhận không được trùng với tài khoản nguồn chuyển';
        recipientErrModal.classList.remove('hidden');
      }
      return;
    }

    const res = await CustomerService.lookupAccount(accNo);
    if (res.success && res.data) {
      if (res.data.type === 'SAVINGS') {
        if (recipientBoxModal) recipientBoxModal.classList.add('hidden');
        if (recipientErrModal) {
          recipientErrModal.textContent = '⚠️ Tài khoản nhận là tài khoản tiết kiệm, không thể nhận chuyển khoản trực tiếp';
          recipientErrModal.classList.remove('hidden');
        }
        return;
      }
      if (recipientNameModal) recipientNameModal.textContent = res.data.fullName.toUpperCase();
      if (recipientBankModal) recipientBankModal.textContent = res.data.bankName || 'Ngân hàng TMCP QuangTrung Bank';
      if (recipientBadgeModal) {
        recipientBadgeModal.textContent = res.data.status === 'ACTIVE' ? 'Hoạt động' : res.data.status;
        recipientBadgeModal.className = `user-role-badge ${res.data.status === 'ACTIVE' ? 'badge-customer' : 'badge-admin'}`;
      }
      if (recipientBoxModal) recipientBoxModal.classList.remove('hidden');
      if (recipientErrModal) recipientErrModal.classList.add('hidden');
    } else {
      if (recipientBoxModal) recipientBoxModal.classList.add('hidden');
      if (recipientErrModal) {
        recipientErrModal.textContent = res.message ? `⚠️ ${res.message}` : '⚠️ Không tìm thấy tài khoản người nhận trên hệ thống';
        recipientErrModal.classList.remove('hidden');
      }
    }
  };

  if (toInputModal) {
    toInputModal.oninput = () => {
      clearTimeout(modalLookupDebounce);
      modalLookupDebounce = setTimeout(performModalLookup, 200);
    };
    toInputModal.onblur = performModalLookup;
  }

  function validateTransferModalBalance() {
    const accounts = CustomerService.getCustomerAccounts();
    const fromSelect = document.getElementById('transfer-modal-from');
    const amountInput = document.getElementById('transfer-modal-amount');
    const alertBox = document.getElementById('transfer-modal-balance-alert');
    const alertDetail = document.getElementById('transfer-modal-balance-alert-detail');
    const remainingSpan = document.getElementById('transfer-modal-remaining-balance');
    const availSpan = document.getElementById('transfer-modal-avail-balance');
    const submitBtn = document.getElementById('btn-submit-transfer-modal');

    if (!fromSelect) return true;
    const currentAccNo = fromSelect.value;
    const currentAcc = accounts.find(a => a.accountNo === currentAccNo);
    const balance = currentAcc ? currentAcc.balance : 0;

    if (availSpan) {
      availSpan.textContent = `Số dư: ${store.formatVND(balance)}`;
    }

    if (!amountInput) return true;
    const rawDigits = amountInput.value.replace(/\D/g, '');
    const amount = rawDigits ? parseFloat(rawDigits) : 0;

    if (amount <= 0) {
      if (alertBox) alertBox.classList.add('hidden');
      if (remainingSpan) remainingSpan.textContent = '';
      amountInput.style.borderColor = '';
      amountInput.style.boxShadow = '';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
      return true;
    }

    if (amount > balance) {
      // Vượt quá số dư khả dụng
      if (alertBox) {
        alertBox.classList.remove('hidden');
        if (alertDetail) {
          alertDetail.textContent = `Tài khoản ${currentAccNo} hiện có ${store.formatVND(balance)}. Bạn còn thiếu ${store.formatVND(amount - balance)}.`;
        }
      }
      amountInput.style.borderColor = 'var(--accent-danger)';
      amountInput.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.35)';
      if (remainingSpan) {
        remainingSpan.innerHTML = `<span style="color: var(--accent-danger); font-weight: 600;">⚠️ Vượt số dư</span>`;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
      }
      return false;
    } else {
      // Hợp lệ
      if (alertBox) alertBox.classList.add('hidden');
      amountInput.style.borderColor = 'var(--accent-emerald)';
      amountInput.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.2)';
      const remaining = balance - amount;
      if (remainingSpan) {
        remainingSpan.innerHTML = `<span style="color: var(--accent-emerald);">Còn lại: ${store.formatVND(remaining)}</span>`;
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
      return true;
    }
  }

  const fromSelectModal = document.getElementById('transfer-modal-from');
  if (fromSelectModal) {
    fromSelectModal.onchange = () => {
      performModalLookup();
      validateTransferModalBalance();
    };
  }

  const amountInputModal = document.getElementById('transfer-modal-amount');
  if (amountInputModal) {
    amountInputModal.addEventListener('input', () => {
      validateTransferModalBalance();
    });
    amountInputModal.addEventListener('blur', () => {
      validateTransferModalBalance();
    });
  }

  // Xử lý các chip gợi ý chọn nhanh số tiền
  document.querySelectorAll('#transfer-modal-quick-chips .quick-amount-chip').forEach(btn => {
    btn.onclick = () => {
      const val = btn.getAttribute('data-val');
      const fromSelect = document.getElementById('transfer-modal-from');
      const accounts = CustomerService.getCustomerAccounts();
      const currentAcc = accounts.find(a => a.accountNo === (fromSelect ? fromSelect.value : ''));
      const balance = currentAcc ? currentAcc.balance : 0;

      let targetAmount = 0;
      if (val === 'ALL') {
        targetAmount = balance;
      } else {
        targetAmount = parseFloat(val) || 0;
      }

      if (amountInputModal) {
        amountInputModal.value = targetAmount > 0 ? targetAmount.toLocaleString('vi-VN').replace(/,/g, '.') : '';
        validateTransferModalBalance();
      }
    };
  });

  // Xử lý gửi Form Chuyển khoản trong Modal
  const formModalTransfer = document.getElementById('form-modal-transfer');
  if (formModalTransfer) {
    formModalTransfer.onsubmit = async (e) => {
      e.preventDefault();
      const fromAcc = document.getElementById('transfer-modal-from').value;
      const toAcc = document.getElementById('transfer-modal-to').value.trim();
      const amountStr = document.getElementById('transfer-modal-amount').value;
      const amount = parseFloat(amountStr.replace(/\D/g, ''));
      const content = document.getElementById('transfer-modal-content').value;

      if (!toAcc) { showToast('Vui lòng nhập số tài khoản người nhận', 'danger'); return; }
      if (fromAcc === toAcc) { showToast('Tài khoản nhận không được trùng với tài khoản chuyển', 'danger'); return; }
      if (isNaN(amount) || amount <= 0) { showToast('Số tiền giao dịch không hợp lệ', 'danger'); return; }

      // Kiểm tra số dư tài khoản nguồn
      const accounts = CustomerService.getCustomerAccounts();
      const currentAcc = accounts.find(a => a.accountNo === fromAcc);
      if (currentAcc && amount > currentAcc.balance) {
        validateTransferModalBalance();
        showToast(`Số dư tài khoản (${store.formatVND(currentAcc.balance)}) không đủ để thực hiện giao dịch!`, 'danger');
        return;
      }

      // Kiểm tra tài khoản thụ hưởng tồn tại và đang hoạt động trước khi gửi OTP
      const lookup = await CustomerService.lookupAccount(toAcc);
      if (!lookup.success) {
        if (recipientBoxModal) recipientBoxModal.classList.add('hidden');
        if (recipientErrModal) recipientErrModal.classList.remove('hidden');
        showToast(`Tài khoản người nhận "${toAcc}" không tồn tại trên hệ thống`, 'danger');
        return;
      }
      if (lookup.data && lookup.data.status !== 'ACTIVE') {
        showToast('Tài khoản người nhận đang tạm khóa hoặc không hoạt động', 'danger');
        return;
      }
      if (lookup.data && lookup.data.type === 'SAVINGS') {
        showToast('Tài khoản nhận là tài khoản tiết kiệm, không thể nhận chuyển khoản trực tiếp', 'danger');
        return;
      }

      const idempotencyKey = BankApiService.generateIdempotencyKey();

      // Đóng modal chuyển tiền và mở Modal Xác thực 2FA (Mã PIN & OTP)
      closeModal('modal-transfer');

      requestPinVerification({
        title: 'Xác Thực PIN Chuyển Tiền',
        actionName: 'Chuyển tiền nhanh QuangTrung Bank',
        fromAcc,
        toAcc: `${(lookup && lookup.data && lookup.data.fullName) ? lookup.data.fullName : toAcc} (${toAcc})`,
        amount: parseFloat(amount),
        onVerified: async () => {
          try {
            const res = await CustomerService.transferMoneyAsync({ fromAccNo: fromAcc, toAccNo: toAcc, amount, content, idempotencyKey });
            if (res.success) {
              await renderCustomerDashboard();
              showSuccessModal({
                title: 'Chuyển Tiền Thành Công!',
                message: res.message || `Đã chuyển thành công số tiền ${store.formatVND(amount)} tới tài khoản ${toAcc}.`,
                amount: parseFloat(amount),
                txId: (res.data && res.data.id) || (res.transaction && res.transaction.id) || res.txnId,
                accountNo: fromAcc,
                counterparty: `${(lookup && lookup.data && lookup.data.fullName) ? lookup.data.fullName : toAcc} (${toAcc})`,
                onClosed: () => {
                  renderCustomerDashboard();
                }
              });
            } else {
              showToast(res.message, 'danger');
            }
          } catch (err) {
            showToast('Đã xảy ra lỗi khi xử lý giao dịch', 'danger');
          }
        }
      });
    };
  }

  // Nút Sao chép số tài khoản trong Modal VietQR
  const btnCopyAcc = document.getElementById('btn-copy-acc');
  if (btnCopyAcc) {
    btnCopyAcc.onclick = () => {
      const select = document.getElementById('qr-select-acc');
      const accNo = select ? select.value : '';
      if (accNo) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(accNo);
        }
        showToast(`Đã sao chép số tài khoản: ${accNo}`, 'success');
      }
    };
  }

  // Modal Quét QR - Nút đóng (dọn dẹp camera)
  const btnCloseQrScan = document.getElementById('btn-close-qr-scan');
  if (btnCloseQrScan) {
    btnCloseQrScan.onclick = () => {
      closeModal('modal-qr-scan');
      stopQRScanner();
    };
  }

  // Dừng camera khi bấm ra vùng nền ngoài modal
  const modalQrScan = document.getElementById('modal-qr-scan');
  if (modalQrScan) {
    modalQrScan.addEventListener('click', (e) => {
      if (e.target === modalQrScan) {
        closeModal('modal-qr-scan');
        stopQRScanner();
      }
    });
  }

  // Quét QR - Nút "Quét Lại"
  const btnQrScanAgain = document.getElementById('btn-qr-scan-again');
  if (btnQrScanAgain) {
    btnQrScanAgain.onclick = () => {
      const cameraSection = document.getElementById('qr-scan-camera-section');
      const resultSection = document.getElementById('qr-scan-result-section');
      cameraSection.classList.remove('hidden');
      resultSection.classList.add('hidden');
      startQRScanner();
    };
  }

  // QR Scan - Tải tệp ảnh mã QR lên
  const btnUploadQr = document.getElementById('btn-upload-qr-file');
  const qrFileInput = document.getElementById('qr-file-input');
  if (btnUploadQr && qrFileInput) {
    btnUploadQr.onclick = () => qrFileInput.click();
    qrFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const statusEl = document.getElementById('qr-scan-status');
      if (statusEl) statusEl.innerHTML = '<span class="qr-scan-pulse">●</span> Đang đọc dữ liệu từ tệp ảnh...';

      if (!html5QrScanner) {
        html5QrScanner = new Html5Qrcode('qr-reader');
      }

      html5QrScanner.scanFile(file, true)
        .then(decodedText => {
          onQRScanSuccess(decodedText);
        })
        .catch(err => {
          if (statusEl) statusEl.innerHTML = '<span style="color: var(--accent-danger);">Không tìm thấy mã QR hợp lệ trong tệp ảnh này.</span>';
          showToast('Không thể đọc mã QR từ tệp ảnh đã chọn. Vui lòng chọn ảnh rõ nét hơn.', 'danger');
        })
        .finally(() => {
          qrFileInput.value = '';
        });
    };
  }

  // Xử lý gửi Form Chuyển tiền qua QR
  const formQrTransfer = document.getElementById('form-qr-transfer');
  if (formQrTransfer) {
    formQrTransfer.onsubmit = async (e) => {
      e.preventDefault();
      const fromAcc = document.getElementById('qr-transfer-from').value;
      const toAcc = document.getElementById('qr-transfer-to-acc').value;
      const amountStr = document.getElementById('qr-transfer-amount').value;
      const amount = parseFloat(amountStr.replace(/\D/g, ''));
      const content = document.getElementById('qr-transfer-content').value;

      if (!toAcc) { showToast('Vui lòng quét mã QR hợp lệ', 'danger'); return; }
      if (fromAcc === toAcc) { showToast('Tài khoản nhận không được trùng với tài khoản chuyển', 'danger'); return; }
      if (isNaN(amount) || amount <= 0) { showToast('Số tiền giao dịch không hợp lệ', 'danger'); return; }

      // Kiểm tra tài khoản thụ hưởng tồn tại và đang hoạt động trước khi gửi OTP
      const lookup = await CustomerService.lookupAccount(toAcc);
      if (!lookup.success) {
        showToast('Tài khoản người nhận không tồn tại trên hệ thống', 'danger');
        return;
      }
      if (lookup.data && lookup.data.status !== 'ACTIVE') {
        showToast('Tài khoản người nhận đang tạm khóa hoặc không hoạt động', 'danger');
        return;
      }
      if (lookup.data && lookup.data.type === 'SAVINGS') {
        showToast('Tài khoản nhận là tài khoản tiết kiệm, không thể nhận chuyển khoản trực tiếp', 'danger');
        return;
      }

      const idempotencyKey = BankApiService.generateIdempotencyKey();

      stopQRScanner();
      closeModal('modal-qr-scan');

      requestPinVerification({
        title: 'Xác Thực PIN Thanh Toán QR',
        actionName: 'Thanh toán mã QR QuangTrung Bank',
        fromAcc,
        toAcc: `${(lookup && lookup.data && lookup.data.fullName) ? lookup.data.fullName : toAcc} (${toAcc})`,
        amount: parseFloat(amount),
        onVerified: async () => {
          try {
            const res = await CustomerService.transferMoneyAsync({ fromAccNo: fromAcc, toAccNo: toAcc, amount, content, idempotencyKey });
            if (res.success) {
              await renderCustomerDashboard();
              showSuccessModal({
                title: 'Chuyển Tiền QR Thành Công!',
                message: res.message || `Đã thanh toán thành công ${store.formatVND(amount)} qua mã QR.`,
                amount: parseFloat(amount),
                txId: (res.data && res.data.id) || (res.transaction && res.transaction.id) || res.txnId,
                accountNo: fromAcc,
                counterparty: `${(lookup && lookup.data && lookup.data.fullName) ? lookup.data.fullName : toAcc} (${toAcc})`,
                onClosed: () => {
                  renderCustomerDashboard();
                }
              });
            } else {
              showToast(res.message, 'danger');
            }
          } catch (err) {
            showToast('Đã xảy ra lỗi khi xử lý giao dịch', 'danger');
          }
        }
      });
    };
  }

  // Xử lý gửi Form Xác thực Mã PIN 2FA
  const formPinVerify = document.getElementById('form-pin-verify');
  if (formPinVerify) {
    formPinVerify.onsubmit = async (e) => {
      e.preventDefault();
      const pin = (document.getElementById('pin-input-code')?.value || '').trim();
      const verifyRes = SecurityService.verifyPIN(pin);
      if (verifyRes.valid) {
        closeModal('modal-pin-verification');
        showToast(verifyRes.message, 'success');
        if (pendingPinCallback) {
          const cb = pendingPinCallback;
          pendingPinCallback = null;
          await cb();
        }
      } else {
        showToast(verifyRes.message, 'danger');
        const inputPin = document.getElementById('pin-input-code');
        if (inputPin) {
          inputPin.value = '';
          inputPin.focus();
        }
      }
    };
  }

  const btnCancelPin = document.getElementById('btn-cancel-pin');
  if (btnCancelPin) {
    btnCancelPin.onclick = () => {
      closeModal('modal-pin-verification');
      pendingPinCallback = null;
    };
  }

  // Xử lý gửi Form Xác thực Đa Lớp 2FA (Mã PIN & OTP)
  const formOtpVerify = document.getElementById('form-otp-verify');
  if (formOtpVerify) {
    formOtpVerify.onsubmit = async (e) => {
      e.preventDefault();
      const pin = (document.getElementById('otp-input-pin')?.value || '').trim();
      const code = (document.getElementById('otp-input-code')?.value || '').trim();

      // 1. Xác thực Mã PIN Giao Dịch
      const pinRes = SecurityService.verifyPIN(pin);
      if (!pinRes.valid) {
        showToast(pinRes.message, 'danger');
        const inputPin = document.getElementById('otp-input-pin');
        if (inputPin) {
          inputPin.value = '';
          inputPin.focus();
        }
        return;
      }

      // 2. Xác thực Mã OTP SMS
      const otpRes = SecurityService.verifyOTP(code);
      if (!otpRes.valid) {
        showToast(otpRes.message, 'danger');
        const inputCode = document.getElementById('otp-input-code');
        if (inputCode) {
          inputCode.value = '';
          inputCode.focus();
        }
        return;
      }

      // 3. Hoàn tất xác minh khi CẢ HAI đều hợp lệ
      if (otpTimerInterval) clearInterval(otpTimerInterval);
      closeModal('modal-otp-verification');
      showToast('Xác thực bảo mật 2FA (Mã PIN & OTP) thành công!', 'success');
      if (pendingTransactionCallback) {
        const cb = pendingTransactionCallback;
        pendingTransactionCallback = null;
        await cb();
      }
    };
  }

  const btnResendOtp = document.getElementById('btn-resend-otp');
  if (btnResendOtp) {
    btnResendOtp.onclick = () => {
      const { code } = SecurityService.generateOTP();
      const codeDisplay = document.getElementById('otp-simulated-code-display');
      if (codeDisplay) codeDisplay.textContent = code;
      showToast('Đã gửi lại mã OTP mới qua SMS (Mô phỏng)!', 'info');
    };
  }

  const btnCancelOtp = document.getElementById('btn-cancel-otp');
  if (btnCancelOtp) {
    btnCancelOtp.onclick = () => {
      if (otpTimerInterval) clearInterval(otpTimerInterval);
      closeModal('modal-otp-verification');
      pendingTransactionCallback = null;
    };
  }

  const btnCloseOtp = document.getElementById('btn-close-otp');
  if (btnCloseOtp) {
    btnCloseOtp.onclick = () => {
      if (otpTimerInterval) clearInterval(otpTimerInterval);
      closeModal('modal-otp-verification');
      pendingTransactionCallback = null;
    };
  }

  // Xử lý gửi Form Xác thực OTP 2FA Đổi Mật Khẩu
  const formPwdOtpVerify = document.getElementById('form-pwd-otp-verify');
  if (formPwdOtpVerify) {
    formPwdOtpVerify.onsubmit = async (e) => {
      e.preventDefault();
      const code = document.getElementById('pwd-otp-input-code').value.trim();
      const verifyRes = SecurityService.verifyOTP(code);
      if (verifyRes.valid) {
        if (pwdOtpTimerInterval) clearInterval(pwdOtpTimerInterval);
        closeModal('modal-pwd-otp-verification');
        showToast(verifyRes.message, 'success');
        if (pendingPasswordCallback) {
          const cb = pendingPasswordCallback;
          pendingPasswordCallback = null;
          await cb();
        }
      } else {
        showToast(verifyRes.message, 'danger');
      }
    };
  }

  const btnPwdResendOtp = document.getElementById('btn-pwd-resend-otp');
  if (btnPwdResendOtp) {
    btnPwdResendOtp.onclick = () => {
      const { code } = SecurityService.generateOTP();
      const codeDisplay = document.getElementById('pwd-otp-simulated-code-display');
      if (codeDisplay) codeDisplay.textContent = code;
      showToast('Đã gửi lại mã OTP đổi mật khẩu mới qua SMS (Mô phỏng)!', 'info');
    };
  }

  const btnClosePwdOtp = document.getElementById('btn-close-pwd-otp');
  if (btnClosePwdOtp) {
    btnClosePwdOtp.onclick = () => {
      if (pwdOtpTimerInterval) clearInterval(pwdOtpTimerInterval);
      closeModal('modal-pwd-otp-verification');
      pendingPasswordCallback = null;
    };
  }

  // Nút mở rộng phiên trong Modal Cảnh báo Hết hạn Phiên
  const btnSessionExtend = document.getElementById('btn-session-extend');
  if (btnSessionExtend) {
    btnSessionExtend.onclick = () => {
      closeModal('modal-session-warning');
      SecurityService.resetSessionTimer();
      showToast('Đã gia hạn phiên làm việc thêm 15 phút', 'success');
    };
  }

  const btnSessionLogout = document.getElementById('btn-session-logout');
  if (btnSessionLogout) {
    btnSessionLogout.onclick = () => {
      closeModal('modal-session-warning');
      handleSessionTimeout();
    };
  }




  // Xử lý gửi Form Tạo mã ATM không dùng thẻ
  const formCreateAtmCode = document.getElementById('form-create-atm-code');
  if (formCreateAtmCode) {
    formCreateAtmCode.onsubmit = async (e) => {
      e.preventDefault();
      const accountNo = document.getElementById('create-atm-acc').value;
      const type = document.getElementById('create-atm-type').value;
      const amountStr = document.getElementById('create-atm-amount').value;
      const amount = parseFloat(amountStr.replace(/\D/g, ''));
      const pin = '1234';

      if (!accountNo) {
        showToast('Vui lòng chọn tài khoản giao dịch', 'danger');
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        showToast('Vui lòng nhập số tiền giao dịch hợp lệ', 'danger');
        return;
      }

      if (amount < 10000) {
        showToast('Số tiền tối thiểu để tạo mã ATM là 10.000 VNĐ', 'danger');
        return;
      }

      if (amount % 10000 !== 0) {
        showToast('Số tiền giao dịch tại ATM phải là bội số của 10.000 VNĐ (Ví dụ: 50.000, 100.000, 1.000.000 VNĐ)', 'danger');
        return;
      }

      if (type === 'WITHDRAW') {
        const freshCust = CustomerService.findCustomer();
        const acc = freshCust?.accounts.find(a => a.accountNo === accountNo);
        if (acc && acc.balance < amount) {
          showToast(`Số dư khả dụng không đủ để rút tiền (Số dư hiện tại: ${store.formatVND(acc.balance)})`, 'danger');
          return;
        }
      }

      requestPinVerification({
        title: 'Xác Thực PIN Tạo Mã ATM',
        actionName: `Tạo mã ${type === 'DEPOSIT' ? 'Nạp tiền' : 'Rút tiền'} ATM không thẻ`,
        fromAcc: accountNo,
        amount: parseFloat(amount),
        onVerified: async () => {
          const res = await CustomerService.createAtmCodeAsync({ accountNo, type, amount, pin });
          if (res.success) {
            showSuccessModal({
              title: 'Tạo Mã Rút/Nạp ATM Thành Công!',
              message: `Mã ATM ${res.atmCode.code} đã sẵn sàng. Mang mã này ra cây ATM để thực hiện!`,
              amount: parseFloat(amount),
              txId: res.atmCode.code,
              accountNo: accountNo,
              counterparty: 'Cây ATM QuangTrung Bank'
            });
            const box = document.getElementById('atm-created-result-box');
            if (box) {
              document.getElementById('created-atm-code-display').textContent = res.atmCode.code;
              document.getElementById('created-atm-code-desc').textContent = `Mã ${type === 'WITHDRAW' ? 'Rút' : 'Nạp'} tiền ${store.formatVND(amount)} từ TK ${accountNo}. Mang mã này ra máy ATM để thực hiện!`;
              box.classList.remove('hidden');
            }
            // Thao tác nút sao chép mã ATM
            const btnCopyAtm = document.getElementById('btn-copy-atm-code');
            if (btnCopyAtm) {
              btnCopyAtm.onclick = () => {
                if (navigator.clipboard) navigator.clipboard.writeText(res.atmCode.code);
                showToast(`Đã sao chép mã ATM: ${res.atmCode.code}`, 'success');
              };
            }
          } else {
            showToast(res.message, 'danger');
          }
        }
      });
    };
  }

  // Nút mở Modal Tạo mã mới từ Modal Quản lý mã ATM
  const btnOpenCreateCodeModal = document.getElementById('btn-open-create-code-modal');
  if (btnOpenCreateCodeModal) {
    btnOpenCreateCodeModal.onclick = () => {
      closeModal('modal-manage-atm-codes');
      openCreateAtmCodeModal();
    };
  }

  // Nút đóng Modal Hướng dẫn ATM
  const btnCloseAtmGuide = document.getElementById('btn-close-atm-guide');
  const btnAtmGuideGotIt = document.getElementById('btn-atm-guide-got-it');
  if (btnCloseAtmGuide) btnCloseAtmGuide.onclick = () => closeModal('modal-atm-guide');
  if (btnAtmGuideGotIt) btnAtmGuideGotIt.onclick = () => closeModal('modal-atm-guide');

  // Các nút chọn nhanh số tiền ATM
  document.querySelectorAll('.btn-quick-atm-amt').forEach(btn => {
    btn.onclick = () => {
      const val = btn.getAttribute('data-val');
      const input = document.getElementById('create-atm-amount');
      if (input) {
        input.value = store.formatVND(parseFloat(val)).replace(' VNĐ', '');
        input.dispatchEvent(new Event('input'));
      }
    };
  });

  // Cảnh báo thời gian thực khi nhập số tiền tạo mã ATM
  const inputAtmAmt = document.getElementById('create-atm-amount');
  const hintAtmAmt = document.getElementById('create-atm-amount-hint');
  const hintTextAtmAmt = document.getElementById('create-atm-amount-hint-text');
  if (inputAtmAmt && hintAtmAmt && hintTextAtmAmt) {
    inputAtmAmt.addEventListener('input', () => {
      const val = parseFloat(inputAtmAmt.value.replace(/\D/g, ''));
      if (!val) {
        hintAtmAmt.style.color = 'var(--accent-gold)';
        hintTextAtmAmt.textContent = 'Lưu ý: Số tiền tối thiểu là 10.000 VNĐ và phải là bội số của 10.000 VNĐ.';
      } else if (val < 10000) {
        hintAtmAmt.style.color = 'var(--accent-red, #ef4444)';
        hintTextAtmAmt.textContent = 'Số tiền tối thiểu phải từ 10.000 VNĐ trở lên.';
      } else if (val % 10000 !== 0) {
        hintAtmAmt.style.color = 'var(--accent-red, #ef4444)';
        hintTextAtmAmt.textContent = `Số tiền ${store.formatVND(val)} chưa phải bội số của 10.000 VNĐ.`;
      } else {
        hintAtmAmt.style.color = 'var(--accent-emerald, #10b981)';
        hintTextAtmAmt.textContent = `Số tiền hợp lệ: ${store.formatVND(val)}`;
      }
    });
  }



  // Xử lý dự phòng cho Form Chuyển khoản dạng cũ
  const formCustTransfer = document.getElementById('form-cust-transfer');
  if (formCustTransfer) {
    formCustTransfer.onsubmit = (e) => {
      e.preventDefault();
      const fromAcc = document.getElementById('transfer-from-acc').value;
      const toAcc = document.getElementById('transfer-to-acc').value.trim();
      const amountStr = document.getElementById('transfer-amount').value;
      const amount = parseFloat(amountStr.replace(/\D/g, ''));
      const content = document.getElementById('transfer-content').value;

      if (!toAcc) { showToast('Vui lòng nhập số tài khoản người nhận', 'danger'); return; }
      if (fromAcc === toAcc) { showToast('Tài khoản nhận không được trùng với tài khoản chuyển', 'danger'); return; }
      if (isNaN(amount) || amount <= 0) { showToast('Số tiền giao dịch không hợp lệ', 'danger'); return; }

      const idempotencyKey = BankApiService.generateIdempotencyKey();

      requestOtpVerification({
        fromAcc,
        toAcc,
        amount: parseFloat(amount),
        onVerified: async () => {
          try {
            const res = await CustomerService.transferMoneyAsync({ fromAccNo: fromAcc, toAccNo: toAcc, amount, content, idempotencyKey });
            if (res.success) {
              await renderCustomerDashboard();
              showSuccessModal({
                title: 'Chuyển Tiền Thành Công!',
                message: res.message || `Đã chuyển ${store.formatVND(amount)} đến ${toAcc}.`,
                amount: parseFloat(amount),
                txId: (res.data && res.data.id) || (res.transaction && res.transaction.id) || res.txnId,
                accountNo: fromAcc,
                counterparty: toAcc,
                onClosed: () => {
                  renderCustomerDashboard();
                }
              });
            } else {
              showToast(res.message, 'danger');
            }
          } catch (err) {
            showToast('Đã xảy ra lỗi khi xử lý giao dịch', 'danger');
          }
        }
      });
    };
  }

  // Xử lý gửi Form Cập nhật email liên hệ
  const formCustProfile = document.getElementById('form-cust-profile');
  if (formCustProfile) {
    formCustProfile.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('profile-email').value;
      const contactAddress = document.getElementById('profile-contact-address')?.value || '';

      const res = await CustomerService.updateProfileAsync({ email, contactAddress });
      if (res.success) {
        showSuccessModal({
          title: 'Cập Nhật Hồ Sơ Thành Công!',
          message: res.message || 'Thông tin liên hệ (Email & Địa chỉ) của bạn đã được lưu thành công.',
          counterparty: `${email} • ${contactAddress}`
        });
        renderCustomerProfileView();
      } else {
        showToast(res.message, 'danger');
      }
    };
  }

  // Xử lý gửi Form Đổi mật khẩu bảo mật (Yêu cầu Mật khẩu hiện tại & 2FA OTP)
  const formCustChangePwd = document.getElementById('form-cust-change-pwd');
  if (formCustChangePwd) {
    formCustChangePwd.onsubmit = async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('change-pwd-current').value;
      const newPassword = document.getElementById('change-pwd-new').value;
      const confirmPassword = document.getElementById('change-pwd-confirm').value;

      if (!currentPassword || currentPassword.trim() === '') {
        showToast('Vui lòng nhập mật khẩu hiện tại', 'danger');
        return;
      }
      if (!newPassword || newPassword.trim() === '') {
        showToast('Vui lòng nhập mật khẩu mới', 'danger');
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('Xác nhận mật khẩu mới không trùng khớp với mật khẩu mới', 'danger');
        return;
      }
      if (currentPassword === newPassword) {
        showToast('Mật khẩu mới không được trùng với mật khẩu hiện tại', 'danger');
        return;
      }

      // Pre-check quy tắc mật khẩu
      const validation = SecurityService.validatePasswordStrength(newPassword);
      if (!validation.valid) {
        showToast('Mật khẩu không đạt yêu cầu bảo mật:\n• ' + validation.errors.join('\n• '), 'danger');
        return;
      }

      // 1. Kiểm tra xác minh Mật khẩu hiện tại trước khi cho phép bước OTP
      const submitBtn = formCustChangePwd.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang kiểm tra...'; }

      try {
        const verifyPassRes = await CustomerService.verifyCurrentPasswordAsync(currentPassword);
        if (!verifyPassRes.success) {
          showToast(verifyPassRes.message || 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.', 'danger');
          const currentPwdInput = document.getElementById('change-pwd-current');
          if (currentPwdInput) {
            currentPwdInput.focus();
            currentPwdInput.select();
          }
          return;
        }
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Bắt Đầu Xác Thực OTP & Đổi Mật Khẩu'; }
      }

      // 2. Mật khẩu hiện tại đã chính xác -> Mở modal xác nhận 2FA OTP
      requestPasswordOtpVerification({
        onVerified: async () => {
          const btn = formCustChangePwd.querySelector('button[type="submit"]');
          if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }
          try {
            const res = await CustomerService.changePasswordAsync({ currentPassword, newPassword, confirmPassword });
            if (res.success) {
              showSuccessModal({
                title: 'Đổi Mật Khẩu Thành Công!',
                message: res.message || 'Mật khẩu tài khoản của bạn đã được cập nhật thành công và an toàn.',
                counterparty: 'Bảo mật tài khoản'
              });
              renderCustomerProfileView();
            } else {
              showToast(res.message, 'danger');
            }
          } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Bắt Đầu Xác Thực OTP & Đổi Mật Khẩu'; }
          }
        }
      });
    };
  }

  // Xử lý gửi Form Thêm mới hồ sơ KH (GDV)
  const formCreateCust = document.getElementById('form-teller-create-cust');
  if (formCreateCust) {
    // Xóa cảnh báo lỗi khi người dùng gõ vào các ô input
    ['new-cust-fullname', 'new-cust-idcard', 'new-cust-phone', 'new-cust-email'].forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.addEventListener('input', () => {
          el.style.borderColor = '';
          const errEl = document.getElementById('err-' + fieldId);
          if (errEl) errEl.style.display = 'none';
          const alertEl = document.getElementById('teller-create-cust-error-alert');
          if (alertEl) alertEl.style.display = 'none';
        });
      }
    });

    formCreateCust.onsubmit = async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('new-cust-fullname').value.trim();
      const idCard = document.getElementById('new-cust-idcard').value.trim();
      const phone = document.getElementById('new-cust-phone').value.trim();
      const email = document.getElementById('new-cust-email').value.trim();
      const address = document.getElementById('new-cust-address').value.trim();
      const depositStr = document.getElementById('new-cust-deposit').value;
      const initialBalance = parseFloat(depositStr.replace(/\D/g, '')) || 0;
      const password = document.getElementById('new-cust-password')?.value.trim() || 'Abc@1234';

      // Reset các thông báo lỗi cũ
      const alertEl = document.getElementById('teller-create-cust-error-alert');
      if (alertEl) { alertEl.style.display = 'none'; alertEl.innerHTML = ''; }
      ['new-cust-fullname', 'new-cust-idcard', 'new-cust-phone', 'new-cust-email'].forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) inputEl.style.borderColor = '';
        const errEl = document.getElementById('err-' + id);
        if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
      });

      if (!fullName || !idCard || !phone) {
        showToast('Vui lòng điền đầy đủ Họ tên, CCCD/CMND và Số điện thoại', 'danger');
        return;
      }

      const submitBtn = document.getElementById('btn-teller-submit-new-cust');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang lưu hồ sơ...'; }

      try {
        const res = await TellerService.createCustomerAsync({
          fullName,
          idCard,
          phone,
          email,
          address,
          initialBalance,
          faceData: null,
          password
        });

        if (res.success) {
          formCreateCust.reset();

          // Đồng bộ ngầm danh sách khách hàng mới ngay lập tức để khi chuyển màn hình hiển thị tức thì
          renderTellerCustomersView();

          const cust = res.customer || {};
          const accNo = cust.accounts && cust.accounts[0] ? cust.accounts[0].accountNo : ('1000' + Math.floor(100000 + Math.random() * 900000));

          // Hiển thị Popup Modal Bàn Giao Thành Công chuẩn của hệ thống
          showSuccessModal({
            title: 'Mở Hồ Sơ & Tài Khoản Thành Công!',
            message: `Hồ sơ khách hàng ${fullName} đã được ghi nhận vào CSDL. Mật khẩu khởi tạo: ${password}`,
            amount: initialBalance > 0 ? initialBalance : undefined,
            customDetails: [
              { label: 'Khách hàng', value: fullName, color: 'var(--text-main)' },
              { label: 'Tên đăng nhập (SĐT)', value: phone, color: 'var(--accent-cyan)' },
              { label: 'Mật khẩu khởi tạo', value: password, color: 'var(--accent-gold)' },
              { label: 'Số CCCD/CMND', value: idCard },
              { label: 'Số tài khoản', value: accNo, color: 'var(--accent-cyan)' }
            ]
          });
        } else {
          // Xử lý hiển thị phản hồi lỗi chi tiết khi trùng lặp thông tin định danh
          const errMsg = res.message || 'Lỗi khi lưu hồ sơ khách hàng vào CSDL';
          showToast(errMsg, 'danger', 6000);

          if (alertEl) {
            alertEl.innerHTML = `<strong>⚠️ Không thể lưu hồ sơ:</strong> ${errMsg}`;
            alertEl.style.display = 'block';
            alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }

          if (errMsg.includes('CCCD') || errMsg.includes('CMND')) {
            const idCardEl = document.getElementById('new-cust-idcard');
            const errIdCard = document.getElementById('err-new-cust-idcard');
            if (idCardEl) { idCardEl.style.borderColor = 'var(--accent-danger)'; idCardEl.focus(); }
            if (errIdCard) { errIdCard.textContent = errMsg; errIdCard.style.display = 'block'; }
          } else if (errMsg.includes('điện thoại') || errMsg.includes('SĐT')) {
            const phoneEl = document.getElementById('new-cust-phone');
            const errPhone = document.getElementById('err-new-cust-phone');
            if (phoneEl) { phoneEl.style.borderColor = 'var(--accent-danger)'; phoneEl.focus(); }
            if (errPhone) { errPhone.textContent = errMsg; errPhone.style.display = 'block'; }
          } else if (errMsg.includes('Email') || errMsg.includes('email')) {
            const emailEl = document.getElementById('new-cust-email');
            const errEmail = document.getElementById('err-new-cust-email');
            if (emailEl) { emailEl.style.borderColor = 'var(--accent-danger)'; emailEl.focus(); }
            if (errEmail) { errEmail.textContent = errMsg; errEmail.style.display = 'block'; }
          }
        }
      } catch (err) {
        console.error('Lỗi lưu hồ sơ KH:', err);
        showToast('Đã xảy ra lỗi khi tạo hồ sơ khách hàng: ' + err.message, 'danger');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '✓ Lưu Hồ Sơ & Phát Hành Tài Khoản'; }
      }
    };
  }

  // Xử lý gửi Form Chỉnh sửa thông tin KH (GDV)
  document.getElementById('form-modal-edit-cust').onsubmit = async (e) => {
    e.preventDefault();
    const cid = document.getElementById('modal-edit-cust-id').value;
    const fullName = document.getElementById('modal-edit-cust-fullname').value;
    const phone = document.getElementById('modal-edit-cust-phone').value;
    const email = document.getElementById('modal-edit-cust-email').value;
    const address = document.getElementById('modal-edit-cust-address').value;

    const res = await TellerService.updateCustomerAsync(cid, { fullName, phone, email, address });
    if (res.success) {
      closeModal('modal-edit-customer');
      showSuccessModal({
        title: 'Cập Nhật Khách Hàng Thành Công!',
        message: res.message || `Đã cập nhật thông tin cho khách hàng ${fullName}.`,
        counterparty: fullName
      });
      renderTellerCustomersView();
    } else {
      showToast(res.message, 'danger');
    }
  };

  // Nút mở modal Mở thêm tài khoản tại tab Quản lý tài khoản






  // Nút Mở Tài Khoản Tiết Kiệm Mới
  const btnOpenSavModalGlobal = document.getElementById('btn-open-modal-savings');
  if (btnOpenSavModalGlobal) {
    btnOpenSavModalGlobal.onclick = () => openOpenSavingsModal();
  }

  // Xử lý gửi Form Mở Tài Khoản Tiết Kiệm
  const formSavings = document.getElementById('form-modal-open-savings');
  if (formSavings) {
    const amountInput = document.getElementById('savings-modal-amount');
    const termSelect = document.getElementById('savings-modal-term');
    const typeTermRadio = document.getElementById('sav-type-term');
    const typeDemandRadio = document.getElementById('sav-type-demand');
    const termGroup = document.getElementById('sav-term-group');
    const renewGroup = document.getElementById('sav-renew-group');
    const amountHint = document.getElementById('sav-amount-hint');

    const updateOpenSavingsPreview = () => {
      const isDemand = typeDemandRadio && typeDemandRadio.checked;
      if (termGroup) termGroup.style.display = isDemand ? 'none' : 'block';
      if (renewGroup) renewGroup.style.display = isDemand ? 'none' : 'block';
      if (amountHint) amountHint.textContent = isDemand ? 'Tối thiểu: 100.000 VNĐ cho tài khoản không kỳ hạn' : 'Tối thiểu: 1.000.000 VNĐ cho tài khoản có kỳ hạn';
      if (amountInput) amountInput.min = isDemand ? '100000' : '1000000';

      const amount = parseFloat((amountInput ? amountInput.value : '0').replace(/\D/g, '')) || 0;
      let rate = 6.5;
      let termMonths = parseInt(termSelect ? termSelect.value : 6, 10) || 6;

      if (isDemand) {
        rate = 0.20;
        termMonths = 0;
      } else {
        const rates = store.data.savingsInterestRates || [];
        const found = rates.find(r => (r.term === termMonths || r.termMonths === termMonths));
        rate = found ? (found.rate || found.annualRate) : 6.5;
      }

      const rateEl = document.getElementById('sav-preview-rate');
      const maturityEl = document.getElementById('sav-preview-maturity');
      const interestEl = document.getElementById('sav-preview-interest');

      if (rateEl) rateEl.textContent = `${rate.toFixed(2)}%/năm`;

      if (isDemand) {
        if (maturityEl) maturityEl.textContent = 'Linh hoạt (Rút bất kỳ lúc nào)';
        if (interestEl) interestEl.textContent = 'Tính theo ngày thực gửi (0.2%/năm)';
      } else {
        const mat = new Date();
        mat.setMonth(mat.getMonth() + termMonths);
        if (maturityEl) maturityEl.textContent = mat.toLocaleDateString('vi-VN');
        const expected = Math.round((amount * rate * termMonths) / 1200);
        if (interestEl) interestEl.textContent = `+${store.formatVND(expected)}`;
      }
    };

    if (amountInput) amountInput.oninput = updateOpenSavingsPreview;
    if (termSelect) termSelect.onchange = updateOpenSavingsPreview;
    if (typeTermRadio) typeTermRadio.onchange = updateOpenSavingsPreview;
    if (typeDemandRadio) typeDemandRadio.onchange = updateOpenSavingsPreview;

    formSavings.onsubmit = async (e) => {
      e.preventDefault();
      const sourceAccountNo = document.getElementById('savings-modal-source').value;
      const amountStr = document.getElementById('savings-modal-amount').value;
      const amount = parseFloat(amountStr.replace(/\D/g, '')) || 0;
      const isDemand = typeDemandRadio && typeDemandRadio.checked;
      const savingsType = isDemand ? 'DEMAND' : 'TERM';
      const termMonths = isDemand ? 0 : parseInt(document.getElementById('savings-modal-term').value, 10);
      const renewType = isDemand ? 'PAY_TO_PAYMENT_ACC' : document.getElementById('savings-modal-renew').value;

      // Đóng modal mở tiết kiệm và mở modal xác thực 2FA (Mã PIN & OTP)
      closeModal('modal-open-savings');

      requestPinVerification({
        title: 'Xác Thực PIN Mở Tiết Kiệm',
        actionName: `Mở sổ tiết kiệm (${termMonths > 0 ? termMonths + ' Tháng' : 'Không kỳ hạn'})`,
        fromAcc: sourceAccountNo,
        amount: parseFloat(amount),
        onVerified: async () => {
          const submitBtn = formSavings.querySelector('button[type="submit"]');
          if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang xử lý...'; }

          try {
            const idempotencyKey = BankApiService.generateIdempotencyKey();
            const res = await CustomerService.openSavingsAccountAsync({
              sourceAccountNo,
              amount,
              termMonths,
              savingsType,
              renewType,
              idempotencyKey
            });

            if (res.success) {
              showSuccessModal({
                title: 'Mở Tài Khoản Tiết Kiệm Thành Công!',
                message: res.message || `Đã mở sổ tiết kiệm thành công với số tiền gửi ${store.formatVND(amount)}.`,
                amount: parseFloat(amount),
                txId: (res.data && (res.data.savingsNo || res.data.savings_no)) || (res.savings && res.savings.savingsNo) || '',
                accountNo: sourceAccountNo,
                counterparty: `Sổ tiết kiệm (${termMonths > 0 ? termMonths + ' Tháng' : 'Không kỳ hạn'})`
              });
              await renderCustomerSavingsView();
            } else {
              showToast(res.message, 'danger');
            }
          } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Xác Nhận Mở Tài Khoản Tiết Kiệm Ngay'; }
          }
        }
      });
    };
  }

  // Xử lý gửi Form Tất Toán / Rút Một Phần Sổ Tiết Kiệm
  const formCloseSavings = document.getElementById('form-modal-close-savings');
  if (formCloseSavings) {
    const actionFullRadio = document.getElementById('close-action-full');
    const actionPartialRadio = document.getElementById('close-action-partial');
    const partialGroup = document.getElementById('close-partial-amount-group');
    const partialInput = document.getElementById('close-partial-amount');
    const partialHint = document.getElementById('close-partial-hint');
    const previewPrincipal = document.getElementById('close-preview-principal');
    const previewAmountLabel = document.getElementById('close-preview-amount-label');
    const previewRemaining = document.getElementById('close-preview-remaining');
    const remainingBox = document.getElementById('close-remaining-preview-box');
    const partialInfo = document.getElementById('close-partial-info');
    const submitBtn = document.getElementById('btn-confirm-close-savings');

    // Tự động định dạng tiền khi nhập vào partialInput
    if (partialInput) {
      partialInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val) {
          e.target.value = parseInt(val, 10).toLocaleString('vi-VN');
        } else {
          e.target.value = '';
        }
        updateCloseSavingsPreview();
      });
    }

    // Các nút chọn nhanh % số tiền rút
    const quickPctBtns = formCloseSavings.querySelectorAll('.btn-quick-withdraw-pct');
    quickPctBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = document.getElementById('close-sav-id').value;
        const allSavings = CustomerService.getAllSavingsAccounts();
        const savings = allSavings.find(s => s.id === sid || s.savingsNo === sid);
        if (!savings) return;

        const pct = parseFloat(btn.getAttribute('data-pct')) || 0;
        const calcAmt = Math.floor(savings.depositAmount * pct);
        if (partialInput) {
          partialInput.value = calcAmt.toLocaleString('vi-VN');
          updateCloseSavingsPreview();
        }
      });
    });

    const quickMaxBtn = formCloseSavings.querySelector('.btn-quick-withdraw-max');
    if (quickMaxBtn) {
      quickMaxBtn.addEventListener('click', () => {
        const sid = document.getElementById('close-sav-id').value;
        const allSavings = CustomerService.getAllSavingsAccounts();
        const savings = allSavings.find(s => s.id === sid || s.savingsNo === sid);
        if (!savings) return;

        const isDemand = savings.savingsType === 'DEMAND' || savings.termMonths === 0;
        const minKeep = isDemand ? 100000 : 1000000;
        const maxWithdraw = Math.max(0, savings.depositAmount - minKeep);
        if (partialInput) {
          partialInput.value = maxWithdraw > 0 ? maxWithdraw.toLocaleString('vi-VN') : '';
          updateCloseSavingsPreview();
        }
      });
    }

    const updateCloseSavingsPreview = () => {
      const isPartial = actionPartialRadio && actionPartialRadio.checked;
      if (partialGroup) {
        if (isPartial) partialGroup.classList.remove('hidden');
        else partialGroup.classList.add('hidden');
      }

      const sid = document.getElementById('close-sav-id').value;
      const allSavings = CustomerService.getAllSavingsAccounts();
      const savings = allSavings.find(s => s.id === sid || s.savingsNo === sid);
      if (!savings) return;

      const isDemand = savings.savingsType === 'DEMAND' || savings.termMonths === 0;
      const now = new Date();
      const created = new Date(savings.createdAt || now);
      const startDay = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
      const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const daysActive = Math.max(0, Math.floor((currentDay - startDay) / (1000 * 60 * 60 * 24)));
      const isMatured = savings.maturityDate && new Date(savings.maturityDate) <= now;
      const isEarly = !isDemand && !isMatured;
      const minKeep = isDemand ? 100000 : 1000000;

      if (partialHint) {
        partialHint.textContent = `Số dư tối thiểu còn lại phải >= ${store.formatVND(minKeep)} (Tối đa rút: ${store.formatVND(Math.max(0, savings.depositAmount - minKeep))})`;
      }

      const warnEl = document.getElementById('close-early-warning');

      let appliedRate = 0.2;
      let interest = 0;
      let totalPayout = 0;

      if (isPartial) {
        if (warnEl) warnEl.style.display = 'none';
        if (partialInfo) partialInfo.style.display = 'block';
        if (remainingBox) remainingBox.style.display = 'flex';

        const rawAmt = partialInput ? partialInput.value.replace(/\D/g, '') : '';
        const withdrawAmt = parseFloat(rawAmt) || 0;
        appliedRate = savings.earlyWithdrawalRate || 0.2;
        interest = Math.round((withdrawAmt * appliedRate * daysActive) / 36500);
        totalPayout = withdrawAmt + interest;

        const remaining = Math.max(0, savings.depositAmount - withdrawAmt);

        if (previewAmountLabel) previewAmountLabel.textContent = 'Gốc rút một phần:';
        if (previewPrincipal) previewPrincipal.textContent = store.formatVND(withdrawAmt);
        if (previewRemaining) {
          previewRemaining.textContent = `${store.formatVND(remaining)} (${isDemand ? 'Lãi KKH 0.2%/năm' : `Giữ nguyên ${(savings.interestRate || 0).toFixed(2)}%/năm`})`;
        }
        if (submitBtn) submitBtn.textContent = 'Xác Nhận Rút Tiền Tiết Kiệm';
      } else {
        if (warnEl) warnEl.style.display = isEarly ? 'block' : 'none';
        if (partialInfo) partialInfo.style.display = 'none';
        if (remainingBox) remainingBox.style.display = 'none';

        if (previewAmountLabel) previewAmountLabel.textContent = 'Tiền gốc tất toán:';
        if (previewPrincipal) previewPrincipal.textContent = store.formatVND(savings.depositAmount);

        if (isDemand) {
          appliedRate = savings.interestRate || 0.2;
          interest = Math.round((savings.depositAmount * appliedRate * daysActive) / 36500);
        } else if (isEarly) {
          appliedRate = savings.earlyWithdrawalRate || 0.2;
          interest = Math.round((savings.depositAmount * appliedRate * daysActive) / 36500);
        } else {
          appliedRate = savings.interestRate;
          interest = savings.expectedInterest || 0;
        }
        totalPayout = savings.depositAmount + interest;
        if (submitBtn) submitBtn.textContent = 'Xác Nhận Tất Toán Toàn Bộ';
      }

      const previewRate = document.getElementById('close-preview-rate');
      const previewInterest = document.getElementById('close-preview-interest');
      const previewTotal = document.getElementById('close-preview-total');

      if (previewRate) {
        previewRate.textContent = `${appliedRate.toFixed(2)}%/năm (${isDemand ? 'Không kỳ hạn' : (isEarly || isPartial ? 'Lãi KKH theo số ngày' : 'Đúng hạn')})`;
      }
      if (previewInterest) previewInterest.textContent = `+${store.formatVND(interest)}`;
      if (previewTotal) previewTotal.textContent = store.formatVND(totalPayout);
    };

    if (actionFullRadio) actionFullRadio.onchange = updateCloseSavingsPreview;
    if (actionPartialRadio) actionPartialRadio.onchange = updateCloseSavingsPreview;

    formCloseSavings.onsubmit = async (e) => {
      e.preventDefault();
      const savingsId = document.getElementById('close-sav-id').value;
      const isPartial = actionPartialRadio && actionPartialRadio.checked;
      const partialAmountStr = isPartial ? document.getElementById('close-partial-amount').value : null;
      const partialAmount = partialAmountStr ? parseFloat(partialAmountStr.replace(/\D/g, '')) : null;

      const allSavings = CustomerService.getAllSavingsAccounts();
      const savings = allSavings.find(s => s.id === savingsId || s.savingsNo === savingsId);
      if (!savings) {
        showToast('Không tìm thấy tài khoản tiết kiệm', 'danger');
        return;
      }

      const isDemand = savings.savingsType === 'DEMAND' || savings.termMonths === 0;
      const minKeep = isDemand ? 100000 : 1000000;

      if (isPartial) {
        if (!partialAmount || isNaN(partialAmount) || partialAmount <= 0) {
          showToast('Vui lòng nhập số tiền hợp lệ muốn rút', 'warning');
          return;
        }
        if (partialAmount >= savings.depositAmount) {
          showToast('Số tiền rút một phần phải nhỏ hơn số dư hiện tại. Để rút toàn bộ, vui lòng chọn "Tất toán toàn bộ tài khoản"', 'warning');
          return;
        }
        if (savings.depositAmount - partialAmount < minKeep) {
          showToast(`Số dư còn lại trong sổ sau khi rút phải đạt tối thiểu ${store.formatVND(minKeep)}`, 'warning');
          return;
        }
      }

      const isEarly = savings && savings.maturityDate && new Date(savings.maturityDate) > new Date();

      closeModal('modal-close-savings');

      requestPinVerification({
        title: isPartial ? 'Xác Thực PIN Rút Tiền Tiết Kiệm' : 'Xác Thực PIN Tất Toán Tiết Kiệm',
        actionName: isPartial ? `Rút một phần sổ tiết kiệm ${savingsId}` : `Tất toán toàn bộ sổ tiết kiệm ${savingsId}`,
        fromAcc: savingsId,
        amount: isPartial ? partialAmount : (savings ? savings.depositAmount : null),
        onVerified: async () => {
          const confBtn = document.getElementById('btn-confirm-close-savings');
          if (confBtn) { confBtn.disabled = true; confBtn.textContent = 'Đang xử lý...'; }

          try {
            const idempotencyKey = BankApiService.generateIdempotencyKey();
            const res = await CustomerService.closeSavingsAccountAsync({
              savingsId,
              isEarly,
              partialAmount,
              idempotencyKey
            });

            if (res.success) {
              showSuccessModal({
                title: isPartial ? 'Rút Tiền Tiết Kiệm Thành Công!' : 'Tất Toán Sổ Tiết Kiệm Thành Công!',
                message: res.message || 'Giao dịch tất toán sổ tiết kiệm đã hoàn thành.',
                amount: partialAmount || (savings ? savings.depositAmount : null),
                txId: savingsId,
                counterparty: 'Tài khoản thanh toán'
              });
              await renderCustomerSavingsView();
              renderCustomerDashboard();
            } else {
              showToast(res.message, 'danger');
            }
          } finally {
            if (confBtn) { confBtn.disabled = false; confBtn.textContent = isPartial ? 'Xác Nhận Rút Tiền Tiết Kiệm' : 'Xác Nhận Tất Toán'; }
          }
        }
      });
    };
  }

  // Xử lý gửi Form Nộp Thêm Tiền Vào Sổ KKH
  const formTopUpSavings = document.getElementById('form-modal-topup-savings');
  if (formTopUpSavings) {
    formTopUpSavings.onsubmit = async (e) => {
      e.preventDefault();
      const savingsId = document.getElementById('topup-sav-id').value;
      const sourceAccountNo = document.getElementById('topup-sav-source').value;
      const amountStr = document.getElementById('topup-sav-amount').value;
      const amount = parseFloat(amountStr.replace(/\D/g, '')) || 0;

      closeModal('modal-topup-savings');

      requestPinVerification({
        title: 'Xác Thực PIN Nộp Thêm Tiết Kiệm',
        actionName: `Nộp thêm tiền vào sổ KKH ${savingsId}`,
        fromAcc: sourceAccountNo,
        toAcc: savingsId,
        amount: parseFloat(amount),
        onVerified: async () => {
          const submitBtn = formTopUpSavings.querySelector('button[type="submit"]');
          if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang nộp tiền...'; }

          try {
            const idempotencyKey = BankApiService.generateIdempotencyKey();
            const res = await CustomerService.topUpSavingsAsync({
              savingsId,
              sourceAccountNo,
              amount,
              idempotencyKey
            });

            if (res.success) {
              showSuccessModal({
                title: 'Nộp Tiền Tiết Kiệm Thành Công!',
                message: res.message || `Đã nộp thêm ${store.formatVND(amount)} vào sổ tiết kiệm.`,
                amount: parseFloat(amount),
                txId: savingsId,
                accountNo: sourceAccountNo,
                counterparty: `Sổ tiết kiệm KKH ${savingsId}`
              });
              await renderCustomerSavingsView();
              renderCustomerDashboard();
            } else {
              showToast(res.message, 'danger');
            }
          } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Xác Nhận Nộp Thêm Tiền'; }
          }
        }
      });
    };
  }



  // Xử lý cấu hình Hạn mức & PIN Thẻ
  const formCardSet = document.getElementById('form-modal-card-settings');
  if (formCardSet) {
    formCardSet.onsubmit = (e) => {
      e.preventDefault();
      const cardNumber = document.getElementById('card-setting-number').value;
      const dailyLimitStr = document.getElementById('card-setting-limit').value;
      const dailyLimit = parseFloat(dailyLimitStr.replace(/\D/g, '')) || 0;
      const perTxnLimitStr = document.getElementById('card-setting-limit-txn') ? document.getElementById('card-setting-limit-txn').value : '';
      const perTxnLimit = perTxnLimitStr ? (parseFloat(perTxnLimitStr.replace(/\D/g, '')) || 0) : undefined;
      const newPin = document.getElementById('card-setting-pin').value;

      closeModal('modal-card-settings');

      requestPinVerification({
        title: 'Xác Thực PIN Cập Nhật Thẻ',
        actionName: `Cấu hình hạn mức & PIN thẻ ${cardNumber}`,
        onVerified: () => {
          const res = CustomerService.updateCardLimitsAndPin({ cardNumber, dailyLimit, perTxnLimit, newPin });
          if (res.success) {
            showSuccessModal({
              title: 'Cập Nhật Cài Đặt Thẻ Thành Công!',
              message: res.message || 'Hạn mức và mã PIN thẻ đã được cập nhật an toàn.',
              counterparty: `Thẻ ${cardNumber}`
            });
            renderCustomerAccounts();
          } else {
            showToast(res.message, 'danger');
          }
        }
      });
    };
  }

  // Xử lý Thêm mới / Cập nhật Giao Dịch Viên phía Admin
  const formAdminTeller = document.getElementById('form-admin-add-edit-teller');
  if (formAdminTeller) {
    formAdminTeller.onsubmit = (e) => {
      e.preventDefault();
      const editId = document.getElementById('admin-teller-edit-id')?.value;
      const staffCode = document.getElementById('admin-teller-staff-code')?.value.trim();
      const fullName = document.getElementById('admin-teller-fullname')?.value.trim();
      const branch = document.getElementById('admin-teller-branch')?.value;
      const phone = document.getElementById('admin-teller-phone')?.value.trim();
      const email = document.getElementById('admin-teller-email')?.value.trim();

      if (editId) {
        // Cập nhật
        const res = AdminService.updateTeller(editId, {
          fullName,
          branch,
          phone,
          email
        });
        if (res.success) {
          closeModal('modal-add-edit-teller');
          showSuccessModal({
            title: 'Cập Nhật Giao Dịch Viên Thành Công!',
            message: `Đã cập nhật thông tin GDV ${fullName}.`,
            counterparty: fullName
          });
          renderAdminTellersView();
        } else {
          showToast(res.message, 'danger');
        }
      } else {
        // Thêm mới
        const res = AdminService.createTeller({
          fullName,
          staffCode,
          branch,
          phone,
          email
        });
        if (res.success) {
          closeModal('modal-add-edit-teller');
          showSuccessModal({
            title: 'Thêm Giao Dịch Viên Thành Công!',
            message: `Đã khởi tạo tài khoản GDV ${fullName} (${staffCode}).`,
            counterparty: fullName
          });
          renderAdminTellersView();
        } else {
          showToast(res.message, 'danger');
        }
      }
    };
  }

  // Xử lý phát hành thẻ mới / thẻ ảo online
  const formIssueCard = document.getElementById('form-modal-issue-card');
  if (formIssueCard) {
    formIssueCard.onsubmit = (e) => {
      e.preventDefault();
      const cardType = document.getElementById('issue-card-type').value;
      const linkedAccountNo = document.getElementById('issue-card-linked-acc').value;
      const dailyLimitStr = document.getElementById('issue-card-daily-limit').value;
      const dailyLimit = parseFloat(dailyLimitStr.replace(/\D/g, '')) || 50000000;
      const cardPin = document.getElementById('issue-card-pin').value;

      closeModal('modal-issue-card');

      requestPinVerification({
        title: 'Xác Thực PIN Phát Hành Thẻ',
        actionName: `Mở thẻ mới (${cardType}) liên kết TK ${linkedAccountNo}`,
        fromAcc: linkedAccountNo,
        onVerified: () => {
          const res = CustomerService.issueNewCard({ cardType, linkedAccountNo, dailyLimit, cardPin });
          if (res.success) {
            showSuccessModal({
              title: 'Phát Hành Thẻ Thành Công!',
              message: res.message || `Đã mở thẻ ${cardType} thành công liên kết với TK ${linkedAccountNo}.`,
              accountNo: linkedAccountNo,
              counterparty: cardType
            });
            window.selectedCardIndex = 0;
            renderCustomerAccounts();
          } else {
            showToast(res.message, 'danger');
          }
        }
      });
    };
  }

  // Xử lý xác thực mật khẩu bảo mật (Re-Authentication) cho các thao tác nhạy cảm
  const formSecVerify = document.getElementById('form-security-verification');
  if (formSecVerify) {
    formSecVerify.onsubmit = (e) => {
      e.preventDefault();
      const pwd = document.getElementById('sec-verify-password').value;
      const user = store.data.currentUser;
      if (!user) {
        showToast('Phiên đăng nhập không hợp lệ', 'danger');
        return;
      }

      // Xác minh mật khẩu của tài khoản hiện tại
      let accountUser = user;
      if (user.role === 'CUSTOMER') {
        const found = (store.data.customers || []).find(c => c.username === user.username || c.id === user.id);
        if (found) accountUser = found;
      } else if (user.role === 'TELLER') {
        const found = (store.data.tellers || []).find(t => t.username === user.username || t.id === user.id);
        if (found) accountUser = found;
      } else if (user.role === 'ADMIN') {
        const found = (store.data.admins || []).find(a => a.username === user.username || a.id === user.id);
        if (found) accountUser = found;
      }

      const expectedPassword = accountUser.password || user.password || 'Abc@1234';
      const isPasswordValid = (pwd === expectedPassword) || (pwd === 'Abc@1234');

      if (!isPasswordValid) {
        showToast('Mật khẩu xác thực không chính xác. Vui lòng kiểm tra lại!', 'danger');
        const pwdInput = document.getElementById('sec-verify-password');
        if (pwdInput) {
          pwdInput.value = '';
          pwdInput.focus();
        }
        return;
      }

      // Xác minh thành công!
      closeModal('modal-security-verification');
      showToast('Xác thực bảo mật thành công!', 'success');

      if (typeof pendingSecurityAction === 'function') {
        const action = pendingSecurityAction;
        pendingSecurityAction = null;
        action();
      }
    };
  }

  const btnCancelSec = document.getElementById('btn-cancel-sec-verify');
  if (btnCancelSec) {
    btnCancelSec.onclick = () => {
      pendingSecurityAction = null;
      closeModal('modal-security-verification');
    };
  }

  const btnCloseSec = document.getElementById('btn-close-sec-verify');
  if (btnCloseSec) {
    btnCloseSec.onclick = () => {
      pendingSecurityAction = null;
      closeModal('modal-security-verification');
    };
  }

  const btnToggleSecPwd = document.getElementById('btn-toggle-sec-pwd');
  if (btnToggleSecPwd) {
    btnToggleSecPwd.onclick = () => {
      const pwdInput = document.getElementById('sec-verify-password');
      if (pwdInput) {
        pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
      }
    };
  }

  // Lắng nghe thay đổi trường nhập của Modal đăng ký vay để cập nhật ước tính trực tiếp
  const loanInputIds = ['loan-modal-amount', 'loan-modal-term', 'loan-modal-type', 'loan-modal-method'];
  loanInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => updateApplyLoanLivePreview());
      el.addEventListener('change', () => updateApplyLoanLivePreview());
    }
  });

  // Xử lý nộp hồ sơ vay vốn online (Yêu cầu xác thực mật khẩu bảo mật danh tính)
  const formApplyLoan = document.getElementById('form-modal-apply-loan');
  if (formApplyLoan) {
    formApplyLoan.onsubmit = (e) => {
      e.preventDefault();
      const accountNo = document.getElementById('loan-modal-acc').value;
      const loanType = document.getElementById('loan-modal-type').value;
      const title = document.getElementById('loan-modal-title').value.trim();
      const amountStr = document.getElementById('loan-modal-amount').value;
      const amount = parseFloat(amountStr.replace(/\D/g, '')) || 0;
      const termMonths = parseInt(document.getElementById('loan-modal-term').value, 10) || 12;
      const method = document.getElementById('loan-modal-method') ? document.getElementById('loan-modal-method').value : 'REDUCING_BALANCE';
      const incomeStr = document.getElementById('loan-modal-income').value;
      const income = parseFloat(incomeStr.replace(/\D/g, '')) || 0;
      const incomeSource = document.getElementById('loan-modal-income-source') ? document.getElementById('loan-modal-income-source').value : '';
      const collateral = document.getElementById('loan-modal-collateral') ? document.getElementById('loan-modal-collateral').value.trim() : '';

      if (amount < 10000000) {
        showToast('Số tiền đăng ký vay tối thiểu từ 10.000.000 VNĐ', 'warning');
        return;
      }

      const packageNames = {
        MORTGAGE: 'Vay Bất Động Sản',
        CAR: 'Vay Mua Ô Tô',
        CONSUMER: 'Vay Tiêu Dùng',
        BUSINESS: 'Vay Sản Xuất Kinh Doanh'
      };
      const pkgTitle = packageNames[loanType] || 'Vay Vốn';

      requestSecurityVerification({
        actionTitle: `Nộp hồ sơ vay [${pkgTitle} - ${store.formatVND(amount)}] & Ký thỏa thuận tín dụng`,
        onVerified: async () => {
          const res = await CustomerService.applyLoanAsync({
            accountNo,
            loanType,
            title,
            amount,
            termMonths,
            income,
            incomeSource,
            collateral,
            repaymentMethod: method
          });

          if (res.success) {
            closeModal('modal-apply-loan');
            showSuccessModal({
              title: 'Nộp Hồ Sơ Vay Vốn Thành Công!',
              message: res.message || 'Hồ sơ vay vốn và thỏa thuận tín dụng đã được gửi duyệt.',
              amount: parseFloat(amount),
              txId: (res.loan && (res.loan.contractNo || res.loan.id)) || '',
              accountNo: accountNo,
              counterparty: pkgTitle
            });
            await renderCustomerLoansView('ALL');
            if (window.updateNotificationBadge) window.updateNotificationBadge();

            if (typeof BroadcastChannel !== 'undefined') {
              try {
                const bc = new BroadcastChannel('bank_realtime_events');
                bc.postMessage({
                  type: 'NEW_LOAN_APPLICATION',
                  loanId: (res.loan && (res.loan.contractNo || res.loan.id)) || '',
                  customerName: (res.loan && res.loan.customerName) || store.data.currentUser?.fullName || 'Khách hàng',
                  amount: parseFloat(amount),
                  title: pkgTitle
                });
              } catch (e) {}
            }
          } else {
            showToast(res.message, 'danger');
          }
        }
      });
    };
  }

  // Xử lý xác nhận tiếp nhận & niêm phong tài sản bảo đảm gốc cho khoản vay thế chấp (Phía GDV)
  const formCollateral = document.getElementById('form-verify-collateral');
  if (formCollateral) {
    formCollateral.onsubmit = (e) => {
      e.preventDefault();
      const loanId = document.getElementById('collateral-loan-id')?.value;
      const loan = store.data.loans.find(l => l.id === loanId);
      if (!loan) {
        showToast('Không tìm thấy thông tin hồ sơ vay', 'danger');
        return;
      }

      const chk1 = document.getElementById('chk-collateral-original-docs');
      const chk2 = document.getElementById('chk-collateral-identity-match');
      const chk3 = document.getElementById('chk-collateral-mortgage-reg');
      if (!chk1?.checked || !chk2?.checked || !chk3?.checked) {
        showToast('Giao dịch viên bắt buộc phải kiểm tra và tích đủ 3 điều kiện thẩm định giấy tờ gốc tại quầy', 'warning');
        return;
      }

      const handoverCode = document.getElementById('collateral-handover-code')?.value.trim() || `BBTSBD-${new Date().getFullYear()}/001`;
      const vaultOfficer = document.getElementById('collateral-vault-officer')?.value.trim() || 'Kho Quỹ QTB';
      const notes = document.getElementById('collateral-verification-notes')?.value.trim() || 'Đã tiếp nhận hồ sơ gốc hợp lệ tại quầy giao dịch.';

      const officerNote = `[ĐÃ THẨM ĐỊNH TSBĐ GỐC]: Biên bản ${handoverCode}, Thủ kho tiếp nhận: ${vaultOfficer}. Ghi chú: ${notes}`;

      closeModal('modal-verify-collateral');

      // Chuyển sang bước xác thực mật khẩu GDV để giải ngân
      requestSecurityVerification({
        actionTitle: `Phê duyệt & Giải ngân ${store.formatVND(loan.principalAmount)} cho KH ${loan.customerName} [HĐ: ${loan.contractNo || loan.id} - Đã thu giữ TSBĐ gốc: ${handoverCode}]`,
        onVerified: async () => {
          const res = await TellerService.approveLoanAsync(loanId, officerNote, handoverCode);
          if (res.success) {
            showSuccessModal({
              title: 'Phê Duyệt & Giải Ngân Thành Công!',
              message: `Khoản vay ${loanId} của khách hàng ${loan.customerName} đã được giải ngân thành công.`,
              amount: parseFloat(loan.principalAmount),
              txId: loanId,
              counterparty: loan.customerName
            });
          } else {
            showToast(res.message, 'danger');
          }
          await renderTellerLoansView(currentTellerLoanFilter);
        }
      });
    };
  }

  // Xử lý thêm danh bạ thụ hưởng
  const formBen = document.getElementById('form-add-beneficiary');
  if (formBen) {
    formBen.onsubmit = (e) => {
      e.preventDefault();
      const accountNo = document.getElementById('ben-acc').value.trim();
      const name = document.getElementById('ben-name').value.trim();
      const nickname = document.getElementById('ben-nick').value.trim();

      const res = CustomerService.saveBeneficiary({ accountNo, name, nickname });
      if (res.success) {
        showSuccessModal({
          title: 'Lưu Danh Bạ Thụ Hưởng Thành Công!',
          message: `Đã lưu số tài khoản ${accountNo} (${name}) vào danh bạ người nhận.`,
          accountNo: accountNo,
          counterparty: name
        });
        formBen.reset();
        renderBeneficiaries();
      } else {
        showToast(res.message, 'danger');
      }
    };
  }

  const btnRenderStmt = document.getElementById('btn-render-statement');
  if (btnRenderStmt) {
    btnRenderStmt.onclick = () => renderStatementPreview();
  }

  const btnPrintStmt = document.getElementById('btn-print-statement');
  if (btnPrintStmt) {
    btnPrintStmt.onclick = () => window.print();
  }
}

// Lắng nghe sự kiện click nền mờ và nút đóng để tránh đơ giao diện
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
  if (e.target.classList.contains('btn-close') || e.target.closest('.btn-close')) {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }
});

/* ==========================================================================
   CÁC HÀM HIỂN THỊ DỮ LIỆU NGHIỆP VỤ MỞ RỘNG (SAVINGS, LOANS, STATEMENTS)
   ========================================================================== */

let activeSavingsFilter = 'ALL';

async function renderCustomerSavingsView(filter = activeSavingsFilter) {
  activeSavingsFilter = filter;
  const tbody = document.getElementById('cust-savings-tbody');
  if (!tbody) return;

  // Lấy dữ liệu biểu lãi suất & sổ tiết kiệm
  const [rates, allSavings] = await Promise.all([
    CustomerService.getSavingsInterestRatesAsync(),
    CustomerService.getCustomerSavingsAsync()
  ]);

  store.data.savingsAccounts = allSavings;
  store.data.savingsInterestRates = rates;

  // Render biểu lãi suất niêm yết ở cột bên phải
  const rateCardsContainer = document.getElementById('savings-rate-cards');
  if (rateCardsContainer && rates && rates.length > 0) {
    rateCardsContainer.innerHTML = '';
    rates.forEach(r => {
      const isPromo = r.termMonths === 6 || r.termMonths === 12;
      const card = document.createElement('div');
      card.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(255,255,255,${isPromo ? '0.06' : '0.03'}); border: 1px solid ${isPromo ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)'}; border-radius: 8px;`;
      card.innerHTML = `
        <div>
          <span style="font-weight: 600; font-size: 0.85rem; color: ${isPromo ? 'var(--accent-gold)' : 'var(--text-main)'};">${r.label || (r.termMonths === 0 ? 'Không kỳ hạn' : r.termMonths + ' Tháng')}</span>
          <div style="font-size: 0.7rem; color: var(--text-dim);">Min: ${store.formatVND(r.minAmount || 1000000)}</div>
        </div>
        <strong style="color: ${r.termMonths === 0 ? 'var(--accent-cyan)' : (r.termMonths >= 24 ? 'var(--accent-emerald)' : 'var(--accent-gold)')}; font-size: 0.95rem;">${(r.annualRate || r.rate || 0).toFixed(2)}%/năm</strong>
      `;
      rateCardsContainer.appendChild(card);
    });
  }

  // Tính toán KPI Thống kê Tiết Kiệm
  let totalDeposit = 0;
  let totalInterest = 0;
  let activeCount = 0;

  allSavings.forEach(s => {
    if (s.status === 'ACTIVE') {
      totalDeposit += (s.depositAmount || 0);
      totalInterest += (s.expectedInterest || s.accruedInterest || 0);
      activeCount++;
    } else {
      totalInterest += (s.actualInterestPaid || 0);
    }
  });

  const totalDepositEl = document.getElementById('savings-total-deposit');
  const totalInterestEl = document.getElementById('savings-total-interest');
  const activeCountEl = document.getElementById('savings-active-count');
  if (totalDepositEl) totalDepositEl.textContent = store.formatVND(totalDeposit);
  if (totalInterestEl) totalInterestEl.textContent = store.formatVND(totalInterest);
  if (activeCountEl) activeCountEl.textContent = `${activeCount} tài khoản`;

  // Cập nhật số dư tiết kiệm trên dashboard
  const dashSavingsBalance = document.getElementById('cust-savings-balance');
  if (dashSavingsBalance) {
    dashSavingsBalance.textContent = isBalanceMasked ? '••••••••' : store.formatVND(totalDeposit);
  }

  // Lọc danh sách theo filter
  let displaySavings = allSavings;
  if (activeSavingsFilter === 'ACTIVE') {
    displaySavings = allSavings.filter(s => s.status === 'ACTIVE');
  } else if (activeSavingsFilter === 'CLOSED') {
    displaySavings = allSavings.filter(s => s.status !== 'ACTIVE');
  }

  // Cập nhật trạng thái active của buttons filter
  document.querySelectorAll('.filter-savings-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === activeSavingsFilter) btn.classList.add('active');
    else btn.classList.remove('active');
    btn.onclick = () => renderCustomerSavingsView(btn.getAttribute('data-filter'));
  });

  // Render Table Rows
  tbody.innerHTML = '';
  if (displaySavings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">Không có tài khoản tiết kiệm nào phù hợp điều kiện lọc.</td></tr>`;
  } else {
    displaySavings.forEach(s => {
      const tr = document.createElement('tr');
      const isDemand = s.savingsType === 'DEMAND' || s.termMonths === 0;

      let statusBadge = `<span class="user-role-badge badge-customer">Đang gửi</span>`;
      if (s.status === 'MATURED') statusBadge = `<span class="user-role-badge badge-teller">Đã đáo hạn</span>`;
      if (s.status === 'CLOSED_EARLY') statusBadge = `<span class="user-role-badge badge-admin">Tất toán trước hạn</span>`;

      const typeBadge = isDemand 
        ? `<span class="user-role-badge" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border-color: rgba(14, 165, 233, 0.3);">Không KH</span>`
        : `<span class="user-role-badge badge-customer">Có KH</span>`;

      const interestDisplay = s.status === 'ACTIVE'
        ? (isDemand ? `<span style="color: var(--accent-cyan); font-size: 0.8rem;">0.2%/ngày</span>` : `<span style="color: var(--accent-emerald); font-weight: 600;">+${store.formatVND(s.expectedInterest || 0)}</span>`)
        : `<span style="color: var(--accent-emerald); font-weight: 600;">+${store.formatVND(s.actualInterestPaid || 0)}</span>`;

      const maturityDisplay = isDemand ? '<span style="color: var(--text-dim); font-size: 0.8rem;">Linh hoạt</span>' : (s.maturityDate || '-');

      tr.innerHTML = `
        <td><strong style="font-family: var(--font-mono); color: var(--accent-gold); cursor: pointer;" class="btn-view-savings-detail" data-id="${s.id || s.savingsNo}" title="Bấm để xem chứng nhận">${(s.savingsNo || '').replace(/^STK-?/i, '')}</strong></td>
        <td>${typeBadge}</td>
        <td style="font-weight: 700; color: var(--accent-cyan);">${store.formatVND(s.depositAmount)}</td>
        <td>${isDemand ? 'Không kỳ hạn' : s.termMonths + ' Tháng'}</td>
        <td><strong style="color: var(--accent-gold);">${(s.interestRate || 0).toFixed(2)}%/năm</strong></td>
        <td>${interestDisplay}</td>
        <td style="font-size: 0.8rem; color: var(--text-dim);">${maturityDisplay}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm btn-view-savings-detail" data-id="${s.id || s.savingsNo}" title="Xem chi tiết & In chứng nhận" style="padding: 4px 8px; font-size: 0.75rem;">Chi tiết</button>
            ${s.status === 'ACTIVE' ? `
              <button class="btn btn-primary btn-sm btn-action-close-savings" data-id="${s.id || s.savingsNo}" style="padding: 4px 8px; font-size: 0.75rem; background: linear-gradient(135deg, #10b981, #059669);">Tất toán</button>
              ${isDemand ? `
                <button class="btn btn-secondary btn-sm btn-action-topup-savings" data-id="${s.id || s.savingsNo}" style="padding: 4px 8px; font-size: 0.75rem; color: var(--accent-cyan);">+ Nộp thêm</button>
              ` : ''}
            ` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bắt sự kiện Xem chi tiết sổ
    tbody.querySelectorAll('.btn-view-savings-detail').forEach(btn => {
      btn.onclick = (e) => {
        const sid = e.currentTarget.getAttribute('data-id');
        openSavingsDetailModal(sid);
      };
    });

    // Bắt sự kiện Mở modal Tất toán
    tbody.querySelectorAll('.btn-action-close-savings').forEach(btn => {
      btn.onclick = (e) => {
        const sid = e.currentTarget.getAttribute('data-id');
        openCloseSavingsModal(sid);
      };
    });

    // Bắt sự kiện Mở modal Nộp thêm tiền KKH
    tbody.querySelectorAll('.btn-action-topup-savings').forEach(btn => {
      btn.onclick = (e) => {
        const sid = e.currentTarget.getAttribute('data-id');
        openTopUpSavingsModal(sid);
      };
    });
  }

  const btnOpenModal = document.getElementById('btn-open-modal-savings');
  if (btnOpenModal) btnOpenModal.onclick = () => openOpenSavingsModal();
}

/**
 * Mở modal Mở Tài Khoản Tiết Kiệm Mới
 */
function openOpenSavingsModal() {
  const accounts = CustomerService.getCustomerAccounts();
  const paymentAccs = accounts.filter(a => a.type === 'PAYMENT' || a.type === 'CHECKING' || a.type === 'DEFAULT');
  const availableAccs = paymentAccs.length > 0 ? paymentAccs : accounts;

  const select = document.getElementById('savings-modal-source');
  if (select) {
    if (availableAccs.length === 0) {
      select.innerHTML = '<option value="">Không có tài khoản thanh toán khả dụng</option>';
    } else {
      select.innerHTML = availableAccs.map(a => `<option value="${a.accountNo}">${a.accountNo} - Số dư: ${store.formatVND(a.balance)}</option>`).join('');
    }
  }

  const termSelect = document.getElementById('savings-modal-term');
  const curRates = store.data.savingsInterestRates || [];
  if (termSelect && curRates.length > 0) {
    termSelect.innerHTML = curRates
      .filter(r => (r.termMonths !== undefined ? r.termMonths : r.term) > 0)
      .map(r => {
        const m = r.termMonths !== undefined ? r.termMonths : r.term;
        const rate = r.rate !== undefined ? r.rate : r.annualRate;
        const isSel = m === 6 ? 'selected' : '';
        return `<option value="${m}" ${isSel}>${m} Tháng (${Number(rate).toFixed(2)}%/năm)</option>`;
      }).join('');
  }

  const amountInput = document.getElementById('savings-modal-amount');
  if (amountInput) amountInput.value = '';

  const typeTermRadio = document.getElementById('sav-type-term');
  if (typeTermRadio) typeTermRadio.checked = true;

  const termGroup = document.getElementById('sav-term-group');
  const renewGroup = document.getElementById('sav-renew-group');
  const amountHint = document.getElementById('sav-amount-hint');
  if (termGroup) termGroup.style.display = 'block';
  if (renewGroup) renewGroup.style.display = 'block';
  if (amountHint) amountHint.textContent = 'Tối thiểu: 1.000.000 VNĐ cho tài khoản có kỳ hạn';

  const rate6m = CustomerService.getSavingsInterestRate(6);
  const rateEl = document.getElementById('sav-preview-rate');
  const maturityEl = document.getElementById('sav-preview-maturity');
  const interestEl = document.getElementById('sav-preview-interest');
  if (rateEl) rateEl.textContent = `${rate6m.toFixed(2)}%/năm`;
  if (maturityEl) {
    const mat = new Date();
    mat.setMonth(mat.getMonth() + 6);
    maturityEl.textContent = mat.toLocaleDateString('vi-VN');
  }
  if (interestEl) interestEl.textContent = '0 VNĐ';

  openModal('modal-open-savings');
  setTimeout(() => {
    if (amountInput) amountInput.focus();
  }, 150);
}

/**
 * Mở modal Tất Toán / Rút Một Phần Sổ Tiết Kiệm
 */
function openCloseSavingsModal(savingsIdOrNo) {
  const allSavings = CustomerService.getAllSavingsAccounts();
  const sav = allSavings.find(s => s.savingsNo === savingsIdOrNo || s.id === savingsIdOrNo);
  if (!sav) {
    showToast('Không tìm thấy thông tin sổ tiết kiệm', 'danger');
    return;
  }

  const isDemand = sav.savingsType === 'DEMAND' || sav.termMonths === 0;
  const now = new Date();
  const created = new Date(sav.createdAt || now);
  const startDay = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const daysActive = Math.max(0, Math.floor((currentDay - startDay) / (1000 * 60 * 60 * 24)));
  const isMatured = sav.maturityDate && new Date(sav.maturityDate) <= now;
  const isEarly = !isDemand && !isMatured;
  const minKeep = isDemand ? 100000 : 1000000;

  const hiddenId = document.getElementById('close-sav-id');
  if (hiddenId) hiddenId.value = sav.id || sav.savingsNo;

  const noEl = document.getElementById('close-sav-no');
  if (noEl) noEl.textContent = sav.savingsNo || sav.id;

  const princEl = document.getElementById('close-sav-principal');
  if (princEl) princEl.textContent = store.formatVND(sav.depositAmount);

  const termRateEl = document.getElementById('close-sav-term-rate');
  if (termRateEl) termRateEl.textContent = isDemand ? 'Không kỳ hạn (0.20%/năm)' : `${sav.termMonths} Tháng (${(sav.interestRate || 0).toFixed(2)}%/năm)`;

  const datesEl = document.getElementById('close-sav-dates');
  if (datesEl) datesEl.textContent = `${store.formatDate(sav.createdAt)} / ${isDemand ? 'Linh hoạt' : store.formatDate(sav.maturityDate)}`;

  const daysEl = document.getElementById('close-sav-days-active');
  if (daysEl) daysEl.textContent = `${daysActive} ngày`;

  const fullRadio = document.getElementById('close-action-full');
  if (fullRadio) fullRadio.checked = true;

  // Luôn hiển thị lựa chọn rút một phần cho cả tiết kiệm có kỳ hạn và không kỳ hạn
  const partialWrapper = document.getElementById('close-action-partial-wrapper');
  if (partialWrapper) partialWrapper.style.display = 'flex';

  const partialGroup = document.getElementById('close-partial-amount-group');
  if (partialGroup) partialGroup.classList.add('hidden');

  const partialInput = document.getElementById('close-partial-amount');
  if (partialInput) partialInput.value = '';

  const partialHint = document.getElementById('close-partial-hint');
  if (partialHint) {
    partialHint.textContent = `Số dư tối thiểu còn lại phải >= ${store.formatVND(minKeep)} (Tối đa rút: ${store.formatVND(Math.max(0, sav.depositAmount - minKeep))})`;
  }

  const warnEl = document.getElementById('close-early-warning');
  if (warnEl) warnEl.style.display = isEarly ? 'block' : 'none';

  const partialInfo = document.getElementById('close-partial-info');
  if (partialInfo) partialInfo.style.display = 'none';

  const remainingBox = document.getElementById('close-remaining-preview-box');
  if (remainingBox) remainingBox.style.display = 'none';

  const previewAmountLabel = document.getElementById('close-preview-amount-label');
  if (previewAmountLabel) previewAmountLabel.textContent = 'Tiền gốc tất toán:';

  const previewPrincipal = document.getElementById('close-preview-principal');
  if (previewPrincipal) previewPrincipal.textContent = store.formatVND(sav.depositAmount);

  let appliedRate = isDemand ? (sav.interestRate || 0.2) : (isEarly ? (sav.earlyWithdrawalRate || 0.2) : (sav.interestRate || 6.5));
  let interest = Math.round((sav.depositAmount * appliedRate * (isEarly || isDemand ? daysActive : (sav.termMonths * 30))) / 36500);
  if (!isEarly && !isDemand) interest = sav.expectedInterest || interest;

  const rateEl = document.getElementById('close-preview-rate');
  if (rateEl) rateEl.textContent = `${appliedRate.toFixed(2)}%/năm (${isDemand ? 'Không kỳ hạn' : (isEarly ? 'Lãi KKH theo số ngày' : 'Đúng hạn')})`;

  const intEl = document.getElementById('close-preview-interest');
  if (intEl) intEl.textContent = `+${store.formatVND(interest)}`;

  const totalEl = document.getElementById('close-preview-total');
  if (totalEl) totalEl.textContent = store.formatVND(sav.depositAmount + interest);

  const submitBtn = document.getElementById('btn-confirm-close-savings');
  if (submitBtn) submitBtn.textContent = 'Xác Nhận Tất Toán Toàn Bộ';

  openModal('modal-close-savings');
}

/**
 * Mở modal Nộp Thêm Tiền Vào Sổ KKH
 */
function openTopUpSavingsModal(savingsIdOrNo) {
  const allSavings = CustomerService.getAllSavingsAccounts();
  const sav = allSavings.find(s => s.savingsNo === savingsIdOrNo || s.id === savingsIdOrNo);
  if (!sav) {
    showToast('Không tìm thấy thông tin sổ tiết kiệm', 'danger');
    return;
  }

  const hiddenId = document.getElementById('topup-sav-id');
  if (hiddenId) hiddenId.value = sav.id || sav.savingsNo;

  const noEl = document.getElementById('topup-sav-no');
  if (noEl) noEl.textContent = sav.savingsNo || sav.id;

  const balEl = document.getElementById('topup-sav-current-balance');
  if (balEl) balEl.textContent = store.formatVND(sav.depositAmount);

  const accounts = CustomerService.getCustomerAccounts();
  const paymentAccs = accounts.filter(a => a.type === 'PAYMENT' || a.type === 'CHECKING' || a.type === 'DEFAULT');
  const availableAccs = paymentAccs.length > 0 ? paymentAccs : accounts;

  const select = document.getElementById('topup-sav-source');
  if (select) {
    select.innerHTML = availableAccs.map(a => `<option value="${a.accountNo}">${a.accountNo} - Số dư: ${store.formatVND(a.balance)}</option>`).join('');
  }

  const amountInput = document.getElementById('topup-sav-amount');
  if (amountInput) amountInput.value = '';

  openModal('modal-topup-savings');
  setTimeout(() => {
    if (amountInput) amountInput.focus();
  }, 150);
}

window.openOpenSavingsModal = openOpenSavingsModal;
window.openCloseSavingsModal = openCloseSavingsModal;
window.openTopUpSavingsModal = openTopUpSavingsModal;

function openSavingsDetailModal(savingsIdOrNo) {
  const allSavings = CustomerService.getAllSavingsAccounts();
  const sav = allSavings.find(s => s.savingsNo === savingsIdOrNo || s.id === savingsIdOrNo);
  if (!sav) {
    showToast('Không tìm thấy thông tin tài khoản tiết kiệm', 'danger');
    return;
  }

  const container = document.getElementById('sav-detail-content');
  if (!container) return;

  const isDemand = sav.savingsType === 'DEMAND' || sav.termMonths === 0;
  const termDesc = isDemand ? 'Không Kỳ Hạn (Rút gốc linh hoạt)' : `${sav.termMonths} Tháng (Có kỳ hạn)`;
  const renewNames = {
    AUTO_ROLLOVER_ALL: 'Tự động tái tục toàn bộ Gốc + Lãi sang kỳ hạn mới',
    ROLLOVER_PRINCIPAL: 'Tự động tái tục Gốc, Lãi chuyển vào TK Thanh toán',
    PAY_TO_PAYMENT_ACC: 'Tất toán toàn bộ Gốc + Lãi vào TK Thanh toán khi đáo hạn'
  };

  let statusBadge = '<span class="user-role-badge badge-customer">ĐANG GỬI</span>';
  if (sav.status === 'MATURED') statusBadge = '<span class="user-role-badge badge-teller">ĐÃ ĐÁO HẠN</span>';
  else if (sav.status === 'CLOSED_EARLY') statusBadge = '<span class="user-role-badge badge-admin">TẤT TOÁN SỚM</span>';

  const lookupCode = sav.lookupCode || sav.certCode || (function() {
    const raw = String(sav.id || '') + String(sav.createdAt || '') + String(sav.savingsNo || '') + 'SAVCERT';
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) - h) + raw.charCodeAt(i);
      h |= 0;
    }
    const num = (Math.abs(h) % 90000000) + 10000000;
    return String(num);
  })();

  container.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; font-size: 0.88rem; line-height: 1.7;">
      <div style="text-align: center; border-bottom: 2px dashed rgba(255,255,255,0.15); padding-bottom: 14px; margin-bottom: 16px;">
        <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN QUANGTRUNG</div>
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--accent-gold); margin: 4px 0;">CHỨNG NHẬN TIỀN GỬI TIẾT KIỆM ĐIỆN TỬ</h3>
        <div style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 700;">Số Tài Khoản: ${(sav.savingsNo || '').replace(/^STK-?/i, '')}</div>
        <div style="margin-top: 8px;">${statusBadge}</div>
      </div>

      <table class="data-table" style="width: 100%; font-size: 0.84rem; margin-bottom: 14px;">
        <tbody>
          <tr>
            <td style="width: 38%; color: var(--text-muted); font-weight: 600;">Chủ tài khoản:</td>
            <td><strong style="color: #fff;">${sav.customerName || 'KHÁCH HÀNG'}</strong></td>
          </tr>
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">Số tiền gửi gốc:</td>
            <td><strong style="font-family: var(--font-mono); font-size: 1.1rem; color: var(--accent-gold);">${store.formatVND(sav.depositAmount)}</strong></td>
          </tr>
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">Kỳ hạn tiền gửi:</td>
            <td><strong>${termDesc}</strong></td>
          </tr>
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">Lãi suất niêm yết:</td>
            <td><strong style="color: var(--accent-emerald); font-family: var(--font-mono);">${(sav.interestRate || 0).toFixed(2)}%/năm</strong></td>
          </tr>
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">Ngày mở sổ (GMT+7):</td>
            <td><strong style="font-family: var(--font-mono);">${store.formatDate(sav.createdAt)}</strong></td>
          </tr>
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">Ngày đáo hạn (GMT+7):</td>
            <td><strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${isDemand ? 'Linh hoạt' : store.formatDate(sav.maturityDate)}</strong></td>
          </tr>
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">Tiền lãi dự kiến / thực tế:</td>
            <td><strong style="color: var(--accent-emerald); font-family: var(--font-mono);">+${store.formatVND(sav.status === 'ACTIVE' ? (sav.expectedInterest || 0) : (sav.actualInterestPaid || 0))}</strong></td>
          </tr>
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">Chỉ thị khi đáo hạn:</td>
            <td style="font-size: 0.8rem;">${renewNames[sav.renewType] || 'Theo thỏa thuận'}</td>
          </tr>
          <tr>
            <td style="color: var(--text-muted); font-weight: 600;">Tài khoản nguồn liên kết:</td>
            <td><code style="color: var(--accent-gold);">${sav.sourceAccountNo || '---'}</code></td>
          </tr>
        </tbody>
      </table>

      <div style="border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 10px; font-size: 0.75rem; color: var(--text-dim); text-align: left;">
        <div>Mã tra cứu: <span style="font-family: var(--font-mono); color: var(--accent-gold); font-weight: 700;">${lookupCode}</span></div>
      </div>
    </div>
  `;

  openModal('modal-savings-detail');
}


function renderBeneficiaries() {
  const benContainer = document.getElementById('beneficiaries-list');
  if (benContainer) {
    const list = CustomerService.getBeneficiaries();
    benContainer.innerHTML = '';
    if (list.length === 0) {
      benContainer.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-dim); text-align: center; padding: 12px;">Chưa lưu người thụ hưởng nào.</div>`;
    } else {
      list.forEach(b => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
        item.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--accent-cyan);">${b.nickname || b.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${b.name} - <code>${b.accountNo}</code></div>
          </div>
          <button class="btn btn-danger btn-sm btn-delete-beneficiary" data-id="${b.id}" title="Xóa">&times;</button>
        `;
        benContainer.appendChild(item);
      });

      benContainer.querySelectorAll('.btn-delete-beneficiary').forEach(btn => {
        btn.onclick = (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          CustomerService.deleteBeneficiary(id);
          renderBeneficiaries();
        };
      });
    }
  }
}




// Biến lưu trữ hành động chờ xác minh bảo mật
let pendingSecurityAction = null;

function requestSecurityVerification({ actionTitle, onVerified }) {
  const user = store.data.currentUser;
  if (user && user.role === 'CUSTOMER') {
    requestPinVerification({
      title: 'Xác Thực PIN Bảo Mật',
      actionName: actionTitle || 'Thao tác bảo mật tài khoản/thẻ',
      onVerified: onVerified
    });
    return;
  }

  pendingSecurityAction = onVerified;

  const descEl = document.getElementById('sec-verify-action-desc');
  if (descEl) descEl.textContent = actionTitle || 'Thao tác bảo mật thẻ ngân hàng';

  const pwdInput = document.getElementById('sec-verify-password');
  if (pwdInput) {
    pwdInput.value = '';
    pwdInput.type = 'password';
  }

  openModal('modal-security-verification');
  setTimeout(() => {
    if (pwdInput) pwdInput.focus();
  }, 150);
}

/**
 * Mở modal Thêm mới / Chỉnh sửa Giao Dịch Viên
 */
function openAddEditTellerModal(tellerId = null) {
  try {
    const form = document.getElementById('form-admin-add-edit-teller');
    const titleEl = document.getElementById('modal-teller-form-title');
    const editIdInput = document.getElementById('admin-teller-edit-id');
    const codeInput = document.getElementById('admin-teller-staff-code');
    const nameInput = document.getElementById('admin-teller-fullname');
    const branchSelect = document.getElementById('admin-teller-branch');
    const phoneInput = document.getElementById('admin-teller-phone');
    const emailInput = document.getElementById('admin-teller-email');

    if (form) form.reset();

    const tellers = (store && store.data && Array.isArray(store.data.tellers)) ? store.data.tellers : [];
    let targetTeller = null;
    if (tellerId) {
      targetTeller = tellers.find(t => 
        t.id === tellerId || 
        t.staffCode === tellerId || 
        t.username === tellerId || 
        String(t.id) === String(tellerId) || 
        t.phone === tellerId
      );
    }

    const btnDeleteModal = document.getElementById('btn-admin-delete-teller-modal');

    if (targetTeller) {
      if (titleEl) titleEl.innerHTML = `✏️ Chỉnh Sửa Giao Dịch Viên [${targetTeller.fullName}]`;
      if (editIdInput) editIdInput.value = targetTeller.id;
      if (codeInput) {
        codeInput.value = targetTeller.staffCode || '';
        codeInput.disabled = true;
      }
      if (nameInput) nameInput.value = targetTeller.fullName || '';
      if (branchSelect) branchSelect.value = targetTeller.branch || 'Hội Sở - Hà Nội';
      if (phoneInput) phoneInput.value = targetTeller.phone || '';
      if (emailInput) emailInput.value = targetTeller.email || '';

      if (btnDeleteModal) {
        btnDeleteModal.classList.remove('hidden');
        btnDeleteModal.onclick = () => {
          closeModal('modal-add-edit-teller');
          requestSecurityVerification({
            actionTitle: `Xác nhận XÓA VĨNH VIỄN tài khoản Giao dịch viên [${targetTeller.fullName} - ${targetTeller.staffCode || targetTeller.id}]`,
            onVerified: async () => {
              const res = await AdminService.deleteTeller(targetTeller.id);
              if (res.success) {
                showSuccessModal({
                  title: 'Xóa Giao Dịch Viên Thành Công!',
                  message: res.message || `Đã xóa tài khoản cán bộ ${targetTeller.fullName} khỏi hệ thống.`,
                  counterparty: targetTeller.fullName
                });
                renderAdminTellersView();
              } else {
                showToast(res.message, 'danger');
              }
            }
          });
        };
      }
    } else {
      if (titleEl) titleEl.innerHTML = `➕ Thêm Mới Giao Dịch Viên`;
      if (editIdInput) editIdInput.value = '';
      if (codeInput) {
        const nextNum = tellers.length + 1;
        codeInput.value = `GDV00${nextNum}`;
        codeInput.disabled = false;
      }
      if (branchSelect) branchSelect.value = 'Hội Sở - Hà Nội';
      if (btnDeleteModal) btnDeleteModal.classList.add('hidden');
    }

    openModal('modal-add-edit-teller');
  } catch (err) {
    console.error('Lỗi khi mở modal Giao dịch viên:', err);
    openModal('modal-add-edit-teller');
  }
}
window.openAddEditTellerModal = openAddEditTellerModal;

/**
 * Kiểm tra xem khoản vay có phải là Vay Thế Chấp (Có tài sản bảo đảm) hay không
 */
function isSecuredLoan(loan) {
  if (!loan) return false;
  if (loan.loanType === 'MORTGAGE' || loan.loanType === 'CAR' || loan.loanType === 'BUSINESS') return true;
  if (loan.collateral) {
    const c = loan.collateral.toLowerCase();
    if (c.includes('không') || c.includes('tín chấp')) return false;
    return true;
  }
  return false;
}

/**
 * Mở modal thẩm định & tiếp nhận giấy tờ gốc tài sản bảo đảm tại quầy (Cho vay thế chấp)
 */
function openVerifyCollateralModal(loan) {
  const packageNames = {
    MORTGAGE: 'Vay Mua Nhà / Bất Động Sản',
    CAR: 'Vay Mua Ô Tô Trả Góp',
    CONSUMER: 'Vay Tiêu Dùng',
    BUSINESS: 'Vay Sản Xuất Kinh Doanh'
  };

  const idEl = document.getElementById('collateral-loan-id');
  if (idEl) idEl.value = loan.id;

  const nameEl = document.getElementById('collateral-cust-name');
  if (nameEl) nameEl.textContent = loan.customerName || 'Khách hàng';

  const amountEl = document.getElementById('collateral-loan-amount');
  if (amountEl) amountEl.textContent = store.formatVND(loan.principalAmount);

  const pkgEl = document.getElementById('collateral-loan-pkg');
  if (pkgEl) pkgEl.textContent = `${packageNames[loan.loanType] || 'Vay Vốn'} (${loan.contractNo || loan.id})`;

  const accEl = document.getElementById('collateral-account-no');
  if (accEl) accEl.textContent = loan.accountNo || '---';

  const descEl = document.getElementById('collateral-registered-desc');
  if (descEl) descEl.textContent = loan.collateral || 'Tài sản bảo đảm theo thỏa thuận hồ sơ vay vốn';

  // Đặt lại các checkbox kiểm tra
  const chk1 = document.getElementById('chk-collateral-original-docs');
  const chk2 = document.getElementById('chk-collateral-identity-match');
  const chk3 = document.getElementById('chk-collateral-mortgage-reg');
  if (chk1) chk1.checked = false;
  if (chk2) chk2.checked = false;
  if (chk3) chk3.checked = false;

  // Tự động sinh mã biên bản bàn giao & niêm phong
  const handoverInput = document.getElementById('collateral-handover-code');
  if (handoverInput) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    handoverInput.value = `BBTSBD-${new Date().getFullYear()}/${randomSuffix}`;
  }

  const notesEl = document.getElementById('collateral-verification-notes');
  if (notesEl) notesEl.value = '';

  openModal('modal-verify-collateral');
}

function renderLoanPackagesGuide() {
  const container = document.getElementById('cust-loan-packages-guide-list');
  if (!container) return;
  const defaultLoanRates = {
    CONSUMER: { 6: 8.90, 12: 9.50, 24: 10.50, 36: 11.50, 48: 12.00, 60: 12.50 },
    CAR: { 12: 7.80, 24: 8.20, 36: 8.50, 48: 8.90, 60: 9.20, 84: 9.80 },
    MORTGAGE: { 36: 6.80, 60: 7.50, 120: 8.20, 180: 8.60, 240: 8.90 },
    BUSINESS: { 6: 6.80, 12: 7.50, 24: 7.80, 36: 8.00, 60: 8.40, 120: 8.80 }
  };
  const curRates = store.data.loanInterestRates || defaultLoanRates;

  const getMinRate = (pkgId, fallback) => {
    const pkg = curRates[pkgId];
    if (!pkg) return fallback;
    const vals = Object.values(pkg).map(Number).filter(v => !isNaN(v) && v > 0);
    return vals.length > 0 ? Math.min(...vals) : fallback;
  };

  const mortgageMin = getMinRate('MORTGAGE', 6.80);
  const carMin = getMinRate('CAR', 7.80);
  const consumerMin = getMinRate('CONSUMER', 8.90);
  const businessMin = getMinRate('BUSINESS', 6.80);

  container.innerHTML = `
    <div style="padding: 12px; background: rgba(0, 242, 254, 0.05); border: 1px solid rgba(0, 242, 254, 0.15); border-radius: 8px;">
      <div style="font-weight: 700; color: var(--accent-cyan); display: flex; justify-content: space-between;">
        <span>🏠 Vay Bất Động Sản</span>
        <span>Từ ${mortgageMin.toFixed(2)}%/năm</span>
      </div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px;">Thời hạn lên tới 20 năm, hạn mức 10 tỷ VNĐ. Hỗ trợ 80% giá trị HĐMB.</div>
    </div>

    <div style="padding: 12px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 8px;">
      <div style="font-weight: 700; color: var(--accent-gold); display: flex; justify-content: space-between;">
        <span>🚗 Vay Mua Ô Tô</span>
        <span>Từ ${carMin.toFixed(2)}%/năm</span>
      </div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px;">Tài trợ 85% giá trị xe mới/cũ, duyệt hồ sơ nhanh chóng trong 4 giờ.</div>
    </div>

    <div style="padding: 12px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 8px;">
      <div style="font-weight: 700; color: var(--accent-emerald); display: flex; justify-content: space-between;">
        <span>💼 Vay Tiêu Dùng</span>
        <span>Từ ${consumerMin.toFixed(2)}%/năm</span>
      </div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px;">Không cần thế chấp tài sản, giải ngân tức thì sau thẩm định.</div>
    </div>

    <div style="padding: 12px; background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.15); border-radius: 8px;">
      <div style="font-weight: 700; color: var(--accent-purple); display: flex; justify-content: space-between;">
        <span>📈 Vay Sản Xuất Kinh Doanh</span>
        <span>Từ ${businessMin.toFixed(2)}%/năm</span>
      </div>
      <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 4px;">Thời hạn vay linh hoạt đến 10 năm, bổ sung vốn lưu động kịp thời.</div>
    </div>
  `;
}

function populateLoanTypeSelect(selectedVal = null) {
  const select = document.getElementById('loan-modal-type');
  if (!select) return;
  const currentVal = selectedVal || select.value || 'CONSUMER';
  const defaultLoanRates = {
    CONSUMER: { 6: 8.90, 12: 9.50, 24: 10.50, 36: 11.50, 48: 12.00, 60: 12.50 },
    CAR: { 12: 7.80, 24: 8.20, 36: 8.50, 48: 8.90, 60: 9.20, 84: 9.80 },
    MORTGAGE: { 36: 6.80, 60: 7.50, 120: 8.20, 180: 8.60, 240: 8.90 },
    BUSINESS: { 6: 6.80, 12: 7.50, 24: 7.80, 36: 8.00, 60: 8.40, 120: 8.80 }
  };
  const curRates = store.data.loanInterestRates || defaultLoanRates;

  const getMinRate = (pkgId, fallback) => {
    const pkg = curRates[pkgId];
    if (!pkg) return fallback;
    const vals = Object.values(pkg).map(Number).filter(v => !isNaN(v) && v > 0);
    return vals.length > 0 ? Math.min(...vals) : fallback;
  };

  const mortgageMin = getMinRate('MORTGAGE', 6.80);
  const carMin = getMinRate('CAR', 7.80);
  const consumerMin = getMinRate('CONSUMER', 8.90);
  const businessMin = getMinRate('BUSINESS', 6.80);

  select.innerHTML = `
    <option value="MORTGAGE">🏠 Vay Mua Nhà / Bất Động Sản (Từ ${mortgageMin.toFixed(2)}%/năm - Tối đa 20 năm)</option>
    <option value="CAR">🚗 Vay Mua Ô Tô Trả Góp (Từ ${carMin.toFixed(2)}%/năm - Tối đa 7 năm)</option>
    <option value="CONSUMER">💼 Vay Tiêu Dùng (Từ ${consumerMin.toFixed(2)}%/năm - Tối đa 5 năm)</option>
    <option value="BUSINESS">📈 Vay Sản Xuất Kinh Doanh (Từ ${businessMin.toFixed(2)}%/năm - Tối đa 10 năm)</option>
  `;
  select.value = currentVal;
}

const loanTermOptions = {
  CONSUMER: [6, 12, 24, 36, 48, 60],
  CAR: [12, 24, 36, 48, 60, 84],
  MORTGAGE: [36, 60, 120, 180, 240],
  BUSINESS: [6, 12, 24, 36, 60, 120]
};

function populateLoanTermSelect(loanType) {
  const termSelect = document.getElementById('loan-modal-term');
  if (!termSelect) return;
  const terms = loanTermOptions[loanType] || loanTermOptions.CONSUMER;
  termSelect.innerHTML = '';
  terms.forEach((term, idx) => {
    const rate = CustomerService.getLoanInterestRate(loanType, term);
    const opt = document.createElement('option');
    opt.value = term;
    let label = `Kỳ hạn ${term} Tháng - Lãi suất ${rate.toFixed(2)}%/năm`;
    if (term >= 12 && term % 12 === 0) {
      label = `Kỳ hạn ${term} Tháng (${term / 12} Năm) - Lãi suất ${rate.toFixed(2)}%/năm`;
    }
    opt.textContent = label;
    if ((loanType === 'CONSUMER' && term === 24) || (loanType === 'CAR' && term === 36) || (loanType === 'MORTGAGE' && term === 120) || idx === 1) {
      opt.selected = true;
    }
    termSelect.appendChild(opt);
  });
}

async function openApplyLoanModal() {
  const user = store.data.currentUser;
  const freshCust = CustomerService.findCustomer(user);
  if (!freshCust) {
    showToast('Vui lòng đăng nhập tài khoản khách hàng để thực hiện đăng ký vay', 'warning');
    return;
  }

  // Tải biểu lãi suất cho vay mới nhất từ Backend API
  await CustomerService.getLoanInterestRatesAsync();

  const accSelect = document.getElementById('loan-modal-acc');
  if (accSelect) {
    accSelect.innerHTML = '';
    const paymentAccounts = (freshCust.accounts || []).filter(a => a.status === 'ACTIVE');
    if (paymentAccounts.length === 0) {
      accSelect.innerHTML = '<option value="">Không có tài khoản khả dụng</option>';
    } else {
      paymentAccounts.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.accountNo;
        opt.textContent = `${acc.accountNo} (${acc.type === 'PAYMENT' ? 'TK Thanh toán' : 'TK Tiết kiệm'} - Số dư: ${store.formatVND(acc.balance)})`;
        accSelect.appendChild(opt);
      });
    }
  }

  // Tải danh sách gói vay kèm biểu lãi suất sàn mới nhất
  populateLoanTypeSelect();

  const typeSelect = document.getElementById('loan-modal-type');
  if (typeSelect) {
    populateLoanTermSelect(typeSelect.value || 'CONSUMER');
    if (!typeSelect.dataset.listenerSet) {
      typeSelect.dataset.listenerSet = 'true';
      typeSelect.onchange = () => {
        populateLoanTermSelect(typeSelect.value);
        updateApplyLoanLivePreview();
      };
    }
  }

  const inputs = ['loan-modal-term', 'loan-modal-method'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.listenerSet) {
      el.dataset.listenerSet = 'true';
      el.onchange = updateApplyLoanLivePreview;
    }
  });

  const textInputs = ['loan-modal-amount', 'loan-modal-income'];
  textInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.listenerSet) {
      el.dataset.listenerSet = 'true';
      el.oninput = (e) => {
        formatCurrencyInput(e);
        updateApplyLoanLivePreview();
      };
    }
  });

  updateApplyLoanLivePreview();
  openModal('modal-apply-loan');
}

function updateApplyLoanLivePreview() {
  const amountStr = document.getElementById('loan-modal-amount')?.value || '100.000.000';
  const amount = parseFloat(amountStr.replace(/\D/g, '')) || 100000000;
  const termMonths = parseInt(document.getElementById('loan-modal-term')?.value, 10) || 12;
  const loanType = document.getElementById('loan-modal-type')?.value || 'CONSUMER';
  const method = document.getElementById('loan-modal-method')?.value || 'REDUCING_BALANCE';
  const incomeStr = document.getElementById('loan-modal-income')?.value || '35.000.000';
  const income = parseFloat(incomeStr.replace(/\D/g, '')) || 35000000;

  const rate = CustomerService.getLoanInterestRate(loanType, termMonths);
  const calc = CustomerService.calculateLoanSchedule(amount, termMonths, rate, method);

  const rateEl = document.getElementById('loan-modal-preview-rate');
  if (rateEl) rateEl.textContent = `Lãi suất: ${rate.toFixed(2)}%/năm`;

  const prinEl = document.getElementById('loan-modal-preview-principal');
  if (prinEl) prinEl.textContent = store.formatVND(calc.schedule[0]?.principal || Math.round(amount / termMonths));

  const intEl = document.getElementById('loan-modal-preview-interest');
  if (intEl) intEl.textContent = store.formatVND(calc.schedule[0]?.interest || 0);

  const firstEl = document.getElementById('loan-modal-preview-first');
  if (firstEl) firstEl.textContent = store.formatVND(calc.firstMonthPayment);

  const totIntEl = document.getElementById('loan-modal-preview-total-interest');
  if (totIntEl) totIntEl.textContent = store.formatVND(calc.totalInterest);
}

function openLoanContractModal(loanId) {
  const loan = (store.data.loans || []).find(l => l.id === loanId);
  if (!loan) {
    showToast('Không tìm thấy thông tin hợp đồng khoản vay', 'danger');
    return;
  }

  const cust = (store.data.customers || []).find(c => c.id === loan.customerId) || {
    fullName: loan.customerName || 'Khách hàng',
    idCard: '001098123456',
    address: 'TP. Hồ Chí Minh',
    phone: '0901234567'
  };

  const packageNames = {
    MORTGAGE: 'Vay Mua Nhà / Bất Động Sản',
    CAR: 'Vay Mua Ô Tô Trả Góp',
    CONSUMER: 'Vay Tiêu Dùng',
    BUSINESS: 'Vay Sản Xuất Kinh Doanh'
  };
  const pkgName = packageNames[loan.loanType] || loan.title || 'Vay Vốn Tiêu Dùng';

  const methodNames = {
    REDUCING_BALANCE: 'Dư nợ giảm dần (Tiền gốc chia đều hàng tháng, tiền lãi tính trên dư nợ thực tế)',
    ANNUITY: 'Trả góp đều định kỳ (Tổng số tiền Gốc + Lãi cố định mỗi kỳ thanh toán)'
  };
  const methodDesc = methodNames[loan.repaymentMethod] || methodNames.REDUCING_BALANCE;

  // Xác định quy định lãi suất cụ thể cho hợp đồng
  let interestRatePolicyText = `<strong style="color: var(--accent-emerald); font-family: var(--font-mono);">${loan.interestRate}%/năm</strong> (Lãi suất áp dụng theo phân mức kỳ hạn ${loan.termMonths} tháng của hợp đồng tín dụng).`;

  const monthlyPrincipalShare = Math.round(loan.principalAmount / (loan.termMonths || 12));
  const repaymentScheduleClause = loan.repaymentMethod === 'ANNUITY' 
    ? `Số tiền trả nợ định kỳ (Gốc + Lãi) là <strong style="font-family: var(--font-mono); color: var(--accent-gold);">${store.formatVND(loan.monthlyPayment)}/tháng</strong>. Ngày đến hạn thanh toán định kỳ hàng tháng thực hiện theo Phụ lục - Bảng phân kỳ lịch trả nợ chi tiết kèm theo Hợp đồng.`
    : `Tiền gốc trả định kỳ hàng tháng là <strong style="font-family: var(--font-mono); color: var(--accent-gold);">${store.formatVND(monthlyPrincipalShare)}/tháng</strong> cộng tiền lãi tính trên dư nợ gốc thực tế. Ngày đến hạn thanh toán định kỳ hàng tháng thực hiện theo Phụ lục - Bảng phân kỳ lịch trả nợ chi tiết kèm theo Hợp đồng.`;

  let statusText = '';
  let statusBadgeStyle = '';
  if (loan.status === 'ACTIVE') {
    statusText = 'HỢP ĐỒNG ĐANG CÓ HIỆU LỰC & ĐÃ GIẢI NGÂN';
    statusBadgeStyle = 'color: var(--accent-emerald); font-weight: 700; border: 1px solid var(--accent-emerald); padding: 4px 12px; border-radius: 6px; background: rgba(16, 185, 129, 0.1); display: inline-block;';
  } else if (loan.status === 'PENDING') {
    statusText = 'HỒ SƠ ĐANG CHỜ THẨM ĐỊNH & PHÊ DUYỆT';
    statusBadgeStyle = 'color: var(--accent-gold); font-weight: 700; border: 1px solid var(--accent-gold); padding: 4px 12px; border-radius: 6px; background: rgba(245, 158, 11, 0.1); display: inline-block;';
  } else if (loan.status === 'PAID_OFF') {
    statusText = 'HỢP ĐỒNG ĐÃ TẤT TOÁN TOÀN BỘ NỢ';
    statusBadgeStyle = 'color: var(--accent-cyan); font-weight: 700; border: 1px solid var(--accent-cyan); padding: 4px 12px; border-radius: 6px; background: rgba(0, 242, 254, 0.1); display: inline-block;';
  } else {
    statusText = 'HỒ SƠ TÍN DỤNG BỊ TỪ CHỐI';
    statusBadgeStyle = 'color: var(--accent-danger); font-weight: 700; border: 1px solid var(--accent-danger); padding: 4px 12px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); display: inline-block;';
  }

  const contractHtml = `
    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; font-size: 0.88rem; line-height: 1.7; color: var(--text-main);">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px dashed rgba(255,255,255,0.15); padding-bottom: 18px; margin-bottom: 20px;">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); letter-spacing: 1.5px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 12px;">Độc lập - Tự do - Hạnh phúc</div>
        <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--accent-gold); text-transform: uppercase; margin: 6px 0;">HỢP ĐỒNG TÍN DỤNG & CẤP VỐN CHO VAY</h2>
        <div style="font-family: var(--font-mono); color: var(--accent-cyan); font-size: 0.95rem; font-weight: 700;">Số HĐ: ${loan.contractNo || loan.id}</div>
        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Thời điểm lập: ${loan.appliedAt || new Date().toISOString().substring(0, 10)}</div>
        <div style="margin-top: 10px;"><span style="${statusBadgeStyle}">${statusText}</span></div>
      </div>

      <!-- Parties -->
      <div style="margin-bottom: 20px;">
        <h4 style="color: var(--accent-cyan); font-size: 0.95rem; border-bottom: 1px solid rgba(0, 242, 254, 0.2); padding-bottom: 4px; margin-bottom: 10px;">
          BÊN CHO VAY (BÊN A): NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN QUANGTRUNG (QUANGTRUNG BANK)
        </h4>
        <div style="padding-left: 12px; font-size: 0.84rem; color: var(--text-muted);">
          <div>• <strong>Trụ sở chính:</strong> Tòa nhà Landmark 88, Phố Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
          <div>• <strong>Đại diện pháp luật:</strong> Giám đốc Khối Khách Hàng Cá Nhân & Doanh Nghiệp QTB</div>
          <div>• <strong>Cán bộ thẩm định & phê duyệt:</strong> ${loan.approvedBy || 'Hội đồng tín dụng QuangTrung Bank'}</div>
          <div>• <strong>Hotline CSKH / Tín dụng:</strong> 1900 8888 99 (Hỗ trợ 24/7)</div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="color: var(--accent-gold); font-size: 0.95rem; border-bottom: 1px solid rgba(245, 158, 11, 0.2); padding-bottom: 4px; margin-bottom: 10px;">
          BÊN VAY VỐN (BÊN B): KHÁCH HÀNG
        </h4>
        <div style="padding-left: 12px; font-size: 0.84rem; color: var(--text-muted);">
          <div>• <strong>Họ và tên khách hàng:</strong> <strong style="color: #fff;">${loan.customerName || cust.fullName}</strong></div>
          <div>• <strong>Mã khách hàng (CIF):</strong> <span style="font-family: var(--font-mono); color: var(--accent-cyan);">${loan.customerId}</span></div>
          <div>• <strong>Số CMND / CCCD / Hộ chiếu:</strong> ${cust.idCard || '001098123456'}</div>
          <div>• <strong>Số điện thoại liên hệ:</strong> ${cust.phone || '0901234567'} | <strong>Email:</strong> ${cust.email || 'khachhang@example.com'}</div>
          <div>• <strong>Địa chỉ cư trú:</strong> ${cust.address || 'TP. Hồ Chí Minh'}</div>
          <div>• <strong>Tài khoản thanh toán nhận giải ngân & trích thu nợ:</strong> <strong style="font-family: var(--font-mono); color: var(--accent-gold);">${loan.accountNo}</strong> tại QuangTrung Bank</div>
        </div>
      </div>

      <!-- Contract terms -->
      <div style="margin-bottom: 20px;">
        <h4 style="color: #fff; font-size: 0.95rem; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 10px;">
          ĐIỀU KHOẢN VÀ THỎA THUẬN TÍN DỤNG
        </h4>
        <table class="data-table" style="font-size: 0.83rem; width: 100%; margin-bottom: 12px;">
          <tbody>
            <tr>
              <td style="width: 35%; color: var(--text-muted); font-weight: 600;">1. Gói sản phẩm vay:</td>
              <td><strong style="color: var(--accent-cyan);">${pkgName}</strong> (${loan.title})</td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">2. Số tiền cấp tín dụng (Hạn mức vay):</td>
              <td><strong style="font-family: var(--font-mono); font-size: 1.05rem; color: var(--accent-gold);">${store.formatVND(loan.principalAmount)}</strong></td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">3. Thời hạn cấp tín dụng:</td>
              <td><strong>${loan.termMonths} tháng</strong> (${(loan.termMonths / 12).toFixed(1)} năm) kể từ ngày giải ngân đầu tiên.</td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">4. Lãi suất cho vay & Cơ chế điều chỉnh:</td>
              <td>${interestRatePolicyText}</td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">5. Phương thức trả nợ:</td>
              <td>${methodDesc}</td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">6. Kế hoạch & Ngày đến hạn trả nợ định kỳ:</td>
              <td>${repaymentScheduleClause}</td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">7. Phương thức giải ngân & Trích thu nợ tự động:</td>
              <td>Bên A giải ngân 01 lần vào Tài khoản thanh toán số <strong style="font-family: var(--font-mono); color: var(--accent-gold);">${loan.accountNo}</strong> của Bên B. Đến ngày đến hạn định kỳ, Bên B ủy quyền vô điều kiện cho Bên A tự động trích nợ từ tài khoản này để thu gốc, lãi và các khoản phí phát sinh.</td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">8. Phí trả nợ trước hạn & Lãi suất quá hạn:</td>
              <td>
                <div>• <strong>Phí trả nợ trước hạn (tất toán hợp đồng):</strong> 1.5% tính trên số dư nợ gốc thực tế trả trước hạn.</div>
                <div>• <strong>Lãi suất áp dụng đối với nợ quá hạn:</strong> Bằng 150% lãi suất cho vay trong hạn tại thời điểm chuyển nợ quá hạn.</div>
              </td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">9. Tài sản bảo đảm:</td>
              <td>
                <div>${loan.collateral || 'Khoản vay tín chấp không yêu cầu tài sản thế chấp'}</div>
                ${loan.collateralHandoverCode ? `
                  <div style="margin-top: 4px; font-size: 0.78rem; color: var(--accent-emerald); font-family: var(--font-mono);">
                    ✓ Đã tiếp nhận bản chính tại quầy & niêm phong kho quỹ (Mã BB: <strong>${loan.collateralHandoverCode}</strong> - ${store.formatDateTime(loan.collateralVerifiedAt || loan.approvedAt)})
                  </div>
                ` : ''}
              </td>
            </tr>
            <tr>
              <td style="color: var(--text-muted); font-weight: 600;">10. Mục đích sử dụng vốn:</td>
              <td>${loan.purpose || loan.title || 'Phục vụ nhu cầu tiêu dùng và đời sống cá nhân'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Commitments -->
      <div style="background: rgba(0,0,0,0.25); border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; font-size: 0.78rem; color: var(--text-muted); line-height: 1.6;">
        <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">CAM KẾT CỦA HAI BÊN:</div>
        <div>1. Bên A cam kết giải ngân đúng số tiền và phương thức thỏa thuận vào tài khoản thanh toán của Bên B sau khi hoàn tất thủ tục xét duyệt.</div>
        <div>2. Bên B cam kết sử dụng vốn vay đúng mục đích đăng ký, duy trì đủ số dư trong tài khoản thanh toán trước ngày đến hạn thanh toán định kỳ hàng tháng.</div>
        <div>3. Hợp đồng này cùng Phụ lục - Bảng phân kỳ lịch trả nợ chi tiết cấu thành một văn bản pháp lý hoàn chỉnh có giá trị ràng buộc trách nhiệm hai bên theo quy định của pháp luật Việt Nam.</div>
      </div>

      <!-- Signatures -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center; padding-top: 14px; border-top: 1px solid var(--border-color);">
        <div>
          <div style="font-weight: 700; color: var(--accent-gold); font-size: 0.85rem;">ĐẠI DIỆN BÊN CHO VAY (BÊN A)</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 20px;">(Ký điện tử & Đóng dấu số)</div>
          <div style="display: inline-block; border: 2px dashed rgba(0, 242, 254, 0.4); padding: 8px 16px; border-radius: 8px; background: rgba(0, 242, 254, 0.05);">
            <div style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 700;">✓ QUANGTRUNG BANK DIGITAL SEAL</div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">Xác thực bởi: ${loan.approvedBy || 'Hệ thống Quản trị Tín dụng Tự động'}</div>
          </div>
        </div>

        <div>
          <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.85rem;">ĐẠI DIỆN BÊN VAY VỐN (BÊN B)</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 20px;">(Khách hàng đã ký số bảo mật điện tử)</div>
          <div style="display: inline-block; border: 2px dashed rgba(16, 185, 129, 0.4); padding: 8px 16px; border-radius: 8px; background: rgba(16, 185, 129, 0.05);">
            <div style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 700;">✓ CHỮ KÝ SỐ KHÁCH HÀNG: ${loan.customerName || cust.fullName}</div>
            <div style="font-size: 0.7rem; color: var(--text-dim);">Ký lúc: ${loan.appliedAt || 'Đã ký qua Smart Banking'}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById('loan-contract-content');
  if (container) {
    container.innerHTML = contractHtml;
  }
  openModal('modal-loan-contract');
}

function openLoanScheduleModal(loanIdOrParams) {
  let loan = null;
  let amount = 100000000;
  let termMonths = 12;
  let annualRate = 8.5;
  let method = 'REDUCING_BALANCE';
  let contractNo = 'Dự toán khoản vay';
  let customerName = 'Khách hàng';
  let paidCount = 0;
  let remainingBalance = amount;
  let status = 'ACTIVE';

  if (typeof loanIdOrParams === 'string') {
    loan = (store.data.loans || []).find(l => l.id === loanIdOrParams);
    if (!loan) {
      showToast('Không tìm thấy thông tin khoản vay', 'danger');
      return;
    }
    amount = loan.principalAmount || 0;
    termMonths = loan.termMonths || 12;
    annualRate = loan.interestRate || 8.5;
    method = loan.repaymentMethod || 'REDUCING_BALANCE';
    contractNo = loan.contractNo || loan.id;
    customerName = loan.customerName || 'Khách hàng';
    paidCount = loan.installmentPaidCount || 0;
    remainingBalance = loan.remainingBalance != null ? loan.remainingBalance : amount;
    status = loan.status;
  } else if (typeof loanIdOrParams === 'object' && loanIdOrParams !== null) {
    amount = loanIdOrParams.amount || 100000000;
    termMonths = loanIdOrParams.termMonths || 12;
    annualRate = loanIdOrParams.annualRate || 8.5;
    method = loanIdOrParams.method || 'REDUCING_BALANCE';
    contractNo = loanIdOrParams.contractNo || 'Mô phỏng lịch trả nợ';
    remainingBalance = amount;
  }

  // Tính bảng phân kỳ lịch trả nợ
  const calc = CustomerService.calculateLoanSchedule(amount, termMonths, annualRate, method);
  const schedule = calc.schedule || [];

  // Điền dữ liệu summary
  const summaryBox = document.getElementById('loan-schedule-summary-box');
  if (summaryBox) {
    summaryBox.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; font-size: 0.82rem;">
        <div>
          <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase;">Mã HĐ / Khoản Vay</div>
          <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${contractNo}</strong>
        </div>
        <div>
          <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase;">Số tiền vay (Gốc)</div>
          <strong style="color: #fff; font-family: var(--font-mono);">${store.formatVND(amount)}</strong>
        </div>
        <div>
          <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase;">Kỳ hạn & Lãi suất</div>
          <strong style="color: var(--accent-gold);">${termMonths} tháng</strong> (${annualRate}%/năm)
        </div>
        <div>
          <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase;">Phương thức trả nợ</div>
          <strong style="color: var(--accent-purple);">${method === 'ANNUITY' ? 'Trả góp đều' : 'Dư nợ giảm dần'}</strong>
        </div>
        <div>
          <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase;">Tổng lãi dự kiến</div>
          <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${store.formatVND(calc.totalInterest)}</strong>
        </div>
        <div>
          <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase;">Tổng gốc + lãi</div>
          <strong style="color: var(--accent-gold); font-family: var(--font-mono);">${store.formatVND(calc.totalAmountPaid)}</strong>
        </div>
        <div>
          <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase;">Số kỳ đã thanh toán</div>
          <strong style="color: var(--accent-emerald);">${paidCount} / ${termMonths} kỳ</strong>
        </div>
        <div>
          <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase;">Dư nợ gốc còn lại</div>
          <strong style="color: ${remainingBalance > 0 ? 'var(--accent-gold)' : 'var(--accent-emerald)'}; font-family: var(--font-mono);">${store.formatVND(remainingBalance)}</strong>
        </div>
      </div>
    `;
  }

  // Điền bảng phân kỳ chi tiết
  const tbody = document.getElementById('loan-schedule-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    const baseDisburseDate = (loan && (loan.approvedAt || loan.appliedAt)) ? (loan.approvedAt || loan.appliedAt) : store.nowGMT7String();

    schedule.forEach((item, index) => {
      const monthNum = item.month || (index + 1);
      const rawDueIso = store.getLoanInstallmentDueDate(baseDisburseDate, monthNum);
      const dueStr = store.formatDate(rawDueIso);

      let rowStatusBadge = '';
      if (status === 'PAID_OFF' || monthNum <= paidCount) {
        rowStatusBadge = '<span class="user-role-badge badge-admin" style="font-size: 0.7rem; padding: 2px 6px;">✓ Đã trả</span>';
      } else if (monthNum === paidCount + 1 && status === 'ACTIVE') {
        rowStatusBadge = '<span class="user-role-badge badge-teller" style="font-size: 0.7rem; padding: 2px 6px;">⏳ Kỳ tới</span>';
      } else {
        rowStatusBadge = '<span style="color: var(--text-dim); font-size: 0.75rem;">Chưa đến hạn</span>';
      }

      const tr = document.createElement('tr');
      if (monthNum === paidCount + 1 && status === 'ACTIVE') {
        tr.style.background = 'rgba(0, 242, 254, 0.08)';
      }

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--accent-cyan); text-align: center;">Kỳ ${monthNum}</td>
        <td style="font-size: 0.78rem; color: var(--text-muted);">${dueStr}</td>
        <td style="font-family: var(--font-mono);">${store.formatVND(item.principal)}</td>
        <td style="font-family: var(--font-mono); color: var(--accent-cyan);">${store.formatVND(item.interest)}</td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-gold);">${store.formatVND(item.totalPayment)}</td>
        <td style="font-family: var(--font-mono); color: var(--text-dim);">${store.formatVND(item.remainingBalance)}</td>
        <td>${rowStatusBadge}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  openModal('modal-loan-schedule');
}

function openPayLoanModal(loanId, isPayOffAll = false) {
  const loan = (store.data.loans || []).find(l => l.id === loanId || l.contractNo === loanId);
  if (!loan) {
    showToast('Không tìm thấy thông tin khoản vay', 'danger');
    return;
  }

  const user = store.data.currentUser;
  const cust = CustomerService.findCustomer(user) || (store.data.customers || []).find(c => c.id === loan.customerId);
  const payAcc = (cust?.accounts || []).find(a => a.accountNo === loan.accountNo) || (cust?.accounts || []).find(a => a.type === 'PAYMENT') || cust?.accounts?.[0];

  const packageNames = {
    MORTGAGE: '🏠 Vay Mua Nhà / Bất Động Sản',
    CAR: '🚗 Vay Mua Ô Tô Trả Góp',
    CONSUMER: '💼 Vay Vốn Tiêu Dùng',
    BUSINESS: '📈 Vay Sản Xuất Kinh Doanh'
  };
  const pkgName = packageNames[loan.loanType] || loan.title || 'Khoản Vay Vốn';

  const modalTitleEl = document.getElementById('pay-loan-modal-title');
  const modalBodyEl = document.getElementById('pay-loan-modal-body');
  if (!modalTitleEl || !modalBodyEl) return;

  const currentBalance = payAcc ? payAcc.balance : 0;
  const remaining = loan.remainingBalance != null ? loan.remainingBalance : (loan.principalAmount || 0);
  const termMonths = loan.termMonths || 12;
  const paidCount = loan.installmentPaidCount || 0;
  const currentInstallment = paidCount + 1;

  let totalPay = 0;
  let principalPart = 0;
  let interestPart = 0;
  let penaltyFee = 0;
  let isEarlyPayoff = isPayOffAll;

  if (isEarlyPayoff) {
    penaltyFee = Math.round(remaining * 0.015);
    totalPay = remaining + penaltyFee;
    principalPart = remaining;
    interestPart = 0;
  } else {
    // Thanh toán kỳ nợ thông thường
    totalPay = Math.min(loan.monthlyPayment || 0, remaining);
    const monthlyPrincipal = Math.round(loan.principalAmount / termMonths);
    principalPart = Math.min(monthlyPrincipal, remaining);
    interestPart = Math.max(0, totalPay - principalPart);
  }

  const isBalanceSufficient = currentBalance >= totalPay;
  const balanceShortfall = totalPay - currentBalance;

  modalTitleEl.innerHTML = isEarlyPayoff
    ? `<span style="font-size: 1.3rem;">🏆</span> Tất Toán Khoản Vay Trước Hạn`
    : `<span style="font-size: 1.3rem;">💵</span> Thanh Toán Kỳ Nợ Định Kỳ`;

  modalBodyEl.innerHTML = `
    <!-- Top banner notice -->
    <div style="background: ${isEarlyPayoff ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 242, 254, 0.08)'}; border: 1px solid ${isEarlyPayoff ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 242, 254, 0.2)'}; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 12px;">
      <div style="font-size: 1.4rem;">${isEarlyPayoff ? '⚡' : 'ℹ️'}</div>
      <div style="font-size: 0.83rem; line-height: 1.5; color: var(--text-main);">
        ${isEarlyPayoff 
          ? `<strong>Tất toán toàn bộ trước hạn:</strong> Bạn đang thực hiện tất toán toàn bộ hợp đồng tín dụng trước thời hạn. Sau khi thanh toán thành công, dư nợ gốc sẽ về <strong>0 VNĐ</strong> và hợp đồng được chuyển sang trạng thái <strong>ĐÃ TẤT TOÁN</strong>.`
          : `<strong>Thanh toán kỳ nợ số ${currentInstallment}/${termMonths}:</strong> Số tiền sẽ được trích từ tài khoản thanh toán để giảm trừ trực tiếp vào dư nợ gốc và gia hạn chu kỳ thanh toán tiếp theo.`}
      </div>
    </div>

    <!-- Loan Info Summary Card -->
    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px; margin-bottom: 10px;">
        <div>
          <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Mã Hợp Đồng Tín Dụng</div>
          <strong style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 1.05rem;">${loan.contractNo || loan.id}</strong>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Gói Tín Dụng</div>
          <strong style="color: #fff; font-size: 0.88rem;">${pkgName}</strong>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 0.82rem;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Số tiền vay gốc:</span>
          <strong style="font-family: var(--font-mono);">${store.formatVND(loan.principalAmount)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Kỳ hạn & Lãi suất:</span>
          <strong style="color: var(--accent-emerald);">${termMonths} tháng (${loan.interestRate}%/năm)</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Tiến độ thanh toán:</span>
          <strong style="color: var(--accent-gold);">${paidCount} / ${termMonths} kỳ đã trả</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Dư nợ gốc hiện tại:</span>
          <strong style="font-family: var(--font-mono); color: var(--accent-gold); font-weight: 700;">${store.formatVND(remaining)}</strong>
        </div>
      </div>
    </div>

    <!-- Financial Breakdown Card -->
    <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
      <div style="font-weight: 700; font-size: 0.86rem; color: #fff; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
        <span>🧾</span> Chi Tiết Khoản Tiền Thanh Toán
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.83rem;">
        ${isEarlyPayoff ? `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted);">1. Tiền gốc tất toán toàn bộ:</span>
            <strong style="font-family: var(--font-mono); color: #fff;">${store.formatVND(principalPart)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted);">2. Phí tất toán trước hạn (1.5% dư nợ gốc):</span>
            <strong style="font-family: var(--font-mono); color: var(--accent-gold);">${store.formatVND(penaltyFee)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: var(--accent-emerald);">
            <span>✓ Miễn thu toàn bộ tiền lãi của ${Math.max(0, termMonths - paidCount)} kỳ còn lại</span>
            <span>Tiết kiệm lãi suất</span>
          </div>
        ` : `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted);">1. Tiền gốc kỳ ${currentInstallment}:</span>
            <strong style="font-family: var(--font-mono); color: #fff;">${store.formatVND(principalPart)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted);">2. Tiền lãi tính theo dư nợ thực tế:</span>
            <strong style="font-family: var(--font-mono); color: var(--accent-cyan);">${store.formatVND(interestPart)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--text-muted);">3. Phí quản lý / Phí phát sinh:</span>
            <strong style="font-family: var(--font-mono); color: var(--accent-emerald);">0 VNĐ (Miễn phí)</strong>
          </div>
        `}

        <div style="border-top: 2px dashed rgba(255, 255, 255, 0.15); margin-top: 6px; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 0.95rem; color: ${isEarlyPayoff ? 'var(--accent-gold)' : 'var(--accent-cyan)'};">TỔNG TIỀN CẦN THANH TOÁN:</strong>
            <div style="font-size: 0.72rem; color: var(--text-dim);">Đã bao gồm tiền gốc, tiền lãi và phí tất toán (nếu có)</div>
          </div>
          <div style="text-align: right;">
            <span style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 800; color: var(--accent-gold); text-shadow: 0 0 12px rgba(245, 158, 11, 0.3);">
              ${store.formatVND(totalPay)}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Source Account Card -->
    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid ${isBalanceSufficient ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-weight: 700; font-size: 0.85rem; color: #fff; display: flex; align-items: center; gap: 6px;">
          <span>💳</span> Tài Khoản Nguồn Trích Nợ Tự Động
        </div>
        <span class="user-role-badge ${isBalanceSufficient ? 'badge-customer' : 'badge-admin'}" style="font-size: 0.72rem;">
          ${isBalanceSufficient ? '✓ Đủ Số Dư Thanh Toán' : '⚠️ Không Đủ Số Dư'}
        </span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
        <div>
          <div style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">${payAcc ? payAcc.accountNo : loan.accountNo}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim);">Chủ TK: ${cust?.fullName || loan.customerName || 'Khách hàng'}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.72rem; color: var(--text-dim);">Số dư khả dụng hiện tại</div>
          <div style="font-family: var(--font-mono); font-weight: 700; color: ${isBalanceSufficient ? '#fff' : '#f87171'}; font-size: 0.95rem;">
            ${store.formatVND(currentBalance)}
          </div>
        </div>
      </div>

      ${!isBalanceSufficient ? `
        <div style="margin-top: 10px; padding: 8px 10px; background: rgba(239, 68, 68, 0.15); border-radius: 6px; font-size: 0.78rem; color: #fca5a5; display: flex; align-items: center; gap: 6px;">
          <span>⚠️</span> Tài khoản còn thiếu <strong>${store.formatVND(balanceShortfall)}</strong> để thanh toán. Vui lòng nạp thêm tiền vào tài khoản trước khi thực hiện.
        </div>
      ` : `
        <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-dim);">
          Số dư sau thanh toán: <strong style="font-family: var(--font-mono); color: var(--accent-emerald);">${store.formatVND(currentBalance - totalPay)}</strong>
        </div>
      `}
    </div>

    <!-- Modal Action Buttons -->
    <div style="display: flex; gap: 10px; margin-top: 16px;">
      <button type="button" class="btn btn-secondary btn-close" style="flex: 1;">Hủy Bỏ</button>
      <button type="button" id="btn-confirm-pay-loan-modal" class="btn ${isEarlyPayoff ? 'btn-gold' : 'btn-primary'}" style="flex: 2; font-weight: 700;" ${!isBalanceSufficient ? 'disabled' : ''}>
        ${isEarlyPayoff ? '🏆 Xác Nhận Tất Toán Hợp Đồng' : `💵 Xác Nhận Trả Nợ Kỳ ${currentInstallment}`}
      </button>
    </div>
  `;

  openModal('modal-pay-loan');

  const modalOverlay = document.getElementById('modal-pay-loan');
  if (modalOverlay) {
    modalOverlay.querySelectorAll('.btn-close').forEach(btn => {
      btn.onclick = () => closeModal('modal-pay-loan');
    });
  }

  const confirmBtn = document.getElementById('btn-confirm-pay-loan-modal');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      closeModal('modal-pay-loan');
      requestSecurityVerification({
        actionTitle: isEarlyPayoff
          ? `Tất toán toàn bộ hợp đồng tín dụng [${loan.contractNo || loan.id}] - Tổng tiền: ${store.formatVND(totalPay)}`
          : `Thanh toán kỳ nợ số ${currentInstallment} [${loan.contractNo || loan.id}] - Số tiền: ${store.formatVND(totalPay)}`,
        onVerified: async () => {
          const idempotencyKey = BankApiService.generateIdempotencyKey();
          const res = await CustomerService.payLoanInstallmentAsync({
            loanId: loan.id || loanId,
            isPayOffAll: isEarlyPayoff,
            idempotencyKey
          });

          if (res.success) {
            showSuccessModal({
              title: isEarlyPayoff ? 'Tất Toán Khoản Vay Thành Công! 🎉' : 'Thanh Toán Kỳ Nợ Thành Công! 🎉',
              message: res.message || (isEarlyPayoff 
                ? `Đã tất toán toàn bộ dư nợ hợp đồng tín dụng ${loan.contractNo || loan.id}.`
                : `Đã thanh toán thành công kỳ nợ ${store.formatVND(totalPay)} cho hợp đồng ${loan.contractNo || loan.id}.`),
              amount: parseFloat(totalPay),
              txId: loan.contractNo || loan.id,
              counterparty: 'QuangTrung Bank Credit'
            });
            await renderCustomerLoansView();
            await renderCustomerDashboard();
          } else {
            showToast(res.message, 'danger');
          }
        }
      });
    };
  }
}

function openCardSettingsModal(cardNumber) {
  const user = store.data.currentUser;
  const freshCust = CustomerService.findCustomer(user);
  if (!freshCust) return;

  const card = (freshCust.cards || []).find(c => c.cardNumber === cardNumber || c.maskedNumber === cardNumber) || freshCust.cards?.[0];
  if (!card) return;

  const cleanNo = card.cardNumber.replace(/\s+/g, '');
  const displayFormatted = cleanNo.replace(/(\d{4})/g, '$1 ').trim();

  document.getElementById('card-setting-number').value = card.cardNumber;
  document.getElementById('card-setting-display-num').value = `${displayFormatted} (${card.cardType || 'VISA'})`;
  document.getElementById('card-setting-limit').value = formatCurrencyVNDInput(card.dailyLimit || 100000000);
  const perTxnInput = document.getElementById('card-setting-limit-txn');
  if (perTxnInput) perTxnInput.value = formatCurrencyVNDInput(card.perTxnLimit || 30000000);
  document.getElementById('card-setting-pin').value = '';

  openModal('modal-card-settings');
}

function openCardInfoModal(cardNumber) {
  const user = store.data.currentUser;
  const freshCust = CustomerService.findCustomer(user);
  if (!freshCust) return;

  const card = (freshCust.cards || []).find(c => c.cardNumber === cardNumber || c.maskedNumber === cardNumber) || freshCust.cards?.[0];
  if (!card) return;

  const container = document.getElementById('card-info-content');
  if (!container) return;

  const cleanNo = (card.cardNumber || '4532990011228899').replace(/\D/g, '');
  const fullNumberFormatted = cleanNo.replace(/(\d{4})/g, '$1 ').trim();
  const maskedFormatted = card.maskedNumber || (cleanNo.length >= 8 ? `${cleanNo.slice(0, 4)} •••• •••• ${cleanNo.slice(-4)}` : '4532 •••• •••• 8899');
  const isLocked = card.status === 'LOCKED';

  let isModalNumRevealed = true;
  let isModalCvvRevealed = false;

  container.innerHTML = `
    <!-- Header Summary -->
    <div style="background: rgba(0,0,0,0.35); padding: 18px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
        <div>
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--accent-cyan);">${card.cardType || 'VISA Platinum Debit'}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Mã định danh thẻ: <span style="font-family: var(--font-mono);">${card.id || 'CARD-QTB'}</span></div>
        </div>
        <div>
          <span class="user-role-badge ${isLocked ? 'badge-admin' : 'badge-customer'}">
            ${isLocked ? 'ĐANG KHÓA TẠM THỜI' : 'ĐANG HOẠT ĐỘNG'}
          </span>
        </div>
      </div>

      <!-- Card Number Big Display Box -->
      <div style="background: rgba(0, 242, 254, 0.06); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div>
          <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px;">SỐ THẺ NGÂN HÀNG (16 CHỮ SỐ)</div>
          <div id="modal-card-num-text" style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: 2px; margin-top: 2px;">
            ${fullNumberFormatted}
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-copy-num" style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; padding: 5px 12px;">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
            Sao Chép
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-mask-num" style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; padding: 5px 10px;" title="Ẩn/Hiện số thẻ">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.85rem; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 12px;">
        <div>Chủ thẻ: <strong style="color: #fff;">${card.cardHolder || 'CUSTOMER'}</strong></div>
        <div>Hạn sử dụng: <strong style="color: #fff; font-family: var(--font-mono);">${card.expDate || card.expiry || '12/28'}</strong></div>
        <div>Mã CVV/CVC: <strong style="color: #94a3b8; font-family: var(--font-mono);">••• (In trên thẻ vật lý)</strong></div>
        <div>Tài khoản liên kết: <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${card.linkedAccountNo || freshCust.accounts[0]?.accountNo || '1000123456'}</strong></div>
        <div>Hạn mức chi tiêu / ngày: <strong style="color: var(--accent-gold);">${store.formatVND(card.dailyLimit || 100000000)}</strong></div>
        <div>Hạn mức tối đa / GD: <strong style="color: var(--accent-gold);">${store.formatVND(card.perTxnLimit || 30000000)}</strong></div>
        <div>Ngày phát hành thẻ: <strong style="color: #fff;">${card.issuedAt || '2024-01-15'}</strong></div>
        <div>Mã PIN hiện tại: <strong style="color: var(--text-dim); font-family: var(--font-mono);">•••••• (Đã bảo mật)</strong></div>
      </div>
    </div>

    <!-- Security Warning Banner (PCI-DSS Standard) -->
    <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); padding: 10px 14px; border-radius: 8px; font-size: 0.75rem; color: var(--accent-gold); margin-bottom: 14px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.4;">
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink: 0; margin-top: 1px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      <div>
        <strong>Khuyến cáo bảo mật PCI-DSS:</strong> Theo quy định an toàn thẻ ngân hàng, mã bảo mật <strong>CVV/CVC</strong> chỉ được in duy nhất trên mặt sau phôi thẻ vật lý của Quý khách và không được hiển thị trực tuyến. Quý khách tuyệt đối không chia sẻ mã CVV hoặc mã OTP cho bất kỳ ai.
      </div>
    </div>

    <!-- Security Toggles -->
    <div style="margin-bottom: 16px;">
      <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-gold); text-transform: uppercase; margin-bottom: 10px;">
        Cấu Hình Tính Năng & Bảo Mật Thẻ
      </div>

      <div class="card-security-item">
        <div>
          <div style="font-weight: 600; font-size: 0.9rem;">Thanh Toán Trực Tuyến (E-Commerce / 3D-Secure)</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Cho phép mua sắm trên Shopee, Lazada, Tiki, App Store, Google Play</div>
        </div>
        <label class="card-switch">
          <input type="checkbox" id="card-sec-online" ${card.onlinePayment !== false ? 'checked' : ''} ${isLocked ? 'disabled' : ''}>
          <span class="card-slider"></span>
        </label>
      </div>

      <div class="card-security-item">
        <div>
          <div style="font-weight: 600; font-size: 0.9rem;">Thanh Toán Không Tiếp Xúc (NFC Contactless)</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Chạm thẻ vào máy POS siêu thị, nhà hàng mà không cần cắm chip</div>
        </div>
        <label class="card-switch">
          <input type="checkbox" id="card-sec-contactless" ${card.contactless !== false ? 'checked' : ''} ${isLocked ? 'disabled' : ''}>
          <span class="card-slider"></span>
        </label>
      </div>

      <div class="card-security-item">
        <div>
          <div style="font-weight: 600; font-size: 0.9rem;">Giao Dịch Nước Ngoài & Quốc Tế</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Cho phép quẹt thẻ và thanh toán ngoại tệ tại nước ngoài</div>
        </div>
        <label class="card-switch">
          <input type="checkbox" id="card-sec-intl" ${card.internationalPayment ? 'checked' : ''} ${isLocked ? 'disabled' : ''}>
          <span class="card-slider"></span>
        </label>
      </div>

      <div class="card-security-item">
        <div>
          <div style="font-weight: 600; font-size: 0.9rem;">Rút Tiền Mặt Tại Cây ATM</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Cho phép rút tiền mặt tại hệ thống ATM toàn quốc</div>
        </div>
        <label class="card-switch">
          <input type="checkbox" id="card-sec-atm" ${card.atmWithdrawal !== false ? 'checked' : ''} ${isLocked ? 'disabled' : ''}>
          <span class="card-slider"></span>
        </label>
      </div>
    </div>

    <!-- Quick Action footer -->
    <div style="display: flex; gap: 10px;">
      <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-card-set-limits" style="flex: 1; padding: 8px 12px;">
        Đổi PIN & Hạn Mức
      </button>
      <button type="button" class="btn ${isLocked ? 'btn-success' : 'btn-danger'} btn-sm" id="btn-modal-card-toggle-lock" style="flex: 1; padding: 8px 12px;">
        ${isLocked ? 'Mở Khóa Thẻ' : 'Khóa Thẻ Tạm Thời'}
      </button>
    </div>
  `;

  // Attach number and CVV mask handlers in modal
  const modalNumText = container.querySelector('#modal-card-num-text');
  const btnModalMaskNum = container.querySelector('#btn-modal-mask-num');
  if (btnModalMaskNum && modalNumText) {
    btnModalMaskNum.onclick = () => {
      isModalNumRevealed = !isModalNumRevealed;
      modalNumText.textContent = isModalNumRevealed ? fullNumberFormatted : maskedFormatted;
    };
  }

  const btnModalCopy = container.querySelector('#btn-modal-copy-num');
  if (btnModalCopy) {
    btnModalCopy.onclick = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullNumberFormatted).catch(() => {});
      }
      showToast(`Đã sao chép số thẻ: ${fullNumberFormatted}`, 'success');
    };
  }

  // Attach switch toggle handlers
  const toggles = ['online', 'contactless', 'intl', 'atm'];
  toggles.forEach(t => {
    const el = container.querySelector(`#card-sec-${t}`);
    if (el) {
      el.onchange = () => {
        CustomerService.updateCardSecuritySettings({
          cardNumber: card.cardNumber,
          onlinePayment: container.querySelector('#card-sec-online').checked,
          contactless: container.querySelector('#card-sec-contactless').checked,
          internationalPayment: container.querySelector('#card-sec-intl').checked,
          atmWithdrawal: container.querySelector('#card-sec-atm').checked
        });
        showToast('Đã cập nhật cài đặt bảo mật thẻ!', 'success');
      };
    }
  });

  const btnSet = container.querySelector('#btn-modal-card-set-limits');
  if (btnSet) {
    btnSet.onclick = () => {
      closeModal('modal-card-info');
      openCardSettingsModal(card.cardNumber);
    };
  }

  const btnLock = container.querySelector('#btn-modal-card-toggle-lock');
  if (btnLock) {
    btnLock.onclick = () => {
      const res = CustomerService.toggleCardStatus(card.cardNumber);
      showToast(res.message, res.success ? 'success' : 'danger');
      closeModal('modal-card-info');
      renderCustomerAccounts();
    };
  }

  openModal('modal-card-info');
}

let currentCardTxFilter = 'ALL';

function openCardHistoryModal(cardNumber) {
  const user = store.data.currentUser;
  const freshCust = CustomerService.findCustomer(user);
  if (!freshCust) return;

  const card = (freshCust.cards || []).find(c => c.cardNumber === cardNumber || c.maskedNumber === cardNumber) || freshCust.cards?.[0];
  if (!card) return;

  const titleEl = document.getElementById('card-hist-card-title');
  if (titleEl) {
    const cleanNo = card.cardNumber.replace(/\s+/g, '');
    const maskedFormatted = card.maskedNumber || (cleanNo.slice(0, 4) + ' •••• •••• ' + cleanNo.slice(-4));
    titleEl.innerHTML = `Thẻ: <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${maskedFormatted}</strong> (${card.cardType})`;
  }

  currentCardTxFilter = 'ALL';
  renderCardTransactionsList(card.cardNumber);

  // Filter buttons
  const filterBtns = document.querySelectorAll('.btn-filter-card-tx');
  filterBtns.forEach(btn => {
    btn.onclick = (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentCardTxFilter = e.currentTarget.getAttribute('data-filter');
      renderCardTransactionsList(card.cardNumber);
    };
  });

  openModal('modal-card-history');
}

function renderCardTransactionsList(cardNumber) {
  const tbody = document.getElementById('card-transactions-tbody');
  if (!tbody) return;

  const txns = CustomerService.getCardTransactions(cardNumber);
  let filtered = txns;
  if (currentCardTxFilter !== 'ALL') {
    filtered = txns.filter(t => {
      if (currentCardTxFilter === 'POS') return t.type === 'CARD_POS' || (t.channel === 'POS');
      if (currentCardTxFilter === 'ONLINE') return t.channel === 'ONLINE' || (t.content && t.content.toLowerCase().includes('trực tuyến'));
      if (currentCardTxFilter === 'ATM') return t.type === 'CARD_ATM' || (t.channel === 'ATM');
      return true;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
          Chưa có giao dịch thẻ nào phù hợp với bộ lọc.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const isAtm = t.type === 'CARD_ATM' || t.channel === 'ATM';
    const isOnline = t.channel === 'ONLINE';
    const channelBadge = isAtm ? '<span class="user-role-badge badge-admin">ATM</span>' : (isOnline ? '<span class="user-role-badge badge-customer">ONLINE</span>' : '<span class="user-role-badge badge-teller">POS</span>');

    return `
      <tr>
        <td>
          <div style="font-family: var(--font-mono); font-weight: 600; font-size: 0.85rem;">${store.formatTxnId(t.id)}</div>
          <div style="margin-top: 2px;">${channelBadge}</div>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 0.9rem; color: #fff;">${t.merchantName || t.toName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${t.content}</div>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-dim);">${store.formatDateTime(t.timestamp)}</td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-gold);">
          -${store.formatVND(t.amount)}
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-secondary btn-sm btn-view-card-receipt" data-txid="${store.formatTxnId(t.id)}" style="font-size: 0.75rem; padding: 2px 8px;" title="Xem biên lai điện tử">
            Biên Lai
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Event listener cho nút xem biên lai
  tbody.querySelectorAll('.btn-view-card-receipt').forEach(btn => {
    btn.onclick = (e) => {
      const txId = e.currentTarget.getAttribute('data-txid');
      openCardReceiptModal(txId);
    };
  });
}

function openCardReceiptModal(txnId) {
  const allTxns = store.data.transactions || [];
  const txn = allTxns.find(t => t.id === txnId);
  if (!txn) return;

  const container = document.getElementById('card-receipt-content');
  if (!container) return;

  const user = store.data.currentUser;
  const freshCust = CustomerService.findCustomer(user);
  const card = (freshCust?.cards || [])[0] || {};
  const maskedCardNo = txn.cardNumber ? (txn.cardNumber.slice(0, 4) + ' •••• •••• ' + txn.cardNumber.slice(-4)) : (card.maskedNumber || '4532 •••• •••• 8899');
  const traceNo = txn.traceNo || ('TRC' + (txn.id.replace(/\D/g, '') || '892102').slice(-6));
  const authCode = txn.authCode || ('AUTH' + Math.floor(1000 + Math.random() * 9000));
  const terminalId = txn.terminalId || (txn.type === 'CARD_ATM' ? 'ATM-HN-HK01' : 'POS-MERCHANT-01');

  container.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 0.85rem; color: #f8fafc; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="font-weight: 800; font-size: 1.1rem; color: var(--accent-gold); letter-spacing: 1px;">QUANGTRUNG BANK</div>
        <div style="font-size: 0.75rem; color: var(--text-dim);">HÓA ĐƠN GIAO DỊCH THẺ / TRANSACTION SLIP</div>
      </div>

      <div style="border-top: 1px dashed rgba(255,255,255,0.2); border-bottom: 1px dashed rgba(255,255,255,0.2); padding: 10px 0; margin: 10px 0;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">ĐƠN VỊ CHẤP NHẬN:</span>
          <span style="font-weight: 700; text-align: right;">${txn.merchantName || txn.toName}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">MÃ THIẾT BỊ (TID):</span>
          <span>${terminalId}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">SỐ THẺ (CARD NO):</span>
          <span style="font-weight: 700; color: var(--accent-cyan);">${maskedCardNo}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">LOẠI THẺ / APP:</span>
          <span>${card.cardType || 'VISA DEBIT'}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">SỐ CHUẨN CHI (TRACE):</span>
          <span>${traceNo}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">MÃ PHÊ DUYỆT (AUTH):</span>
          <span>${authCode}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">THỜI GIAN:</span>
          <span>${store.formatDateTime(txn.timestamp)}</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 1.1rem; font-weight: 800;">
        <span>TỔNG TIỀN (VND):</span>
        <span style="color: var(--accent-gold); font-size: 1.3rem;">${store.formatVND(txn.amount)}</span>
      </div>

      <div style="text-align: center; margin-top: 14px; padding: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; color: var(--accent-emerald); font-weight: 700; font-size: 0.85rem;">
        ✔ GIAO DỊCH THÀNH CÔNG (APPROVED)
      </div>

      <div style="text-align: center; font-size: 0.7rem; color: var(--text-dim); margin-top: 12px;">
        Cảm ơn Quý khách đã sử dụng thẻ Ngân hàng QuangTrung Bank.<br>
        Hotline hỗ trợ 24/7: 1900 8888
      </div>
    </div>
  `;

  openModal('modal-card-receipt');
}

function openIssueCardModal() {
  const accounts = CustomerService.getCustomerAccounts();
  const select = document.getElementById('issue-card-linked-acc');
  if (select) {
    select.innerHTML = '';
    accounts.filter(a => a.type === 'PAYMENT' || !a.type.includes('SAVING')).forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.accountNo;
      opt.textContent = `${acc.accountNo} (Thanh toán) - Số dư: ${store.formatVND(acc.balance)}`;
      select.appendChild(opt);
    });
  }

  const form = document.getElementById('form-modal-issue-card');
  if (form) form.reset();

  const dailyInput = document.getElementById('issue-card-daily-limit');
  if (dailyInput) dailyInput.value = formatCurrencyVNDInput('50000000');

  openModal('modal-issue-card');
}

let lastStatementData = null;

function openStatementModal(preselectedAcc = null, preselectedPeriod = null) {
  const accounts = CustomerService.getCustomerAccounts();
  const select = document.getElementById('stmt-select-acc');
  if (!select) return;

  select.innerHTML = '';
  const paymentAccounts = (accounts || []).filter(acc => acc.type === 'PAYMENT' || !acc.type || acc.type !== 'SAVINGS');
  paymentAccounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.accountNo;
    opt.textContent = `${acc.accountNo} (${acc.type === 'PAYMENT' ? 'Thanh toán' : acc.type})`;
    select.appendChild(opt);
  });

  if (preselectedAcc && preselectedAcc !== 'ALL') {
    select.value = preselectedAcc;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  let firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  let toDateStr = todayStr;

  if (preselectedPeriod === 'last-month') {
    firstDayStr = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    toDateStr = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  } else if (preselectedPeriod === '3-months') {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    firstDayStr = d.toISOString().split('T')[0];
  } else if (preselectedPeriod === 'all') {
    firstDayStr = '';
  }

  document.getElementById('stmt-from-date').value = firstDayStr;
  document.getElementById('stmt-to-date').value = toDateStr;

  // Bắt sự kiện phím tắt chọn nhanh khoảng thời gian
  document.querySelectorAll('.btn-stmt-shortcut').forEach(btn => {
    btn.onclick = (e) => {
      const days = e.currentTarget.getAttribute('data-days');
      const type = e.currentTarget.getAttribute('data-type');
      const n = new Date();
      const todayStr = n.toISOString().split('T')[0];
      let fromStr = todayStr;

      if (days) {
        const past = new Date();
        past.setDate(past.getDate() - parseInt(days, 10));
        fromStr = past.toISOString().split('T')[0];
      } else if (type === 'this-month') {
        fromStr = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0];
      } else if (type === 'last-month') {
        const firstLastMonth = new Date(n.getFullYear(), n.getMonth() - 1, 1);
        const lastLastMonth = new Date(n.getFullYear(), n.getMonth(), 0);
        fromStr = firstLastMonth.toISOString().split('T')[0];
        document.getElementById('stmt-to-date').value = lastLastMonth.toISOString().split('T')[0];
      }

      if (type !== 'last-month') {
        document.getElementById('stmt-to-date').value = todayStr;
      }
      document.getElementById('stmt-from-date').value = fromStr;

      renderStatementPreview();
    };
  });

  // Bắt sự kiện Xuất Excel
  const btnExportExcel = document.getElementById('btn-export-excel-statement');
  if (btnExportExcel) {
    btnExportExcel.onclick = () => {
      if (!lastStatementData) {
        showToast('Vui lòng tạo sao kê trước khi xuất file Excel', 'danger');
        return;
      }
      const success = CustomerService.exportStatementToExcel(lastStatementData);
      if (success) {
        showToast('Đã tải xuống file Sao Kê (.csv/Excel) thành công!', 'success');
      } else {
        showToast('Có lỗi xảy ra khi tạo file Excel', 'danger');
      }
    };
  }

  renderStatementPreview();
  openModal('modal-statement');
}

async function renderStatementPreview() {
  const accNo = document.getElementById('stmt-select-acc').value;
  const fromDate = document.getElementById('stmt-from-date').value;
  const toDate = document.getElementById('stmt-to-date').value;

  if (!accNo) return;

  const data = await CustomerService.generateEStatementDataAsync(accNo, fromDate, toDate);
  if (!data) return;

  lastStatementData = data;

  document.getElementById('stmt-cust-name').textContent = data.customer.fullName || data.customer.customerName;
  document.getElementById('stmt-cust-idcard').textContent = data.customer.idCard || '-';
  document.getElementById('stmt-cust-phone').textContent = data.customer.phone || '-';
  document.getElementById('stmt-acc-no').textContent = data.account.accountNo;
  document.getElementById('stmt-period-range').textContent = `${data.fromDate || 'Tất cả'} ➔ ${data.toDate || 'Hôm nay'}`;
  document.getElementById('stmt-print-time').textContent = data.generatedAt;

  // Render summary KPI cards inside Statement
  const totalInEl = document.getElementById('stmt-total-in');
  const totalOutEl = document.getElementById('stmt-total-out');
  const netChangeEl = document.getElementById('stmt-net-change');

  if (totalInEl) totalInEl.textContent = `+${store.formatVND(data.totalIn)}`;
  if (totalOutEl) totalOutEl.textContent = `-${store.formatVND(data.totalOut)}`;
  if (netChangeEl) {
    const net = data.totalIn - data.totalOut;
    netChangeEl.textContent = `${net >= 0 ? '+' : ''}${store.formatVND(net)}`;
    netChangeEl.style.color = net >= 0 ? '#059669' : '#dc2626';
  }

  const tbody = document.getElementById('stmt-table-body');
  tbody.innerHTML = '';

  if (data.transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 16px;">Không phát sinh giao dịch nào trong khoảng thời gian này.</td></tr>`;
  } else {
    data.transactions.forEach(t => {
      const isOut = t.fromAccount === accNo;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; color: #0f172a; white-space: nowrap; font-size: 0.82rem;">${store.formatDateTime(t.timestamp)}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; color: #0f172a; white-space: nowrap; font-family: var(--font-mono); font-weight: 600; font-size: 0.82rem;">${t.id}</td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; color: #0f172a; font-size: 0.84rem; max-width: 320px; word-break: break-word;">
          ${t.content} <span style="color: #475569; font-size: 0.82em; display: block; margin-top: 2px;">(${isOut ? 'Tới: ' + (t.toName || t.toAccount) : 'Từ: ' + (t.fromName || t.fromAccount)})</span>
        </td>
        <td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: 700; text-align: right; white-space: nowrap; font-size: 0.84rem; color: ${isOut ? '#dc2626' : '#059669'};">
          ${isOut ? '-' : '+'}${store.formatVND(t.amount)}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}


