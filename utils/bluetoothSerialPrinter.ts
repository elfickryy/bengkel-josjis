// utils/bluetoothSerialPrinter.ts
import { BluetoothSerial } from '@awesome-cordova-plugins/bluetooth-serial';
import { generateEscPosReceipt } from './printHelper';

export async function printViaBluetoothSerial(transactionData: any): Promise<boolean> {
  try {
    const isEnabled = await BluetoothSerial.isEnabled().catch(() => false);
    if (!isEnabled) {
      await BluetoothSerial.enable().catch(() => {});
    }

    const devices = await BluetoothSerial.list().catch(() => []);
    if (!devices || devices.length === 0) {
      alert("Tidak ada perangkat Bluetooth tersanding (paired). Hubungkan printer thermal via pengaturan Bluetooth HP terlebih dahulu.");
      return false;
    }

    let targetDevice = devices.find((d: any) => {
      const name = (d.name || "").toLowerCase();
      return name.includes("printer") || name.includes("pos") || name.includes("mpt") || name.includes("mtp") || name.includes("thermal") || name.includes("blue");
    });

    if (!targetDevice) {
      targetDevice = devices[0];
    }

    const deviceId = targetDevice.id || targetDevice.address;
    if (!deviceId) {
      alert("Alamat MAC printer Bluetooth tidak valid.");
      return false;
    }

    await BluetoothSerial.connect(deviceId);

    const buffer = generateEscPosReceipt(transactionData);
    await BluetoothSerial.write(buffer);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await BluetoothSerial.disconnect();

    return true;
  } catch (error: any) {
    console.error("Gagal cetak Bluetooth Serial:", error);
    alert("Gagal cetak Bluetooth: " + (error?.message || error || "Pastikan printer menyala & terhubung"));
    try {
      await BluetoothSerial.disconnect();
    } catch {}
    return false;
  }
}
