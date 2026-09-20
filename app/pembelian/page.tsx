"use client";
import { useState, useEffect } from "react";
import { getStokBarang, tambahPart, restockPart, updatePart, setPartActive, getRestockHistory, removeCategory } from "@/lib/api";
import { ArrowLeft, Plus, Package, RefreshCw, Save, Search, AlertTriangle, XCircle, Pencil, RotateCcw, History, EyeOff, Eye } from "lucide-react";
import Link from "next/link";

export default function PembelianPage() {
  const [stokList, setStokList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("all");
  const [stokFilter, setStokFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [restockHistory, setRestockHistory] = useState<any[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

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
    const data = await getStokBarang(true);
    setStokList(data);
    setLoading(false);
  };

  const loadRestockHistory = async () => {
    setRestockHistory(await getRestockHistory());
  };

  useEffect(() => {
    loadStok();
    loadRestockHistory();
    const savedCategories = localStorage.getItem("bengkel_categories");
    if (savedCategories) {
      try {
        setCustomCategories(JSON.parse(savedCategories));
      } catch {
        setCustomCategories([]);
      }
    }
  }, []);

  const kategoriOptions = Array.from(new Set([
    ...customCategories,
    ...stokList.map((item) => item.kategori).filter(Boolean),
  ])).sort();

  const filteredStokList = stokList.filter((item) => {
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      String(item.nama_part || "").toLowerCase().includes(query) ||
      String(item.kode_part || "").toLowerCase().includes(query) ||
      String(item.kategori || "").toLowerCase().includes(query);

    const matchesKategori = kategoriFilter === "all" || item.kategori === kategoriFilter;

    const matchesStok =
      stokFilter === "all" ||
      (stokFilter === "habis" && Number(item.stok) <= 0) ||
      (stokFilter === "rendah" && Number(item.stok) > 0 && Number(item.stok) <= 5) ||
      (stokFilter === "cukup" && Number(item.stok) > 5);

    const matchesStatus = statusFilter === "all" || (statusFilter === "aktif" ? item.aktif !== false : item.aktif === false);

    return matchesSearch && matchesKategori && matchesStok && matchesStatus;
  });

  const totalStok = stokList.reduce((sum, item) => sum + Number(item.stok || 0), 0);
  const stokHabis = stokList.filter((item) => Number(item.stok) <= 0).length;
  const stokRendah = stokList.filter((item) => Number(item.stok) > 0 && Number(item.stok) <= 5).length;

  const handleSimpanPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kategori.trim()) {
      alert("Kategori wajib diisi!");
      return;
    }
    const hargaBeliNumber = Number(hargaBeli);
    const hargaJualNumber = Number(hargaJual);
    const stokNumber = Number(stokTambah);
    if (hargaBeliNumber < 0 || hargaJualNumber < 0 || !Number.isInteger(stokNumber) || stokNumber < 0) {
      alert("Harga tidak boleh negatif dan stok harus berupa angka bulat 0 atau lebih.");
      return;
    }
    setSubmitting(true);

    const payload = {
      kodePart: kodePart || "PART-" + Math.floor(1000 + Math.random() * 9000),
      namaPart,
      kategori: kategori.trim(),
      hargaBeli: hargaBeliNumber,
      hargaJual: hargaJualNumber,
      stok: stokNumber,
    };

    if (!customCategories.includes(payload.kategori)) {
      const updatedCategories = [...customCategories, payload.kategori].sort();
      localStorage.setItem("bengkel_categories", JSON.stringify(updatedCategories));
      setCustomCategories(updatedCategories);
    }

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

  const handleDeleteCategory = (category: string) => {
    const usedByPart = stokList.some((item) => item.kategori === category);
    const message = usedByPart
      ? `Kategori "${category}" masih dipakai. Semua part dengan kategori ini akan dipindahkan ke "Umum". Lanjutkan?`
      : `Hapus kategori "${category}" dari daftar pilihan?`;
    if (!confirm(message)) return;

    if (usedByPart) {
      removeCategory(category).then((res) => {
        if (res.status !== "success") return alert("Kategori gagal dihapus: " + res.message);
        const updatedCategories = customCategories.filter((item) => item !== category);
        localStorage.setItem("bengkel_categories", JSON.stringify(updatedCategories));
        setCustomCategories(updatedCategories);
        if (kategoriFilter === category) setKategoriFilter("all");
        loadStok();
        alert(`Kategori "${category}" berhasil dihapus. Part dipindahkan ke "Umum".`);
      });
      return;
    }

    const updatedCategories = customCategories.filter((item) => item !== category);
    localStorage.setItem("bengkel_categories", JSON.stringify(updatedCategories));
    setCustomCategories(updatedCategories);
    if (kategoriFilter === category) setKategoriFilter("all");
  };

  const handleRestock = async (item: any) => {
    const input = prompt(`Tambah stok untuk "${item.nama_part}". Jumlah unit:`, "5");
    if (!input) return;
    const jumlah = Number(input);
    if (!Number.isInteger(jumlah) || jumlah <= 0) {
      alert("Jumlah restock harus berupa angka bulat lebih dari 0.");
      return;
    }
    const res = await restockPart(item.id, jumlah);
    if (res.status !== "success") return alert("Restock gagal: " + res.message);
    await Promise.all([loadStok(), loadRestockHistory()]);
  };

  const handleToggleActive = async (item: any) => {
    const nextActive = item.aktif === false;
    const label = nextActive ? "mengaktifkan" : "menonaktifkan";
    if (!confirm(`Konfirmasi ${label} part "${item.nama_part}"?`)) return;
    const res = await setPartActive(item.id, nextActive);
    if (res.status !== "success") return alert("Status part gagal diubah: " + res.message);
    await loadStok();
  };

  const handleEditPart = async (item: any) => {
    const nama = prompt("Nama part:", item.nama_part);
    if (!nama?.trim()) return;
    const kategoriBaru = prompt("Kategori:", item.kategori || "Umum");
    if (!kategoriBaru?.trim()) return;
    const hargaBeliBaru = prompt("Harga beli:", String(item.harga_beli || 0));
    const hargaJualBaru = prompt("Harga jual:", String(item.harga_jual || 0));
    if (hargaBeliBaru === null || hargaJualBaru === null) return;
    const hargaBeliNumber = Number(hargaBeliBaru);
    const hargaJualNumber = Number(hargaJualBaru);
    if (!Number.isFinite(hargaBeliNumber) || !Number.isFinite(hargaJualNumber) || hargaBeliNumber < 0 || hargaJualNumber < 0) {
      alert("Harga harus berupa angka 0 atau lebih.");
      return;
    }
    const res = await updatePart(item.id, {
      namaPart: nama.trim(),
      kategori: kategoriBaru.trim(),
      hargaBeli: hargaBeliNumber,
      hargaJual: hargaJualNumber,
    });
    if (res.status !== "success") return alert("Perubahan gagal: " + res.message);
    await loadStok();
  };

  return (
    <main className="min-h-screen bg-transparent p-4 font-sans text-stone-800 md:p-8">
      <header className="mb-5 flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white/85 p-4 shadow-[0_18px_45px_rgba(61,52,45,0.08)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-xl border border-stone-300 bg-stone-50 p-2.5 text-stone-700 transition hover:bg-stone-100">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">Manajemen Stok & Pembelian</h1>
            <p className="text-xs text-stone-500">Kelola barang gudang, harga, dan status persediaan.</p>
          </div>
        </div>
        <button onClick={loadStok} className="flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Muat ulang
        </button>
      </header>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white/85 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-500"><span>Total jenis barang</span><Package size={16} /></div>
          <p className="mt-2 text-2xl font-black text-stone-900">{stokList.length}</p>
          <p className="text-[11px] text-stone-500">{totalStok.toLocaleString()} unit tersedia</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-800"><span>Stok menipis</span><AlertTriangle size={16} /></div>
          <p className="mt-2 text-2xl font-black text-amber-900">{stokRendah}</p>
          <p className="text-[11px] text-amber-800">Perlu segera direstok</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-red-800"><span>Stok habis</span><XCircle size={16} /></div>
          <p className="mt-2 text-2xl font-black text-red-900">{stokHabis}</p>
          <p className="text-[11px] text-red-800">Tidak dapat dijual di kasir</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        
        {/* Form Tambah Part Baru */}
        <div className="flex flex-col gap-4 rounded-[26px] border border-stone-200 bg-white/85 p-5 shadow-[0_18px_45px_rgba(61,52,45,0.07)]">
          <h2 className="flex items-center gap-2 text-sm font-bold text-stone-800">
            <Plus size={16} className="text-stone-700" /> Tambah part baru
          </h2>

          <form onSubmit={handleSimpanPart} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-stone-500">Kode part (opsional)</label>
              <input
                type="text"
                placeholder="BSI-003 / Biarkan kosong"
                value={kodePart}
                onChange={(e) => setKodePart(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs uppercase text-stone-800 outline-none focus:border-stone-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500">Nama onderdil / barang</label>
              <input
                type="text"
                required
                placeholder="Kampas Rem Depan Beat"
                value={namaPart}
                onChange={(e) => setNamaPart(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500">Kategori</label>
              <input
                type="text"
                required
                list="kategori-options"
                placeholder="Pilih atau ketik kategori baru"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
              />
              <datalist id="kategori-options">{kategoriOptions.map((item) => <option key={item} value={item} />)}</datalist>
              {kategoriOptions.length > 0 && (
                <p className="mt-2 text-[10px] text-stone-500">Klik `×` untuk menghapus kategori.</p>
              )}
              {kategoriOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {kategoriOptions.map((item) => {
                    const usedCount = stokList.filter((part) => part.kategori === item).length;
                    return (
                    <span key={item} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] text-violet-700">
                      {item}{usedCount > 0 ? ` · ${usedCount}` : ""}
                      <button type="button" onClick={() => handleDeleteCategory(item)} className="font-bold hover:text-red-600" aria-label={`Hapus kategori ${item}`}>×</button>
                    </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-stone-500">Harga beli (modal)</label>
                <input
                  type="number"
                  required
                  placeholder="35000"
                  value={hargaBeli}
                  onChange={(e) => setHargaBeli(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">Harga jual</label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={hargaJual}
                  onChange={(e) => setHargaJual(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-500">Jumlah stok masuk</label>
              <input
                type="number"
                required
                placeholder="10"
                value={stokTambah}
                onChange={(e) => setStokTambah(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-[0_12px_25px_rgba(41,35,34,0.14)] transition hover:bg-stone-800 disabled:opacity-50"
            >
              <Save size={15} /> {submitting ? "Menyimpan..." : "Simpan Part ke Gudang"}
            </button>
          </form>
        </div>

        {/* Tabel Daftar Gudang Saat Ini */}
        <div className="flex flex-col gap-4 rounded-[26px] border border-stone-200 bg-white/85 p-5 shadow-[0_18px_45px_rgba(61,52,45,0.07)] lg:col-span-2 lg:max-h-[650px] lg:self-start">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-stone-800">
                <Package size={16} className="text-stone-700" /> Daftar stok gudang
              </h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-600">{filteredStokList.length} tampil</span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative md:col-span-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama, kode, kategori"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 py-2 pl-9 pr-3 text-xs text-stone-800 outline-none focus:border-stone-500"
                />
              </div>
              <select
                value={kategoriFilter}
                onChange={(e) => setKategoriFilter(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
              >
                <option value="all">Semua kategori</option>
                {kategoriOptions.map((kategoriItem) => <option key={kategoriItem} value={kategoriItem}>{kategoriItem}</option>)}
              </select>
              <select
                value={stokFilter}
                onChange={(e) => setStokFilter(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
              >
                <option value="all">Semua status stok</option>
                <option value="habis">Habis</option>
                <option value="rendah">Rendah (1–5)</option>
                <option value="cukup">Cukup (&gt;5)</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-stone-500"
              >
                <option value="all">Semua status part</option>
                <option value="aktif">Aktif di kasir</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="py-16 text-center text-xs text-stone-500 animate-pulse">Memuat data gudang...</p>
          ) : filteredStokList.length === 0 ? (
            <p className="py-16 text-center text-xs text-stone-500">Data stok tidak ditemukan dengan filter saat ini.</p>
          ) : (
            <div className="h-[420px] min-h-[240px] overflow-auto rounded-xl lg:h-[455px]">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="sticky top-0 border-b border-stone-200 bg-white/95 text-stone-500">
                    <th className="p-3 font-semibold">Kode / Nama Part</th>
                    <th className="p-3 font-semibold">Kategori</th>
                    <th className="p-3 font-semibold text-right">H. Beli</th>
                    <th className="p-3 font-semibold text-right">H. Jual</th>
                    <th className="p-3 text-center font-semibold">Stok</th>
                    <th className="p-3 text-center font-semibold">Status</th>
                    <th className="p-3 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80">
                  {filteredStokList.map((item, idx) => (
                    <tr key={idx} className="transition hover:bg-stone-50">
                      <td className="p-3">
                        <p className="font-bold text-stone-800">{item.nama_part}</p>
                        <span className="font-mono text-[10px] text-stone-500">{item.kode_part}</span>
                      </td>
                      <td className="p-3">
                        <span className="rounded-md border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] text-stone-700">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="p-3 text-right text-stone-500">Rp {Number(item.harga_beli).toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-stone-800">Rp {Number(item.harga_jual).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${Number(item.stok) <= 0 ? "bg-red-100 text-red-700" : Number(item.stok) <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                          {item.stok}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.aktif === false ? "bg-stone-200 text-stone-600" : "bg-violet-100 text-violet-700"}`}>
                          {item.aktif === false ? "Nonaktif" : "Aktif"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => handleRestock(item)} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100" title="Restock">
                            <RotateCcw size={13} />
                          </button>
                          <button onClick={() => handleEditPart(item)} className="rounded-lg border border-violet-200 bg-violet-50 p-1.5 text-violet-700 transition hover:bg-violet-100" title="Edit part">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleToggleActive(item)} className="rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-stone-600 transition hover:bg-stone-100" title={item.aktif === false ? "Aktifkan part" : "Nonaktifkan part"}>
                            {item.aktif === false ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <section className="mt-5 rounded-[26px] border border-stone-200 bg-white/85 p-5 shadow-[0_18px_45px_rgba(61,52,45,0.07)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-stone-800"><History size={16} /> Riwayat restock terbaru</h2>
          <span className="text-[10px] text-stone-500">Maksimal 100 aktivitas</span>
        </div>
        {restockHistory.length === 0 ? (
          <p className="rounded-xl bg-stone-50 p-4 text-center text-xs text-stone-500">Belum ada riwayat restock.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 text-stone-500"><tr><th className="p-2">Waktu</th><th className="p-2">Part</th><th className="p-2 text-center">Jumlah</th><th className="p-2 text-center">Stok</th><th className="p-2">Keterangan</th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {restockHistory.map((entry) => (
                  <tr key={entry.id}><td className="p-2 text-stone-500">{new Date(entry.created_at).toLocaleString("id-ID")}</td><td className="p-2 font-medium text-stone-800">{entry.part?.nama_part || "Part"}</td><td className="p-2 text-center font-bold text-emerald-700">+{entry.jumlah}</td><td className="p-2 text-center text-stone-600">{entry.stok_sebelum} → {entry.stok_sesudah}</td><td className="p-2 text-stone-500">{entry.keterangan || "-"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}