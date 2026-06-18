export const config = {
  port: parseInt(process.env.PORT || "3001"),
  nodeEnv: process.env.NODE_ENV || "development",

  jwt: {
    secret: process.env.JWT_SECRET || "ProFitJwtSecretKeyMustBeAtLeastSixtyFourCharactersLongForHS512",
    expirationMs: parseInt(process.env.JWT_EXPIRATION_MS || "86400000"),
    rememberExpirationMs: parseInt(process.env.JWT_REMEMBER_EXPIRATION_MS || "604800000"),
    cookieName: "admin_token",
  },

  bootstrap: {
    admin: {
      enabled: process.env.BOOTSTRAP_ADMIN_ENABLED !== "false",
      fullName: process.env.BOOTSTRAP_ADMIN_FULL_NAME || "Administrator",
      email: process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@profit.com",
      phone: process.env.BOOTSTRAP_ADMIN_PHONE || "0123456789",
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin@123",
    },
    customer: {
      enabled: process.env.BOOTSTRAP_CUSTOMER_ENABLED !== "false",
      fullName: process.env.BOOTSTRAP_CUSTOMER_FULL_NAME || "Khach Hang",
      email: process.env.BOOTSTRAP_CUSTOMER_EMAIL || "khachhang@gmail.com",
      phone: process.env.BOOTSTRAP_CUSTOMER_PHONE || "0987654321",
      password: process.env.BOOTSTRAP_CUSTOMER_PASSWORD || "Customer@123",
    },
  },

  frontendBaseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:5173",
};
