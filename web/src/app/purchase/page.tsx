"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PurchasePage() {
    const [familyCode, setFamilyCode] = useState("");
    const [variants, setVariants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [history, setHistory] = useState<{ code: string, name: string }[]>([]);
    const [autoBuyData, setAutoBuyData] = useState<any>({ configs: [], logs: [] });
    const [showAutoBuyModal, setShowAutoBuyModal] = useState(false);
    const [tempAutoBuy, setTempAutoBuy] = useState<any>({
        familyCode: '',
        familyName: '',
        packages: [],
        quotas: [],
        step: 'SELECT_FAMILY', // 'SELECT_FAMILY' | 'SELECT_PACKAGE' | 'SELECT_QUOTA'
        loading: false,
        selectedPackage: null
    });

    useEffect(() => {
        // Fetch from server (Redis)
        fetch("/api/bookmarks/family")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setHistory(data);
                    localStorage.setItem("family_code_bookmarks", JSON.stringify(data));
                }
            })
            .catch(err => {
                console.error("Failed to fetch bookmarks from server", err);
                const savedHistory = localStorage.getItem("family_code_bookmarks");
                if (savedHistory) {
                    try {
                        setHistory(JSON.parse(savedHistory));
                    } catch (e) { }
                }
            });
        // Fetch AutoBuy data with cache-busting
        fetch(`/api/autobuy/configs?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setAutoBuyData(data.data);
                }
            })
            .catch(err => console.error("Failed to fetch autobuy configs", err));
    }, []);

    // For detail view
    const [selectedDetail, setSelectedDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [purchaseRes, setPurchaseRes] = useState<any>(null);
    const [customQrisAmount, setCustomQrisAmount] = useState("");

    const purchaseMethods = [
        { id: 'pulsa', name: 'Pulsa' },
        { id: 'pulsa_decoy', name: 'Pulsa + Decoy' },
        { id: 'pulsa_decoy_v2', name: 'Pulsa + Decoy V2' },
        { id: 'qris', name: 'QRIS' },
        { id: 'qris_decoy', name: 'QRIS + Decoy' },
        { id: 'wallet_dana', name: 'DANA' },
        { id: 'wallet_ovo', name: 'OVO' },
        { id: 'wallet_gopay', name: 'GoPay' },
    ];

    const handleFetchFamily = (codeToFetch?: string) => {
        const targetCode = codeToFetch || familyCode;
        if (!targetCode) return;

        if (codeToFetch) setFamilyCode(codeToFetch);

        setLoading(true);
        setError("");
        setVariants([]);
        setPurchaseRes(null);
        fetch(`/api/packages/family/${targetCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setVariants(data.data.package_variants || []);
                    localStorage.setItem("last_family_code", targetCode);
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

    const removeHistory = (e: React.MouseEvent, codeToRemove: string) => {
        e.stopPropagation();
        if (!confirm("Hapus bookmark ini?")) return;

        const newHistory = history.filter(item => item.code !== codeToRemove);
        setHistory(newHistory);
        localStorage.setItem("family_code_bookmarks", JSON.stringify(newHistory));

        // Sync to Redis
        fetch("/api/bookmarks/family", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: codeToRemove, action: "delete" })
        });
    };

    const addOrEditBookmark = (code: string, currentName?: string) => {
        const alias = prompt("Masukkan nama untuk bookmark ini:", currentName || "") || "";
        if (!alias && !currentName) return;

        const name = alias || currentName || code;

        const exists = history.find(item => item.code === code);
        let updated;
        if (exists) {
            updated = history.map(item => item.code === code ? { ...item, name } : item);
        } else {
            updated = [{ code, name }, ...history].slice(0, 30);
        }
        setHistory(updated);
        localStorage.setItem("family_code_bookmarks", JSON.stringify(updated));

        // Sync to Redis
        fetch("/api/bookmarks/family", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, name, action: "update" })
        });
    };

    const handleToggleAutoBuy = (config: any) => {
        const updated = { ...config, enabled: !config.enabled };
        fetch("/api/autobuy/configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated)
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setAutoBuyData(data.data);
                } else {
                    alert(data.message || "Gagal memperbarui konfigurasi");
                }
            });
    };

    const handleDeleteAutoBuy = (id: string) => {
        if (!confirm("Hapus auto-buy ini?")) return;
        fetch(`/api/autobuy/configs/${id}`, { method: "DELETE" })
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setAutoBuyData(data.data);
                } else {
                    alert(data.message || "Gagal menghapus konfigurasi");
                }
            });
    };


    const refreshAutoBuyData = () => {
        fetch(`/api/autobuy/configs?t=${Date.now()}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") setAutoBuyData(data.data);
            });
    };

    const handleClearLogs = () => {
        if (!confirm("Hapus semua log aktifitas?")) return;
        fetch("/api/autobuy/logs", { method: "DELETE" })
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") setAutoBuyData(data.data);
            });
    };

    const handleResetAutoBuy = () => {
        if (!confirm("⚠️ PERINGATAN: Ini akan menghapus SEMUA konfigurasi dan log. Lanjutkan?")) return;
        fetch("/api/autobuy/reset", { method: "POST" })
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setAutoBuyData(data.data);
                    alert("Seluruh data Auto Buy berhasil diriset.");
                } else {
                    alert(data.message || "Gagal meriset data");
                }
            });
    };

    const handleAddAutoBuy = () => {
        setShowAutoBuyModal(true);
        setTempAutoBuy({
            familyCode: '',
            familyName: '',
            packages: [],
            step: 'SELECT_FAMILY',
            loading: false,
            quotaKeyword: 'Utama'
        });
    };

    const handleSelectFamilyAutoBuy = (code: string, name: string) => {
        setTempAutoBuy((prev: any) => ({ ...prev, loading: true, familyCode: code, familyName: name }));
        fetch(`/api/packages/family/${code}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    const allPkg: any[] = [];
                    data.data.package_variants.forEach((v: any) => {
                        v.package_options.forEach((p: any) => {
                            allPkg.push({ ...p, variantName: v.name, variantCode: v.package_variant_code });
                        });
                    });
                    setTempAutoBuy((prev: any) => ({
                        ...prev,
                        packages: allPkg,
                        step: 'SELECT_PACKAGE',
                        loading: false
                    }));
                } else {
                    alert("Gagal mengambil data paket");
                    setTempAutoBuy((prev: any) => ({ ...prev, loading: false }));
                }
            })
            .catch(() => {
                alert("Kesalahan koneksi");
                setTempAutoBuy((prev: any) => ({ ...prev, loading: false }));
            });
    };

    const handleConfirmAutoBuy = (pkg: any) => {
        setTempAutoBuy((prev: any) => ({ ...prev, selectedPackage: pkg, loading: true, step: 'SELECT_QUOTA' }));

        // Fetch active quotas to select from
        fetch("/api/packages/my")
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    const allQuotas: string[] = [];
                    data.data.quotas.forEach((q: any) => {
                        q.benefits.forEach((b: any) => {
                            if (!allQuotas.includes(b.name)) allQuotas.push(b.name);
                        });
                    });
                    setTempAutoBuy((prev: any) => ({ ...prev, quotas: allQuotas, loading: false }));
                } else {
                    alert("Gagal mengambil data kuota aktif. Silakan masukkan keyword manual.");
                    const manual = prompt("Masukkan keyword kuota (misal: 'Utama'):", "Utama");
                    if (manual) finishAutoBuy(pkg, manual);
                    else setTempAutoBuy((prev: any) => ({ ...prev, loading: false, step: 'SELECT_PACKAGE' }));
                }
            })
            .catch(() => {
                alert("Kesalahan koneksi saat ambil kuota");
                setTempAutoBuy((prev: any) => ({ ...prev, loading: false, step: 'SELECT_PACKAGE' }));
            });
    };

    const finishAutoBuy = (pkg: any, keyword: string) => {
        if (tempAutoBuy.loading) return;
        setTempAutoBuy((prev: any) => ({ ...prev, loading: true }));

        const newConfig = {
            family_code: tempAutoBuy.familyCode,
            variant_code: pkg.variantCode,
            package_order: pkg.order,
            quota_keyword: keyword,
            enabled: true
        };

        fetch("/api/autobuy/configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newConfig)
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === "SUCCESS") {
                    setAutoBuyData(data.data);
                    setShowAutoBuyModal(false);
                    setTempAutoBuy((prev: any) => ({ ...prev, loading: false }));
                    alert(`Auto-buy '${keyword}' berhasil dikonfigurasi!`);
                } else {
                    alert("Gagal: " + (data.message || "Gagal menyimpan"));
                    setTempAutoBuy((prev: any) => ({ ...prev, loading: false }));
                }
            })
            .catch(() => {
                setTempAutoBuy((prev: any) => ({ ...prev, loading: false }));
                alert("Gagal menyimpan konfigurasi");
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
                variant_code: selectedDetail.package_variant_code,
                option_order: optionOrder,
                method: method,
                wallet_number: walletNum,
                custom_amount: method.includes("qris") ? customQrisAmount : undefined
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
                    <button onClick={() => { setSelectedDetail(null); setPurchaseRes(null); setCustomQrisAmount(""); }} className="glass-card" style={{ padding: '10px 15px', borderRadius: '12px', border: 'none', cursor: 'pointer', color: 'inherit' }}>
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

                            <div className="label" style={{ marginBottom: '12px', color: 'inherit' }}>Atur Nominal QRIS (Opsional):</div>
                            <div style={{ marginBottom: '20px' }}>
                                <input
                                    type="text"
                                    placeholder={`Contoh: ${(selectedDetail.package_option.price || 0).toLocaleString('id-ID')}`}
                                    value={customQrisAmount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\./g, "");
                                        if (raw === "") {
                                            setCustomQrisAmount("");
                                            return;
                                        }
                                        const num = parseInt(raw);
                                        if (!isNaN(num)) {
                                            setCustomQrisAmount(num.toLocaleString("id-ID"));
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        background: 'var(--background)',
                                        border: '1px solid var(--border-thin)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        color: 'inherit',
                                        outline: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                />
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '6px', marginLeft: '4px' }}>
                                    Wajib diisi jika harga paket berbeda dengan nominal di aplikasi.
                                </div>
                            </div>

                            <div className="label" style={{ marginBottom: '12px', color: 'inherit' }}>Pilih Metode Pembayaran:</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                {purchaseMethods.map(m => (
                                    <button
                                        key={m.id}
                                        className="glass-card"
                                        style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border-thin)', borderRadius: '12px', color: 'inherit' }}
                                        onClick={() => handlePurchase(m.id)}
                                        disabled={loading}
                                    >
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
                        <div className="glass-card" style={{ background: 'var(--background)', borderColor: 'var(--border-thin)', marginBottom: '24px' }}>
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
                <Link href="/" className="glass-card" style={{ padding: '10px 15px', borderRadius: '12px', textDecoration: 'none', color: 'inherit' }}>
                    ←
                </Link>
                <h1 className="gradient-text" style={{ fontSize: '1.5rem' }}>Beli Paket</h1>
            </header>

            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <div className="label">Masukkan Family Code</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    <input
                        type="text"
                        value={familyCode}
                        onChange={(e) => setFamilyCode(e.target.value)}
                        placeholder="7658c955-a0b9..."
                        style={{
                            flex: 1,
                            minWidth: 0,
                            background: 'var(--background)',
                            border: '1px solid var(--border-thin)',
                            borderRadius: '12px',
                            padding: '12px',
                            color: 'inherit',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    />
                    <button
                        className="btn-primary"
                        style={{ padding: '0 16px', flexShrink: 0, fontSize: '0.8rem' }}
                        onClick={() => handleFetchFamily()}
                        disabled={loading}
                    >
                        {loading ? "..." : "Cari"}
                    </button>
                    {familyCode && (
                        <button
                            className="glass-card"
                            style={{
                                padding: '0 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--accent)',
                                color: 'var(--accent)',
                                cursor: 'pointer',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onClick={() => addOrEditBookmark(familyCode)}
                            title="Simpan ke Bookmark"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bookmark-icon lucide-bookmark"><path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" /></svg>
                        </button>
                    )}
                </div>
                {error && <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '10px' }}>{error}</p>}
            </div>

            {history.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <div className="label" style={{ marginLeft: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>Bookmark Tersimpan</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                        {history.map((item, i) => (
                            <div
                                key={i}
                                className="glass-card animate-fade"
                                style={{
                                    padding: '12px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    animationDelay: `${i * 0.05}s`,
                                    border: familyCode === item.code ? '1px solid var(--accent)' : '1px solid var(--border-thin)'
                                }}
                                onClick={() => handleFetchFamily(item.code)}
                            >
                                <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px', zIndex: 10 }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); addOrEditBookmark(item.code, item.name); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem' }}
                                        title="Edit Nama"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => removeHistory(e, item.code)}
                                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.9rem' }}
                                        title="Hapus"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                </div>
                                <div style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    color: 'inherit',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    paddingRight: '30px'
                                }}>
                                    {item.name}
                                </div>
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--text-secondary)',
                                    fontFamily: 'monospace',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.code.substring(0, 8)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {variants.map((variant, vIdx) => (
                    <div key={vIdx}>
                        <div className="label" style={{ marginBottom: '12px', marginLeft: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                            {vIdx + 1}. Variant: {variant.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {variant.package_options?.map((pkg: any, idx: number) => (
                                <div key={idx} className="glass-card animate-fade" style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }} onClick={() => fetchDetail(variant.package_variant_code, pkg.order)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div className="value" style={{ fontSize: '0.95rem' }}>{idx + 1}. {pkg.name}</div>
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
            <div style={{ marginTop: '48px', borderTop: '1px solid var(--border-thin)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 className="gradient-text" style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-cart-icon lucide-shopping-cart"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
                            Auto Buy
                        </h2>
                    </div>
                    <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={handleAddAutoBuy}>+ Tambah</button>
                </div>

                {(autoBuyData.configs || []).length === 0 ? (
                    <div className="label" style={{ textAlign: 'center', padding: '20px' }}>Belum ada konfigurasi auto-buy.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(autoBuyData.configs || []).map((config: any, i: number) => (
                            <div key={i} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: config.enabled ? 1 : 0.6 }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px', color: 'inherit' }}>
                                        Quota: <span style={{ color: 'var(--accent)' }}>{config.quota_keyword}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                        Family: {config.family_code.substring(0, 8)}... | Order: {config.package_order}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div
                                        onClick={() => handleToggleAutoBuy(config)}
                                        style={{
                                            width: '40px',
                                            height: '20px',
                                            background: config.enabled ? 'var(--accent)' : '#444',
                                            borderRadius: '20px',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: '0.3s'
                                        }}
                                    >
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            background: 'white',
                                            borderRadius: '50%',
                                            position: 'absolute',
                                            top: '2px',
                                            left: config.enabled ? '22px' : '2px',
                                            transition: '0.3s'
                                        }} />
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAutoBuy(config.id)}
                                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Logs Section */}
                <div style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div className="label" style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity-icon lucide-activity"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" /></svg>
                            Activity Logs (Auto Buy)
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={handleResetAutoBuy} style={{ background: 'none', border: 'none', color: '#ff8800', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                                Reset
                            </button>
                            <button onClick={refreshAutoBuyData} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw-icon lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
                                Refresh
                            </button>
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '10px', maxHeight: '200px', overflowY: 'auto', fontSize: '0.75rem', background: 'var(--background)' }}>
                        {(autoBuyData.logs || []).length === 0 ? (
                            <div className="label" style={{ textAlign: 'center', padding: '10px' }}>Belum ada log aktifitas.</div>
                        ) : (
                            (autoBuyData.logs || []).map((log: any, idx: number) => (
                                <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '10px' }}>
                                    <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>[{log.timestamp.split(' ')[3]}]</span>
                                    <span style={{
                                        color: log.status === 'SUCCESS' ? '#44ff44' :
                                            log.status === 'FAILED' ? '#ff4444' :
                                                log.status === 'PING' ? 'var(--accent)' : 'var(--text-secondary)',
                                        fontWeight: 'bold',
                                        minWidth: '60px'
                                    }}>{log.status}</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '24px', textAlign: 'center' }}>
                    Sistem mengecek kuota secara berkala via Vercel Cron. Tersinkronisasi dengan Redis.
                </p>
            </div>
            {showAutoBuyModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 className="gradient-text">Konfigurasi Auto Buy</h3>
                            <button onClick={() => setShowAutoBuyModal(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                        </div>

                        {tempAutoBuy.step === 'SELECT_FAMILY' && (
                            <div>
                                <div className="label" style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Pilih Family dari Bookmark:</div>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    {history.map((item, idx) => (
                                        <button
                                            key={idx}
                                            className="glass-card"
                                            style={{ textAlign: 'left', padding: '12px', cursor: 'pointer', border: '1px solid var(--border-thin)', color: 'inherit' }}
                                            onClick={() => handleSelectFamilyAutoBuy(item.code, item.name)}
                                            disabled={tempAutoBuy.loading}
                                        >
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'inherit' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.code.substring(0, 12)}...</div>
                                        </button>
                                    ))}
                                    {history.length === 0 && <p className="label" style={{ color: 'var(--text-secondary)' }}>Belum ada bookmark untuk dipilih.</p>}
                                </div>
                            </div>
                        )}

                        {tempAutoBuy.step === 'SELECT_PACKAGE' && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <button onClick={() => setTempAutoBuy((p: any) => ({ ...p, step: 'SELECT_FAMILY' }))} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>← Ganti</button>
                                    <div className="label" style={{ color: 'var(--text-secondary)' }}>Pilih Paket untuk <span style={{ color: 'inherit' }}>{tempAutoBuy.familyName}</span>:</div>
                                </div>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {tempAutoBuy.packages.map((pkg: any, idx: number) => (
                                        <button
                                            key={idx}
                                            className="glass-card"
                                            style={{ textAlign: 'left', padding: '12px', cursor: 'pointer', border: '1px solid var(--border-thin)', color: 'inherit' }}
                                            onClick={() => handleConfirmAutoBuy(pkg)}
                                            disabled={tempAutoBuy.loading}
                                        >
                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'inherit' }}>{pkg.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rp {pkg.price.toLocaleString()} • {pkg.variantName}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tempAutoBuy.step === 'SELECT_QUOTA' && !tempAutoBuy.loading && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <button onClick={() => setTempAutoBuy((p: any) => ({ ...p, step: 'SELECT_PACKAGE' }))} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>← Ganti Paket</button>
                                    <div className="label" style={{ color: 'var(--text-secondary)' }}>Pilih Kuota untuk Dipantau:</div>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Pilih satu nama kuota dari akun Anda yang ingin dicek (Jika 0, paket akan dibeli otomatis).</p>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {tempAutoBuy.quotas.map((qName: string, idx: number) => (
                                        <button
                                            key={idx}
                                            className="glass-card"
                                            style={{ textAlign: 'left', padding: '12px', cursor: 'pointer', border: '1px solid var(--border-thin)', color: 'inherit' }}
                                            onClick={() => finishAutoBuy(tempAutoBuy.selectedPackage, qName)}
                                            disabled={tempAutoBuy.loading}
                                        >
                                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold' }}>{qName}</div>
                                        </button>
                                    ))}
                                    <button
                                        className="glass-card"
                                        style={{ padding: '12px', color: 'var(--text-secondary)', borderStyle: 'dashed', cursor: 'pointer' }}
                                        onClick={() => {
                                            const manual = prompt("Masukkan nama kuota secara manual:");
                                            if (manual) finishAutoBuy(tempAutoBuy.selectedPackage, manual);
                                        }}
                                        disabled={tempAutoBuy.loading}
                                    >
                                        + Ketik Manual
                                    </button>
                                </div>
                            </div>
                        )}

                        {tempAutoBuy.loading && (
                            <div style={{ textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="loader"></div>
                                <div className="label">Sedang mengambil data...</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {(detailLoading || loading) && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div className="glass-card">Memproses...</div>
                </div>
            )}
        </main>
    );
}
