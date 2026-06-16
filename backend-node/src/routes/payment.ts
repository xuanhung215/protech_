import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Order } from "../entity/Order";
import { config } from "../config/env";
import { hmacSHA512, sortObject, buildQueryString, extractOrderCodeFromTxnRef } from "../config/vnpay";

function parseId(param: string | undefined): number | null {
  const n = parseInt(param ?? "", 10);
  return isNaN(n) || n <= 0 ? null : n;
}

export async function createPaymentUrl(req: Request, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);
  const orderId = parseId(req.params.orderId);
  if (!orderId) { res.status(400).json({ error: "Invalid order ID" }); return; }
  const order = await orderRepo.findOne({ where: { id: orderId } });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  order.paymentAttempts = (order.paymentAttempts || 0) + 1;
  await orderRepo.save(order);

  const amount = order.totalAmount * 100;
  const rawOrderCode = order.orderCode.replace(/-/g, "");
  const txnRef = rawOrderCode + order.paymentAttempts;

  const now = new Date();
  const createDate = formatDate(now);
  const expireDate = formatDate(new Date(now.getTime() + 15 * 60 * 1000));

  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.vnpay.tmnCode,
    vnp_Amount: String(Math.round(amount)),
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: config.vnpay.returnUrl,
    vnp_IpAddr: req.ip || "127.0.0.1",
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  const sorted = sortObject(params);
  const hashData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const secureHash = hmacSHA512(hashData, config.vnpay.hashSecret);

  const queryString = buildQueryString(sorted);
  const paymentUrl = `${config.vnpay.paymentUrl}?${queryString}&vnp_SecureHash=${secureHash}`;

  console.log("[VNPay] Payment URL created:", { orderCode: order.orderCode, txnRef, amount: Math.round(amount), paymentUrl });

  res.json({ paymentUrl });
}

export async function vnpayReturn(req: Request, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);

  console.log("[VNPay Return] Params:", req.query);

  const secureHash = req.query["vnp_SecureHash"] as string;
  const secureHashType = req.query["vnp_SecureHashType"] as string;

  const fields = { ...req.query };
  delete (fields as any)["vnp_SecureHash"];
  delete (fields as any)["vnp_SecureHashType"];

  const sorted = sortObject(fields as Record<string, string>);
  const hashData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const calculatedHash = secureHashType === "SHA256"
    ? (await import("../config/vnpay")).hmacSHA256(hashData, config.vnpay.hashSecret)
    : hmacSHA512(hashData, config.vnpay.hashSecret);

  const isValid = calculatedHash.toLowerCase() === secureHash?.toLowerCase();

  const txnRef = req.query["vnp_TxnRef"] as string;
  const responseCode = req.query["vnp_ResponseCode"] as string;
  const orderCode = extractOrderCodeFromTxnRef(txnRef);

  let status = "error";
  let message = "Chu ky khong hop le!";

  if (isValid) {
    if (responseCode === "00") {
      const order = await orderRepo.findOne({ where: { orderCode }, relations: ["items"] });
      if (order) {
        order.paymentStatus = "PAID";
        order.status = "CONFIRMED";
        order.paidAt = new Date();
        await orderRepo.save(order);
      }
      status = "success";
      message = "Thanh toan thanh cong!";
    } else {
      const order = await orderRepo.findOne({ where: { orderCode }, relations: ["items"] });
      if (order) {
        order.paymentStatus = "FAILED";
        await orderRepo.save(order);
      }
      status = "failed";
      message = `Thanh toan that bai! Ma loi: ${responseCode}`;
    }
  }

  const redirectUrl = `${config.frontendBaseUrl}/payment-result?status=${status}&message=${encodeURIComponent(message)}&orderCode=${encodeURIComponent(orderCode)}`;
  console.log("[VNPay Return] Redirecting to:", redirectUrl);
  res.redirect(redirectUrl);
}

export async function vnpayIpn(req: Request, res: Response): Promise<void> {
  const orderRepo = AppDataSource.getRepository(Order);

  console.log("[VNPay IPN] Params:", req.query);

  const secureHash = req.query["vnp_SecureHash"] as string;
  const secureHashType = req.query["vnp_SecureHashType"] as string;

  const fields = { ...req.query };
  delete (fields as any)["vnp_SecureHash"];
  delete (fields as any)["vnp_SecureHashType"];

  const sorted = sortObject(fields as Record<string, string>);
  const hashData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const calculatedHash = secureHashType === "SHA256"
    ? (await import("../config/vnpay")).hmacSHA256(hashData, config.vnpay.hashSecret)
    : hmacSHA512(hashData, config.vnpay.hashSecret);

  const isValid = calculatedHash.toLowerCase() === secureHash?.toLowerCase();

  if (!isValid) {
    console.log("[VNPay IPN] Invalid signature");
    res.status(400).send("INVALID_SIGNATURE");
    return;
  }

  const txnRef = req.query["vnp_TxnRef"] as string;
  const responseCode = req.query["vnp_ResponseCode"] as string;
  const orderCode = extractOrderCodeFromTxnRef(txnRef);

  if (responseCode === "00") {
    await orderRepo.update({ orderCode }, { paymentStatus: "PAID", status: "CONFIRMED", paidAt: new Date() });
    console.log(`[VNPay IPN] Order ${orderCode} marked as PAID`);
  } else {
    await orderRepo.update({ orderCode }, { paymentStatus: "FAILED" });
    console.log(`[VNPay IPN] Order ${orderCode} marked as FAILED`);
  }

  res.send("OK");
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
}
