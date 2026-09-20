"use client";
import { useState, useEffect } from "react";
import { getStokBarang, simpanTransaksi } from "@/lib/api";
import { 
  ShoppingCart, Trash2, CheckCircle, RefreshCw, 
  Search, Package, BarChart3, Database, Plus, Minus, Settings, CreditCard, QrCode, History, Printer
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// 1. IMPORT FITUR PRINTER BLUETOOTH YANG BARU DIBUAT
import PrinterButton from "@/components/PrinterButton";
import { printReceipt } from "@/utils/printer";

export default function KasirPage() {
  const [stokList, setStokList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State Jasa & Konfigurasi Setting
  const [customJasaList, setCustomJasaList] = useState<any[]>([]);
  const [bankList, setBankList] = useState<any[]>([]);
  const [qrisImage, setQrisImage] = useState("");
  const [bengkelConfig, setBengkelConfig] = useState<any>({});

  // Keranjang & Pembayaran
  const [cart, setCart] = useState<any[]>([]);
  const [namaPelanggan, setNamaPelanggan] = useState("");
  const [platNomor, setPlatNomor] = useState("");
  const [metodeBayar, setMetodeBayar] = useState("CASH");
  
  // Input Mekanik & Opsi Cetak Struk
  const [mekanik, setMekanik] = useState("");
  const [autoCetak, setAutoCetak] = useState(true);

  const [uangDiterima, setUangDiterima] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQrisFullscreen, setShowQrisFullscreen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await getStokBarang();
    setStokList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    
    // Load Jasa Servis
    const savedJasa = localStorage.getItem("bengkel_custom_jasa");
    if (savedJasa) {
      setCustomJasaList(JSON.parse(savedJasa));
    } else {
      const defaults = [
        { nama: "Servis Ringan", harga: 35000 },
        { nama: "Ganti Oli", harga: 15000 },
        { nama: "Ganti Ban", harga: 25000 },
        { nama: "Turun Mesin", harga: 150000 }
      ];
      localStorage.setItem("bengkel_custom_jasa", JSON.stringify(defaults));
      setCustomJasaList(defaults);
    }

    // Load Konfigurasi Bank & QRIS dari Setting
    const savedConfig = localStorage.getItem("bengkel_config");
    const savedPrinter = localStorage.getItem("bengkel_printer_config");
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setBengkelConfig(config);
      const banks = config.bankList || [];
      setBankList(banks);
      if (banks.length > 0) setSelectedBank(`${banks[0].bank} - ${banks[0].norek} (a/n ${banks[0].an})`);
      setQrisImage(config.qrisImage || "");
    } else {
      setBankList([{ bank: "BCA", norek: "1234567890", an: "Bengkel Jaya" }]);
      setSelectedBank("BCA - 1234567890 (a/n Bengkel Jaya)");
    }

    if (savedPrinter) {
      try {
        const printerConfig = JSON.parse(savedPrinter);
        setAutoCetak(printerConfig.autoPrint !== false);
      } catch {
        setAutoCetak(true);
      }
    }
  }, []);

  const filteredStok = stokList.filter(
    (item) =>
      item.nama_part?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode_part?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (item: any, jenis: "PART" | "JASA", customHarga?: number) => {
    if (jenis === "PART" && item.stok <= 0) {
      alert("Stok barang ini habis!");
      return;
    }

    const hargaJual = customHarga !== undefined ? customHarga : Number(item.harga_jual || 0);
    const cartItemId = jenis === "JASA" ? `jasa-${Date.now()}-${Math.random()}` : item.id;

    const existing = cart.find((c) => (jenis === "PART" ? c.id === item.id : c.cartItemId === cartItemId));

    if (existing && jenis === "PART") {
      if (existing.qty >= item.stok) {
        alert("Jumlah melebihi stok gudang!");
        return;
      }
      setCart(
        cart.map((c) =>
          c.id === item.id
            ? { ...c, qty: c.qty + 1, subtotal: (c.qty + 1) * c.harga_jual }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          cartItemId,
          id: jenis === "PART" ? item.id : null,
          jenis,
          nama: jenis === "PART" ? item.nama_part : item.nama,
          harga_jual: hargaJual,
          qty: 1,
          subtotal: hargaJual,
        },
      ]);
    }
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        const key = item.jenis === "PART" ? item.id : item.cartItemId;
        if (key === cartItemId) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          return { ...item, qty: newQty, subtotal: newQty * item.harga_jual };
        }
        return item;
      }).filter(Boolean)
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter((item) => (item.jenis === "PART" ? item.id !== cartItemId : item.cartItemId !== cartItemId)));
  };

  const totalBelanja = cart.reduce((sum, item) => sum + item.subtotal, 0);
  
  const nominalUang = Number(uangDiterima) || 0;
  const kembalian = nominalUang >= totalBelanja ? nominalUang - totalBelanja : 0;

  // 2. LOGIKA CETAK STRUK BLUETOOTH BARU (Menggantikan window.print lama)
  const cetakStrukBluetooth = async (nomorNota: string, finalMetode: string, namaMekanik: string) => {
    const dataStruk = {
      storeName: bengkelConfig.namaBengkel || "BENGKEL JOSJIS",
      storeAddress: bengkelConfig.alamatBengkel || "Jl. Raya Bengkel No. 32",
      storePhone: bengkelConfig.teleponBengkel || "",
      notaNo: nomorNota,
      date: new Date().toLocaleString("id-ID"),
      cashier: namaMekanik || "Admin",
      plateNumber: platNomor.trim().toUpperCase() || "-",
      items: cart.map(item => ({
        name: item.nama,
        qty: item.qty,
        price: Number(item.harga_jual),
        subtotal: Number(item.subtotal)
      })),
      total: totalBelanja,
      // Kalau Transfer/QRIS anggap uang pas, kalau CASH pakai nominal uang dari state
      cash: finalMetode.includes("CASH") ? nominalUang : totalBelanja,
      change: finalMetode.includes("CASH") ? kembalian : 0,
      paymentMethod: finalMetode,
      footerMessage: bengkelConfig.pesanStruk || "Terima Kasih Atas Kunjungan Anda!",
    };

    // Eksekusi kirim ke printer Bluetooth
    return await printReceipt(dataStruk);
  };

  // Data Struk Preview untuk tombol Pairing Printer sebelum transaksi
  const previewDataStruk = {
    storeName: bengkelConfig.namaBengkel || "BENGKEL JOSJIS",
    storeAddress: bengkelConfig.alamatBengkel || "Jl. Raya Bengkel No. 32",
    storePhone: bengkelConfig.teleponBengkel || "",
    notaNo: "TES-PRINTER",
    date: new Date().toLocaleString("id-ID"),
    cashier: "Admin",
    plateNumber: platNomor || "-",
    items: cart.length > 0 ? cart.map(item => ({ name: item.nama, qty: item.qty, price: Number(item.harga_jual), subtotal: Number(item.subtotal) })) : [{ name: "Tes Print 1", qty: 1, price: 1000, subtotal: 1000 }],
    total: totalBelanja || 1000,
    cash: nominalUang || 1000,
    change: kembalian || 0,
    paymentMethod: "TEST PRINT",
    footerMessage: bengkelConfig.pesanStruk || "Terima Kasih Atas Kunjungan Anda!",
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }

    if (metodeBayar === "CASH" && nominalUang < totalBelanja) {
      alert("Jumlah uang tunai yang diterima kurang dari total belanja!");
      return;
    }

    let finalMetodeBayar = "CASH";
    if (metodeBayar === "TRANSFER") {
      finalMetodeBayar = `TRANSFER (${selectedBank})`;
    } else if (metodeBayar === "QRIS") {
      finalMetodeBayar = "QRIS (All Payment)";
    }

    if (!confirm(`Konfirmasi pembayaran sebesar Rp ${totalBelanja.toLocaleString()} via ${finalMetodeBayar}?`)) return;

    setIsSubmitting(true);
    const nomorNota = "NOTA-" + Date.now().toString().slice(-6);
    const currentMekanik = mekanik.trim() || "-";

    const payload = {
      nomorNota,
      namaPelanggan: namaPelanggan.trim() || "Umum",
      platNomor: platNomor.trim().toUpperCase() || "-",
      totalBelanja,
      metodeBayar: finalMetodeBayar,
      items: cart,
      mekanik: currentMekanik, 
    };

    const res = await simpanTransaksi(payload);
    setIsSubmitting(false);

    if (res.status === "success") {
      alert(`✅ Transaksi Berhasil! No. Nota: ${nomorNota}`);
      
      // 3. CETAK STRUK BLUETOOTH OTOMATIS
      if (autoCetak) {
        const printSuccess = await cetakStrukBluetooth(nomorNota, finalMetodeBayar, currentMekanik);
        if (!printSuccess) {
          alert("Transaksi tersimpan, tetapi struk belum tercetak. Anda dapat mencetak ulang dari menu Riwayat.");
        }
      }

      setCart([]);
      setNamaPelanggan("");
      setPlatNomor("");
      setUangDiterima("");
      loadData();
    } else {
      alert("Gagal menyimpan transaksi: " + res.message);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-transparent text-stone-800">
      <div className="flex min-h-[calc(100vh-1.5rem)] flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white/85 p-4 shadow-[0_18px_45px_rgba(61,52,45,0.08)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#101b38] shadow-[0_8px_18px_rgba(44,61,105,0.22)] ring-1 ring-white/70">
              <Image src="/josjis-mark.svg" alt="Logo Bengkel Josjis" width={48} height={48} priority className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-stone-900 md:text-xl">
                POS Bengkel Josjis
              </h1>
              <p className="text-[11px] text-stone-500">
                Program Kasir Bengkel by: • <span className="font-medium text-stone-700">EL Tech</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/riwayat" className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-700 transition hover:bg-stone-100">
              <History size={14} /> Riwayat
            </Link>
            <Link href="/pembelian" className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-700 transition hover:bg-stone-100">
              <Package size={14} className="text-stone-700" /> Gudang
            </Link>
            <Link href="/rekap" className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-700 transition hover:bg-stone-100">
              <BarChart3 size={14} className="text-stone-700" /> Rekap
            </Link>
            <Link href="/database" className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-700 transition hover:bg-stone-100">
              <Database size={14} className="text-stone-700" /> Database
            </Link>
            <Link href="/setting" className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-[11px] font-medium text-stone-700 transition hover:bg-stone-100" title="Pengaturan Bengkel">
              <Settings size={14} className="text-stone-700" /> Setting
            </Link>
            <button onClick={loadData} className="rounded-xl border border-stone-300 bg-stone-50 p-2.5 text-stone-700 transition hover:bg-stone-100" title="Refresh Stok">
              <RefreshCw size={15} className={loading ? "animate-spin text-stone-700" : ""} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.48fr_0.92fr]">
          <section className="flex min-h-0 h-full flex-col gap-4 rounded-[30px] border border-stone-200 bg-white/80 p-4 shadow-[0_18px_45px_rgba(61,52,45,0.08)] backdrop-blur-md">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-wide text-stone-900">Katalog Onderdil</h2>
                <p className="mt-0.5 text-[10px] text-stone-500">Pilih barang untuk memasukkan ke transaksi</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={15} />
                <input
                  type="text"
                  placeholder="Cari nama part / kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 py-2.5 pl-9 pr-3 text-xs text-stone-800 outline-none transition focus:border-stone-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                  <span className="text-stone-800">✦</span> Jasa Servis Cepat
                </span>
                <button
                  onClick={() => {
                    const namaBaru = prompt("Masukkan nama jasa servis baru (Cth: Las Knalpot):");
                    if (!namaBaru) return;
                    const hargaBaru = prompt(`Masukkan tarif default untuk "${namaBaru}" (Rp):`, "30000");
                    if (!hargaBaru || isNaN(Number(hargaBaru))) {
                      alert("Tarif tidak valid!");
                      return;
                    }
                    const updated = [...customJasaList, { nama: namaBaru.trim(), harga: Number(hargaBaru) }];
                    localStorage.setItem("bengkel_custom_jasa", JSON.stringify(updated));
                    setCustomJasaList(updated);
                  }}
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-[10px] font-medium text-stone-700 transition hover:bg-stone-100"
                >
                  + Tambah Jasa
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {customJasaList.map((jasa, idx) => (
                  <div
                    key={idx}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-stone-200 bg-white px-2.5 py-2 shadow-sm"
                  >
                    <button onClick={() => addToCart({ nama: `Jasa: ${jasa.nama}`, id: null }, "JASA", jasa.harga)} className="text-left">
                      <span className="block text-[11px] font-medium text-stone-800">{jasa.nama}</span>
                      <span className="text-[10px] font-bold text-emerald-700">Rp {jasa.harga.toLocaleString()}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Hapus jasa "${jasa.nama}"?`)) return;
                        const updated = customJasaList.filter((_, i) => i !== idx);
                        localStorage.setItem("bengkel_custom_jasa", JSON.stringify(updated));
                        setCustomJasaList(updated);
                      }}
                      className="text-xs text-stone-500 transition hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-violet-50/40">
              {loading ? (
                <p className="py-12 text-center text-xs text-stone-500 animate-pulse">Memuat daftar onderdil...</p>
              ) : filteredStok.length === 0 ? (
                <p className="py-12 text-center text-xs text-stone-500">Tidak ada onderdil ditemukan.</p>
              ) : (
                <div className="h-[420px] overflow-y-auto p-2 sm:p-3 lg:h-[455px]">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredStok.map((item) => {
                      const habis = Number(item.stok) <= 0;
                      const stokRendah = Number(item.stok) <= 3;
                      return (
                        <article
                          key={item.id}
                          role="button"
                          tabIndex={habis ? -1 : 0}
                          onClick={() => !habis && addToCart(item, "PART")}
                          onKeyDown={(event) => {
                            if (!habis && (event.key === "Enter" || event.key === " ")) {
                              event.preventDefault();
                              addToCart(item, "PART");
                            }
                          }}
                          className={`group flex min-w-0 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition ${habis ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-300"}`}
                        >
                          <div className="min-w-0">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <span className="rounded-md bg-violet-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-violet-700">{item.kategori || "Umum"}</span>
                              <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${habis ? "bg-red-50 text-red-700" : stokRendah ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                                {habis ? "Habis" : `${item.stok} stok`}
                              </span>
                            </div>
                            <h3 className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-4 text-stone-800">{item.nama_part}</h3>
                            <p className="mt-1 truncate font-mono text-[9px] text-stone-400">{item.kode_part || "Tanpa kode"}</p>
                          </div>
                          <div className="mt-3 border-t border-stone-100 pt-2">
                            <span className="truncate text-xs font-black text-amber-700">Rp {Number(item.harga_jual).toLocaleString()}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="flex min-h-0 h-full flex-col rounded-[30px] border border-stone-200 bg-white/85 p-4 shadow-[0_18px_45px_rgba(61,52,45,0.08)] backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <ShoppingCart size={16} className="text-stone-700" /> Keranjang Belanja
              </h2>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm("Kosongkan semua item di keranjang?")) return;
                      setCart([]);
                      setUangDiterima("");
                    }}
                    className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Kosongkan
                  </button>
                )}
                <PrinterButton testData={previewDataStruk} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nama Pelanggan"
                value={namaPelanggan}
                onChange={(e) => setNamaPelanggan(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none transition focus:border-stone-500"
              />
              <input
                type="text"
                placeholder="Plat Nomor"
                value={platNomor}
                onChange={(e) => setPlatNomor(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs uppercase text-stone-800 outline-none transition focus:border-stone-500"
              />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-stone-500">Nama Mekanik</label>
              <input
                type="text"
                placeholder="Cth: Budi / Joko"
                value={mekanik}
                onChange={(e) => setMekanik(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none transition focus:border-stone-500"
              />
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 p-2">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-500">Keranjang masih kosong.</p>
              ) : (
                <div className="max-h-[calc(100vh-510px)] space-y-2 overflow-y-auto pr-1">
                  {cart.map((item, idx) => {
                    const key = item.jenis === "PART" ? item.id : item.cartItemId;
                    return (
                      <div key={idx} className="flex items-center justify-between gap-2 rounded-xl border border-stone-300 bg-white p-2.5 shadow-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium text-stone-800">{item.nama}</p>
                          <p className="text-[10px] text-stone-500">{item.qty}x @Rp {Number(item.harga_jual).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-amber-700">Rp {Number(item.subtotal).toLocaleString()}</span>
                          <div className="flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 p-0.5">
                            <button onClick={() => updateQty(key, -1)} className="rounded p-1 text-stone-600 transition hover:bg-stone-100"><Minus size={10} /></button>
                            <span className="w-4 text-center text-[10px] font-bold text-stone-700">{item.qty}</span>
                            <button onClick={() => updateQty(key, 1)} className="rounded p-1 text-stone-600 transition hover:bg-stone-100"><Plus size={10} /></button>
                          </div>
                          <button onClick={() => removeFromCart(key)} className="rounded p-1 text-red-600 transition hover:bg-red-50"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">Metode bayar</span>
                <div className="flex gap-1.5">
                  {["CASH", "TRANSFER", "QRIS"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetodeBayar(m)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition ${
                        metodeBayar === m ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {metodeBayar === "CASH" && (
                <div className="mt-3 space-y-2 border-t border-stone-200 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-600">Uang diterima</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={uangDiterima}
                      onChange={(e) => setUangDiterima(e.target.value)}
                      className="w-32 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-right text-xs font-bold text-stone-800 outline-none focus:border-stone-500"
                    />
                  </div>
                  <div className="flex justify-end gap-1">
                    {[20000, 50000, 100000].map((nominal) => (
                      <button key={nominal} onClick={() => setUangDiterima(String(nominal))} className="rounded-md border border-stone-300 bg-white px-2 py-0.5 text-[10px] text-stone-700 transition hover:bg-stone-100">
                        {nominal / 1000}k
                      </button>
                    ))}
                    <button onClick={() => setUangDiterima(String(totalBelanja))} className="rounded-md border border-emerald-700/20 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Uang Pas
                    </button>
                  </div>
                </div>
              )}

              {metodeBayar === "TRANSFER" && (
                <div className="mt-3 space-y-2 border-t border-stone-200 pt-3">
                  <label className="flex items-center gap-1 text-[11px] font-medium text-stone-700">
                    <CreditCard size={12} /> Pilih rekening tujuan
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
                  >
                    {bankList.map((b, i) => (
                      <option key={i} value={`${b.bank} - ${b.norek} (a/n ${b.an})`}>
                        {b.bank} : {b.norek} ({b.an})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {metodeBayar === "QRIS" && (
                <div className="mt-3 space-y-3 border-t border-stone-200 pt-3 text-center">
                  <div className="flex items-center justify-between text-left">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                      <QrCode size={15} className="text-violet-600" /> Scan QRIS
                    </div>
                    <span className="text-[10px] text-stone-500">Klik gambar untuk memperbesar</span>
                  </div>
                  {qrisImage ? (
                    <button
                      type="button"
                      onClick={() => setShowQrisFullscreen(true)}
                      className="group mx-auto block rounded-3xl border border-violet-200 bg-white p-3 shadow-[0_10px_24px_rgba(117,104,194,0.12)] transition hover:border-violet-400 hover:shadow-[0_14px_30px_rgba(117,104,194,0.2)]"
                      aria-label="Perbesar QRIS"
                    >
                      <Image src={qrisImage} alt="QRIS Code" width={220} height={220} unoptimized className="h-52 w-52 object-contain sm:h-60 sm:w-60" />
                    </button>
                  ) : (
                    <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-[10px] text-red-700">
                      Gambar QRIS belum di-upload di menu Setting.
                    </p>
                  )}
                  {qrisImage && <p className="text-sm font-black text-stone-900">Rp {totalBelanja.toLocaleString("id-ID")}</p>}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3">
                <span className="flex items-center gap-1.5 text-[11px] text-stone-600">
                  <Printer size={12} className="text-stone-700" /> Thermal otomatis?
                </span>
                <button
                  onClick={() => setAutoCetak(!autoCetak)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${autoCetak ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" : "bg-stone-100 text-stone-600 ring-1 ring-stone-200"}`}
                >
                  {autoCetak ? "YA" : "TIDAK"}
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-stone-200 pt-4">
              <div className="space-y-2 text-[11px] text-stone-700">
                <div className="flex items-center justify-between">
                  <span>Total Belanja</span>
                  <span className="font-semibold text-stone-900">Rp {totalBelanja.toLocaleString()}</span>
                </div>
                {metodeBayar === "CASH" && (
                  <div className="flex items-center justify-between">
                    <span>Kembalian</span>
                    <span className={kembalian < 0 && nominalUang > 0 ? "font-bold text-red-600" : "font-bold text-stone-700"}>Rp {kembalian.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Grand total</span>
                <span className="text-xl font-black text-stone-900">Rp {totalBelanja.toLocaleString()}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="mt-4 w-full rounded-2xl bg-stone-900 px-4 py-3 text-xs font-bold text-white shadow-[0_14px_30px_rgba(41,35,34,0.12)] transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> {isSubmitting ? "Memproses..." : "Proses Pembayaran"}
                </span>
              </button>
            </div>
          </aside>
        </div>
      </div>
      {showQrisFullscreen && qrisImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4 backdrop-blur-sm" onClick={() => setShowQrisFullscreen(false)}>
          <div className="relative rounded-[30px] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setShowQrisFullscreen(false)} className="absolute -right-2 -top-2 rounded-full bg-stone-900 px-3 py-1.5 text-sm font-bold text-white shadow-lg">×</button>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Scan QRIS Pembayaran</p>
            <Image src={qrisImage} alt="QRIS Code Fullscreen" width={420} height={420} unoptimized className="h-[min(78vw,420px)] w-[min(78vw,420px)] object-contain" />
            <p className="mt-3 text-center text-lg font-black text-stone-900">Rp {totalBelanja.toLocaleString("id-ID")}</p>
          </div>
        </div>
      )}
    </main>
  );
}