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
export function assetContentType(file: Pick<File, "name">): string | undefined {
  const types: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", ttf: "font/ttf", otf: "font/otf",
  };
  const extension = file.name.match(/\.([^.]+)$/)?.[1].toLowerCase() || "";
  return Object.hasOwn(types, extension) ? types[extension] : undefined;
}
export function validateUpload(
  file: Pick<File, "name" | "size">,
): string | undefined {
  if (!assetContentType(file))
    return "Please choose PNG, JPG, GIF, TTF or OTF files.";
  if (file.size <= 0) return "Please choose a file that isn't empty.";
  if (file.size > 20 * 1024 * 1024)
    return "Please choose files no larger than 20 MB.";
}
export const previewColors: Record<string, string> = {
  sunday: "#ffe1d2",
  after: "#eedffc",
  stacked: "#fff0ad",
  daybreak: "#dceef9",
  pho: "#ffd2be",
  burger: "#ffe7a3",
};
