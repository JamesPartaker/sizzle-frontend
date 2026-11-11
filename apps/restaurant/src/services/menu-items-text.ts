import type { MenuItem } from "./restaurant-data";

const encodeCell = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, "\\n");

export function itemsToText(items: MenuItem[]) {
  return items
    .map(
      ({ name, description, price }) =>
        `${encodeCell(name)} | ${encodeCell(description)} | ${price}`,
    )
    .join("\n");
}

export function itemsFromText(text: string, previous: MenuItem[]): MenuItem[] {
  const available = new Set(previous);
  return text.split("\n").flatMap((line, index) => {
    if (!line.trim()) return [];
    const cells = [""];
    let escaped = false;
    for (const char of line) {
      if (escaped) {
        cells[cells.length - 1] += char === "n" ? "\n" : char;
        escaped = false;
      } else if (char === "\\") escaped = true;
      else if (char === "|") cells.push("");
      else cells[cells.length - 1] += char;
    }
    if (escaped) cells[cells.length - 1] += "\\";
    const [name, description, amount] = cells.map((cell) => cell.trim());
    const numericAmount = amount?.replace(/^\$/, "").trim();
    const price = Number(numericAmount);
    if (cells.length !== 3 || !name || !numericAmount || !validPrice(price))
      throw new Error(
        `Line ${index + 1} needs a name, description column, and a non-negative price with up to two decimal places.`,
      );
    const original = [...available].find((item) => item.name === name);
    if (original) available.delete(original);
    return [
      {
        ...original,
        name,
        description,
        price,
        attributes: original?.attributes ?? [],
      },
    ];
  });
}

export function validPrice(price: number, minimum = 0) {
  return (
    Number.isFinite(price) &&
    price >= minimum &&
    price <= 999999 &&
    Math.abs(price * 100 - Math.round(price * 100)) <= 1e-7
  );
}
