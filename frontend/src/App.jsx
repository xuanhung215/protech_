// App.jsx – Ứng dụng chính, quản lý routing và state toàn cục


import { useState, useEffect } from "react";

import Navbar  from "./components/Navbar";
import Footer  from "./components/Footer";
import Toast   from "./components/Toast";
import BackButton from "./components/BackButton";

import HomePage          from "./pages/HomePage";
import ProductListPage   from "./pages/ProductListPage";   
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage          from "./pages/CartPage";
import CheckoutPage      from "./pages/CheckoutPage";       
import OrderPage         from "./pages/OrderPage";          
import OrderDetailPage   from "./pages/OrderDetailPage";    
import AboutPage         from "./pages/AboutPage";
import ContactPage       from "./pages/ContactPage";
import LoginPage         from "./pages/LoginPage";
import RegisterPage      from "./pages/RegisterPage";
import ProfilePage       from "./pages/ProfilePage";
import PaymentResultPage from "./pages/PaymentResultPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import DashboardPage     from "./pages/admin/DashboardPage";
import ProductManagePage from "./pages/admin/ProductManagePage";
import OrderManagePage   from "./pages/admin/OrderManagePage";
import UserManagePage    from "./pages/admin/UserManagePage";
import ContactInboxPage  from "./pages/admin/ContactInboxPage";

import "./styles/global.css";
import { transformOrderFromBE } from "./utils/orderHelpers";
import { isLoggedIn } from "./utils/api";

