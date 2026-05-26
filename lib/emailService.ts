/**
 * Mock Email Service (Prototype)
 * 
 * In a real production environment, this would integrate with Resend, SendGrid, or AWS SES.
 * For the prototype, it logs the email to the server console and creates a simulated delay.
 */

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    // Check if real API key exists (e.g. RESEND_API_KEY)
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Flowbee <noreply@flowbee.app>",
          to,
          subject,
          html,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send real email via Resend");
      }
      return { success: true, mode: "real" };
    }

    // ── MOCK MODE (For prototype / no API key) ──
    console.log("\n=========================================");
    console.log("📨 MOCK EMAIL SENT");
    console.log("=========================================");
    console.log(`To      : ${to}`);
    console.log(`Subject : ${subject}`);
    console.log(`Body    : \n${html.replace(/<[^>]*>?/gm, '')}`); // Strip HTML tags for clean console output
    console.log("=========================================\n");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return { success: true, mode: "mock" };
  } catch (error) {
    console.error("Email Service Error:", error);
    return { success: false, error };
  }
}
