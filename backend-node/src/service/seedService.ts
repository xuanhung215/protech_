import { AppDataSource } from "../config/database";
import { User, Role, UserStatus } from "../entity/User";
import { config } from "../config/env";
import bcryptjs from "bcryptjs";

export async function seedDefaultUsers(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);

  if (config.bootstrap.admin.enabled) {
    const adminEmail = config.bootstrap.admin.email;
    let admin = await userRepo.findOne({ where: { email: adminEmail } });
    if (!admin) {
      admin = new User();
      admin.fullName = config.bootstrap.admin.fullName;
      admin.email = adminEmail;
      admin.phone = config.bootstrap.admin.phone;
      admin.role = Role.ADMIN;
      admin.status = UserStatus.ACTIVE;
      admin.deletedAt = undefined;
      admin.passwordHash = await bcryptjs.hash(config.bootstrap.admin.password, 10);
      await userRepo.save(admin);
      console.log(`[Seed] Admin created: ${adminEmail} / ${config.bootstrap.admin.password}`);
    } else {
      console.log(`[Seed] Admin already exists: ${adminEmail}`);
    }
  }

  if (config.bootstrap.customer.enabled) {
    const custEmail = config.bootstrap.customer.email;
    let customer = await userRepo.findOne({ where: { email: custEmail } });
    if (!customer) {
      customer = new User();
      customer.fullName = config.bootstrap.customer.fullName;
      customer.email = custEmail;
      customer.phone = config.bootstrap.customer.phone;
      customer.role = Role.CUSTOMER;
      customer.status = UserStatus.ACTIVE;
      customer.deletedAt = undefined;
      customer.passwordHash = await bcryptjs.hash(config.bootstrap.customer.password, 10);
      await userRepo.save(customer);
      console.log(`[Seed] Customer created: ${custEmail} / ${config.bootstrap.customer.password}`);
    } else {
      console.log(`[Seed] Customer already exists: ${custEmail}`);
    }
  }
}
