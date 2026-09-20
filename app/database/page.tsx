"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Database, Download, Upload, 
  RefreshCw, Package, FileText, List, AlertCircle 
} from "lucide-react";
import Link from "next/link";

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState<"part" | "transaksi" | "detail_transaksi">("part");
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async (table: string) => {
    setLoading(true);
    const { data, error } = await supabase.from(table).select("*").order("id", { ascending: false });
    if (error) {
      console.error(error);
      alert("Gagal memuat data tabel " + table);
    } else {
      setTableData(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  // Ekspor Data ke CSV
  const handleExportCSV = () => {
    if (tableData.length === 0) return alert("Tidak ada data untuk diekspor!");

    const headers = Object.keys(tableData[0]);
    const csvRows = tableData.map(row => 
      headers.map(h => {
        let val = row[h] === null ? "" : String(row[h]);
        val = val.replace(/"/g, '""'); 
        return `"${val}"`;
      }).join(',')
    );

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.setAttribute("download", `Backup_${activeTab.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Import Data dari CSV
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`⚠️ YAKIN INGIN IMPORT KE TABEL "${activeTab.toUpperCase()}"?\n\nPastikan format kolom (header baris pertama) di CSV sama persis dengan nama kolom di database.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) throw new Error("File kosong atau tidak memiliki baris data.");

        const headers = lines[0].split(',').map(h => h.trim().replace(/(^"|"$)/g, ''));
        const payload = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => 
            v.trim().replace(/(^"|"$)/g, '').replace(/""/g, '"')
          );
          
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            if (values[idx] !== undefined && values[idx] !== "") {
              rowObj[h] = values[idx];
            }
          });
          payload.push(rowObj);
        }

        const { error } = await supabase.from(activeTab).insert(payload);
        if (error) throw new Error(error.message);

        alert(`✅ ${payload.length} baris data berhasil diimpor ke tabel ${activeTab}!`);
        fetchData(activeTab);
      } catch (err: any) {
        alert("❌ Gagal Import: " + err.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const renderTableHeaders = () => {
    if (tableData.length === 0) return null;
    return Object.keys(tableData[0]).map((key) => (
      <th key={key} className="px-4 py-3 font-semibold text-slate-300 border-b border-slate-700">{key}</th>
    ));
  };

  const renderTableRows = () => {
    if (tableData.length === 0) return null;
    const headers = Object.keys(tableData[0]);
    return tableData.map((row, idx) => (
      <tr key={idx} className="hover:bg-slate-800/50 transition">
        {headers.map((key) => (
          <td key={key} className="px-4 py-3 border-b border-slate-800/50 text-slate-400 max-w-[200px] truncate">
            {row[key] === null ? <span className="text-slate-600 italic">null</span> : String(row[key])}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 border border-slate-800 bg-slate-900 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Database className="text-blue-500" size={24} /> Pusat Data & Sinkronisasi
            </h1>
            <p className="text-sm text-slate-500">Melihat, mengekspor, dan mengimpor seluruh data mentah dari database.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* SIDEBAR TABS */}
        <div className="xl:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Pilih Tabel Database</h3>
          
          <button 
            onClick={() => setActiveTab("part")}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition ${activeTab === "part" ? "bg-blue-600/10 border-blue-500/50 text-blue-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}
          >
            <Package size={20} />
            <div className="text-left">
              <p className="font-semibold text-sm">Onderdil & Jasa (part)</p>
              <p className="text-[10px] opacity-70">Data stok dan daftar harga</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab("transaksi")}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition ${activeTab === "transaksi" ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}
          >
            <FileText size={20} />
            <div className="text-left">
              <p className="font-semibold text-sm">Header Nota (transaksi)</p>
              <p className="text-[10px] opacity-70">Data pelanggan & omset per nota</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab("detail_transaksi")}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition ${activeTab === "detail_transaksi" ? "bg-purple-600/10 border-purple-500/50 text-purple-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}
          >
            <List size={20} />
            <div className="text-left">
              <p className="font-semibold text-sm">Isi Nota (detail_transaksi)</p>
              <p className="text-[10px] opacity-70">Rincian item per transaksi</p>
            </div>
          </button>

          <div className="mt-6 bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-orange-400 shrink-0 mt-0.5" size={16} />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Tips Import Data Baru:</strong> Kosongkan atau hapus kolom <code className="bg-slate-800 px-1 rounded text-orange-300">id</code> pada file CSV lu saat mengimpor data baru agar Supabase bisa membuat ID unik secara otomatis.
            </p>
          </div>
        </div>

        {/* DATA VIEWER */}
        <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-xl min-h-[500px]">
          
          {/* Action Bar */}
          <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-900/80 gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Tabel: <span className="text-blue-400 font-mono">{activeTab}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Total Record: {tableData.length} data</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={() => fetchData(activeTab)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition" title="Refresh Data">
                <RefreshCw size={16} className={loading ? "animate-spin text-blue-500" : ""} />
              </button>
              
              {/* IMPORT BUTTON (Hidden File Input) */}
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleImportCSV} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium transition text-white shadow-md shadow-orange-600/20"
              >
                <Upload size={16} /> Import CSV
              </button>

              <button 
                onClick={handleExportCSV} 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition text-white shadow-md shadow-blue-500/20"
              >
                <Download size={16} /> Export CSV
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto bg-slate-950/50">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm py-20">
                <RefreshCw size={32} className="animate-spin mb-4 text-blue-500/50" />
                Memuat data dari database...
              </div>
            ) : tableData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm py-20">
                Data di tabel ini masih kosong.
              </div>
            ) : (
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 sticky top-0 shadow-md">
                  <tr>
                    {renderTableHeaders()}
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows()}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}