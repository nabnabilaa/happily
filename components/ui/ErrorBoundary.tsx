"use client";

import React from "react";
import { HP_TOKENS, HP_FONT } from "@/lib/constants";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: HP_TOKENS.paper, fontFamily: HP_FONT, padding: 24, textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Oops, ada yang salah</h2>
          <p style={{ fontSize: 13, color: HP_TOKENS.inkMute, marginBottom: 24, maxWidth: 300 }}>
            {this.state.error?.message || "Terjadi kesalahan yang tidak terduga."}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("hp_user_id");
              window.location.reload();
            }}
            style={{
              padding: '12px 24px', borderRadius: 14, border: 'none',
              background: HP_TOKENS.ink, color: '#F4F7F9',
              fontFamily: HP_FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer'
            }}
          >
            Logout & Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
