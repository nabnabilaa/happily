
async function testSync() {
  const payload = {
    userId: "user_admin",
    user: {
      name: "Super Admin", streak: 0, points: 5000, coins: 0, level: 50, rank: "A", role: "admin", userRole: "hr"
    },
    state: {
      priorities: [
        { id: "123", title: "Test priority", energy: "high", est: "30m", done: false, verified: false, tone: "blue" }
      ],
      habits: [],
      goals: [
        { id: "g123", ownerId: "user_admin", title: "Test Goal", progress: 0, alignment: 100, tone: "sage", metric: "1", scope: "personal" }
      ],
      skills: [],
      rewards: [],
      rewardHistory: [],
      contacts: [],
      workSchedule: { start: "08:00", end: "17:00" },
      onboarded: true
    }
  };

  try {
    const res = await fetch("http://localhost:3000/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testSync();
