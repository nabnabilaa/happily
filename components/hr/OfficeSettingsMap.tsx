"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";

// Dynamically import Leaflet map with no SSR
const Map = dynamic(() => import("./LeafletMap"), { 
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '500px', background: HP_TOKENS.lineSoft, borderRadius: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12
    }}>
      <div style={{
        width: 36, height: 36, border: `3px solid ${HP_TOKENS.line}`,
        borderTopColor: HP_TOKENS.blue, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Memuat Peta...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
});

interface OfficeLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export default function OfficeSettingsMap() {
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const res = await fetch("/api/settings/office");
      const data = await res.json();
      if (data.offices) {
        setOffices(data.offices);
      }
    } catch (error) {
      console.error("Failed to fetch offices", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffice = async (office: Partial<OfficeLocation>) => {
    try {
      const res = await fetch("/api/settings/office", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(office)
      });
      const data = await res.json();
      if (data.success) {
        await fetchOffices(); // Refresh
      } else {
        alert(data.error || "Gagal menambah lokasi");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan");
    }
  };

  const handleDeleteOffice = async (id: string) => {
    if (!confirm("Hapus lokasi kantor ini?")) return;
    try {
      const res = await fetch(`/api/settings/office?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        await fetchOffices();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateOffice = async (office: OfficeLocation) => {
    try {
      const res = await fetch("/api/settings/office", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(office)
      });
      const data = await res.json();
      if (data.success) {
        await fetchOffices();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 36, height: 36, border: `3px solid ${HP_TOKENS.line}`,
          borderTopColor: HP_TOKENS.blue, borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <HPCard style={{ background: HP_TOKENS.blueSoft, border: 'none', marginBottom: 4 }} padding={16}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: HP_TOKENS.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HPGlyph name="target" size={18} color="#F4F7F9" />
          </div>
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 14, color: HP_TOKENS.blue }}>Pengaturan Lokasi Kantor</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkSoft, fontWeight: 600, marginTop: 2 }}>
              Klik pada peta untuk menetapkan lokasi kantor baru dan atur radius absensi yang diizinkan.
            </div>
          </div>
        </div>
      </HPCard>

      <Map 
        offices={offices} 
        onAddOffice={handleAddOffice} 
        onDeleteOffice={handleDeleteOffice}
        onUpdateOffice={handleUpdateOffice}
      />
      
      {/* Office List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginTop: 12 }}>
        {offices.map((office) => (
          <HPCard key={office.id} padding={16} style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ ...HP_TEXT.h, fontSize: 14 }}>{office.name}</h3>
            <p style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 4, marginBottom: 12 }}>
              Radius: {office.radius}m • Lat: {Number(office.lat).toFixed(4)} • Lng: {Number(office.lng).toFixed(4)}
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => handleDeleteOffice(office.id)}
                style={{
                  background: 'none', border: 'none', ...HP_TEXT.small, color: HP_TOKENS.coral, fontWeight: 800, cursor: 'pointer', fontFamily: HP_FONT
                }}
              >
                Hapus
              </button>
            </div>
          </HPCard>
        ))}
        {offices.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', background: HP_TOKENS.lineSoft, borderRadius: 20, border: `1px dashed ${HP_TOKENS.line}` }}>
            <p style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Belum ada lokasi kantor yang diatur.</p>
          </div>
        )}
      </div>
    </div>
  );
}
