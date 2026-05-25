import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const result = await db.execute("SELECT * FROM office_locations ORDER BY name ASC");
    return NextResponse.json({ offices: result.rows });
  } catch (error) {
    console.error("Failed to fetch office locations:", error);
    return NextResponse.json({ error: "Gagal mengambil data lokasi kantor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, lat, lng, radius } = await request.json();

    if (!name || lat === undefined || lng === undefined || !radius) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const id = "off_" + uuidv4().replace(/-/g, "").substring(0, 8);

    await db.execute({
      sql: "INSERT INTO office_locations (id, name, lat, lng, radius) VALUES (?, ?, ?, ?, ?)",
      args: [id, name, lat, lng, radius]
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to add office location:", error);
    return NextResponse.json({ error: "Gagal menambah lokasi kantor" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, lat, lng, radius } = await request.json();

    if (!id || !name || lat === undefined || lng === undefined || !radius) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    await db.execute({
      sql: "UPDATE office_locations SET name = ?, lat = ?, lng = ?, radius = ? WHERE id = ?",
      args: [name, lat, lng, radius, id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update office location:", error);
    return NextResponse.json({ error: "Gagal mengupdate lokasi kantor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID tidak ditemukan" }, { status: 400 });
    }

    await db.execute({
      sql: "DELETE FROM office_locations WHERE id = ?",
      args: [id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete office location:", error);
    return NextResponse.json({ error: "Gagal menghapus lokasi kantor" }, { status: 500 });
  }
}

