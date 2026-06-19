import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { authenticate, requireAdmin } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import * as authRoutes from "./routes/auth";
import * as publicRoutes from "./routes/public";
import * as userRoutes from "./routes/user";
import * as orderRoutes from "./routes/order";
import * as reviewRoutes from "./routes/review";
import * as messageRoutes from "./routes/message";
import * as adminRoutes from "./routes/admin";
import * as dashboardRoutes from "./routes/dashboard";

const app = express();

// Middleware
const allowedOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use("/static", express.static(path.join(__dirname, "../static")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ============================================
// Auth routes (public)
// ============================================
app.post("/api/v1/auth/login", authRoutes.login);
app.post("/api/v1/auth/register", authRoutes.register);
app.post("/api/v1/auth/logout", authRoutes.logout);
app.post("/api/v1/auth/forgot-password", authRoutes.forgotPassword);
app.post("/api/v1/auth/reset-password", authRoutes.resetPassword);

// ============================================
// Public product/category routes
// ============================================
app.get("/api/v1/public/products", publicRoutes.getProducts);
app.get("/api/v1/public/products/:id", publicRoutes.getProductById);
app.get("/api/v1/public/categories", publicRoutes.getCategories);
app.get("/api/v1/products", publicRoutes.getProducts);
app.get("/api/v1/products/:id", publicRoutes.getProductById);
app.get("/api/v1/categories", publicRoutes.getCategories);

// ============================================
// Authenticated user routes
// ============================================
app.get("/api/v1/users/profile", authenticate, userRoutes.getProfile);
app.put("/api/v1/users/profile", authenticate, userRoutes.updateProfile);

// ============================================
// Order routes
// ============================================
app.post("/api/v1/orders/create", authenticate, orderRoutes.createOrder);
app.post("/api/v1/orders/guest", orderRoutes.createGuestOrder);
app.get("/api/v1/orders/my-orders", authenticate, orderRoutes.getMyOrders);
app.put("/api/v1/orders/:id/confirm-payment", authenticate, orderRoutes.confirmPayment);
app.put("/api/v1/admin/order/:id/status", authenticate, requireAdmin, orderRoutes.updateOrderStatus);

// ============================================
// Review routes
// ============================================
app.post("/api/v1/reviews", authenticate, reviewRoutes.createReview);
app.get("/api/v1/reviews/product/:productId", reviewRoutes.getProductReviews as any);
app.get("/api/v1/reviews/my-reviews", authenticate, reviewRoutes.getMyReviews);
app.put("/api/v1/reviews/:reviewId", authenticate, reviewRoutes.updateReview);
app.delete("/api/v1/reviews/:reviewId", authenticate, reviewRoutes.deleteReview);

// ============================================
// Message routes
// ============================================
app.get("/api/v1/messages/my", authenticate, messageRoutes.getMyMessages);
app.post("/api/v1/messages/send", authenticate, messageRoutes.sendMessage);
app.get("/api/v1/messages/admin/all", authenticate, requireAdmin, messageRoutes.getAllMessages);
app.get("/api/v1/messages/admin/:id", authenticate, requireAdmin, messageRoutes.getMessage);
app.post("/api/v1/messages/admin/:id/reply", authenticate, requireAdmin, messageRoutes.replyMessage);
app.post("/api/v1/messages/admin/:id/read", authenticate, requireAdmin, messageRoutes.markAsRead);
app.get("/api/v1/messages/admin/unread-count", authenticate, requireAdmin, messageRoutes.getUnreadCount);

// ============================================
// Banking / payment
// ============================================
app.post("/api/v1/banking/confirm/:orderId", authenticate, orderRoutes.confirmBankingPayment);
app.get("/api/v1/banking/pending-count", authenticate, orderRoutes.getPendingConfirmCount);

// ============================================
// Admin routes (API endpoints)
// ============================================
app.get("/api/v1/admin/user/all", authenticate, requireAdmin, adminRoutes.getAllUsers);
app.post("/api/v1/admin/user/add", authenticate, requireAdmin, adminRoutes.createUser);
app.put("/api/v1/admin/user/:id", authenticate, requireAdmin, adminRoutes.updateUser);
app.delete("/api/v1/admin/user/:id", authenticate, requireAdmin, adminRoutes.deleteUser);

app.get("/api/v1/admin/category/all", authenticate, requireAdmin, adminRoutes.getAllCategoriesAdmin);
app.post("/api/v1/admin/category/add", authenticate, requireAdmin, adminRoutes.createCategory);
app.put("/api/v1/admin/category/:id", authenticate, requireAdmin, adminRoutes.updateCategory);
app.delete("/api/v1/admin/category/:id", authenticate, requireAdmin, adminRoutes.deleteCategory);

app.get("/api/v1/admin/product/all", authenticate, requireAdmin, adminRoutes.getAllProductsAdmin);
app.post("/api/v1/admin/product/add", authenticate, requireAdmin, adminRoutes.createProduct);
app.put("/api/v1/admin/product/:id", authenticate, requireAdmin, adminRoutes.updateProduct);
app.delete("/api/v1/admin/product/:id", authenticate, requireAdmin, adminRoutes.deleteProduct);

app.get("/api/v1/admin/order/all", authenticate, requireAdmin, adminRoutes.getAllOrdersAdmin);
app.get("/api/v1/admin/order/:id", authenticate, requireAdmin, adminRoutes.getOrderByIdAdmin);
app.put("/api/v1/admin/order/:id/status", authenticate, requireAdmin, orderRoutes.updateOrderStatus);

app.get("/api/v1/admin/dashboard/stats", authenticate, requireAdmin, dashboardRoutes.getDashboardStats);

// ============================================
// Admin view routes (EJS templates)
// ============================================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views/admin"));

app.get("/admin", authenticate, requireAdmin, (req: any, res) => {
  res.render("index", { user: req.user });
});
app.get("/admin/login", (req, res) => {
  res.render("login");
});
app.get("/admin/user/list", authenticate, requireAdmin, (req: any, res) => {
  res.render("users/list", { user: req.user });
});
app.get("/admin/product/list", authenticate, requireAdmin, (req: any, res) => {
  res.render("product/list", { user: req.user });
});
app.get("/admin/product/add", authenticate, requireAdmin, (req: any, res) => {
  res.render("product/add", { user: req.user });
});
app.get("/admin/product/category", authenticate, requireAdmin, (req: any, res) => {
  res.render("product/category", { user: req.user });
});
app.get("/admin/order/list", authenticate, requireAdmin, (req: any, res) => {
  res.render("orders/list", { user: req.user });
});
app.get("/admin/order/detail", authenticate, requireAdmin, (req: any, res) => {
  res.render("orders/detail", { user: req.user });
});
app.get("/admin/marketing/discount", authenticate, requireAdmin, (req: any, res) => {
  res.render("marketing/discount", { user: req.user });
});
app.get("/admin/reviews/review", authenticate, requireAdmin, (req: any, res) => {
  res.render("reviews/review", { user: req.user });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
