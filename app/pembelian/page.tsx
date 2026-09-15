"use client";
import { useState, useEffect } from "react";
import { getStokBarang, tambahPart } from "@/lib/api";
import { ArrowLeft, Plus, Package, RefreshCw, Save } from "lucide-react";
import Link from "next/link";

export default function PembelianPage() {
  const [stokList, setStokList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Tambah / Restock Part
  const [kodePart, setKodePart] = useState("");
  const [namaPart, setNamaPart] = useState("");
  const [kategori, setKategori] = useState("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [stokTambah, setStokTambah] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadStok = async () => {
    setLoading(true);
    const data = await getStokBarang();
    setStokList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStok();
  }, []);

  const handleSimpanPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kategori.trim()) {
      alert("Kategori wajib diisi!");
      return;
    }
    setSubmitting(true);

    const payload = {
      kodePart: kodePart || "PART-" + Math.floor(1000 + Math.random() * 9000),
      namaPart,
      kategori: kategori.trim(),
      hargaBeli,
      hargaJual,
      stok: stokTambah,
    };

    const res = await tambahPart(payload);
    setSubmitting(false);

    if (res.status === "success") {
      alert("✅ Onderdil berhasil ditambahkan ke gudang!");
      setKodePart("");
      setNamaPart("");
      setKategori("");
      setHargaBeli("");
      setHargaJual("");
      setStokTambah("");
      loadStok();
    } else {
      alert("Gagal: " + res.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-slate-100 p-4 md:p-6 flex flex-col gap-6">
      <header className="flex justify-between items-center bg-slate-800/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link href="/" className="bg-slate-700 hover:bg-slate-600 p-2.5 rounded-xl transition text-slate-200">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            📦 Manajemen Stok & Pembelian Onderdil
          </h1>
        </div>
        <button onClick={loadStok} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-sm font-medium transition">
          <RefreshCw size={16} className={loading ? "animate-spin text-teal-400" : ""} /> Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Tambah Part Baru */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
          <h2 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Plus size={16} className="text-emerald-400" /> Tambah Part / Barang Baru
          </h2>

          <form onSubmit={handleSimpanPart} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Kode Part (Opsional)</label>
              <input
                type="text"
                placeholder="BSI-003 / Biarkan kosong"
                value={kodePart}
                onChange={(e) => setKodePart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nama Onderdil / Barang</label>
              <input
                type="text"
                required
                placeholder="Kampas Rem Depan Beat"
                value={namaPart}
                onChange={(e) => setNamaPart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Kategori (Ketik Bebas)</label>
              <input
                type="text"
                required
                placeholder="Contoh: Oli, Kampas Rem, Rantai"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Harga Beli (Modal)</label>
                <input
                  type="number"
                  required
                  placeholder="35000"
                  value={hargaBeli}
                  onChange={(e) => setHargaBeli(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Harga Jual</label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={hargaJual}
                  onChange={(e) => setHargaJual(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Jumlah Stok Masuk</label>
              <input
                type="number"
                required
                placeholder="10"
                value={stokTambah}
                onChange={(e) => setStokTambah(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs mt-2"
            >
              <Save size={15} /> {submitting ? "Menyimpan..." : "Simpan Part ke Gudang"}
            </button>
          </form>
        </div>

        {/* Tabel Daftar Gudang Saat Ini */}
        <div className="lg:col-span-2 bg-slate-800/80 backdrop-blur-md border border-slate-700 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
          <h2 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Package size={16} className="text-teal-400" /> Daftar Stok Gudang Saat Ini
          </h2>

          {loading ? (
            <p className="text-center text-slate-400 py-16 animate-pulse text-xs">Memuat data gudang...</p>
          ) : stokList.length === 0 ? (
            <p className="text-center text-slate-500 py-16 text-xs">Belum ada onderdil di gudang.</p>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 bg-slate-900/40 sticky top-0">
                    <th className="p-3 font-semibold">Kode / Nama Part</th>
                    <th className="p-3 font-semibold">Kategori</th>
                    <th className="p-3 font-semibold text-right">H. Beli</th>
                    <th className="p-3 font-semibold text-right">H. Jual</th>
                    <th className="p-3 font-semibold text-center">Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {stokList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30 transition">
                      <td className="p-3">
                        <p className="font-bold text-slate-200">{item.nama_part}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{item.kode_part}</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded text-[10px]">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-400">Rp {Number(item.harga_beli).toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-orange-400">Rp {Number(item.harga_jual).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded text-xs">
                          {item.stok}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}