const App = () => {
  // ── Routing ───
  const [currentPage, setCurrentPage]         = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder]     = useState(null);

  // Detect URL path on mount (for direct navigation via redirect links)
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      setCurrentPage("home");
    } else if (path === "/payment-result" || path.startsWith("/payment-result")) {
      setCurrentPage("payment-result");
    } else if (path === "/reset-password" || path.startsWith("/reset-password")) {
      setCurrentPage("reset-password");
    } else if (path === "/login") {
      setCurrentPage("login");
    } else if (path === "/register") {
      setCurrentPage("register");
    } else if (path === "/contact") {
      setCurrentPage("contact");
    } else if (path === "/products") {
      setCurrentPage("products");
    } else if (path === "/about") {
      setCurrentPage("about");
    } else if (path === "/profile") {
      setCurrentPage("profile");
    }
  }, []);

  // ── Navigation History (Back Button) ──────────────
  // Những trang KHÔNG có trong lịch sử back (trang gốc)
  const TOP_LEVEL_PAGES = new Set([
    "home", "products", "about", "contact", "login", "register", "profile",
  ]);
  const [history, setHistory] = useState(["home"]);

  // ── Auth state ──────────────────────────────────────
  // user = null khi chưa đăng nhập
  // user = { id, name, email, phone, role: "user" | "admin" } khi đã đăng nhập
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  // ── Giỏ hàng (Persistent - Lưu vào localStorage riêng theo user) ─────
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      const key = saved ? `cart_${JSON.parse(saved).email}` : "cart";
      const savedCart = localStorage.getItem(key);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  // Sync cart với localStorage CHỈ khi cart thay đổi (KHÔNG phụ thuộc vào user)
  // Lý do: nếu để [cart, user], khi user đổi thì effect này chạy trước effect [user],
  // dẫn đến ghi đè cart=[] vào key mới TRƯỚC khi effect [user] kịp đọc lại từ localStorage.
  useEffect(() => {
    try {
      const key = user ? `cart_${user.email}` : "cart";
      localStorage.setItem(key, JSON.stringify(cart));
    } catch {}
  }, [cart]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync user với localStorage mỗi khi thay đổi
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // ── Đơn hàng – dùng localStorage ────────────────
  const [orders, setOrders] = useState(() => {
    try {
      const user = localStorage.getItem("user");
      const key = user ? `localOrders_${JSON.parse(user).email}` : "localOrders";
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Khi đăng nhập/logout: load đúng cart và orders của user
  useEffect(() => {
    // Load giỏ hàng đúng theo user
    try {
      const cartKey = user ? `cart_${user.email}` : "cart";
      const savedCart = localStorage.getItem(cartKey);
      setCart(savedCart ? JSON.parse(savedCart) : []);
    } catch {
      setCart([]);
    }
    // Load đơn hàng đúng theo user
    try {
      const ordersKey = user ? `localOrders_${user.email}` : "localOrders";
      const savedOrders = localStorage.getItem(ordersKey);
      setOrders(savedOrders ? JSON.parse(savedOrders) : []);
    } catch {
      setOrders([]);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast ─────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: "" });
  const showToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: "" }), 2500);
  };

  // ── Navigate ──────────────────────────────────────
  const [targetCategory, setTargetCategory] = useState(null);

  const navigate = (page, params = {}) => {
    // Push trang hiện tại vào history (nếu không phải trang top-level)
    if (!TOP_LEVEL_PAGES.has(page)) {
      setHistory((prev) => {
        if (prev[prev.length - 1] === currentPage) return prev;
        return [...prev, currentPage];
      });
    } else {
      setHistory(["home"]);
    }

    setCurrentPage(page);
    if (page === "products" && params.categoryId) {
      setTargetCategory(params.categoryId);
    } else if (page === "products") {
      setTargetCategory(null);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Handlers ──────────────────────────────────────
  const handleViewDetail = (product) => { setSelectedProduct(product); navigate("detail"); };
  const handleViewOrder  = (order)   => { setSelectedOrder(transformOrderFromBE(order)); navigate("order-detail"); };

  const handleAddToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      return found
        ? prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { product, qty: 1 }];
    });
    showToast(`✅ Đã thêm "${product.name}" vào giỏ!`);
  };

  const handleUpdateQty = (id, qty) => {
    if (qty <= 0) { handleRemove(id); return; }
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, qty } : i));
  };

  const handleRemove = (id) => {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
    showToast("🗑 Đã xóa sản phẩm khỏi giỏ hàng");
  };

  // Đặt hàng thành công: xóa giỏ, lưu đơn vào orders và localStorage
  const handlePlaceOrder = (order) => {
    // Cập nhật state orders
    setOrders((prev) => {
      const newOrders = [...prev, order];
      // Lưu ngay vào localStorage
      try {
        const key = user ? `localOrders_${user.email}` : "localOrders";
        localStorage.setItem(key, JSON.stringify(newOrders));
      } catch {}
      return newOrders;
    });
    
    // Xóa giỏ hàng và lưu vào localStorage
    setCart([]);
    
    showToast("🎉 Đặt hàng thành công!");
  };

  // Admin cập nhật trạng thái đơn
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    // Đảm bảo trạng thái là chữ thường
    const statusLowerCase = typeof newStatus === 'string' ? newStatus.toLowerCase() : newStatus;
    
    // Cập nhật state và lưu vào localStorage của user hiện tại
    setOrders((prev) => {
      const newOrders = prev.map((o) => o.id === orderId || o.orderCode === orderId ? { ...o, status: statusLowerCase } : o);
      
      // Lưu vào localStorage của user hiện tại
      try {
        const key = user ? `localOrders_${user.email}` : "localOrders";
        localStorage.setItem(key, JSON.stringify(newOrders));
      } catch {}
      
      return newOrders;
    });
    
    // Cập nhật localStorage cho TẤT CẢ user (đảm bảo đồng bộ)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("localOrders_") || key === "localOrders") {
          const userOrders = JSON.parse(localStorage.getItem(key) || "[]");
          let updated = false;
          const newOrders = userOrders.map(o => {
            if (o.id === orderId || o.orderCode === orderId) {
              updated = true;
              return { ...o, status: statusLowerCase };
            }
            return o;
          });
          if (updated) {
            localStorage.setItem(key, JSON.stringify(newOrders));
          }
        }
      }
    } catch (err) {
      console.error("Lỗi cập nhật đơn hàng vào localStorage:", err);
    }
  };

  // [MỚI] Login / Logout
  const handleLogin = (userData) => {
    setUser(userData);
    showToast(`👋 Xin chào, ${userData.name || userData.email}!`);
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
    setOrders([]);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("home");
    showToast("Đã đăng xuất.");
  };

  const goBack = () => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      const newHistory = prev.slice(0, -1);
      const previousPage = newHistory[newHistory.length - 1];
      setCurrentPage(previousPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return newHistory;
    });
  };

  const canGoBack = history.length > 1;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // ── Render page ───────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {

      case "home":
        return <HomePage navigate={navigate} onAddToCart={handleAddToCart} onViewDetail={handleViewDetail} />;

      case "products":
        return <ProductListPage onAddToCart={handleAddToCart} onViewDetail={handleViewDetail} initialCategoryId={targetCategory} />;

      case "detail":
        return (
          <ProductDetailPage
            product={selectedProduct}
            onAddToCart={handleAddToCart}
            onViewDetail={handleViewDetail}
            navigate={navigate}
          />
        );

      case "cart":
        return (
          <CartPage
            cart={cart}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemove}
            navigate={navigate}
          />
        );

      // ── [SỬA] Truyền thêm user + showToast ──────
      case "checkout":
        return (
          <CheckoutPage
            cart={cart}
            user={user}                          // ← THÊM
            onPlaceOrder={handlePlaceOrder}
            navigate={navigate}
            showToast={showToast}                // ← THÊM
          />
        );

      // ── [MỚI] Trang đặt hàng thành công ─────────
      case "order-success":
        return (
          <div className="section" style={{ textAlign: "center", padding: "80px 60px" }}>
            <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: "var(--white)", marginBottom: 12 }}>
              ĐẶT HÀNG THÀNH CÔNG!
            </h1>
            <p style={{ color: "var(--gray)", fontSize: 16, marginBottom: 36 }}>
              Cảm ơn bạn đã mua hàng. Chúng tôi sẽ xử lý đơn sớm nhất.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              {/* Chỉ hiện "Xem đơn hàng" nếu đã đăng nhập */}
              {user && (
                <button className="btn-primary" style={{ padding: "14px 32px" }}
                  onClick={() => navigate("orders")}>
                  Xem đơn hàng
                </button>
              )}
              <button className="btn-outline" style={{ padding: "14px 32px" }}
                onClick={() => navigate("home")}>
                Về trang chủ
              </button>
            </div>
          </div>
        );

      // ── [MỚI] Các trang mới ──────────────────────
      case "orders":
        return (
          <OrderPage
            user={user}
            navigate={navigate}
            onViewOrderDetail={handleViewOrder}
            orders={orders}
          />
        );

      case "order-detail":
        return <OrderDetailPage order={selectedOrder} navigate={navigate} onAddToCart={handleAddToCart} />;

      case "about":
        return <AboutPage navigate={navigate} />;

      case "contact":
        return <ContactPage showToast={showToast} />;

      case "login":
        return <LoginPage onLogin={handleLogin} navigate={navigate} />;

      case "register":
        return <RegisterPage onLogin={handleLogin} navigate={navigate} />;

      case "profile":
        return <ProfilePage navigate={navigate} user={user} />;

      case "payment-result":
        return <PaymentResultPage navigate={navigate} onPlaceOrder={handlePlaceOrder} />;

      case "reset-password":
        return <ResetPasswordPage showToast={showToast} />;

      // ── Admin (guard quyền) ───────────────────────
      case "admin-dashboard":
        if (!user || user.role !== "admin") { navigate("login"); return null; }
        return <DashboardPage orders={orders} navigate={navigate} />;

      case "admin-products":
        if (!user || user.role !== "admin") { navigate("login"); return null; }
        return <ProductManagePage showToast={showToast} />;

      case "admin-orders":
        if (!user || user.role !== "admin") { navigate("login"); return null; }
        return <OrderManagePage orders={orders} onUpdateStatus={handleUpdateOrderStatus} showToast={showToast} />;

      case "admin-users":
        if (!user || user.role !== "admin") { navigate("login"); return null; }
        return <UserManagePage showToast={showToast} navigate={navigate} />;

      case "admin-contact":
        if (!user || user.role !== "admin") { navigate("login"); return null; }
        return <ContactInboxPage showToast={showToast} />;

      default:
        return <HomePage navigate={navigate} onAddToCart={handleAddToCart} onViewDetail={handleViewDetail} />;
      
    }
  };

  const isAdmin = currentPage.startsWith("admin-");

  return (
    <div>
      <BackButton goBack={goBack} canGoBack={canGoBack} />

      {/* [SỬA] Truyền thêm user + onLogout */}
      <Navbar
        currentPage={currentPage}
        navigate={navigate}
        cartCount={cartCount}
        user={user}           // ← THÊM
        onLogout={handleLogout} // ← THÊM
      />

      <main>{renderPage()}</main>

      {!isAdmin && <Footer navigate={navigate} />}

      <Toast message={toast.message} visible={toast.visible} />
      
    </div>
  );
};

export default App;
