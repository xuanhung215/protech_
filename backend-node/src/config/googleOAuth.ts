import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/database";
import { User, Role, UserStatus } from "../entity/User";
import { config } from "../config/env";

if (config.googleOAuth.clientID && config.googleOAuth.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleOAuth.clientID,
        clientSecret: config.googleOAuth.clientSecret,
        callbackURL: config.googleOAuth.callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("Google account has no email address."), undefined);
          }

          const userRepo = AppDataSource.getRepository(User);
          let user = await userRepo.findOne({ where: { email } });

          if (!user) {
            const fullName = profile.displayName || email.split("@")[0];
            user = new User();
            user.fullName = fullName;
            user.email = email;
            user.role = Role.CUSTOMER;
            user.status = UserStatus.ACTIVE;
            user.emailVerifiedAt = new Date();
            user.passwordHash = await bcryptjs.hash((await import("uuid")).v4(), 10);
            await userRepo.save(user);
          } else {
            user.emailVerifiedAt = new Date();
            await userRepo.save(user);
          }

          return done(null, {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
          } as any);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
} else {
  console.warn("[Auth] Google OAuth is disabled because GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.");
}

passport.serializeUser((user: any, done) => done(null, user));

passport.deserializeUser((user: any, done) => done(null, user));

export function generateJwtForUser(user: any, rememberMe = false): string {
  const expirationMs = rememberMe ? config.jwt.rememberExpirationMs : config.jwt.expirationMs;
  return jwt.sign(
    { email: user.email, role: `ROLE_${user.role}` },
    config.jwt.secret,
    { expiresIn: Math.floor(expirationMs / 1000) }
  );
}

export { passport };
