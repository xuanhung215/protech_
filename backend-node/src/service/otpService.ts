// import { AppDataSource } from "../config/database";
// import { User } from "../entity/User";
// import { sendOtpEmail } from "./emailService";

// interface OtpEntry {
//   otp: string;
//   expiresAt: number;
//   action: "register" | "reset_password";
//   userId?: number;
//   email: string;
// }

// const otpStore = new Map<string, OtpEntry>();

// export function generateOtp(): string {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }

// export async function sendOtp(
//   email: string,
//   action: "register" | "reset_password",
//   userId?: number
// ): Promise<{ success: boolean; message: string }> {
//   const existing = otpStore.get(email);
//   if (existing && existing.expiresAt > Date.now()) {
//     const remaining = Math.ceil((existing.expiresAt - Date.now()) / 1000);
//     return {
//       success: false,
//       message: `Vui lòng đợi ${remaining} giây trước khi gửi lại mã.`,
//     };
//   }

//   const otp = generateOtp();
//   const expiresAt = Date.now() + 5 * 60 * 1000;

//   otpStore.set(email, { otp, expiresAt, action, userId, email });

//   try {
//     await sendOtpEmail(email, otp);
//     return { success: true, message: "Mã OTP đã được gửi đến email của bạn." };
//   } catch (error) {
//     otpStore.delete(email);
//     console.error("[OTP] Failed to send email:", error);
//     return {
//       success: false,
//       message: "Không thể gửi email. Vui lòng kiểm tra lại địa chỉ email.",
//     };
//   }
// }

// export async function verifyOtp(
//   email: string,
//   otp: string
// ): Promise<{ success: boolean; message: string; action?: "register" | "reset_password"; userId?: number }> {
//   const entry = otpStore.get(email);

//   if (!entry) {
//     return { success: false, message: "Mã OTP không tồn tại. Vui lòng yêu cầu mã mới." };
//   }

//   if (entry.expiresAt < Date.now()) {
//     otpStore.delete(email);
//     return { success: false, message: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới." };
//   }

//   if (entry.otp !== otp.trim()) {
//     return { success: false, message: "Mã OTP không đúng." };
//   }

//   otpStore.delete(email);

//   if (entry.action === "register") {
//     const userRepo = AppDataSource.getRepository(User);
//     const user = await userRepo.findOne({ where: { email: entry.email } as any });
//     if (user) {
//       user.emailVerifiedAt = new Date();
//       await userRepo.save(user);
//     }
//   }

//   return {
//     success: true,
//     message: "Xác minh OTP thành công.",
//     action: entry.action,
//     userId: entry.userId,
//   };
// }
