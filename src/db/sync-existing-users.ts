if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("sslmode")) {
  process.env.DATABASE_URL += "?sslmode=require";
}

import { db } from "./index";
import { users, staff } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting user-to-staff synchronization...");

  // Fetch all users
  const allUsers = await db.query.users.findMany();
  console.log(`Found ${allUsers.length} total user(s) in the database.`);

  let count = 0;
  for (const user of allUsers) {
    console.log(`User: ${user.name} | Role: ${user.role} | Staff ID: ${user.staffId} | Department ID: ${user.departmentId}`);
    if (user.staffId && user.departmentId) {
      const cleanStaffId = user.staffId.trim();
      if (!cleanStaffId) continue;

      const existingStaff = await db.query.staff.findFirst({
        where: eq(staff.staffId, cleanStaffId),
      });

      if (existingStaff) {
        await db
          .update(staff)
          .set({
            name: user.name,
            email: user.email,
            departmentId: user.departmentId,
            isActive: user.isActive,
          })
          .where(eq(staff.id, existingStaff.id));
        console.log(`-> Updated existing staff record for: ${user.name} (${cleanStaffId})`);
      } else {
        await db.insert(staff).values({
          staffId: cleanStaffId,
          name: user.name,
          email: user.email,
          departmentId: user.departmentId,
          isActive: user.isActive,
        });
        console.log(`-> Created new staff record for: ${user.name} (${cleanStaffId})`);
      }
      count++;
    }
  }

  console.log(`Synchronization complete! Synced ${count} user(s) to staff roster.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error running synchronization:", err);
  process.exit(1);
});
