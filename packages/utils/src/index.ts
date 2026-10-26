export function timeAgo(timestamp: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) {
    const n = Math.floor(minutes / 60);
    return `${n} ${n === 1 ? "hour" : "hours"} ago`;
  }
  const n = Math.floor(minutes / 1440);
  return `${n} ${n === 1 ? "day" : "days"} ago`;
}
export const money = (amount: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    amount,
  );
export function assetData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });
}
export function validateUpload(
  file: Pick<File, "type" | "size">,
): string | undefined {
  if (
    !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(
      file.type,
    )
  )
    return "Please choose SVG, PNG, JPG or WebP images.";
  if (file.size > 5 * 1024 * 1024)
    return "Please choose files smaller than 5 MB.";
}
export const previewColors: Record<string, string> = {
  sunday: "#ffe1d2",
  after: "#eedffc",
  stacked: "#fff0ad",
  daybreak: "#dceef9",
  pho: "#ffd2be",
  burger: "#ffe7a3",
};
