// utils/bluetoothSerialPrinter.ts
import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';
import { generateEscPosReceipt } from './printHelper';

export async function printViaBluetoothSerial(transactionData: any): Promise<boolean> {
  try {
    // Cek & minta izin Bluetooth
    const hasPermission = await BluetoothSerial.checkBluetoothPermissions();
    if (!hasPermission) {
      alert("Izin Bluetooth belum diberikan. Harap izinkan di pengaturan aplikasi.");
      return false;
    }

    // Cek Bluetooth aktif
    const state = await BluetoothSerial.isEnabled();
    if (!state.enabled) {
      await BluetoothSerial.enable();
      const stateAfter = await BluetoothSerial.isEnabled();
      if (!stateAfter.enabled) {
        alert("Bluetooth tidak aktif. Harap aktifkan Bluetooth.");
        return false;
      }
    }

    // Ambil daftar perangkat yang sudah di-pairing
    const { devices } = await BluetoothSerial.getPairedDevices();
    if (!devices || devices.length === 0) {
      alert("Tidak ada perangkat Bluetooth tersanding. Pasangkan printer thermal di pengaturan Bluetooth HP terlebih dahulu.");
      return false;
    }

    // Cari printer berdasarkan nama
    let targetDevice = devices.find((d: any) => {
      const name = (d.name || "").toLowerCase();
      return (
        name.includes("printer") ||
        name.includes("pos") ||
        name.includes("mpt") ||
        name.includes("mtp") ||
        name.includes("thermal") ||
        name.includes("rp") ||
        name.includes("xp") ||
        name.includes("epson") ||
        name.includes("blue")
      );
    });

    // Fallback ke perangkat pertama jika tidak ada yang cocok
    if (!targetDevice) targetDevice = devices[0];

    const address = targetDevice.address;
    if (!address) {
      alert("Alamat MAC printer tidak valid.");
      return false;
    }

    // Hubungkan ke printer
    await BluetoothSerial.connect({ address });

    // Generate ESC/POS data
    const buffer = generateEscPosReceipt(transactionData);

    // Plugin native pakai getBytes(UTF_8), jadi kirim sebagai Latin-1 string
    // Gunakan TextDecoder Latin-1 agar byte 0-255 tidak corrupt
    const latin1 = new TextDecoder('iso-8859-1').decode(buffer);
    await BluetoothSerial.write({ address, value: latin1 });

    // Tunggu sebentar sebelum disconnect
    await new Promise((resolve) => setTimeout(resolve, 800));
    await BluetoothSerial.disconnect({ address });

    return true;
  } catch (error: any) {
    console.error("Gagal cetak Bluetooth Serial:", error);
    alert("Gagal cetak Bluetooth: " + (error?.message || "Pastikan printer menyala & sudah dipasangkan (paired)"));
    try {
      // Best-effort disconnect
    } catch {}
    return false;
  }
}
