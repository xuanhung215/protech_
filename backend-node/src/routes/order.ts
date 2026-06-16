import { Response } from "express";
import { AppDataSource } from "../config/database";
import { Order } from "../entity/Order";
import { OrderItem } from "../entity/OrderItem";
import { Product } from "../entity/Product";
import { User } from "../entity/User";
import { AuthRequest } from "../middleware/auth";
import { generateOrderCode } from "../utils/orderCode";

function parseId(param: string | undefined): number | null {
  const n = parseInt(param ?? "", 10);
  return isNaN(n) || n <= 0 ? null : n;
}

export async function getMyOrders(req: AuthRequest, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  const orders = await orderRepo
    .createQueryBuilder("o")
    .leftJoinAndSelect("o.user", "u")
    .leftJoinAndSelect("o.items", "i")
    .leftJoinAndSelect("i.product", "p")
    .where("u.email = :email", { email: req.user!.email })
    .orderBy("o.createdAt", "DESC")
    .getMany();

  res.json(orders.map(mapOrderResponse));
}

export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const orderRepo = AppDataSource.getRepository(Order);
  const productRepo = AppDataSource.getRepository(Product);

  const user = await userRepo.findOne({
    where: { email: req.user!.email, deletedAt: null as any },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { recipientName, recipientPhone, shippingAddressLine1, shippingCity, shippingProvince, note, items } = req.body;

  const order = new Order();
  order.items = [];
  order.userId = user.id;
  order.orderCode = generateOrderCode();
  order.recipientName = recipientName;
  order.recipientPhone = recipientPhone;
  order.shippingAddressLine1 = shippingAddressLine1;
  order.shippingCity = shippingCity;
  order.shippingProvince = shippingProvince || "";
  order.note = note || "";
  order.status = "PENDING";
  order.paymentStatus = "UNPAID";
  order.paymentAttempts = 0;
  order.placedAt = new Date();

  let total = 0;
  for (const item of items) {
    const product = await productRepo.findOne({ where: { id: item.productId, deletedAt: null as any } });
    if (!product) {
      res.status(400).json({ error: `Product not found: ${item.productId}` });
      return;
    }

    const orderItem = new OrderItem();
    orderItem.productId = product.id;
    orderItem.productName = product.name;
    orderItem.productSku = product.sku;
    orderItem.quantity = item.quantity;
    orderItem.unitPrice = product.price;
    orderItem.lineTotal = parseFloat((product.price * item.quantity).toFixed(2));
    order.items.push(orderItem);
    total += orderItem.lineTotal;
  }

  order.subtotal = parseFloat(total.toFixed(2));
  order.totalAmount = parseFloat(total.toFixed(2));

  const saved = await orderRepo.save(order);
  res.status(201).json(mapOrderResponse(saved));
}

export async function createGuestOrder(req: AuthRequest, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  const productRepo = AppDataSource.getRepository(Product);

  const { recipientName, recipientPhone, shippingAddressLine1, shippingCity, shippingProvince, note, items } = req.body;

  const order = new Order();
  order.items = [];
  order.orderCode = generateOrderCode();
  order.recipientName = recipientName;
  order.recipientPhone = recipientPhone;
  order.shippingAddressLine1 = shippingAddressLine1;
  order.shippingCity = shippingCity;
  order.shippingProvince = shippingProvince || "";
  order.note = note || "";
  order.status = "PENDING";
  order.paymentStatus = "UNPAID";
  order.paymentAttempts = 0;
  order.placedAt = new Date();

  let total = 0;
  for (const item of items) {
    const product = await productRepo.findOne({ where: { id: item.productId, deletedAt: null as any } });
    if (!product) {
      res.status(400).json({ error: `Product not found: ${item.productId}` });
      return;
    }

    const orderItem = new OrderItem();
    orderItem.productId = product.id;
    orderItem.productName = product.name;
    orderItem.productSku = product.sku;
    orderItem.quantity = item.quantity;
    orderItem.unitPrice = product.price;
    orderItem.lineTotal = parseFloat((product.price * item.quantity).toFixed(2));
    order.items.push(orderItem);
    total += orderItem.lineTotal;
  }

  order.subtotal = parseFloat(total.toFixed(2));
  order.totalAmount = parseFloat(total.toFixed(2));

  const saved = await orderRepo.save(order);
  res.status(201).json(mapOrderResponse(saved));
}

export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  const productRepo = AppDataSource.getRepository(Product);

  const orderId = parseId(req.params.id);
  if (!orderId) { res.status(400).json({ error: "Invalid order ID" }); return; }

  const order = await orderRepo.findOne({
    where: { id: orderId },
    relations: ["items"],
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const { status, paymentStatus } = req.body;

  if (status) {
    order.status = status;

    if (status === "COMPLETED") {
      order.completedAt = new Date();
      for (const item of order.items) {
        const product = await productRepo.findOne({ where: { id: item.productId } });
        if (product) {
          product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
          await productRepo.save(product);
        }
      }
    }

    if (status === "CANCELLED") {
      for (const item of order.items) {
        const product = await productRepo.findOne({ where: { id: item.productId } });
        if (product) {
          product.stockQuantity += item.quantity;
          await productRepo.save(product);
        }
      }
    }
  }

  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
    if (paymentStatus === "PAID") {
      order.status = "CONFIRMED";
    }
  }

  await orderRepo.save(order);
  res.json(mapOrderResponse(order));
}

export async function confirmBankingPayment(req: AuthRequest, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  const orderId = parseId(req.params.orderId);
  if (!orderId) { res.status(400).json({ error: "Invalid order ID" }); return; }
  const order = await orderRepo.findOne({
    where: { id: orderId },
    relations: ["items"],
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.paymentStatus !== "UNPAID") {
    res.status(400).json({ error: "Bad Request", message: "Don hang khong o trang thai cho thanh toan" });
    return;
  }

  order.paymentStatus = "PENDING_CONFIRM";
  order.paidAt = new Date();
  await orderRepo.save(order);

  res.json(mapOrderResponse(order));
}

export async function getPendingConfirmCount(req: AuthRequest, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  const count = await orderRepo.count({ where: { paymentStatus: "PENDING_CONFIRM" } });
  res.json({ count });
}

function mapOrderResponse(order: Order): any {
  return {
    id: order.id,
    orderCode: order.orderCode,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    shippingAddressLine1: order.shippingAddressLine1,
    shippingCity: order.shippingCity,
    shippingProvince: order.shippingProvince,
    totalAmount: order.totalAmount,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    status: order.status,
    paymentStatus: order.paymentStatus,
    placedAt: order.placedAt,
    paidAt: order.paidAt,
    deliveredAt: order.deliveredAt,
    completedAt: order.completedAt,
    note: order.note,
    userName: order.user?.fullName || null,
    items: (order.items || []).map((i: OrderItem) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      productSku: i.productSku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      // Thêm thông tin chi tiết sản phẩm nếu có join
      product: i.product ? {
        id: i.product.id,
        name: i.product.name,
        sku: i.product.sku,
        price: i.product.price,
        shortDescription: i.product.shortDescription,
      } : null,
    })),
  };
}
