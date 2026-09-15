"use client";
import { useState, useEffect, useMemo } from "react";
import { getRekapTransaksi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, DollarSign, RefreshCw, ShoppingBag, 
  Calendar as CalendarIcon, Filter, Printer, RotateCcw, 
  Eye, Settings, Search, Download, FileText, TrendingUp, Package
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function RekapPage() {
  const [rekapList, setRekapList] = useState<any[]>([]);
  const [filteredList, setFilteredList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
  const [selectedTanggal, setSelectedTanggal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalDetail, setModalDetail] = useState<any>(null);

  const loadRekap = async () => {
    setLoading(true);
    const data = await getRekapTransaksi();
    setRekapList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRekap();
  }, []);

  // Set tanggal yang memiliki transaksi (format: YYYY-MM-DD)
  const activeDatesSet = useMemo(() => {
    const dates = new Set<string>();
    rekapList.forEach((trx) => {
      if (trx.tanggal) {
        const d = new Date(trx.tanggal);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dates.add(`${year}-${month}-${day}`);
      }
    });
    return dates;
  }, [rekapList]);

  useEffect(() => {
    let result = [...rekapList];

    if (selectedTanggal) {
      result = result.filter((trx) => {
        const d = new Date(trx.tanggal);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dateStr === selectedTanggal;
      });
    } else {
      result = result.filter((trx) => {
        const trxDate = new Date(trx.tanggal);
        return (
          trxDate.getMonth() + 1 === Number(selectedBulan) &&
          trxDate.getFullYear() === Number(selectedTahun)
        );
      });
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (trx) =>
          trx.nomor_nota?.toLowerCase().includes(q) ||
          trx.nama_pelanggan?.toLowerCase().includes(q) ||
          trx.plat_nomor?.toLowerCase().includes(q)
      );
    }

    setFilteredList(result.reverse());
  }, [rekapList, selectedBulan, selectedTahun, selectedTanggal, searchQuery]);

  // Statistik Dashboard
  const activeList = filteredList.filter(trx => trx.status_bayar !== "RETUR");
  const totalOmset = activeList.reduce((sum, item) => sum + Number(item.total_belanja || 0), 0);
  const totalTransaksi = activeList.length;
  const totalItemTerjual = activeList.reduce((sum, trx) => sum + (trx.items?.reduce((s: number, i: any) => s + Number(i.qty), 0) || 0), 0);
  const rataRataTransaksi = totalTransaksi > 0 ? totalOmset / totalTransaksi : 0;

  const handleReturItem = async (id_transaksi: string, id_detail: string, namaItem: string, maxQty: number) => {
    const inputQty = prompt(`Masukkan jumlah "${namaItem}" yang diretur (Maks: ${maxQty}):`, "1");
    if (!inputQty) return;
    
    const qtyRetur = Number(inputQty);
    if (isNaN(qtyRetur) || qtyRetur <= 0 || qtyRetur > maxQty) {
      alert("Jumlah retur tidak valid.");
      return;
    }

    if (!confirm(`Konfirmasi retur ${qtyRetur} unit "${namaItem}"? Stok gudang akan otomatis disesuaikan.`)) return;

    try {
      const { data: detailData, error: errDetail } = await supabase.from("detail_transaksi").select("*").eq("id", id_detail).single();
      if (errDetail || !detailData) return alert("Gagal: Data item tidak ditemukan.");

      const currentQty = Number(detailData.qty);
      const currentSubtotal = Number(detailData.subtotal);
      const hargaSatuan = currentQty > 0 ? currentSubtotal / currentQty : 0;
      const newQty = currentQty - qtyRetur;
      const newSubtotal = newQty * hargaSatuan;

      const { error: errUpdateDetail } = await supabase.from("detail_transaksi").update({ qty: newQty, subtotal: newSubtotal }).eq("id", id_detail);
      if (errUpdateDetail) throw new Error(errUpdateDetail.message);

      if (detailData.jenis === "PART") {
        const { data: partData } = await supabase.from("part").select("id, stok").eq("nama_part", detailData.nama_item).single();
        if (partData) {
          const stokKembali = Number(partData.stok) + qtyRetur;
          await supabase.from("part").update({ stok: stokKembali }).eq("id", partData.id);
        }
      }

      const { data: allDetails } = await supabase.from("detail_transaksi").select("subtotal").eq("id_transaksi", id_transaksi);
      const totalBaru = (allDetails || []).reduce((sum, d) => sum + Number(d.subtotal), 0);
      const statusBayarBaru = totalBaru === 0 ? "RETUR" : "LUNAS";
      await supabase.from("transaksi").update({ total_belanja: totalBaru, status_bayar: statusBayarBaru }).eq("nomor_nota", id_transaksi);

      alert("Retur berhasil diproses.");
      setModalDetail(null);
      loadRekap();
    } catch (err: any) {
      alert("System Error: " + err.message);
    }
  };

  const cetakNota = (trx: any) => {
    const savedConfig = localStorage.getItem("bengkel_config");
    const config = savedConfig ? JSON.parse(savedConfig) : {
      namaBengkel: "BENGKEL MOTOR JOSJIS",
      alamatBengkel: "Jl. Raya Bengkel No. 32",
      teleponBengkel: "08123456789",
      pesanStruk: "Terima Kasih Atas Kunjungan Anda!"
    };

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Nota - ${trx.nomor_nota}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 280px; padding: 10px; margin: 0; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            table { width: 100%; font-size: 11px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <h3 style="margin:0;">${config.namaBengkel}</h3>
            <p style="margin:2px 0;">${config.alamatBengkel}</p>
            <p style="margin:2px 0;">Telp: ${config.teleponBengkel}</p>
          </div>
          <div class="line"></div>
          <p style="margin:2px 0;">No Nota: ${trx.nomor_nota}</p>
          <p style="margin:2px 0;">Tanggal: ${new Date(trx.tanggal).toLocaleString("id-ID")}</p>
          <p style="margin:2px 0;">Pelanggan: ${trx.nama_pelanggan || "Umum"} (${trx.plat_nomor || "-"})</p>
          <div class="line"></div>
          <table>
            ${trx.items?.map((i: any) => `
              <tr><td colspan="2"><b>${i.nama_item}</b></td></tr>
              <tr><td>${i.qty}x @ ${Number(i.harga_satuan).toLocaleString()}</td><td style="text-align:right">Rp ${Number(i.subtotal).toLocaleString()}</td></tr>
            `).join("") || ""}
          </table>
          <div class="line"></div>
          <div class="flex"><strong>TOTAL:</strong><strong>Rp ${Number(trx.total_belanja).toLocaleString()}</strong></div>
          <p style="margin:4px 0;">Bayar: ${trx.metode_bayar}</p>
          <div class="line"></div>
          <div class="center"><p style="margin:0;">${config.pesanStruk}</p></div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    if (filteredList.length === 0) return alert("Tidak ada data untuk diekspor.");
    
    // Siapkan data dengan format rapi untuk Excel
    const dataToExport = filteredList.map(trx => {
      const dateObj = new Date(trx.tanggal);
      return {
        "Nomor Nota": trx.nomor_nota,
        "Tanggal": dateObj.toLocaleDateString("id-ID"),
        "Waktu": dateObj.toLocaleTimeString("id-ID"),
        "Pelanggan": trx.nama_pelanggan || "Umum",
        "Plat Nomor": trx.plat_nomor || "-",
        "Metode Bayar": trx.metode_bayar,
        "Status": trx.status_bayar,
        "Total Belanja (Rp)": Number(trx.total_belanja)
      };
    });

    // Buat worksheet dari data JSON
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Atur lebar kolom biar gak dempet
    const columnWidths = [
      { wch: 18 }, // Nomor Nota
      { wch: 12 }, // Tanggal
      { wch: 10 }, // Waktu
      { wch: 20 }, // Pelanggan
      { wch: 12 }, // Plat Nomor
      { wch: 15 }, // Metode Bayar
      { wch: 10 }, // Status
      { wch: 18 }  // Total Belanja
    ];
    worksheet["!cols"] = columnWidths;

    // Buat workbook dan tambahkan worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Transaksi");

    // Simpan file sebagai .xlsx
    XLSX.writeFile(workbook, `Laporan_Transaksi_${selectedBulan}_${selectedTahun}.xlsx`);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 p-4 md:p-8 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 border border-slate-800 bg-slate-900 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Rekapitulasi Transaksi</h1>
            <p className="text-sm text-slate-500">Laporan keuangan dan riwayat operasional bengkel.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Cari nota, pelanggan, plat..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-200 w-full md:w-64"
            />
          </div>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-700/20 hover:bg-emerald-700/30 border border-emerald-700/50 rounded-lg text-sm font-medium transition text-emerald-400">
            <Download size={16} /> Export Excel
          </button>
          <Link href="/setting" className="p-2 border border-slate-800 bg-slate-900 rounded-lg hover:bg-slate-800 text-slate-400 transition" title="Pengaturan">
            <Settings size={18} />
          </Link>
          <button onClick={loadRekap} className="p-2 border border-slate-800 bg-slate-900 rounded-lg hover:bg-slate-800 text-slate-400 transition" title="Muat Ulang">
            <RefreshCw size={18} className={loading ? "animate-spin text-blue-500" : ""} />
          </button>
        </div>
      </div>

      {/* KEY METRICS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-slate-400">Total Omset Bersih</p>
            <span className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><DollarSign size={18} /></span>
          </div>
          <h3 className="text-2xl font-semibold text-slate-100">Rp {totalOmset.toLocaleString()}</h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-slate-400">Transaksi Berhasil</p>
            <span className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><FileText size={18} /></span>
          </div>
          <h3 className="text-2xl font-semibold text-slate-100">{totalTransaksi} <span className="text-sm text-slate-500 font-normal">Nota</span></h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-slate-400">Total Item Terjual</p>
            <span className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><Package size={18} /></span>
          </div>
          <h3 className="text-2xl font-semibold text-slate-100">{totalItemTerjual} <span className="text-sm text-slate-500 font-normal">Unit/Jasa</span></h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-slate-400">Rata-rata Transaksi</p>
            <span className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><TrendingUp size={18} /></span>
          </div>
          <h3 className="text-2xl font-semibold text-slate-100">Rp {Math.round(rataRataTransaksi).toLocaleString()}</h3>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* LEFT SIDEBAR: FILTERS & CALENDAR */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Filter size={16} className="text-slate-400" /> Filter Waktu
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Bulan</label>
                <select
                  value={selectedBulan}
                  onChange={(e) => { setSelectedBulan(Number(e.target.value)); setSelectedTanggal(null); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
                >
                  {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((b, idx) => (
                    <option key={idx} value={idx + 1}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Tahun</label>
                <select
                  value={selectedTahun}
                  onChange={(e) => { setSelectedTahun(Number(e.target.value)); setSelectedTanggal(null); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
                >
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg p-3 bg-slate-950/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <CalendarIcon size={14} /> Kalender Harian
                </span>
                {selectedTanggal && (
                  <button onClick={() => setSelectedTanggal(null)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition">Clear Filter</button>
                )}
              </div>
              
              <div className="grid grid-cols-7 text-center text-[10px] font-medium text-slate-500 mb-2">
                <span>M</span><span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {Array.from({ length: getFirstDayOfMonth(selectedTahun, selectedBulan) }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: getDaysInMonth(selectedTahun, selectedBulan) }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${selectedTahun}-${String(selectedBulan).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = selectedTanggal === dateStr;
                  const hasTransaction = activeDatesSet.has(dateStr);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedTanggal(isSelected ? null : dateStr)}
                      className={`relative h-8 rounded-md font-medium transition flex flex-col items-center justify-center ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : hasTransaction
                          ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 font-bold"
                          : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      <span>{day}</span>
                      {hasTransaction && (
                        <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? "bg-white" : "bg-emerald-400"}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Keterangan Warna Legenda */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  </span>
                  <span>Ada Transaksi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span>
                  <span>Dipilih</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT: DATA TABLE */}
        <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="text-sm font-semibold text-slate-200">Daftar Transaksi</h2>
            <span className="text-xs text-slate-500">Menampilkan {filteredList.length} data</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500 text-sm flex flex-col items-center">
              <RefreshCw size={24} className="animate-spin mb-3 text-slate-600" />
              Memuat data transaksi...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              Tidak ada data transaksi yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">No. Nota & Tanggal</th>
                    <th className="px-4 py-3 font-medium">Pelanggan</th>
                    <th className="px-4 py-3 font-medium">Metode</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredList.map((trx, idx) => {
                    const isRetur = trx.status_bayar === "RETUR";
                    return (
                      <tr key={idx} className={`hover:bg-slate-800/30 transition ${isRetur ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-mono font-medium text-slate-200">{trx.nomor_nota}</p>
                          <p className="text-[11px] text-slate-500">{new Date(trx.tanggal).toLocaleString("id-ID")}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-300">{trx.nama_pelanggan || "Umum"}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{trx.plat_nomor || "-"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
                            {trx.metode_bayar}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                            isRetur ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          }`}>
                            {trx.status_bayar || "LUNAS"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-200">
                          Rp {Number(trx.total_belanja).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setModalDetail(trx)}
                            className="inline-flex items-center justify-center p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
                            title="Detail & Cetak"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETAIL (Enterprise Style) */}
      {modalDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  Detail Transaksi <span className="font-mono text-slate-400 text-sm">#{modalDetail.nomor_nota}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">{new Date(modalDetail.tanggal).toLocaleString("id-ID")}</p>
              </div>
              <button onClick={() => setModalDetail(null)} className="text-slate-500 hover:text-slate-300 bg-slate-800 p-1.5 rounded-md">✕</button>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Pelanggan / Plat</p>
                  <p className="font-medium text-slate-200">{modalDetail.nama_pelanggan || "Umum"} <span className="text-slate-500 text-xs font-mono ml-1">({modalDetail.plat_nomor || "-"})</span></p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Status Pembayaran</p>
                  <p className="font-medium text-slate-200">{modalDetail.metode_bayar} • <span className={modalDetail.status_bayar === "RETUR" ? "text-red-400" : "text-emerald-400"}>{modalDetail.status_bayar || "LUNAS"}</span></p>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Rincian Item</h4>
              <div className="max-h-56 overflow-y-auto pr-1 space-y-2 mb-4">
                {modalDetail.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                    <div>
                      <p className="font-medium text-slate-200 text-sm">{item.nama_item}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.qty} x Rp {Number(item.harga_satuan).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-semibold text-slate-200">Rp {Number(item.subtotal).toLocaleString()}</p>
                      {Number(item.qty) > 0 && (
                        <button
                          onClick={() => handleReturItem(modalDetail.nomor_nota, item.id, item.nama_item, Number(item.qty))}
                          className="flex items-center gap-1 text-[10px] font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition"
                        >
                          <RotateCcw size={12} /> Retur Item
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <span className="text-sm font-medium text-slate-400">Total Belanja</span>
                <span className="text-xl font-bold text-slate-100">Rp {Number(modalDetail.total_belanja).toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <button
                onClick={() => cetakNota(modalDetail)}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium py-2.5 rounded-lg transition"
              >
                <Printer size={16} /> Cetak Struk Thermal
              </button>
            </div>
            
          </div>
        </div>
      )}
    </main>
  );
}