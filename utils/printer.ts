// utils/printer.ts
import { Capacitor } from "@capacitor/core";
import { generateEscPosReceipt } from "./printHelper";
import { printViaBluetoothSerial } from "./bluetoothSerialPrinter";

const THERMAL_SERVICE_PRIMARY = "000018f0-0000-1000-8000-00805f9b34fb";
const THERMAL_SERVICE_ALT = "0000ff00-0000-1000-8000-00805f9b34fb";
const THERMAL_CHAR_PRIMARY = "0000ff02-0000-1000-8000-00805f9b34fb";
const THERMAL_CHAR_ALT = "00002af1-0000-1000-8000-00805f9b34fb";

function isCapacitorEnvironment() {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === "undefined") return false;
  const nativeCapacitor = (window as any).Capacitor;
  const userAgent = window.navigator?.userAgent || "";
  return Boolean(nativeCapacitor) || /Capacitor|Android.*wv|; wv\)/i.test(userAgent);
}

async function printViaWebBluetooth(transactionData: any): Promise<boolean> {
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    return false;
  }

  try {
    const bluetooth = (navigator as any).bluetooth;
    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [THERMAL_SERVICE_PRIMARY, THERMAL_SERVICE_ALT],
    });

    const server = await device.gatt?.connect();
    if (!server) return false;

    const service = await server
      .getPrimaryService(THERMAL_SERVICE_PRIMARY)
      .catch(() => server.getPrimaryService(THERMAL_SERVICE_ALT));

    const characteristic = await service
      .getCharacteristic(THERMAL_CHAR_PRIMARY)
      .catch(() => service.getCharacteristic(THERMAL_CHAR_ALT));

    const buffer = generateEscPosReceipt(transactionData);
    const CHUNK_SIZE = 512;

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      const chunk = buffer.slice(i, i + CHUNK_SIZE);
      await characteristic.writeValue(chunk);
    }

    device.gatt?.disconnect();
    return true;
  } catch (error) {
    console.error("Gagal cetak Web Bluetooth:", error);
    return false;
  }
}

async function printViaWebSerial(transactionData: any): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serial" in navigator)) {
    return false;
  }

  try {
    const serial = (navigator as any).serial;
    const port = await serial.requestPort();
    await port.open({ baudRate: 9600 });

    const buffer = generateEscPosReceipt(transactionData);
    const writer = port.writable?.getWriter();
    if (!writer) {
      await port.close();
      return false;
    }

    await writer.write(buffer);
    writer.releaseLock();
    await port.close();
    return true;
  } catch (error) {
    console.error("Gagal cetak Web Serial:", error);
    return false;
  }
}

async function printViaWebUSB(transactionData: any): Promise<boolean> {
  if (typeof navigator === "undefined" || !("usb" in navigator)) {
    return false;
  }

  try {
    const usb = (navigator as any).usb;
    const device = await usb.requestDevice({ filters: [] });

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    const buffer = generateEscPosReceipt(transactionData);
    await device.transferOut(2, buffer);
    await device.releaseInterface(0);
    await device.close();
    return true;
  } catch (error) {
    console.error("Gagal cetak Web USB:", error);
    return false;
  }
}

export async function printReceipt(transactionData: any): Promise<boolean> {
  try {
    if (isCapacitorEnvironment()) {
      return await printViaBluetoothSerial(transactionData);
    }

    // Untuk Web (Vercel) / PC (Electron)
    const successBT = await printViaWebBluetooth(transactionData);
    if (successBT) return true;

    const successSerial = await printViaWebSerial(transactionData);
    if (successSerial) return true;

    const successUSB = await printViaWebUSB(transactionData);
    if (successUSB) return true;

    alert("Pencetakan tidak terhubung. Pilih perangkat printer thermal USB/Bluetooth.");
    return false;
  } catch (error: any) {
    console.error("Gagal mencetak struk:", error);
    alert("Gagal mencetak: " + (error?.message || "Kesalahan printer"));
    return false;
  }
}
