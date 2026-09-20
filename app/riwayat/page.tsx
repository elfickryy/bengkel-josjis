"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, History, Calendar, User, Wrench, ShieldAlert, Printer } from "lucide-react";
import Link from "next/link";
import { printReceipt } from "@/utils/printer";

export default function RiwayatServisPage() {
  const [allRiwayat, setAllRiwayat] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | number | null>(null);

  // Load semua riwayat otomatis begitu halaman dibuka (Tanpa sorting ketat agar tidak error)
  const loadAllRiwayat = async () => {
    setLoading(true);
    try {
      // 1. Ambil seluruh transaksi dari tabel 'transaksi'
      const { data: transaksiData, error: trxError } = await supabase
        .from("transaksi")
        .select("*");

      if (trxError) throw trxError;

      if (!transaksiData || transaksiData.length === 0) {
        setAllRiwayat([]);
        setLoading(false);
        return;
      }

      // 2. Ambil seluruh detail item transaksi
      const { data: detailData, error: detailError } = await supabase
        .from("detail_transaksi")
        .select("*");

      if (detailError) throw detailError;

      // 3. Gabungkan transaksi dengan item detailnya
      const combined = transaksiData.map((trx) => {
        const items = (detailData || []).filter(
          (d) => 
            d.transaksi_id === trx.id || 
            d.id_transaksi === trx.nomor_nota ||
            d.transaksi_id === trx.nomor_nota
        );
        return { ...trx, items };
      });

      // Urutkan secara lokal berdasarkan id atau waktu jika ada
      combined.sort((a, b) => {
        const dateA = new Date(a.created_at || a.tanggal || 0).getTime();
        const dateB = new Date(b.created_at || b.tanggal || 0).getTime();
        return dateB - dateA;
      });

      setAllRiwayat(combined);
    } catch (err: any) {
      console.error("Gagal memuat daftar riwayat:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllRiwayat();
  }, []);

  // Filter pencarian pintar (Mencakup Plat Nomor, Nama Pelanggan, Nomor Nota, atau Mekanik)
  const filteredRiwayat = allRiwayat.filter((trx) => {
    const query = searchQuery.toLowerCase();
    const plat = (trx.plat_nomor || "").toLowerCase();
    const nama = (trx.nama_pelanggan || "").toLowerCase();
    const nota = (trx.nomor_nota || "").toLowerCase();
    const mekanik = (trx.mekanik || "").toLowerCase();

    return plat.includes(query) || nama.includes(query) || nota.includes(query) || mekanik.includes(query);
  });

  const cetakThermal = async (trx: any) => {
    const savedConfig = localStorage.getItem("bengkel_config");
    const config = savedConfig ? JSON.parse(savedConfig) : {};
    const transactionId = trx.id || trx.nomor_nota;
    setPrintingId(transactionId);

    try {
      const success = await printReceipt({
        storeName: config.namaBengkel || "BENGKEL JOSJIS",
        storeAddress: config.alamatBengkel || "Jl. Raya Bengkel No. 32",
        storePhone: config.teleponBengkel || "",
        notaNo: trx.nomor_nota,
        date: new Date(trx.created_at || trx.tanggal || Date.now()).toLocaleString("id-ID"),
        cashier: trx.mekanik || "Admin",
        plateNumber: trx.plat_nomor || "-",
        items: (trx.items || []).map((item: any) => ({
          name: item.nama_item,
          qty: Number(item.qty || 0),
          price: Number(item.harga_satuan || 0),
          subtotal: Number(item.subtotal || 0),
        })),
        total: Number(trx.total_belanja || 0),
        cash: Number(trx.total_belanja || 0),
        change: 0,
        paymentMethod: trx.metode_bayar || "-",
        footerMessage: config.pesanStruk || "Terima Kasih Atas Kunjungan Anda!",
      });

      if (!success) alert("Printer thermal tidak terdeteksi. Silakan cek menu Setting.");
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-5xl space-y-4">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/80 p-3 shadow-sm">
          <Link href="/" className="rounded-xl border border-stone-300 bg-stone-50 p-2 text-stone-600 transition hover:bg-stone-100">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-stone-900 md:text-xl">
              <History className="text-violet-600" size={21} /> Riwayat & Rekam Jejak Servis
            </h1>
            <p className="text-[11px] text-stone-500">Cari transaksi berdasarkan nama, plat nomor, nota, atau mekanik.</p>
          </div>
        </div>

        {/* KOLOM PENCARIAN PINTAR */}
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 p-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Cari berdasarkan Plat Nomor, Nama Pelanggan, No. Nota, atau Mekanik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-stone-50 py-2.5 pl-10 pr-4 text-xs font-medium text-stone-800 outline-none focus:border-violet-400"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-700 transition hover:bg-stone-100"
            >
              Reset
            </button>
          )}
        </div>

        {/* DAFTAR RIWAYAT */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {loading ? (
            <p className="text-center text-slate-500 py-16 text-sm animate-pulse">Memuat seluruh data riwayat servis...</p>
          ) : filteredRiwayat.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white/80 p-8 text-center text-sm text-stone-500 shadow-sm space-y-2 xl:col-span-2">
              <ShieldAlert className="mx-auto text-slate-600" size={32} />
              <p>Tidak ada riwayat servis yang cocok dengan kata kunci <span className="text-cyan-400 font-bold">"{searchQuery}"</span>.</p>
            </div>
          ) : (
            filteredRiwayat.map((trx) => (
              <div key={trx.id || trx.nomor_nota} className="space-y-3 rounded-2xl border border-stone-200 bg-white/85 p-3 shadow-sm transition hover:shadow-md">
                <div className="flex flex-col items-start justify-between gap-2 border-b border-stone-200 pb-2 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-mono font-bold uppercase text-violet-700">
                        {trx.plat_nomor || "-"}
                      </span>
                      <span className="font-mono text-[10px] text-stone-500">({trx.nomor_nota})</span>
                    </div>
                    <h3 className="mt-1 flex items-center gap-1.5 text-xs font-bold text-stone-800">
                      <User size={13} className="text-violet-600" /> Pelanggan: <span className="text-violet-700">{trx.nama_pelanggan || "Umum"}</span>
                    </h3>
                  </div>
                  <div className="space-y-0.5 text-right text-[10px] text-stone-500">
                    <p className="flex items-center gap-1 justify-end">
                      <Calendar size={12} className="text-stone-400" /> {trx.created_at ? new Date(trx.created_at).toLocaleString("id-ID") : (trx.tanggal ? new Date(trx.tanggal).toLocaleString("id-ID") : "Baru saja")}
                    </p>
                    <p className="flex items-center gap-1 justify-end">
                      <Wrench size={12} className="text-stone-400" /> Mekanik: <span className="font-bold text-teal-700">{trx.mekanik || "-"}</span>
                    </p>
                    <p className="text-[10px] text-emerald-700">Status: {trx.status_servis || "Selesai"}</p>
                  </div>
                </div>

                {/* Rincian Item */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Rincian Onderdil & Jasa</p>
                  <div className="max-h-32 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 px-3 divide-y divide-stone-200">
                    {trx.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 text-[11px]">
                        <div>
                          <p className="font-medium text-stone-800">{item.nama_item}</p>
                          <p className="text-[10px] text-stone-500">{item.qty}x @Rp {Number(item.harga_satuan).toLocaleString()}</p>
                        </div>
                        <span className="font-bold text-amber-700">Rp {Number(item.subtotal).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-[11px]">
                  <span className="text-stone-500">Bayar: <strong className="text-stone-800">{trx.metode_bayar}</strong></span>
                  <div className="text-right">
                    <span className="mr-2 text-stone-500">Total:</span>
                    <span className="text-sm font-extrabold text-emerald-700">Rp {Number(trx.total_belanja).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => cetakThermal(trx)}
                  disabled={printingId === (trx.id || trx.nomor_nota)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-[10px] font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Printer size={14} /> {printingId === (trx.id || trx.nomor_nota) ? "Mengirim ke printer..." : "Cetak Thermal"}
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}