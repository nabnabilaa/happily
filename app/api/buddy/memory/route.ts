import { NextResponse } from "next/server";
import {
  getMemories,
  formatMemoriesForPrompt,
  extractAndSaveMemories,
  forgetMemory,
  forgetAllMemories,
  memoryLabel,
  type MemorySource,
} from "@/lib/aiMemory";

/**
 * Memori Buddy — milik user, hanya untuk user.
 *
 * Catatan akses: app ini belum punya middleware sesi, jadi `userId` datang dari
 * request seperti route lain. Semua query di lib/aiMemory sudah dikunci per
 * user_id, jadi tidak ada jalur yang bisa membaca memori orang lain lewat
 * response ini. Begitu ada sesi terautentikasi, ganti pembacaan userId di sini
 * dengan identitas sesi — itu satu-satunya perubahan yang dibutuhkan.
 */

const VALID_SOURCES: MemorySource[] = ['coach', 'reflection', 'checkin'];

// GET: apa yang Buddy ingat tentang saya
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const memories = await getMemories(userId);
    return NextResponse.json({
      memories: memories.map(m => ({ ...m, label: memoryLabel(m.kind) })),
      promptBlock: formatMemoriesForPrompt(memories),
    });
  } catch (error: any) {
    console.error("Memory GET error:", error);
    return NextResponse.json({ memories: [], promptBlock: '' });
  }
}

// POST: baca satu sesi, simpan yang layak diingat
export async function POST(request: Request) {
  try {
    const { userId, source, transcript } = await request.json();
    if (!userId || !transcript) {
      return NextResponse.json({ error: "userId dan transcript wajib diisi" }, { status: 400 });
    }
    const src: MemorySource = VALID_SOURCES.includes(source) ? source : 'coach';
    const result = await extractAndSaveMemories({ userId, source: src, transcript: String(transcript) });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Memory POST error:", error);
    // Ekstraksi memori tidak boleh pernah menggagalkan alur user.
    return NextResponse.json({ success: false, saved: 0, reinforced: 0, resolved: 0 });
  }
}

// DELETE: user mencabut satu memori (?id=) atau semuanya (?all=1)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');
    const all = searchParams.get('all');
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const ok = all === '1' || all === 'true'
      ? await forgetAllMemories(userId)
      : id
        ? await forgetMemory(userId, id)
        : false;

    if (!ok) return NextResponse.json({ error: "Gagal menghapus memori" }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Memory DELETE error:", error);
    return NextResponse.json({ error: "Gagal menghapus memori" }, { status: 500 });
  }
}
