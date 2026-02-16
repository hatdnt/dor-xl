"use client";

import { useState } from "react";
import Link from "next/link";

export default function PurchasePage() {
    const [familyCode, setFamilyCode] = useState("");
    const [variants, setVariants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // For detail view
    const [selectedDetail, setSelectedDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [purchaseRes, setPurchaseRes] = useState<any>(null);

    const purchaseMethods = [
        { id: 'pulsa', name: 'Pulsa', icon: '💰' },
        { id: 'pulsa_decoy', name: 'Pulsa + Decoy', icon: '🤫' },
        { id: 'pulsa_decoy_v2', name: 'Pulsa + Decoy V2', icon: '🕵️' },
        { id: 'qris', name: 'QRIS', icon: '📱' },
        { id: 'qris_decoy', name: 'QRIS + Decoy', icon: '🔄' },
        { id: 'wallet_dana', name: 'DANA', icon: '💎' },
        { id: 'wallet_ovo', name: 'OVO', icon: '💜' },
        { id: 'wallet_gopay', name: 'GoPay', icon: '🛵' },
    ];

    const handleFetchFamily = () => {
        if (!familyCode) return;
        setLoading(true);
        setError("");
        setVariants([]);
        setPurchaseRes(null);
        fetch(`/api/packages/family/${familyCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setVariants(data.data.package_variants || []);
                } else {
                    setError(data.detail || data.message || "Gagal mengambil data family");
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Terjadi kesalahan koneksi");
                setLoading(false);
            });
    };

    const fetchDetail = (variantCode: string, optionOrder: number) => {
        setDetailLoading(true);
        setPurchaseRes(null);
        fetch(`/api/packages/detail/${familyCode}/${variantCode}/${optionOrder}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setSelectedDetail(data.data);
                } else {
                    alert(data.detail || "Gagal mengambil detail");
                }
                setDetailLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert("Kesalahan koneksi saat ambil detail");
                setDetailLoading(false);
            });
    };

    const handlePurchase = (method: string) => {
        if (!selectedDetail) return;

        let walletNum = "";
        if (method.startsWith("wallet_")) {
            walletNum = prompt("Masukkan nomor dompet digital (08xx):") || "";
            if (!walletNum) return;
        }

        setLoading(true);
        setPurchaseRes(null);
        const optionOrder = selectedDetail.package_option.order;
        fetch("/api/packages/purchase/family", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                family_code: familyCode,
                option_order: optionOrder,
                method: method,
                wallet_number: walletNum
            })
        })
            .then(res => res.json())
            .then(data => {
                setLoading(false);
                if (data.status === "SUCCESS") {
                    setPurchaseRes(data);
                    if (data.data?.deeplink) {
                        window.open(data.data.deeplink, "_blank");
                    }
                } else {
                    alert("Gagal: " + (data.message || data.detail || "Error tidak diketahui"));
                }
            })
            .catch(err => {
                console.error(err);
                alert("Gagal melakukan pembelian");
                setLoading(false);
            });
    };

    if (selectedDetail) {
        return (
            <main style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
                <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => { setSelectedDetail(null); setPurchaseRes(null); }} className="glass-card" style={{ padding: '10px 15px', borderRadius: '12px', border: 'none', cursor: 'pointer', color: 'white' }}>
                        ←
                    </button>
                    <h1 className="gradient-text" style={{ fontSize: '1.5rem' }}>Detail Paket</h1>
                </header>

                <div className="glass-card animate-fade">
                    <div className="value" style={{ marginBottom: '8px' }}>{selectedDetail.package_option.name}</div>
                    <div className="label" style={{ fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 'bold', marginBottom: '16px' }}>
                        Rp {selectedDetail.package_option.price?.toLocaleString()}
                    </div>

                    {purchaseRes && purchaseRes.qris_code && (
                        <div style={{ textAlign: 'center', background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                            <div style={{ color: '#333', fontWeight: 'bold', marginBottom: '8px' }}>Pindai QRIS untuk Bayar</div>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(purchaseRes.qris_code)}`}
                                alt="QRIS"
                                style={{ maxWidth: '100%', height: 'auto' }}
                            />
                            <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '8px' }}>Atau copy link: <a href={`https://ki-ar-kod.netlify.app/?data=${btoa(purchaseRes.qris_code)}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Klik Disini</a></div>
                        </div>
                    )}

                    {!purchaseRes && (
                        <>
                            <div style={{ marginBottom: '24px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                                <div className="label" style={{ marginBottom: '8px' }}>Manfaat Utama:</div>
                                {selectedDetail.package_option?.benefits?.map((benefit: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span className="value" style={{ fontSize: '0.9rem' }}>{benefit.name}</span>
                                        <span className="label" style={{ fontSize: '0.9rem' }}>{benefit.quota_string || benefit.value || benefit.total}</span>
                                    </div>
                                ))}
                                {(!selectedDetail.package_option?.benefits || selectedDetail.package_option?.benefits.length === 0) && (
                                    <div className="label" style={{ fontSize: '0.8rem' }}>Sesuai Syarat & Ketentuan</div>
                                )}
                            </div>

                            <div className="label" style={{ marginBottom: '12px' }}>Pilih Metode Pembayaran:</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                {purchaseMethods.map(m => (
                                    <button
                                        key={m.id}
                                        className="glass-card"
                                        style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                                        onClick={() => handlePurchase(m.id)}
                                        disabled={loading}
                                    >
                                        <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{m.icon}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '500' }}>{m.name}</div>
                                    </button>
                                ))}
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <div className="label" style={{ marginBottom: '8px' }}>Deskripsi:</div>
                                <div
                                    className="label"
                                    style={{ fontSize: '0.85rem', lineHeight: '1.5', maxHeight: '150px', overflowY: 'auto' }}
                                    dangerouslySetInnerHTML={{ __html: selectedDetail.package_option.description || selectedDetail.package_option.tnc || "Tidak ada deskripsi" }}
                                />
                            </div>
                        </>
                    )}

                    {purchaseRes && !purchaseRes.qris_code && (
                        <div className="glass-card" style={{ background: 'rgba(0,255,0,0.1)', borderColor: 'rgba(0,255,0,0.2)', marginBottom: '24px' }}>
                            <div className="value" style={{ fontSize: '1.1rem', color: '#44ff44' }}>Berhasil!</div>
                            <p className="label" style={{ marginTop: '8px' }}>{purchaseRes.message || "Transaksi Anda sedang diproses."}</p>
                            {purchaseRes.data?.deeplink && (
                                <a href={purchaseRes.data.deeplink} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '12px', textDecoration: 'none', textAlign: 'center' }}>
                                    Lanjut ke Pembayaran
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/" className="glass-card" style={{ padding: '10px 15px', borderRadius: '12px', textDecoration: 'none', color: 'white' }}>
                    ←
                </Link>
                <h1 className="gradient-text" style={{ fontSize: '1.5rem' }}>Beli Paket</h1>
            </header>

            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <div className="label">Masukkan Family Code</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={familyCode}
                        onChange={(e) => setFamilyCode(e.target.value)}
                        placeholder="7658c955-a0b9..."
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            padding: '12px',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                    <button className="btn-primary" onClick={handleFetchFamily} disabled={loading}>
                        {loading ? "..." : "Cari"}
                    </button>
                </div>
                {error && <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '10px' }}>{error}</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {variants.map((variant, vIdx) => (
                    <div key={vIdx}>
                        <div className="label" style={{ marginBottom: '12px', marginLeft: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                            Variant: {variant.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {variant.package_options?.map((pkg: any, idx: number) => (
                                <div key={idx} className="glass-card animate-fade" style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }} onClick={() => fetchDetail(variant.package_variant_code, pkg.order)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div className="value" style={{ fontSize: '0.95rem' }}>{pkg.name}</div>
                                            <div className="label">Rp {pkg.price?.toLocaleString()} • {pkg.validity}</div>
                                        </div>
                                        <div style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>›</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {(detailLoading || loading) && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-card">Memproses...</div>
                </div>
            )}
        </main>
    );
}
