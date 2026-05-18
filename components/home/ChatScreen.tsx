"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useHP } from "@/lib/HPContext";
import { HP_TOKENS, HP_FONT, HP_TEXT } from "@/lib/constants";
import HPGlyph from "@/components/ui/HPGlyph";
import HPAvatar from "@/components/ui/HPAvatar";
import HPCard from "@/components/ui/HPCard";
import BlobBackground from "@/components/home/BlobBackground";

interface ChatScreenProps {
  openModal: (name: string, props?: any) => void;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  emoji: string;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderName: string | null;
}

interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string;
  reply_to: string | null;
  created_at: string;
}

export default function ChatScreen({ openModal }: ChatScreenProps) {
  const { user } = useHP();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChannelIdRef = useRef<string | null>(null);

  // Fetch channels
  useEffect(() => {
    fetchChannels();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Listen for new channel creation events
  useEffect(() => {
    const handleNewChannel = (e: CustomEvent) => {
      const channelId = e.detail?.channelId;
      if (channelId) {
        pendingChannelIdRef.current = channelId;
        fetchChannels();
      }
    };
    window.addEventListener('chat_channel_created', handleNewChannel as EventListener);
    return () => window.removeEventListener('chat_channel_created', handleNewChannel as EventListener);
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`/api/chat?userId=${user?.id}`);
      const data = await res.json();
      const channelList: Channel[] = data.channels || [];
      setChannels(channelList);

      // Auto-open pending channel after fetch
      if (pendingChannelIdRef.current) {
        const target = channelList.find(c => c.id === pendingChannelIdRef.current);
        if (target) {
          pendingChannelIdRef.current = null;
          // Delay slightly so state settles before opening
          setTimeout(() => openChannel(target), 100);
        } else {
          pendingChannelIdRef.current = null;
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Fetch messages when channel selected
  const openChannel = useCallback(async (channel: Channel) => {
    setActiveChannel(channel);
    setMsgLoading(true);
    try {
      const res = await fetch(`/api/chat?channelId=${channel.id}&userId=${user?.id}`);
      const data = await res.json();
      setMessages(data.messages || []);

      // Mark as read in channel list
      setChannels(prev => prev.map(c =>
        c.id === channel.id ? { ...c, unreadCount: 0 } : c
      ));
    } catch (e) { console.error(e); }
    setMsgLoading(false);

    // Start polling for new messages
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat?channelId=${channel.id}&userId=${user?.id}`);
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (e) { /* ignore */ }
    }, 5000);
  }, [user?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMsg = async () => {
    if (!newMessage.trim() || !activeChannel || sending) return;
    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic add
    const tempMsg: Message = {
      id: 'temp_' + Date.now(),
      channel_id: activeChannel.id,
      sender_id: user?.id || '',
      sender_name: user?.name || '',
      content,
      message_type: 'text',
      reply_to: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannel.id,
          senderId: user?.id,
          content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m =>
          m.id === tempMsg.id ? { ...data.message } : m
        ));
      }
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const handleCreateDM = async () => {
    openModal('new_chat', {
      onChannelCreated: (channelId: string) => {
        pendingChannelIdRef.current = channelId;
        fetchChannels();
      }
    });
  };

  // Format time
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  // ── Channel List View ──────────────────────────────────────────────────────
  if (!activeChannel) {
    return (
      <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 100, fontFamily: HP_FONT }}>
        <BlobBackground colors={[HP_TOKENS.blueWash, HP_TOKENS.yellowWash, '#F0E6FF']} />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 16px' }} className="hp-stagger">
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 0 12px',
          }}>
            <div style={{ ...HP_TEXT.h, fontSize: 22 }}>💬 Chat</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreateDM} className="hp-tap" style={{
                padding: '8px 14px', borderRadius: 12,
                background: HP_TOKENS.blue, color: '#fff', border: 'none',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <HPGlyph name="plus" size={14} color="#fff" />
                Chat Baru
              </button>
            </div>
          </div>

          {loading ? (
            <HPCard padding={40} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Memuat chat...</div>
            </HPCard>
          ) : channels.length === 0 ? (
            <HPCard padding={40} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗨️</div>
              <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 6 }}>Belum ada chat</div>
              <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>
                Mulai percakapan dengan rekan kerja kamu
              </div>
              <button onClick={handleCreateDM} className="hp-tap" style={{
                marginTop: 16, padding: '12px 24px', borderRadius: 14,
                background: HP_TOKENS.blue, color: '#fff', border: 'none',
                fontFamily: HP_FONT, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              }}>
                Mulai Chat Pertama
              </button>
            </HPCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {channels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => openChannel(ch)}
                  className="hp-tap"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 16,
                    background: ch.type === 'broadcast'
                      ? (ch.unreadCount > 0 ? '#FFF7ED' : '#FFFBEB')
                      : (ch.unreadCount > 0 ? HP_TOKENS.blueWash : HP_TOKENS.card),
                    border: `1.5px solid ${ch.type === 'broadcast'
                      ? '#F59E0B30'
                      : (ch.unreadCount > 0 ? `${HP_TOKENS.blue}30` : HP_TOKENS.line)}`,
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: ch.type === 'broadcast'
                      ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                      : (ch.type === 'dm' ? HP_TOKENS.yellowSoft : HP_TOKENS.blueSoft),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {ch.type === 'dm' ? <HPAvatar name={ch.name} size={42} /> : ch.emoji}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        ...HP_TEXT.h, fontSize: 14,
                        fontWeight: ch.unreadCount > 0 ? 900 : 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ch.name}
                      </div>
                      {ch.type !== 'dm' && (
                        <span style={{
                          padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 800,
                          background: ch.type === 'broadcast' ? '#FEF3C7' : HP_TOKENS.blueSoft,
                          color: ch.type === 'broadcast' ? '#D97706' : HP_TOKENS.blue,
                          fontFamily: HP_FONT,
                        }}>
                          {ch.type === 'broadcast' ? '📢 Siaran' : ch.type === 'group' ? 'Grup' : 'Tim'}
                        </span>
                      )}
                    </div>
                    {ch.lastMessage && (
                      <div style={{
                        ...HP_TEXT.small, fontSize: 12, color: HP_TOKENS.inkMute, marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontWeight: ch.unreadCount > 0 ? 700 : 400,
                      }}>
                        {ch.lastSenderName && <span style={{ fontWeight: 700 }}>{ch.lastSenderName.split(' ')[0]}: </span>}
                        {ch.lastMessage}
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {ch.lastMessageAt && (
                      <div style={{ ...HP_TEXT.tiny, fontSize: 10, color: HP_TOKENS.inkFade }}>
                        {formatTime(ch.lastMessageAt)}
                      </div>
                    )}
                    {ch.unreadCount > 0 && (
                      <div style={{
                        width: 22, height: 22, borderRadius: 11,
                        background: ch.type === 'broadcast' ? '#F59E0B' : HP_TOKENS.blue,
                        color: '#fff',
                        fontFamily: HP_FONT, fontWeight: 900, fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {ch.unreadCount > 99 ? '99+' : ch.unreadCount}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat View (Active Channel) ─────────────────────────────────────────────
  return (
    <div style={{
      position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
      fontFamily: HP_FONT,
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        background: HP_TOKENS.card, borderBottom: `1px solid ${HP_TOKENS.line}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => { setActiveChannel(null); if (pollRef.current) clearInterval(pollRef.current); fetchChannels(); }}
          className="hp-tap"
          style={{
            background: HP_TOKENS.lineSoft, border: 'none', borderRadius: 10,
            width: 34, height: 34, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <HPGlyph name="chevronLeft" size={16} color={HP_TOKENS.ink} />
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: activeChannel.type === 'broadcast'
            ? 'linear-gradient(135deg, #F59E0B, #D97706)'
            : (activeChannel.type === 'dm' ? HP_TOKENS.yellowSoft : HP_TOKENS.blueSoft),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {activeChannel.type === 'dm' ? <HPAvatar name={activeChannel.name} size={32} /> : activeChannel.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...HP_TEXT.h, fontSize: 15 }}>{activeChannel.name}</div>
          <div style={{ ...HP_TEXT.tiny, color: activeChannel.type === 'broadcast' ? '#D97706' : HP_TOKENS.inkMute }}>
            {activeChannel.type === 'dm' ? 'Direct Message' : activeChannel.type === 'broadcast' ? '📢 Pesan Siaran' : activeChannel.type === 'group' ? 'Grup Chat' : 'Team Channel'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 4,
        background: HP_TOKENS.paper,
      }}>
        {msgLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>Memuat pesan...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div style={{ ...HP_TEXT.small }}>Mulai percakapan!</div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              const showName = !isMe && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
              const showTime = i === messages.length - 1 ||
                messages[i + 1]?.sender_id !== msg.sender_id ||
                new Date(messages[i + 1]?.created_at).getTime() - new Date(msg.created_at).getTime() > 300000;

              return (
                <div key={msg.id} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  marginTop: showName ? 10 : 1,
                }}>
                  {showName && (
                    <div style={{
                      ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginBottom: 3,
                      marginLeft: isMe ? 0 : 4, marginRight: isMe ? 4 : 0,
                      fontWeight: 700, fontSize: 10,
                    }}>
                      {msg.sender_name.split(' ')[0]}
                    </div>
                  )}
                  <div style={{
                    maxWidth: '78%', padding: '10px 14px',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMe
                      ? `linear-gradient(135deg, ${HP_TOKENS.blue}, #2B5F9E)`
                      : HP_TOKENS.card,
                    color: isMe ? '#fff' : HP_TOKENS.ink,
                    border: isMe ? 'none' : `1px solid ${HP_TOKENS.line}`,
                    boxShadow: isMe
                      ? `0 2px 8px ${HP_TOKENS.blue}25`
                      : '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{
                      fontFamily: HP_FONT, fontSize: 14, lineHeight: 1.5,
                      fontWeight: 500, wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                  {showTime && (
                    <div style={{
                      ...HP_TEXT.tiny, color: HP_TOKENS.inkFade, fontSize: 9,
                      marginTop: 3, marginLeft: isMe ? 0 : 4, marginRight: isMe ? 4 : 0,
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div style={{
        padding: '10px 16px 16px', background: HP_TOKENS.card,
        borderTop: `1px solid ${HP_TOKENS.line}`,
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          placeholder="Ketik pesan..."
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 16,
            border: `1.5px solid ${HP_TOKENS.line}`,
            fontFamily: HP_FONT, fontSize: 14, outline: 'none',
            background: HP_TOKENS.paper,
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = HP_TOKENS.blue)}
          onBlur={e => (e.target.style.borderColor = HP_TOKENS.line)}
        />
        <button
          onClick={sendMsg}
          disabled={!newMessage.trim() || sending}
          className="hp-tap"
          style={{
            width: 44, height: 44, borderRadius: 14,
            background: newMessage.trim() ? HP_TOKENS.blue : HP_TOKENS.lineSoft,
            border: 'none', cursor: newMessage.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: newMessage.trim() ? `0 4px 12px ${HP_TOKENS.blue}30` : 'none',
          }}
        >
          <HPGlyph name="arrow" size={18} color={newMessage.trim() ? '#fff' : HP_TOKENS.inkMute} />
        </button>
      </div>
    </div>
  );
}
