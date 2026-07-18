"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AccountPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [activeNumber, setActiveNumber] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);

    // OTP Flow State
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [msisdn, setMsisdn] = useState("");
    const [otp, setOtp] = useState("");
    const [otpStep, setOtpStep] = useState(1);
    const [authLoading, setAuthLoading] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = () => {
        setLoading(true);
        fetch("/api/auth/accounts")
            .then(res => res.json())
            .then(data => {
                setAccounts(data.accounts || []);
                setActiveNumber(data.active_number ?? null);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleSwitch = (number: number) => {
        setSwitching(number);
        fetch("/api/auth/switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ number })
        })
            .then(res => {
                if (!res.ok) return res.json().then(e => { throw new Error(e.detail || "Gagal switch akun"); });
                return res.json();
            })
            .then(() => {
                window.location.href = "/";
            })
            .catch(err => {
                alert(err.message);
                setSwitching(null);
            });
    };

    const handleDelete = (number: number) => {
        if (!confirm(`Hapus akun ${number}? Kamu perlu login ulang via OTP untuk menambahkannya kembali.`)) return;
        setDeleting(number);
        fetch(`/api/auth/accounts/${number}`, { method: "DELETE" })
            .then(res => res.json())
            .then(() => {
                fetchAccounts();
                setDeleting(null);
            })
            .catch(err => {
                console.error(err);
                setDeleting(null);
            });
    };

    const handleRequestOtp = () => {
        if (!msisdn) return alert("Masukkan nomor HP!");
        setAuthLoading(true);
        fetch("/api/auth/otp/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ msisdn })
        })
            .then(res => res.json())
            .then(data => {
                setAuthLoading(false);
                if (data.status === "SUCCESS") {
                    setOtpStep(2);
                } else {
                    alert(data.detail || "Gagal kirim OTP");
                }
            })
            .catch(err => {
                console.error(err);
                setAuthLoading(false);
                alert("Kesalahan koneksi");
            });
    };

    const handleVerifyOtp = () => {
        if (!otp) return alert("Masukkan kode OTP!");
        setAuthLoading(true);
        fetch("/api/auth/otp/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ msisdn, otp })
        })
            .then(res => res.json())
            .then(data => {
                setAuthLoading(false);
                if (data.status === "SUCCESS") {
                    setShowOtpModal(false);
                    setOtpStep(1);
                    setOtp("");
                    setMsisdn("");
                    fetchAccounts();
                } else {
                    alert(data.detail || "Kode OTP salah");
                }
            })
            .catch(err => {
                console.error(err);
                setAuthLoading(false);
                alert("Kesalahan koneksi");
            });
    };

    if (loading) {
        return (
                  <div className="loading-container animate-fade">
        <div className="loader"></div>
        <div className="loading-text">Memuat...</div>
      </div>
        );
    }

    return (
        <main style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/" className="glass-card" style={{ padding: '10px 15px', borderRadius: '12px', textDecoration: 'none', color: 'inherit' }}>
                    ←
                </Link>
                <h1 className="gradient-text" style={{ fontSize: '1.5rem' }}>Ganti Akun</h1>
            </header>

            {/* Active Number Indicator */}
            {activeNumber && (
                <div className="animate-fade" style={{
                    marginBottom: '20px', padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)',
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                    <span style={{ fontSize: '0.85rem', color: '#86efac' }}>Aktif: <strong style={{ color: '#fafafa' }}>{activeNumber}</strong></span>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {accounts.length > 0 ? (
                    accounts.map((acc, idx) => {
                        const isActive = acc.number === activeNumber;
                        return (
                            <div key={idx} className="glass-card animate-fade" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                opacity: switching && switching !== acc.number ? 0.5 : 1,
                                borderColor: isActive ? 'rgba(34, 197, 94, 0.3)' : undefined,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {isActive && (
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 6px #22c55e' }} />
                                    )}
                                    <div>
                                        <div className="value">{acc.number}</div>
                                        <div className="label">{acc.subscription_type} • {acc.subscriber_id}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {!isActive && (
                                        <button
                                            className="btn-primary"
                                            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                                            onClick={() => handleSwitch(acc.number)}
                                            disabled={switching !== null || deleting !== null}
                                        >
                                            {switching === acc.number ? "..." : "Pilih"}
                                        </button>
                                    )}
                                    <button
                                        style={{
                                            padding: '8px 12px', fontSize: '0.8rem', borderRadius: '12px',
                                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#f87171', cursor: 'pointer', transition: 'opacity 0.2s',
                                            opacity: deleting === acc.number ? 0.5 : 1,
                                        }}
                                        onClick={() => handleDelete(acc.number)}
                                        disabled={switching !== null || deleting !== null}
                                    >
                                        {deleting === acc.number ? "..." : "Hapus"}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <p>Belum ada akun tersimpan.</p>
                    </div>
                )}

                <div className="glass-card" style={{ marginTop: '20px', borderStyle: 'dashed', textAlign: 'center' }}>
                    <p style={{ marginBottom: '16px', opacity: 0.6 }}>Tambah Akun Baru (OTP)</p>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowOtpModal(true)}>Login via OTP</button>
                </div>
            </div>

            {/* OTP Modal */}
            {showOtpModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                    padding: '24px'
                }}>
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '400px' }}>
                        <h2 className="gradient-text" style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
                            {otpStep === 1 ? "Login via OTP" : "Masukkan Kode OTP"}
                        </h2>

                        {otpStep === 1 ? (
                            <div>
                                <input
                                    type="text" value={msisdn} onChange={e => setMsisdn(e.target.value)}
                                    placeholder="Nomor HP (Contoh: 0812...)"
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border-thin)', borderRadius: '12px', color: 'inherit', marginBottom: '16px' }}
                                />
                                <button className="btn-primary" style={{ width: '100%' }} onClick={handleRequestOtp} disabled={authLoading}>
                                    {authLoading ? "Mengirim..." : "Kirim OTP"}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="label" style={{ marginBottom: '12px' }}>Kode dikirim ke {msisdn}</p>
                                <input
                                    type="text" value={otp} onChange={e => setOtp(e.target.value)}
                                    placeholder="6 Digit Kode OTP"
                                    style={{ width: '100%', padding: '12px', background: 'var(--background)', border: '1px solid var(--border-thin)', borderRadius: '12px', color: 'inherit', marginBottom: '16px', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }}
                                />
                                <button className="btn-primary" style={{ width: '100%' }} onClick={handleVerifyOtp} disabled={authLoading}>
                                    {authLoading ? "Memverifikasi..." : "Verifikasi"}
                                </button>
                                <button
                                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-secondary)', marginTop: '12px', cursor: 'pointer' }}
                                    onClick={() => setOtpStep(1)}
                                >
                                    Ganti Nomor
                                </button>
                            </div>
                        )}

                        <button
                            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'inherit', fontSize: '1.5rem', cursor: 'pointer' }}
                            onClick={() => setShowOtpModal(false)}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
