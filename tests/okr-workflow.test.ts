import assert from "assert";
import { db } from "../lib/db";

const BASE_URL = "http://localhost:3000/api";

async function runTests() {
  console.log("=== Memulai OKR & Task Management Unit Tests ===");
  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.log(`❌ [FAIL] ${name}`);
      console.error(e.message);
      failed++;
    }
  };

  try {
    // 1. Setup mock data
    console.log("\n[Setup] Menyiapkan test data di database...");
    
    // Clear old test data
    await db.execute("DELETE FROM okr_tasks WHERE title LIKE '[TEST]%'");
    
    // We will create specific mock users for this test
    const hr = { id: 'mock_hr_1', name: 'Mock HR', role: 'hr' };
    const mgr = { id: 'mock_mgr_1', name: 'Mock Manager', role: 'manager', division_id: 101 };
    const emp = { id: 'mock_emp_1', name: 'Mock Employee', role: 'employee', division_id: 101 };

    await db.execute("INSERT IGNORE INTO departments (id, name) VALUES (?, ?)", [101, 'Mock Test Division']);
    await db.execute("INSERT IGNORE INTO users (id, name, email, role, division_id) VALUES (?, ?, ?, ?, ?)", [hr.id, hr.name, 'hr@mock.com', hr.role, null]);
    await db.execute("INSERT IGNORE INTO users (id, name, email, role, division_id) VALUES (?, ?, ?, ?, ?)", [mgr.id, mgr.name, 'mgr@mock.com', mgr.role, mgr.division_id]);
    await db.execute("INSERT IGNORE INTO users (id, name, email, role, division_id) VALUES (?, ?, ?, ?, ?)", [emp.id, emp.name, 'emp@mock.com', emp.role, emp.division_id]);

    // Create a mock KR and tasks for testing directly in DB
    const krId = "test_kr_1";
    await db.execute("INSERT IGNORE INTO key_results (id, okr_id, title, target_value, current_value, unit) VALUES (?, ?, ?, ?, ?, ?)", [krId, 'okr_1', '[TEST] Key Result', 10, 0, 'pcs']);

    // --- TEST SUITE ---

    await test("Employee tidak bisa langsung set status Task ke 'done' (Mark as Done)", async () => {
      // Create test task for employee
      const taskId = "task_test_1";
      await db.execute("INSERT INTO okr_tasks (id, key_result_id, assignee_id, created_by, title, status) VALUES (?, ?, ?, ?, ?, ?)", [taskId, krId, emp.id, mgr.id, '[TEST] Employee Task', 'in_progress']);
      
      const res = await fetch(`${BASE_URL}/okr/tasks/${taskId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: emp.id, action: "mark_done" })
      });
      const data = await res.json();
      assert(res.status === 403, "Seharusnya gagal dengan status 403");
      assert(data.error.includes("Employee tidak bisa langsung"), "Pesan error salah: " + data.error);
    });

    await test("Employee bisa melakukan 'submit_review'", async () => {
      const taskId = "task_test_2";
      await db.execute("INSERT INTO okr_tasks (id, key_result_id, assignee_id, created_by, title, status) VALUES (?, ?, ?, ?, ?, ?)", [taskId, krId, emp.id, mgr.id, '[TEST] Employee Task 2', 'in_progress']);
      
      const res = await fetch(`${BASE_URL}/okr/tasks/${taskId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: emp.id, action: "submit_review" })
      });
      const data = await res.json();
      assert(res.ok, "API gagal: " + data.error);
      assert(data.newStatus === "review", "Status tidak berubah ke review");
    });

    await test("Manager bisa Accept task milik Employee (dengan notifikasi)", async () => {
      const taskId = "task_test_3";
      await db.execute("INSERT INTO okr_tasks (id, key_result_id, assignee_id, created_by, title, status) VALUES (?, ?, ?, ?, ?, ?)", [taskId, krId, emp.id, mgr.id, '[TEST] Employee Task 3', 'review']);
      
      const res = await fetch(`${BASE_URL}/okr/tasks/${taskId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mgr.id, action: "accept" })
      });
      const data = await res.json();
      assert(res.ok, "API gagal: " + data.error);
      assert(data.newStatus === "done", "Status tidak berubah ke done");
      assert(data.approvalType === "reviewed", "Approval type bukan 'reviewed'");
    });

    await test("Manager/HR self-approve otomatis mengisi approval_type = self_approved", async () => {
      const taskId = "task_test_4";
      // Task for Manager created by Manager (Own OKR)
      await db.execute("INSERT INTO okr_tasks (id, key_result_id, assignee_id, created_by, title, status) VALUES (?, ?, ?, ?, ?, ?)", [taskId, krId, mgr.id, mgr.id, '[TEST] Manager Own Task', 'in_progress']);
      
      const res = await fetch(`${BASE_URL}/okr/tasks/${taskId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mgr.id, action: "mark_done" })
      });
      const data = await res.json();
      assert(res.ok, "API gagal: " + data.error);
      assert(data.newStatus === "done", "Status tidak berubah ke done");
      assert(data.approvalType === "self_approved", "Approval type bukan 'self_approved'");
    });

    await test("HR tidak bisa melakukan Accept/Revise terhadap Task milik user lain", async () => {
      const taskId = "task_test_5";
      await db.execute("INSERT INTO okr_tasks (id, key_result_id, assignee_id, created_by, title, status) VALUES (?, ?, ?, ?, ?, ?)", [taskId, krId, emp.id, mgr.id, '[TEST] HR Attempt Task', 'review']);
      
      const res = await fetch(`${BASE_URL}/okr/tasks/${taskId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: hr.id, action: "accept" })
      });
      const data = await res.json();
      assert(res.status === 403, "Seharusnya diblokir dengan 403");
      assert(data.error.includes("Hanya Manager"), "Pesan error salah: " + data.error);
    });

    await test("Manager tidak bisa Accept task Employee dari divisi lain", async () => {
      // Mock employee in different division
      const taskId = "task_test_6";
      const otherDivId = 999;
      await db.execute("INSERT OR IGNORE INTO divisions (id, name) VALUES (?, ?)", [otherDivId, 'Mock Division']);
      await db.execute("INSERT OR IGNORE INTO users (id, name, email, role, division_id) VALUES (?, ?, ?, ?, ?)", ['mock_emp_99', 'Mock Emp', 'e@m.com', 'employee', otherDivId]);
      
      await db.execute("INSERT INTO okr_tasks (id, key_result_id, assignee_id, created_by, title, status) VALUES (?, ?, ?, ?, ?, ?)", [taskId, krId, 'mock_emp_99', mgr.id, '[TEST] Other Div Task', 'review']);
      
      const res = await fetch(`${BASE_URL}/okr/tasks/${taskId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: mgr.id, action: "accept" })
      });
      const data = await res.json();
      assert(res.status === 403, "Seharusnya gagal dengan status 403");
      assert(data.error.includes("di divisi yang sama"), "Pesan error salah: " + data.error);
    });

    // Cleanup
    console.log("\n[Cleanup] Membersihkan test data...");
    await db.execute("DELETE FROM okr_tasks WHERE title LIKE '[TEST]%'");

  } catch (error) {
    console.error("Test framework error:", error);
  }

  console.log(`\n=== Hasil: ${passed} Lulus, ${failed} Gagal ===\n`);
}

runTests();
