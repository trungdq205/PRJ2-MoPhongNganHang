/**
 * Phân hệ Báo cáo & Vẽ biểu đồ Thống kê (Reports Module)
 * Sử dụng font chữ Be Vietnam Pro & Inter đồng bộ cho tiếng Việt chuẩn nét.
 */
import { AdminService } from './admin.js';
import { store } from './store.js';

const VIETNAMESE_FONT = "'Be Vietnam Pro', 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

export class ReportService {
  static renderAdminCharts(liquidityCanvasId, transactionCanvasId, customMetrics = null) {
    if (typeof Chart === 'undefined') {
      console.warn('Thư viện Chart.js CDN chưa được tải');
      return;
    }

    // Cấu hình font chữ mặc định cho toàn bộ Chart.js
    Chart.defaults.font.family = VIETNAMESE_FONT;

    const metrics = customMetrics || AdminService.getSystemMetrics();

    // Biểu đồ 1: Cơ cấu Thanh khoản
    const ctx1 = document.getElementById(liquidityCanvasId);
    if (ctx1) {
      if (window.liquidityChartInstance) {
        window.liquidityChartInstance.destroy();
      }
      const totalLiq = (metrics.totalDeposits + metrics.totalSavings) || 1;
      window.liquidityChartInstance = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: ['Tài khoản thanh toán (VNĐ)', 'Tiền gửi tiết kiệm (VNĐ)'],
          datasets: [{
            data: [metrics.totalDeposits, metrics.totalSavings],
            backgroundColor: ['#00f2fe', '#f59e0b'],
            borderColor: '#111827',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { 
                color: '#94a3b8', 
                font: { family: VIETNAMESE_FONT, size: 12, weight: '500' },
                padding: 16
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const val = context.parsed || 0;
                  const pct = ((val / totalLiq) * 100).toFixed(1);
                  return ` ${context.label}: ${store.formatVND(val)} (${pct}%)`;
                }
              }
            },
            title: {
              display: true,
              text: `Cơ cấu Thanh khoản (Tổng: ${store.formatVND(metrics.totalLiquidity)})`,
              color: '#f8fafc',
              font: { family: VIETNAMESE_FONT, size: 15, weight: '700' },
              padding: { top: 10, bottom: 16 }
            }
          }
        }
      });
    }

    // Biểu đồ 2: Phân loại Giao dịch
    const ctx2 = document.getElementById(transactionCanvasId);
    if (ctx2) {
      const typeCounts = metrics.transactionTypeCounts || { TRANSFER: 0, DEPOSIT: 0, WITHDRAW: 0 };
      if (!metrics.transactionTypeCounts) {
        (store.data.transactions || []).forEach(t => {
          const tp = t.type || 'TRANSFER';
          typeCounts[tp] = (typeCounts[tp] || 0) + 1;
        });
      }

      if (window.transactionChartInstance) {
        window.transactionChartInstance.destroy();
      }
      window.transactionChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: ['Chuyển tiền', 'Nạp tiền', 'Rút tiền'],
          datasets: [{
            label: 'Số lượng giao dịch',
            data: [typeCounts.TRANSFER || 0, typeCounts.DEPOSIT || 0, typeCounts.WITHDRAW || 0],
            backgroundColor: ['#4facfe', '#10b981', '#ef4444'],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Thống kê Loại giao dịch',
              color: '#f8fafc',
              font: { family: VIETNAMESE_FONT, size: 16, weight: '700' },
              padding: { top: 10, bottom: 20 }
            }
          },
          scales: {
            x: { 
              ticks: { color: '#94a3b8', font: { family: VIETNAMESE_FONT, size: 12 } }, 
              grid: { display: false } 
            },
            y: { 
              ticks: { color: '#94a3b8', stepSize: 1, font: { family: VIETNAMESE_FONT, size: 12 } }, 
              grid: { color: 'rgba(255,255,255,0.05)' } 
            }
          }
        }
      });
    }
  }

  /**
   * Phân loại giao dịch dựa trên từ khóa nội dung và loại giao dịch
   */
  static categorizeTransaction(t) {
    const content = (t.content || '').toLowerCase();
    const toAcc = (t.toAccount || '').toLowerCase();

    if (content.includes('tiet kiem') || content.includes('tiết kiệm') || toAcc.startsWith('stk-')) {
      return { id: 'SAVINGS', name: 'Tiết kiệm & Đầu tư', icon: '🏦', color: '#f59e0b' };
    }
    if (content.includes('hoa don') || content.includes('hóa đơn') || content.includes('dien') || content.includes('điện') || content.includes('nuoc') || content.includes('nước') || content.includes('internet') || content.includes('hoc phi') || content.includes('học phí')) {
      return { id: 'BILL', name: 'Thanh toán hóa đơn', icon: '💡', color: '#ec4899' };
    }
    if (content.includes('atm') || content.includes('rut tien') || content.includes('rút tiền')) {
      return { id: 'ATM', name: 'Rút tiền mặt ATM', icon: '🏧', color: '#10b981' };
    }
    if (content.includes('winmart') || content.includes('shopee') || content.includes('lazada') || content.includes('tiki') || content.includes('sieu thi') || content.includes('siêu thị') || content.includes('mua sam') || content.includes('mua sắm')) {
      return { id: 'SHOPPING', name: 'Mua sắm & Siêu thị', icon: '🛒', color: '#8b5cf6' };
    }
    if (content.includes('grab') || content.includes('food') || content.includes('coffee') || content.includes('cafe') || content.includes('cà phê') || content.includes('nha hang') || content.includes('nhà hàng') || content.includes('an uong') || content.includes('phim')) {
      return { id: 'FOOD', name: 'Ăn uống & Giải trí', icon: '🍔', color: '#ef4444' };
    }
    if (t.type === 'TRANSFER') {
      return { id: 'TRANSFER', name: 'Chuyển tiền cá nhân', icon: '💳', color: '#3b82f6' };
    }
    return { id: 'OTHER', name: 'Chi tiêu khác', icon: '📁', color: '#64748b' };
  }

  /**
   * Vẽ biểu đồ phân tích chi tiêu cá nhân theo danh mục và thời gian cho Khách hàng
   */
  static renderSpendAnalyticsChart(doughnutCanvasId, barCanvasId, transactions, accountNo, period = 'this-month') {
    if (typeof Chart === 'undefined') return null;
    Chart.defaults.font.family = VIETNAMESE_FONT;

    let filteredTxns = (transactions || []).filter(t => t.fromAccount === accountNo || t.toAccount === accountNo);

    // Lọc theo khoảng thời gian
    const now = new Date();
    if (period === 'this-month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
      filteredTxns = filteredTxns.filter(t => (t.timestamp || '').substring(0, 10) >= firstDay);
    } else if (period === 'last-month') {
      const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 10);
      const lastLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().substring(0, 10);
      filteredTxns = filteredTxns.filter(t => {
        const d = (t.timestamp || '').substring(0, 10);
        return d >= firstLastMonth && d <= lastLastMonth;
      });
    } else if (period === '3-months') {
      const past3M = new Date();
      past3M.setDate(past3M.getDate() - 90);
      const past3MStr = past3M.toISOString().substring(0, 10);
      filteredTxns = filteredTxns.filter(t => (t.timestamp || '').substring(0, 10) >= past3MStr);
    }

    // Phân tách Thu nhập (+) và Chi tiêu (-)
    const inTxns = filteredTxns.filter(t => t.toAccount === accountNo);
    const outTxns = filteredTxns.filter(t => t.fromAccount === accountNo);

    const totalIn = inTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOut = outTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const netChange = totalIn - totalOut;

    // Gom nhóm chi tiêu theo danh mục
    const catMap = {
      TRANSFER: { id: 'TRANSFER', name: 'Chuyển tiền cá nhân', icon: '💳', color: '#3b82f6', amount: 0, count: 0 },
      BILL: { id: 'BILL', name: 'Thanh toán hóa đơn', icon: '💡', color: '#ec4899', amount: 0, count: 0 },
      SAVINGS: { id: 'SAVINGS', name: 'Tiết kiệm & Đầu tư', icon: '🏦', color: '#f59e0b', amount: 0, count: 0 },
      ATM: { id: 'ATM', name: 'Rút tiền mặt ATM', icon: '🏧', color: '#10b981', amount: 0, count: 0 },
      SHOPPING: { id: 'SHOPPING', name: 'Mua sắm & Siêu thị', icon: '🛒', color: '#8b5cf6', amount: 0, count: 0 },
      FOOD: { id: 'FOOD', name: 'Ăn uống & Giải trí', icon: '🍔', color: '#ef4444', amount: 0, count: 0 },
      OTHER: { id: 'OTHER', name: 'Chi tiêu khác', icon: '📁', color: '#64748b', amount: 0, count: 0 }
    };

    outTxns.forEach(t => {
      const cat = ReportService.categorizeTransaction(t);
      if (catMap[cat.id]) {
        catMap[cat.id].amount += (t.amount || 0);
        catMap[cat.id].count += 1;
      }
    });

    const activeCategories = Object.values(catMap).filter(c => c.amount > 0);
    activeCategories.sort((a, b) => b.amount - a.amount);

    const topCategory = activeCategories.length > 0 ? activeCategories[0] : null;

    // ── Biểu đồ 1: Doughnut Chart Cơ Cấu Tỷ Trọng Danh Mục ──────────────
    const ctx1 = document.getElementById(doughnutCanvasId);
    if (ctx1) {
      if (window.spendAnalyticsChartInstance) {
        window.spendAnalyticsChartInstance.destroy();
      }

      const hasData = totalOut > 0;

      window.spendAnalyticsChartInstance = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: hasData 
            ? activeCategories.map(c => `${c.icon} ${c.name}`) 
            : ['Chưa có dữ liệu chi tiêu'],
          datasets: [{
            data: hasData 
              ? activeCategories.map(c => c.amount) 
              : [1],
            backgroundColor: hasData 
              ? activeCategories.map(c => c.color) 
              : ['#334155'],
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { family: VIETNAMESE_FONT, size: 11, weight: '500' } }
            },
            title: {
              display: true,
              text: 'Cơ Cấu Chi Tiêu Theo Danh Mục',
              color: '#f8fafc',
              font: { family: VIETNAMESE_FONT, size: 14, weight: '700' }
            }
          }
        }
      });
    }

    // ── Biểu đồ 2: Bar Chart Diễn Biến Thu Nhập (+) vs Chi Tiêu (-) ─────
    const ctx2 = document.getElementById(barCanvasId);
    if (ctx2) {
      if (window.spendBarChartInstance) {
        window.spendBarChartInstance.destroy();
      }

      window.spendBarChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: ['Tổng Tiền Vào (+)', 'Tổng Tiền Ra (-)'],
          datasets: [{
            label: 'Số tiền (VNĐ)',
            data: [totalIn, totalOut],
            backgroundColor: ['#10b981', '#ef4444'],
            borderRadius: 8,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'So Sánh Tổng Dòng Tiền Thu vs Chi',
              color: '#f8fafc',
              font: { family: VIETNAMESE_FONT, size: 14, weight: '700' }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { family: VIETNAMESE_FONT, size: 12 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { family: VIETNAMESE_FONT, size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    return {
      categories: activeCategories,
      totalIn,
      totalOut,
      netChange,
      topCategory
    };
  }
}

