import { Response } from "express";
import { AppDataSource } from "../config/database";
import { User } from "../entity/User";
import { Category } from "../entity/Category";
import { Product } from "../entity/Product";
import { Order } from "../entity/Order";
import { OrderItem } from "../entity/OrderItem";
import { AuthRequest } from "../middleware/auth";
import bcryptjs from "bcryptjs";

/** Parse param thành số nguyên, trả về null nếu không hợp lệ */
function parseId(param: string | undefined): number | null {
  const n = parseInt(param ?? "", 10);
  return isNaN(n) || n <= 0 ? null : n;
}

// Users
export async function getAllUsers(req: AuthRequest, res: Response): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo
    .createQueryBuilder("user")
    .where("user.deletedAt IS NULL")
    .orderBy("user.createdAt", "DESC")
    .getMany();

  res.json(users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
  })));
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const { fullName, email, phone, role, status, passwordHash } = req.body;

  if (!fullName?.trim() || !email?.trim()) {
    res.status(400).json({ message: "Full name and email are required" });
    return;
  }

  const user = new User();
  user.fullName = fullName.trim();
  user.email = email.trim();
  user.phone = phone?.trim() || undefined;
  user.role = role || "CUSTOMER";
  user.status = status || "ACTIVE";
    user.passwordHash = passwordHash
      ? await bcryptjs.hash(passwordHash, 10)
      : await bcryptjs.hash("Password@123", 10);

  const saved = await userRepo.save(user);
  res.status(201).json({
    id: saved.id,
    fullName: saved.fullName,
    email: saved.email,
    phone: saved.phone,
    role: saved.role,
    status: saved.status,
  });
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ message: "Invalid user ID" }); return; }
  const user = await userRepo.findOne({ where: { id, deletedAt: null as any } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const { fullName, email, phone, role, status, passwordHash } = req.body;
  if (fullName?.trim()) user.fullName = fullName.trim();
  if (email?.trim()) user.email = email.trim();
  if (phone !== undefined) user.phone = phone?.trim() || undefined;
  if (role) user.role = role;
  if (status) user.status = status;
  if (passwordHash?.trim()) user.passwordHash = await bcryptjs.hash(passwordHash, 10);

  const saved = await userRepo.save(user);
  res.json({
    id: saved.id,
    fullName: saved.fullName,
    email: saved.email,
    phone: saved.phone,
    role: saved.role,
    status: saved.status,
  });
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ message: "Invalid user ID" }); return; }
  const user = await userRepo.findOne({ where: { id } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  user.deletedAt = new Date();
  await userRepo.save(user);
  res.status(204).send();
}

// Categories
export async function getAllCategoriesAdmin(req: AuthRequest, res: Response): Promise<void> {
  const categoryRepo = AppDataSource.getRepository(Category);
  const categories = await categoryRepo.find({ order: { createdAt: "ASC" } });
  res.json(categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    isActive: c.isActive,
    createdAt: c.createdAt,
  })));
}

export async function createCategory(req: AuthRequest, res: Response): Promise<void> {
  const categoryRepo = AppDataSource.getRepository(Category);
  const { name, slug, parentId, isActive } = req.body;

  const category = new Category();
  category.name = name;
  category.slug = slug;
  category.parentId = parentId || undefined;
  category.isActive = isActive !== undefined ? isActive : true;

  const saved = await categoryRepo.save(category);
  res.status(201).json({
    id: saved.id,
    name: saved.name,
    slug: saved.slug,
    parentId: saved.parentId,
    isActive: saved.isActive,
    createdAt: saved.createdAt,
  });
}

export async function updateCategory(req: AuthRequest, res: Response): Promise<void> {
  const categoryRepo = AppDataSource.getRepository(Category);
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ message: "Invalid category ID" }); return; }
  const category = await categoryRepo.findOne({ where: { id } });
  if (!category) {
    res.status(404).json({ message: "Category not found" });
    return;
  }

  const { name, slug, parentId, isActive } = req.body;
  if (name) category.name = name;
  if (slug) category.slug = slug;
  if (parentId !== undefined) category.parentId = parentId || undefined;
  if (isActive !== undefined) category.isActive = isActive;

  const saved = await categoryRepo.save(category);
  res.json({
    id: saved.id,
    name: saved.name,
    slug: saved.slug,
    parentId: saved.parentId,
    isActive: saved.isActive,
    createdAt: saved.createdAt,
  });
}

