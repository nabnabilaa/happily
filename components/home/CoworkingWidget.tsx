"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import { useHP } from "@/lib/HPContext";
import SectionHeader from "./SectionHeader";

interface CoworkingWidgetProps {
  openModal: (name: string, props?: any) => void;
}

interface Room {
  id: string;
  name: string;
  description?: string;
  participants: any[];
  mode: 'hardcore' | 'zen';
  durationMins: number;
  remainingMins: number;
  code: string;
  status?: string;
  bannedUsers?: string[];
}

export default function CoworkingWidget({ openModal }: CoworkingWidgetProps) {
  const { user } = useHP();
  
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [promptRoom, setPromptRoom] = useState<Room | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorStr, setErrorStr] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/focus/rooms');
      const data = await res.json();
      if (data.rooms) {
        setActiveRooms(data.rooms);
      }
    } catch (e) {
      console.error('Failed to fetch rooms', e);
    }
  };

  useEffect(() => {
    fetchRooms();

    // Pusher will handle updates. No more polling here!

    let pusherChannel: any;
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

    if (pusherKey) {
      import('pusher-js').then(({ default: PusherClient }) => {
        if (!(window as any).Pusher) (window as any).Pusher = PusherClient;
        const pusher = new PusherClient(pusherKey, {
          cluster: pusherCluster,
          authEndpoint: '/api/pusher/auth',
          auth: { params: { user_id: user?.id } }
        });
        pusherChannel = pusher.subscribe('presence-lobby');
        pusherChannel.bind('lobby-update', fetchRooms);
      });
    }

    return () => {
      if (pusherChannel) {
        pusherChannel.unbind('lobby-update', fetchRooms);
        pusherChannel.unsubscribe();
      }
    };
  }, [user?.id]);

  const handleJoinClick = (room: Room) => {
    setPromptRoom(room);
    setInputCode("");
    setErrorStr("");
  };

  const handleVerifyJoin = async () => {
    if (!promptRoom) return;
    if (inputCode.toUpperCase() !== promptRoom.code) {
      setErrorStr("Kode tidak valid.");
      return;
    }
    setPromptRoom(null);
    openModal('focus', { 
      initialMultiplayer: true,
      initialRoomCode: promptRoom.id,
      initialMode: promptRoom.mode,
      initialDuration: promptRoom.durationMins,
      initialRemainingMins: promptRoom.remainingMins,
      isGuest: true
    });
  };

  const handleCreateRoom = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/focus/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${user?.name?.split(' ')[0] || 'Tim'}'s Room`,
          mode: 'hardcore',
          durationMins: 25,
          hostId: user?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        openModal('focus', { 
          initialMultiplayer: true,
          initialRoomCode: data.roomId,
          initialMode: 'hardcore',
          initialDuration: 25,
          isGuest: false
        });
      }
    } catch (e) {
      console.error('Create room failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <SectionHeader icon="compass" label="Live Coworking Lounge" />
      
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input 
          placeholder="Cari ruang atau masukkan kode..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 16, border: `1px solid ${HP_TOKENS.line}`, fontFamily: HP_FONT, fontSize: 14, outline: 'none' }}
        />
        <button 
          onClick={() => {
            const found = activeRooms.find(r => r.code === searchQuery.toUpperCase());
            if (found) {
              openModal('focus', { 
                initialMultiplayer: true,
                initialRoomCode: found.id,
                initialMode: found.mode,
                initialDuration: found.durationMins,
                initialRemainingMins: found.remainingMins,
                isGuest: true
              });
              setSearchQuery("");
            } else {
              setErrorStr("Ruang tidak ditemukan.");
              // Fallback to notify if useHP doesn't have notify exposed correctly here, wait notify is from useHP
              alert("Kode tidak valid atau ruang tidak ditemukan.");
            }
          }}
          className="hp-tap"
          style={{ padding: '0 20px', borderRadius: 16, border: 'none', background: HP_TOKENS.sage, color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: HP_FONT, fontSize: 14 }}
        >
          Gabung
        </button>
      </div>

      <div className="hide-scroll" style={{ display: 'flex', overflowX: 'auto', gap: 16, paddingBottom: 12, margin: '0 -4px', paddingLeft: 4, paddingRight: 4 }}>
        <button 
          onClick={handleCreateRoom}
          disabled={loading}
          className="hp-tap"
          style={{
            minWidth: 160, flexShrink: 0, padding: '16px', borderRadius: 24,
            background: 'transparent', color: HP_TOKENS.inkMute,
            border: `2px dashed ${HP_TOKENS.line}`, cursor: loading ? 'wait' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
            transition: 'all 0.2s', opacity: loading ? 0.5 : 1
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 24, background: HP_TOKENS.sageWash, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HPGlyph name="plus" size={24} color={HP_TOKENS.sage}/>
          </div>
          Buat Ruang
        </button>

        {activeRooms.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.code.includes(searchQuery.toUpperCase())).map(room => (
          <div key={room.id} style={{ minWidth: 260, maxWidth: 280, flexShrink: 0 }}>
            <HPCard 
              padding={16}
              style={{ 
                background: `linear-gradient(135deg, ${HP_TOKENS.sageWash} 0%, #fff 100%)`, 
                border: `1.5px solid ${HP_TOKENS.sage}30`,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 20, marginTop: 2 }}>🔥</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ ...HP_TEXT.h, fontSize: 16, color: HP_TOKENS.ink, wordBreak: 'break-word', lineHeight: 1.3 }}>
                      {room.name}
                    </div>
                    <div style={{ 
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                      background: room.mode === 'hardcore' ? HP_TOKENS.coralWash : HP_TOKENS.blueWash,
                      color: room.mode === 'hardcore' ? HP_TOKENS.coral : HP_TOKENS.blue,
                      whiteSpace: 'nowrap'
                    }}>
                      {room.mode.toUpperCase()}
                    </div>
                  </div>
                  {room.description && (
                    <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft, marginTop: 6, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {room.description}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px dashed ${HP_TOKENS.line}`, paddingTop: 12, marginTop: 'auto' }}>
                <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkSoft }}>
                  Sisa Waktu: <strong style={{ color: HP_TOKENS.ink }}>{room.remainingMins} menit</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {room.participants?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: p.isHost ? 'rgba(245,200,66,0.15)' : 'rgba(0,0,0,0.04)', padding: '4px 12px 4px 4px', borderRadius: 20 }}>
                    <div style={{ 
                      width: 24, height: 24, borderRadius: 12, 
                      background: p.isHost ? HP_TOKENS.yellow : '#fff',
                      color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800
                    }}>
                      {p.avatar ? <img src={p.avatar} style={{width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover'}} /> : p.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: HP_TOKENS.ink }}>{p.name.split(' ')[0]} {p.isHost ? '👑' : ''}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const isBanned = user?.id ? room.bannedUsers?.includes(user.id) : false;
                return (
                  <button 
                    onClick={() => !isBanned && handleJoinClick(room)}
                    disabled={isBanned || room.status === 'started'}
                    className={!isBanned ? "hp-tap" : ""}
                    style={{
                      width: '100%',
                      marginTop: 8,
                      padding: '12px', borderRadius: 14, border: 'none',
                      background: isBanned || room.status === 'started' ? HP_TOKENS.lineSoft : HP_TOKENS.sage, 
                      color: isBanned || room.status === 'started' ? HP_TOKENS.inkFade : '#fff',
                      fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, 
                      cursor: isBanned || room.status === 'started' ? 'not-allowed' : 'pointer',
                      boxShadow: isBanned || room.status === 'started' ? 'none' : `0 4px 12px ${HP_TOKENS.sage}40`,
                      transition: 'all 0.2s'
                    }}
                  >
                    {isBanned ? "Dilarang" : (room.status === 'started' ? 'Berjalan' : "Ikut Gabung")}
                  </button>
                );
              })()}
            </HPCard>
          </div>
        ))}
      </div>

      {promptRoom && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(26,29,35,0.7)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 24, width: '100%', maxWidth: 320 }}>
            <div style={{ ...HP_TEXT.h, fontSize: 20, color: HP_TOKENS.ink }}>Masukkan Kode Room</div>
            <div style={{ ...HP_TEXT.body, fontSize: 13, color: HP_TOKENS.inkMute, marginTop: 4, marginBottom: 20 }}>
              Minta kode dari Host ({promptRoom.participants?.find(p=>p.isHost)?.name || 'Host'}) untuk bergabung ke {promptRoom.name}. (Kode Asli: {promptRoom.code})
            </div>
            
            <input 
              autoFocus
              value={inputCode}
              onChange={e => {
                setInputCode(e.target.value.toUpperCase());
                setErrorStr("");
              }}
              placeholder="Contoh: D8F2"
              maxLength={4}
              style={{
                width: '100%', padding: '16px', borderRadius: 12, border: `2px solid ${errorStr ? HP_TOKENS.coral : HP_TOKENS.line}`,
                fontFamily: HP_FONT, fontSize: 24, fontWeight: 800, textAlign: 'center', letterSpacing: 8,
                background: HP_TOKENS.paper, color: HP_TOKENS.ink, marginBottom: 8
              }}
            />
            {errorStr && <div style={{ color: HP_TOKENS.coral, fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>{errorStr}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button 
                onClick={() => setPromptRoom(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: HP_TOKENS.paper, color: HP_TOKENS.ink, border: 'none', fontWeight: 800, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button 
                onClick={handleVerifyJoin}
                style={{ flex: 1, padding: '12px', borderRadius: 12, background: HP_TOKENS.yellow, color: HP_TOKENS.ink, border: 'none', fontWeight: 800, cursor: 'pointer' }}
              >
                Gabung
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

