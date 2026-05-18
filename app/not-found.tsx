import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: '#FBF7F2',
      fontFamily: 'var(--hp-font), sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🧘‍♂️</div>
      <h1 style={{ color: '#4A7C59', fontSize: '24px', fontWeight: 800 }}>Halaman tidak ditemukan</h1>
      <p style={{ color: '#2C2A28', opacity: 0.7, margin: '10px 0 30px' }}>
        Tarik napas sejenak... mari kita kembali ke tempat yang lebih tenang.
      </p>
      <Link 
        href="/" 
        style={{
          padding: '12px 24px',
          borderRadius: '99px',
          background: '#4A7C59',
          color: '#fff',
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
