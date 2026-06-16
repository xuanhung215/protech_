import { useState, useEffect } from "react";

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
};

const STATUS_LIST = [
  { key: "all",            label: "Tất cả"         },
  { key: "pending",        label: "Chờ xác nhận"   },
  { key: "confirmed",      label: "Đã xác nhận"    },
  { key: "delivered",      label: "Đã giao hàng"   },
  { key: "completed",      label: "Hoàn thành"     },
  { key: "cancelled",      label: "Đã hủy"         },
  { key: "pending_confirm", label: "Chờ thanh toán" },
];

const STATUS_NEXT = {
  pending: "confirmed",
  pending_confirm: "confirmed", // Admin confirm banking payment
  confirmed: "delivered",       // Shipper marks as delivered
  delivered: "completed",       // Admin confirms customer received (reduces stock)
};

const STATUS_COLOR = {
  pending:        "#f59e0b",
  confirmed:      "#8b5cf6",    // Purple for confirmed
  delivered:      "#3b82f6",    // Blue for delivered
  completed:      "var(--green)",
  cancelled:      "var(--red)",
  pending_confirm: "#3b82f6", // Blue for banking payment pending
};

const OrderManagePage = ({ onUpdateStatus, showToast }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = () => {
    try {
      setLoading(true);
      // Đọc tất cả đơn hàng từ localStorage (từ tất cả user)
      const allOrders = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("localOrders_")) {
          const userOrders = JSON.parse(localStorage.getItem(key) || "[]");
          allOrders.push(...userOrders);
        }
      }
      // Đọc thêm đơn hàng của guest (nếu có)
      const guestOrders = JSON.parse(localStorage.getItem("localOrders") || "[]");
      allOrders.push(...guestOrders);
      
      setOrders(allOrders);
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
      showToast(`❌ Lỗi tải đơn hàng: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Sắp xếp ưu tiên: pending_confirm lên đầu, sau đó theo thời gian
  const sortedOrders = [...orders].sort((a, b) => {
    // Ưu tiên pending_confirm lên đầu
    if (a.paymentStatus === "pending_confirm" && b.paymentStatus !== "pending_confirm") return -1;
    if (a.paymentStatus !== "pending_confirm" && b.paymentStatus === "pending_confirm") return 1;
    // Sau đó theo thời gian (mới nhất lên đầu)
    return new Date(b.placedAt || b.createdAt) - new Date(a.placedAt || a.createdAt);
  });

  const filtered = sortedOrders.filter((o) => {
    let matchStatus = false;
    if (filter === "all") {
      matchStatus = true;
    } else if (filter === "pending_confirm") {
      matchStatus = o.paymentStatus === "pending_confirm";
    } else if (filter === "pending") {
      matchStatus = o.status === "pending" && o.paymentStatus !== "pending_confirm";
    } else {
      matchStatus = o.status === filter;
    }

    const matchSearch = String(o.orderCode).toLowerCase().includes(search.toLowerCase()) || 
                        (o.info?.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
                        String(o.id).includes(search);
    return matchStatus && matchSearch;
  });

  const countByStatus = (key) => {
    if (key === "all") return orders.length;
    if (key === "pending_confirm") return orders.filter(o => o.paymentStatus === "pending_confirm").length;
    if (key === "pending") return orders.filter(o => o.status === "pending" && o.paymentStatus !== "pending_confirm").length;
    return orders.filter(o => o.status === key).length;
  };

  const handleUpdateStatus = (orderId, statusData) => {
    try {
      // Support both string (backward compatible) and object format
      const data = typeof statusData === 'string' ? { status: statusData.toLowerCase() } : {
        ...statusData,
        status: statusData.status ? statusData.status.toLowerCase() : undefined,
        paymentStatus: statusData.paymentStatus ? statusData.paymentStatus.toLowerCase() : undefined
      };
      
      // Cập nhật đơn hàng trong tất cả các key localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("localOrders_") || key === "localOrders") {
          const userOrders = JSON.parse(localStorage.getItem(key) || "[]");
          let updated = false;
          const newOrders = userOrders.map(o => {
            if (o.id === orderId || o.orderCode === orderId) {
              updated = true;
              return { ...o, ...data };
            }
            return o;
          });
          if (updated) {
            localStorage.setItem(key, JSON.stringify(newOrders));
          }
        }
      }
      
      showToast(`✅ Đã cập nhật trạng thái đơn #${orderId}`);
      if (onUpdateStatus) onUpdateStatus(orderId, data.status || data.paymentStatus);
      fetchOrders(); // Tải lại danh sách
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      showToast(`❌ Lỗi cập nhật trạng thái: ${error.message}`);
    }
  };

  const handleCancel = (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    try {
      handleUpdateStatus(orderId, { status: "cancelled" });
      showToast(`🗑 Đã hủy đơn #${orderId}`);
    } catch (error) {
      console.error("Lỗi hủy đơn:", error);
      showToast(`❌ Lỗi hủy đơn: ${error.message}`);
    }
  };

  return (
    <div className="section">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 2 }}>
          QUẢN LÝ <span style={{ color: "var(--primary)" }}>ĐƠN HÀNG</span>
        </h2>
      </div>

      <div className="order-tabs" style={{ marginBottom: 20 }}>
        {STATUS_LIST.map((tab) => (
          <button key={tab.key} className={`order-tab ${filter === tab.key ? "active" : ""}`}
            onClick={() => setFilter(tab.key)}>
            {tab.label}
            <span style={{ marginLeft: 6, fontSize: 11, background: "var(--dark3)", padding: "2px 7px", borderRadius: 10 }}>
              {countByStatus(tab.key)}
            </span>
          </button>
        ))}
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <span>🔍</span>
          <input className="search-input" placeholder="Tìm theo mã đơn, tên khách..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ color: "var(--gray)", fontSize: 14 }}>
          {filtered.length} đơn hàng
        </span>
      </div>

      {loading ? (
        <div className="empty-state"><h3>Đang tải dữ liệu...</h3></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📭</div><h3>Không có đơn hàng</h3></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((order) => {
            const isExpanded  = expandedId === order.id || expandedId === order.orderCode;
            const nextStatus  = STATUS_NEXT[order.status] || (order.paymentStatus === "pending_confirm" ? "confirmed" : null);
            const statusColor = STATUS_COLOR[order.status] ?? STATUS_COLOR[order.paymentStatus] ?? "var(--gray)";
            const statusLabel = STATUS_LIST.find(s => s.key === order.status)?.label ?? 
                               (order.paymentStatus === "pending_confirm" ? "Chờ thanh toán" : order.status);
            const isPendingConfirm = order.paymentStatus === "pending_confirm";

            return (
              <div key={order.id || order.orderCode} style={{ background: "var(--card-bg)", borderRadius: 14, border: "1px solid #2a2a2a", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 16, padding: "16px 20px", alignItems: "center", cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : (order.id || order.orderCode))}>

                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Mã đơn</div>
                    <div style={{ fontWeight: 700, color: "var(--white)" }}>{order.orderCode}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Khách hàng</div>
                    <div style={{ fontWeight: 700, color: "var(--white)" }}>{order.info?.fullName || "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--gray)" }}>{order.info?.phone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Tổng tiền</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--primary)" }}>{formatPrice(order.total)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 4 }}>Trạng thái</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, border: `1px solid ${statusColor}`, padding: "4px 10px", borderRadius: 6 }}>
                      {statusLabel}
                    </span>
                    {isPendingConfirm && (
                      <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4 }}>
                        💳 Thanh toán chuyển khoản
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 18, color: "var(--gray)" }}>{isExpanded ? "▲" : "▼"}</div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #2a2a2a", padding: "20px 20px" }}>
                    <div style={{ marginBottom: 20 }}>
                      {order.items?.map((item, idx) => (
                        <div key={item.id || item.productId || idx} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                          <span style={{ flex: 1, fontSize: 13, color: "var(--white)" }}>
                            {item.productName} 
                            {item.product?.emoji && <span style={{ marginLeft: 6 }}>{item.product.emoji}</span>}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--gray)" }}>x{item.quantity}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{formatPrice(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>

                    {order.info?.address && (
                      <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 20 }}>
                        📍 {order.info.address}, {order.info.district || ""}, {order.info.city}, {order.info.province || ""}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {/* Nút xác nhận thanh toán cho banking */}
                      {order.paymentStatus === "pending_confirm" && (
                        <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 13, background: "var(--green)" }}
                          onClick={() => handleUpdateStatus(order.id || order.orderCode, { status: "confirmed", paymentStatus: "paid" })}>
                          ✓ Xác nhận thanh toán
                        </button>
                      )}
                      {nextStatus && order.paymentStatus !== "pending_confirm" && (
                        <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}
                          onClick={() => handleUpdateStatus(order.id || order.orderCode, { status: nextStatus })}>
                          {order.status === "confirmed" ? "🚚 Đã giao hàng" : 
                           order.status === "delivered" ? "✓ Xác nhận hoàn thành" : 
                           "✓ Xác nhận đơn hàng"}
                        </button>
                      )}
                      {order.status === "pending" && order.paymentStatus !== "pending_confirm" && (
                        <button className="btn-danger" onClick={() => handleCancel(order.id || order.orderCode)}>Hủy đơn</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderManagePage;
