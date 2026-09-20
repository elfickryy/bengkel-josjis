"use client";
import { useState } from "react";
import { Printer } from "lucide-react";
import { printReceipt } from "@/utils/printer";

export default function PrinterButton({ testData }: { testData: any }) {
  const [status, setStatus] = useState("Test Print Thermal");
  const [printing, setPrinting] = useState(false);

  const handleConnect = async () => {
    setPrinting(true);
    setStatus("Mencoba printer...");
    try {
      const result = await printReceipt(testData);
      setStatus(result ? "Print berhasil" : "Printer tidak terdeteksi");
    } catch {
      setStatus("Print gagal");
    } finally {
      setPrinting(false);
      setTimeout(() => setStatus("Test Print Thermal"), 2200);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={printing}
      className="flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-900 px-3 py-2 text-[10px] font-semibold text-stone-50 shadow-sm transition hover:border-stone-500 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Printer size={14} />
      <span>{printing ? "Sedang print..." : status}</span>
    </button>
  );
}