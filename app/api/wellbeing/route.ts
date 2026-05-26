import { NextResponse } from "next/server";
import { calculateWellbeingScore } from "@/lib/wellbeingEngine";
import { db } from "@/lib/db"; // Use the existing db utility

// In a real app we would fetch the user's specific state from the database.
// For this prototype, we'll accept state in the POST request or try to mock it for GET.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { state, user } = body;
    
    if (!state || !user) {
      return NextResponse.json({ error: "Missing state or user" }, { status: 400 });
    }
    
    const result = calculateWellbeingScore(state, user);
    
    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
