import Link from 'next/link';
import { HP_TOKENS } from '@/lib/constants';
import HPGlyph from "@/components/ui/HPGlyph";

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: HP_TOKENS.paper,
      fontFamily: 'var(--hp-font), sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}><HPGlyph name="leaf" size={14} color="currentColor" /></div>
      <h1 style={{ color: HP_TOKENS.successInk, fontSize: '24px', fontWeight: 700 }}>Halaman tidak ditemukan</h1>
      <p style={{ color: HP_TOKENS.ink, opacity: 0.7, margin: '10px 0 30px' }}>
        Tarik napas sejenak... mari kita kembali ke tempat yang lebih tenang.
      </p>
      <Link 
        href="/" 
        style={{
          padding: '12px 24px',
          borderRadius: '99px',
          background: HP_TOKENS.success,
          color: HP_TOKENS.onPrimary,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '14px'
        }}
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
