"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, History, Calendar, User, Wrench, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function RiwayatServisPage() {
  const [allRiwayat, setAllRiwayat] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 border border-slate-800 bg-slate-900 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <History className="text-cyan-400" size={24} /> Riwayat & Rekam Jejak Servis
            </h1>
            <p className="text-sm text-slate-500">Daftar seluruh transaksi masuk. Cari berdasarkan nama, plat nomor, nota, atau mekanik.</p>
          </div>
        </div>

        {/* KOLOM PENCARIAN PINTAR */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Cari berdasarkan Plat Nomor, Nama Pelanggan, No. Nota, atau Mekanik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl transition"
            >
              Reset
            </button>
          )}
        </div>

        {/* DAFTAR RIWAYAT */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-slate-500 py-16 text-sm animate-pulse">Memuat seluruh data riwayat servis...</p>
          ) : filteredRiwayat.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center text-slate-500 text-sm space-y-2">
              <ShieldAlert className="mx-auto text-slate-600" size={32} />
              <p>Tidak ada riwayat servis yang cocok dengan kata kunci <span className="text-cyan-400 font-bold">"{searchQuery}"</span>.</p>
            </div>
          ) : (
            filteredRiwayat.map((trx) => (
              <div key={trx.id || trx.nomor_nota} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase">
                        {trx.plat_nomor || "-"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({trx.nomor_nota})</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 mt-2 flex items-center gap-1.5">
                      <User size={14} className="text-blue-400" /> Pelanggan: <span className="text-blue-300">{trx.nama_pelanggan || "Umum"}</span>
                    </h3>
                  </div>
                  <div className="text-right text-xs text-slate-400 space-y-1">
                    <p className="flex items-center gap-1 justify-end">
                      <Calendar size={13} className="text-slate-500" /> {trx.created_at ? new Date(trx.created_at).toLocaleString("id-ID") : (trx.tanggal ? new Date(trx.tanggal).toLocaleString("id-ID") : "Baru saja")}
                    </p>
                    <p className="flex items-center gap-1 justify-end">
                      <Wrench size={13} className="text-slate-500" /> Mekanik: <span className="text-cyan-400 font-bold">{trx.mekanik || "-"}</span>
                    </p>
                    <p className="text-[11px] text-emerald-400">Status: {trx.status_servis || "Selesai"}</p>
                  </div>
                </div>

                {/* Rincian Item */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rincian Onderdil & Jasa:</p>
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 divide-y divide-slate-900">
                    {trx.items?.map((item: any, idx: number) => (
                      <div key={idx} className="py-2 first:pt-0 last:pb-0 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-slate-200">{item.nama_item}</p>
                          <p className="text-[10px] text-slate-500">{item.qty}x @Rp {Number(item.harga_satuan).toLocaleString()}</p>
                        </div>
                        <span className="font-bold text-orange-400">Rp {Number(item.subtotal).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Metode Bayar: <strong className="text-slate-200">{trx.metode_bayar}</strong></span>
                  <div className="text-right">
                    <span className="text-slate-400 mr-2">Total Transaksi:</span>
                    <span className="text-sm font-extrabold text-emerald-400">Rp {Number(trx.total_belanja).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}