export async function deleteCategory(req: AuthRequest, res: Response): Promise<void> {
  const categoryRepo = AppDataSource.getRepository(Category);
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ message: "Invalid category ID" }); return; }
  const category = await categoryRepo.findOne({ where: { id } });
  if (!category) {
    res.status(404).json({ message: "Category not found" });
    return;
  }
  category.deletedAt = new Date();
  category.isActive = false;
  await categoryRepo.save(category);
  res.status(204).send();
}

// Products
export async function getAllProductsAdmin(req: AuthRequest, res: Response): Promise<void> {
  const productRepo = AppDataSource.getRepository(Product);
  const products = await productRepo
    .createQueryBuilder("p")
    .leftJoinAndSelect("p.category", "c")
    .where("p.deletedAt IS NULL")
    .orderBy("p.createdAt", "DESC")
    .getMany();

  res.json(products.map((p) => ({
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    price: p.price,
    oldPrice: p.oldPrice,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    stockQuantity: p.stockQuantity,
    isActive: p.isActive,
    categoryId: p.categoryId,
    categoryName: p.category?.name || null,
  })));
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  const productRepo = AppDataSource.getRepository(Product);
  const { sku, slug, name, shortDescription, description, price, oldPrice, stockQuantity, categoryId, isActive } = req.body;

  const product = new Product();
  product.sku = sku;
  product.slug = slug;
  product.name = name;
  product.shortDescription = shortDescription || "";
  product.description = description || "";
  product.price = price;
  product.oldPrice = oldPrice || null;
  product.stockQuantity = stockQuantity ?? 0;
  product.categoryId = categoryId || undefined;
  product.isActive = isActive !== undefined ? isActive : true;
  product.ratingAvg = 0;
  product.ratingCount = 0;

  const saved = await productRepo.save(product);
  res.status(201).json({ id: saved.id, name: saved.name, sku: saved.sku });
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  const productRepo = AppDataSource.getRepository(Product);
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ message: "Invalid product ID" }); return; }
  const product = await productRepo.findOne({ where: { id } });
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  const { sku, slug, name, shortDescription, description, price, oldPrice, stockQuantity, categoryId, isActive } = req.body;
  if (sku) product.sku = sku;
  if (slug) product.slug = slug;
  if (name) product.name = name;
  if (shortDescription !== undefined) product.shortDescription = shortDescription;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (oldPrice !== undefined) product.oldPrice = oldPrice;
  if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;
  if (categoryId !== undefined) product.categoryId = categoryId || undefined;
  if (isActive !== undefined) product.isActive = isActive;

  const saved = await productRepo.save(product);
  res.json({ id: saved.id, name: saved.name });
}

export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  const productRepo = AppDataSource.getRepository(Product);
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ message: "Invalid product ID" }); return; }
  const product = await productRepo.findOne({ where: { id } });
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  product.deletedAt = new Date();
  product.isActive = false;
  await productRepo.save(product);
  res.status(204).send();
}

// Orders
export async function getAllOrdersAdmin(req: AuthRequest, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  const orders = await orderRepo
    .createQueryBuilder("o")
    .leftJoinAndSelect("o.user", "u")
    .leftJoinAndSelect("o.items", "i")
    .orderBy("o.createdAt", "DESC")
    .getMany();

  res.json(orders.map((o) => ({
    id: o.id,
    orderCode: o.orderCode,
    userId: o.userId,
    username: o.user?.fullName || "Guest",
    total: o.totalAmount,
    totalAmount: o.totalAmount,
    status: o.status,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
    recipientName: o.recipientName,
    recipientPhone: o.recipientPhone,
    shippingAddressLine1: o.shippingAddressLine1,
    shippingCity: o.shippingCity,
    shippingProvince: o.shippingProvince,
    items: (o.items || []).map((i: OrderItem) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      productSku: i.productSku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
  })));
}

export async function getOrderByIdAdmin(req: AuthRequest, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid order ID" }); return; }
  const order = await orderRepo.findOne({
    where: { id },
    relations: ["user", "items"],
  });
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({
    id: order.id,
    orderCode: order.orderCode,
    userId: order.userId,
    username: order.user?.fullName || "Guest",
    subtotal: order.subtotal,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    shippingAddressLine1: order.shippingAddressLine1,
    shippingCity: order.shippingCity,
    shippingProvince: order.shippingProvince,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    createdAt: order.createdAt,
    placedAt: order.placedAt,
    items: order.items.map((i: OrderItem) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      productSku: i.productSku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
  });
}
