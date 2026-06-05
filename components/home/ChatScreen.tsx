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
  const channelPollRef = useRef<NodeJS.Timeout | null>(null); // polls channel list for unread updates
  const pendingChannelIdRef = useRef<string | null>(null);
  const activeChannelRef = useRef<Channel | null>(null); // track current channel inside callbacks

  // Fetch channels on mount + start channel list polling
  useEffect(() => {
    fetchChannels();

    // ── Fallback: refresh channel list every 8s so lastMessage & unread badges update ──
    channelPollRef.current = setInterval(() => {
      fetchChannels();
    }, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (channelPollRef.current) clearInterval(channelPollRef.current);
    };
  }, []);

  // Keep activeChannelRef in sync for use in async event callbacks
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

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

  // ── Listen for real-time chat updates relayed by extension content.js ──
  // content.js writes fb_chat_update to chrome.storage when any tab sends a message,
  // then re-posts FLOWBEE_CHAT_INCOMING to window so this React app refreshes instantly.
  useEffect(() => {
    const handleIncoming = (event: MessageEvent) => {
      if (event.data?.type !== 'FLOWBEE_CHAT_INCOMING') return;
      const { channelId } = event.data;
      const current = activeChannelRef.current;
      if (current && current.id === channelId) {
        // User is in the updated channel — fetch new messages immediately
        fetch(`/api/chat?channelId=${current.id}&userId=${user?.id}`)
          .then(r => r.json())
          .then(data => setMessages(data.messages || []))
          .catch(() => {});
      } else {
        // User is on channel list — refresh to show latest lastMessage & unread badge
        fetchChannels();
      }
    };
    window.addEventListener('message', handleIncoming);
    return () => window.removeEventListener('message', handleIncoming);
  }, [user?.id]);

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
        // ── Notify extension (all tabs) that a chat message was sent ──
        // content.js intercepts FLOWBEE_CHAT_UPDATE and writes to chrome.storage
        // so every extension instance (including Gemini tab) gets updated in real-time.
        window.postMessage({
          type: 'FLOWBEE_CHAT_UPDATE',
          channelId: activeChannel.id,
          ts: Date.now(),
        }, '*');
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
  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 120px)', // Force height to fill available space and not grow
      width: '100%',
      background: HP_TOKENS.paper,
      fontFamily: HP_FONT,
      borderRadius: 24,
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(26,29,35,0.03)',
      border: `1px solid ${HP_TOKENS.line}`,
    }}>
      <style>{`
        @media (max-width: 767px) {
          .chat-sidebar { width: 100% !important; display: ${activeChannel ? 'none' : 'flex'} !important; }
          .chat-main { display: ${activeChannel ? 'flex' : 'none'} !important; }
        }
        @media (min-width: 768px) {
          .chat-sidebar { width: 320px !important; border-right: 1px solid rgba(26,29,35,0.05) !important; }
          .chat-main { display: flex !important; }
        }
      `}</style>

      {/* SIDEBAR: CHANNEL LIST */}
      <div className="chat-sidebar" style={{
        display: 'flex',
        flexDirection: 'column',
        background: HP_TOKENS.paper,
        height: '100%',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 16px 16px',
          borderBottom: `1px solid ${HP_TOKENS.line}`,
        }}>
          <div>
            <div style={{ ...HP_TEXT.h, fontSize: 20, fontWeight: 900, color: HP_TOKENS.ink }}>💬 Chat</div>
            <div style={{ ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, marginTop: 2 }}>Kolaborasi tim</div>
          </div>
          <button onClick={handleCreateDM} className="hp-tap" style={{
            padding: '8px 14px', borderRadius: 12,
            background: `linear-gradient(135deg, ${HP_TOKENS.blue}, #2B5F9E)`,
            color: '#F4F7F9', border: 'none',
            fontFamily: HP_FONT, fontWeight: 800, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: `0 4px 12px ${HP_TOKENS.blue}30`,
          }}>
            <HPGlyph name="plus" size={12} color="#F4F7F9" />
            Baru
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>
              <div className="hp-spin" style={{ display: 'inline-block', marginBottom: 8 }}>🌀</div>
              <div style={{ ...HP_TEXT.small }}>Memuat...</div>
            </div>
          ) : channels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: HP_TOKENS.inkMute }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🗨️</div>
              <div style={{ ...HP_TEXT.small }}>Belum ada chat</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {channels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => openChannel(ch)}
                  className="hp-tap"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 14,
                    background: activeChannel?.id === ch.id
                      ? HP_TOKENS.blueSoft
                      : (ch.unreadCount > 0 ? HP_TOKENS.lineSoft : 'transparent'),
                    border: 'none',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (activeChannel?.id !== ch.id) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (activeChannel?.id !== ch.id) e.currentTarget.style.background = ch.unreadCount > 0 ? '#F8FAFC' : 'transparent';
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: ch.type === 'broadcast'
                      ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                      : (ch.type === 'dm' ? HP_TOKENS.yellowSoft : HP_TOKENS.blueSoft),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {ch.type === 'dm' ? <HPAvatar name={ch.name} size={36} /> : ch.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        ...HP_TEXT.h, fontSize: 13,
                        fontWeight: ch.unreadCount > 0 ? 900 : 700,
                        color: HP_TOKENS.ink,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ch.name}
                      </div>
                      {ch.lastMessageAt && (
                        <div style={{ ...HP_TEXT.tiny, fontSize: 9, color: HP_TOKENS.inkMute, fontWeight: 600 }}>
                          {formatTime(ch.lastMessageAt)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      {ch.lastMessage && (
                        <div style={{
                          ...HP_TEXT.small, fontSize: 11, color: ch.unreadCount > 0 ? HP_TOKENS.inkSoft : HP_TOKENS.inkMute,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontWeight: ch.unreadCount > 0 ? 700 : 400,
                          flex: 1,
                        }}>
                          {ch.lastSenderName && <span>{ch.lastSenderName.split(' ')[0]}: </span>}
                          {ch.lastMessage}
                        </div>
                      )}
                      {ch.unreadCount > 0 && (
                        <div style={{
                          width: 16, height: 16, borderRadius: 8,
                          background: ch.type === 'broadcast' ? '#F59E0B' : '#3B82F6',
                          color: '#F4F7F9',
                          fontFamily: HP_FONT, fontWeight: 900, fontSize: 9,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginLeft: 4, flexShrink: 0,
                        }}>
                          {ch.unreadCount > 99 ? '99+' : ch.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT: CHAT VIEW */}
      <div className="chat-main" style={{
        flex: 1,
        flexDirection: 'column',
        background: HP_TOKENS.paper,
        height: '100%',
        borderLeft: `1px solid ${HP_TOKENS.line}`
      }}>
        {activeChannel ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
              background: HP_TOKENS.card,
              backdropFilter: 'blur(12px)',
              borderBottom: `1px solid ${HP_TOKENS.line}`,
              position: 'sticky', top: 0, zIndex: 10,
              boxShadow: '0 4px 20px rgba(26,29,35,0.02)',
            }}>
              <button
                onClick={() => { setActiveChannel(null); if (pollRef.current) clearInterval(pollRef.current); fetchChannels(); }}
                className="hp-tap"
                style={{
                  background: 'rgba(26, 29, 35, 0.04)', border: 'none', borderRadius: 12,
                  width: 36, height: 36, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(26, 29, 35, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(26, 29, 35, 0.04)')}
              >
                <HPGlyph name="chevronLeft" size={16} color={HP_TOKENS.ink} />
              </button>
              <div style={{
                width: 42, height: 42, borderRadius: 14,
                background: activeChannel.type === 'broadcast'
                  ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                  : (activeChannel.type === 'dm' ? HP_TOKENS.yellowSoft : HP_TOKENS.blueSoft),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
                boxShadow: '0 2px 6px rgba(26,29,35,0.05)',
              }}>
                {activeChannel.type === 'dm' ? <HPAvatar name={activeChannel.name} size={38} /> : activeChannel.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...HP_TEXT.h, fontSize: 16, fontWeight: 800, color: HP_TOKENS.ink }}>{activeChannel.name}</div>
                <div style={{ ...HP_TEXT.tiny, color: activeChannel.type === 'broadcast' ? '#D97706' : HP_TOKENS.inkSoft, fontWeight: 600 }}>
                  {activeChannel.type === 'dm' ? 'Direct Message' : activeChannel.type === 'broadcast' ? '📢 Pesan Siaran' : activeChannel.type === 'group' ? 'Grup Chat' : 'Team Channel'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 12,
              background: HP_TOKENS.paper,
            }}>
              {msgLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: HP_TOKENS.inkMute }}>
                  <div className="hp-spin" style={{ display: 'inline-block', marginBottom: 12 }}>🌀</div>
                  <div style={{ ...HP_TEXT.small }}>Memuat pesan...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: HP_TOKENS.inkMute }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                  <div style={{ ...HP_TEXT.h, fontSize: 16, marginBottom: 4, color: HP_TOKENS.ink }}>Mulai percakapan!</div>
                  <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Kirim pesan pertama Anda di sini.</div>
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
                        marginTop: showName ? 16 : 2,
                      }}>
                        {showName && (
                          <div style={{
                            ...HP_TEXT.tiny, color: HP_TOKENS.inkSoft, marginBottom: 4,
                            marginLeft: isMe ? 0 : 8, marginRight: isMe ? 8 : 0,
                            fontWeight: 700, fontSize: 11,
                          }}>
                            {msg.sender_name.split(' ')[0]}
                          </div>
                        )}
                        <div style={{
                          maxWidth: '75%', padding: '12px 16px',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: isMe
                            ? `linear-gradient(135deg, ${HP_TOKENS.blue}, #1e40af)`
                            : HP_TOKENS.card,
                          color: isMe ? '#fff' : HP_TOKENS.ink,
                          border: isMe ? 'none' : `1px solid ${HP_TOKENS.line}`,
                          boxShadow: isMe
                            ? `0 4px 12px rgba(59, 130, 246, 0.2)`
                            : '0 2px 6px rgba(26,29,35,0.02)',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                        }}
                        >
                          <div style={{
                            fontFamily: HP_FONT, fontSize: 14, lineHeight: 1.6,
                            fontWeight: 500, wordBreak: 'break-word',
                          }}>
                            {msg.content}
                          </div>
                        </div>
                        {showTime && (
                          <div style={{
                            ...HP_TEXT.tiny, color: HP_TOKENS.inkMute, fontSize: 10,
                            marginTop: 4, marginLeft: isMe ? 0 : 8, marginRight: isMe ? 8 : 0,
                            fontWeight: 600,
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
              padding: '16px 20px 20px', 
              background: HP_TOKENS.card,
              backdropFilter: 'blur(12px)',
              borderTop: `1px solid ${HP_TOKENS.line}`,
              display: 'flex', gap: 12, alignItems: 'flex-end',
            }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                  placeholder="Ketik pesan..."
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 16,
                    border: `1.5px solid ${HP_TOKENS.line}`,
                    fontFamily: HP_FONT, fontSize: 14, outline: 'none',
                    background: HP_TOKENS.paper,
                    color: HP_TOKENS.ink,
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = HP_TOKENS.blue;
                    e.target.style.boxShadow = `0 0 0 4px ${HP_TOKENS.blue}20`;
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = HP_TOKENS.line;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              <button
                onClick={sendMsg}
                disabled={!newMessage.trim() || sending}
                className="hp-tap"
                style={{
                  width: 48, height: 48, borderRadius: 16,
                  background: newMessage.trim() ? 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)' : 'rgba(26, 29, 35, 0.05)',
                  border: 'none', cursor: newMessage.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: newMessage.trim() ? `0 4px 12px rgba(59, 130, 246, 0.3)` : 'none',
                }}
              >
                <HPGlyph name="arrow" size={20} color={newMessage.trim() ? '#fff' : '#94A3B8'} />
              </button>
            </div>
          </>
        ) : (
          /* Placeholder */
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            color: HP_TOKENS.inkMute 
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
            <div style={{ ...HP_TEXT.h, fontSize: 18, marginBottom: 4, color: HP_TOKENS.ink }}>Pilih Chat</div>
            <div style={{ ...HP_TEXT.small, color: HP_TOKENS.inkMute }}>Pilih percakapan untuk mulai mengobrol.</div>
          </div>
        )}
      </div>
    </div>
  );
}
