// utils/printHelper.ts

export function generateEscPosReceipt(transaction: any): Uint8Array {
  const encoder = new TextEncoder();
  const commands: number[] = [];
  const width = transaction.paperWidth === 42 ? 42 : 32;
  const line = "-".repeat(width);
  const money = (value: unknown) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
  const text = (value: unknown, fallback = "-") => String(value ?? fallback).trim() || fallback;

  const write = (value = "") => commands.push(...encoder.encode(`${value}\n`));
  const align = (value: number) => commands.push(0x1b, 0x61, value);
  const bold = (enabled: boolean) => commands.push(0x1b, 0x45, enabled ? 0x01 : 0x00);
  const wrap = (value: string) => {
    const words = value.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    words.forEach((word) => {
      if (!word) return;
      if (`${current} ${word}`.trim().length > width && current) {
        lines.push(current);
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : ["-"];
  };
  const pair = (label: string, value: string) => {
    const spaces = Math.max(1, width - label.length - value.length);
    write(`${label}${" ".repeat(spaces)}${value}`);
  };

  commands.push(0x1b, 0x40); // initialize
  align(1);
  commands.push(0x1b, 0x21, 0x10); // emphasized header
  wrap(text(transaction.storeName, "BENGKEL JOSJIS")).forEach(write);
  commands.push(0x1b, 0x21, 0x00);
  wrap(text(transaction.storeAddress)).forEach(write);
  if (transaction.storePhone) write(`Telp: ${text(transaction.storePhone)}`);
  write(line);

  align(0);
  pair("Nota", text(transaction.notaNo));
  pair("Tanggal", text(transaction.date));
  pair("Kasir", text(transaction.cashier, "Admin"));
  if (transaction.plateNumber && transaction.plateNumber !== "-") {
    pair("Plat", text(transaction.plateNumber).toUpperCase());
  }
  write(line);

  (transaction.items || []).forEach((item: any) => {
    wrap(text(item.name)).forEach(write);
    const quantity = `${item.qty} x ${Number(item.price || 0).toLocaleString("id-ID")}`;
    const subtotal = Number(item.subtotal || 0).toLocaleString("id-ID");
    pair(quantity, subtotal);
  });

  write(line);
  bold(true);
  pair("TOTAL", money(transaction.total));
  bold(false);
  pair("Bayar", money(transaction.cash));
  pair("Kembali", money(transaction.change));
  if (transaction.paymentMethod) pair("Metode", text(transaction.paymentMethod));
  write(line);

  align(1);
  wrap(text(transaction.footerMessage, "Terima kasih atas kunjungan Anda.")).forEach(write);
  write("Servis & sparepart berkualitas");
  write("");
  write("");
  commands.push(0x1d, 0x56, 0x41, 0x10); // cut paper

  return new Uint8Array(commands);
}