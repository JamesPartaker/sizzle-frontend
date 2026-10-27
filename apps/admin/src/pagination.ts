/** First/last pages plus two neighbours on either side of the current page. */
export function paginationPages(current: number, total: number): (number | "ellipsis")[] {
  const pages = new Set([1, total]);
  for (let number = Math.max(1, current - 2); number <= Math.min(total, current + 2); number++) pages.add(number);
  const result: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const number of [...pages].sort((a, b) => a - b)) {
    if (number - previous === 2) result.push(previous + 1);
    else if (number - previous > 2) result.push("ellipsis");
    result.push(number);
    previous = number;
  }
  return result;
}
