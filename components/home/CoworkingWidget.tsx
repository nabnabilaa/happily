"use client";

import React, { useState, useEffect } from "react";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPCard from "@/components/ui/HPCard";
import HPGlyph from "@/components/ui/HPGlyph";
import { Row, Modal, HPButton, HPInput } from "@/components/ui";
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
    let pusherInstance: any;
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';
    let fallbackTimer: NodeJS.Timeout | null = null;

    const startFallback = () => {
      if (!fallbackTimer) {
        console.warn("[CoworkingWidget] Pusher unavailable or limit reached. Falling back to HTTP polling.");
        fallbackTimer = setInterval(fetchRooms, 10000);
      }
    };

    if (pusherKey && !pusherKey.includes('MASUKKAN')) {
      import('pusher-js').then(({ default: PusherClient }) => {
        if (!(window as any).Pusher) (window as any).Pusher = PusherClient;
        pusherInstance = new PusherClient(pusherKey, {
          cluster: pusherCluster,
          authEndpoint: '/api/pusher/auth',
          auth: { params: { user_id: user?.id } }
        });

        pusherInstance.connection.bind('error', function(err: any) {
          if (err?.error?.data?.code === 4004 || err?.type === 'WebSocketError') {
            startFallback();
          }
        });

        pusherInstance.connection.bind('state_change', function(states: any) {
          if (states.current === 'unavailable' || states.current === 'failed' || states.current === 'disconnected') {
            startFallback();
          } else if (states.current === 'connected' && fallbackTimer) {
            // Recovered
            clearInterval(fallbackTimer);
            fallbackTimer = null;
          }
        });

        pusherChannel = pusherInstance.subscribe('presence-lobby');
        pusherChannel.bind('lobby-update', fetchRooms);
      });
    } else {
      // Fallback polling for local development without Pusher
      startFallback();
    }

    return () => {
      if (pusherChannel) {
        pusherChannel.unbind('lobby-update', fetchRooms);
        pusherChannel.unsubscribe();
      }
      if (pusherInstance) pusherInstance.disconnect();
      if (fallbackTimer) clearInterval(fallbackTimer);
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
    // Spacing between blocks belongs to the screen's layout gap, not to the
    // widget — a self-applied marginTop stacks on top of it and breaks rhythm.
    <section>
      <SectionHeader icon="compass" label="Live Coworking Lounge" />
      
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <Row gap={2} align="flex-start" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <HPInput
            aria-label="Cari ruang atau masukkan kode"
            placeholder="Cari ruang atau masukkan kode…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <HPButton
          variant="primary"
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
              setErrorStr("Kode tidak valid atau ruang tidak ditemukan.");
            }
          }}
        >
          Gabung
        </HPButton>
      </Row>

      {errorStr && (
        <p role="alert" style={{ ...HP_TEXT.small, color: HP_TOKENS.danger, marginTop: -8, marginBottom: 12 }}>
          {errorStr}
        </p>
      )}

      <div className="hide-scroll" style={{ display: 'flex', overflowX: 'auto', gap: 16, paddingBottom: 12, margin: '0 -4px', paddingLeft: 4, paddingRight: 4 }}>
        <button 
          onClick={handleCreateRoom}
          disabled={loading}
          className="hp-tap"
          style={{
            minWidth: 160, flexShrink: 0, padding: '16px', borderRadius: HP_TOKENS.radiusLg,
            background: 'transparent', color: HP_TOKENS.inkMute,
            border: `2px dashed ${HP_TOKENS.line}`, cursor: loading ? 'wait' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: HP_FONT, fontWeight: 700, fontSize: 14,
            transition: 'all 0.2s', opacity: loading ? 0.5 : 1
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: HP_TOKENS.successWash, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HPGlyph name="plus" size={24} color={HP_TOKENS.sage}/>
          </div>
          Buat Ruang
        </button>

        {activeRooms.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.code.includes(searchQuery.toUpperCase())).map(room => (
          <div key={room.id} style={{ minWidth: 260, maxWidth: 280, flexShrink: 0 }}>
            <HPCard 
              padding={16}
              style={{ 
                background: `${HP_TOKENS.sageWash}`, 
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
                      ...HP_TEXT.tiny, padding: '2px 8px', borderRadius: HP_TOKENS.radiusXs,
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
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: p.isHost ? HP_TOKENS.yellowWash : HP_TOKENS.sunken,
                    padding: '4px 12px 4px 4px', borderRadius: HP_TOKENS.radiusPill,
                  }}>
                    <div style={{
                      ...HP_TEXT.tiny,
                      width: 24, height: 24, borderRadius: '50%',
                      background: p.isHost ? HP_TOKENS.yellow : HP_TOKENS.card,
                      color: HP_TOKENS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {p.avatar
                        ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : p.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ ...HP_TEXT.small, color: HP_TOKENS.ink }}>
                      {p.name.split(' ')[0]}
                      {p.isHost && <span className="hp-sr-only"> (host)</span>}
                    </span>
                    {p.isHost && <HPGlyph name="star" size={11} color={HP_TOKENS.yellowDark} />}
                  </div>
                ))}
              </div>

              {(() => {
                const isBanned = user?.id ? room.bannedUsers?.includes(user.id) : false;
                const isAlreadyParticipant = user?.id ? room.participants?.some(p => String(p.id) === String(user.id)) : false;
                
                if (isAlreadyParticipant) {
                  return (
                    <HPButton
                      size="sm"
                      fullWidth
                      icon="arrow"
                      onClick={() => openModal('focus', {
                        initialMultiplayer: true,
                        initialRoomCode: room.id,
                        initialMode: room.mode,
                        initialDuration: room.durationMins,
                        initialRemainingMins: room.remainingMins,
                        isGuest: !room.participants?.find(p => String(p.id) === String(user?.id))?.isHost
                      })}
                      style={{ marginTop: 8, color: HP_TOKENS.success, borderColor: HP_TOKENS.success }}
                    >
                      Masuk kembali
                    </HPButton>
                  );
                }

                return (
                  <HPButton
                    size="sm"
                    variant="primary"
                    fullWidth
                    onClick={() => handleJoinClick(room)}
                    disabled={isBanned || room.status === 'started'}
                    style={{ marginTop: 8 }}
                  >
                    {isBanned ? 'Dilarang masuk' : room.status === 'started' ? 'Sesi berlangsung' : 'Ikut (minta kode)'}
                  </HPButton>
                );
              })()}
            </HPCard>
          </div>
        ))}
      </div>

      {promptRoom && (
        <Modal
          onClose={() => setPromptRoom(null)}
          title="Masukkan kode room"
          description={`Minta kode dari ${promptRoom.participants?.find(p => p.isHost)?.name || 'host'} untuk bergabung ke ${promptRoom.name}.`}
          footer={
            <>
              <HPButton fullWidth onClick={() => setPromptRoom(null)}>Batal</HPButton>
              <HPButton variant="primary" fullWidth onClick={handleVerifyJoin}>Gabung</HPButton>
            </>
          }
        >
          <HPInput
            autoFocus
            aria-label="Kode room"
            value={inputCode}
            onChange={e => {
              setInputCode(e.target.value.toUpperCase());
              setErrorStr("");
            }}
            onKeyDown={e => e.key === 'Enter' && handleVerifyJoin()}
            placeholder="D8F2"
            maxLength={4}
            error={errorStr || undefined}
            style={{
              ...HP_TEXT.metric,
              textAlign: 'center',
              letterSpacing: 8,
              textTransform: 'uppercase',
            }}
          />
        </Modal>
      )}
    </section>
  );
}

