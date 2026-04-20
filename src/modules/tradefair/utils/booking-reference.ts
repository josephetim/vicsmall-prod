export function buildBookingReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now().toString().slice(-6);
  return `VIC-TF-${ts}-${random}`;
}
