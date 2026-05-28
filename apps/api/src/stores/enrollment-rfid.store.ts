export interface EnrollmentRfidScan {
  uid: string;
  deviceId: string;
  scannedAt: Date;
}

let latestScan: EnrollmentRfidScan | null = null;

export const enrollmentRfidStore = {
  set(scan: { uid: string; deviceId: string }) {
    latestScan = {
      uid: scan.uid,
      deviceId: scan.deviceId,
      scannedAt: new Date(),
    };
    return latestScan;
  },

  get(): EnrollmentRfidScan | null {
    return latestScan;
  },

  clear() {
    latestScan = null;
  },
};
