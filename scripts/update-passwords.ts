import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function updatePasswords() {
  console.log("Menyambungkan ke database...");
  const pool = mysql.createPool({
    uri: process.env.MYSQL_URI,
    waitForConnections: true,
  });

  try {
    const hrHash = await bcrypt.hash("hr123", 10);
    const managerHash = await bcrypt.hash("manager123", 10);
    const employeeHash = await bcrypt.hash("employee123", 10);
    const adminHash = await bcrypt.hash("admin123", 10);

    console.log("Memperbarui password berdasarkan role...");

    // Update for HR
    const [hrResult] = await pool.query("UPDATE users SET password_hash = ? WHERE role = 'hr'", [hrHash]);
    console.log(`✅ Update HR passwords: ${(hrResult as any).affectedRows} rows affected`);

    // Update for Manager
    const [managerResult] = await pool.query("UPDATE users SET password_hash = ? WHERE role = 'manager'", [managerHash]);
    console.log(`✅ Update Manager passwords: ${(managerResult as any).affectedRows} rows affected`);

    // Update for Employee
    const [employeeResult] = await pool.query("UPDATE users SET password_hash = ? WHERE role = 'employee'", [employeeHash]);
    console.log(`✅ Update Employee passwords: ${(employeeResult as any).affectedRows} rows affected`);

    // Update for Admin (if any)
    const [adminResult] = await pool.query("UPDATE users SET password_hash = ? WHERE role = 'admin'", [adminHash]);
    console.log(`✅ Update Admin passwords: ${(adminResult as any).affectedRows} rows affected`);

    console.log("\nBerikut adalah email dari beberapa user per role sebagai referensi:");
    
    const [roles] = await pool.query('SELECT role, email FROM users ORDER BY role LIMIT 50');
    const grouped = (roles as any[]).reduce((acc: any, row: any) => {
        if (!acc[row.role]) acc[row.role] = [];
        if (acc[row.role].length < 3) acc[row.role].push(row.email);
        return acc;
    }, {});

    for (const [role, emails] of Object.entries(grouped)) {
        console.log(`Role: ${role.toUpperCase()} (Password: ${role}123)`);
        console.log(`Emails: ${(emails as string[]).join(', ')}`);
        console.log('---');
    }

  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  } finally {
    process.exit(0);
  }
}

updatePasswords();
