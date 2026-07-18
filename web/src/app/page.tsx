"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => {
        if (!res.ok) { setLoading(false); return; }
        return res.json();
      })
      .then(data => {
        if (data) setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-container animate-fade">
        <div className="loader"></div>
        <div className="loading-text">Memuat...</div>
      </div>
    );
  }

  return (
    <main style={{ padding: '40px 24px', maxWidth: '640px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>XL DOR</h1>
        <div className="status-badge status-active">Online</div>
      </header>

      {profile ? (
        <div className="glass-card animate-fade">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div className="label">Nomor HP</div>
              <div className="value">{profile.number}</div>
            </div>
            <div>
              <div className="label">Tipe Akun</div>
              <div className="value">{profile.subscription_type}</div>
            </div>
            <div>
              <div className="label">Pulsa Terkini</div>
              <div className="value" style={{ color: 'var(--accent)' }}>Rp {profile.balance?.toLocaleString() || 0}</div>
            </div>
            <div>
              <div className="label">Masa Aktif</div>
              <div className="value">{new Date(profile.balance_expired_at * 1000).toLocaleDateString()}</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border-thin)', boxShadow: 'inset 0 4px 6px rgba(0, 0, 0, 0.3)' }}>
            <div className="label">Loyalty Info</div>
            <div className="value" style={{ fontSize: '0.9rem' }}>{profile.point_info}</div>
          </div>
        </div>
      ) : (
        <div className="glass-card animate-fade" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Belum ada akun yang aktif. Silakan pilih di menu Ganti Akun / Login.</p>
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Link href="/packages" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ cursor: 'pointer', textAlign: 'center', height: '100%' }}>
            {/* Mengubah flex-direction menjadi column dan menambah padding vertikal */}
            <div className="value" style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-house-wifi-icon"><path d="M9.5 13.866a4 4 0 0 1 5 .01" /><path d="M12 17h.01" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M7 10.754a8 8 0 0 1 10 0" /></svg>
              <span>Cek Kouta</span>
            </div>
          </div>
        </Link>

        <Link href="/purchase" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ cursor: 'pointer', textAlign: 'center', height: '100%' }}>
            {/* Mengubah flex-direction menjadi column dan menambah padding vertikal */}
            <div className="value" style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-store-icon lucide-store"><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" /><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" /><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" /></svg>
              <span>Beli Kouta</span>
            </div>
          </div>
        </Link>
      </div>


      <div style={{ marginTop: '16px' }}>
        <Link href="/account" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="glass-card" style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div className="value" style={{ fontSize: '0.9rem' }}>Ganti Akun / Login</div>
          </div>
        </Link>
      </div>
    </main>
  );
}
