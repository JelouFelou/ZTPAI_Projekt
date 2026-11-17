// Treat the selected size as a minimum and finish the last row before paginating.
export function catalogPageSize(minimum: number, columns: number): number {
  const count = Math.max(1, Math.min(100, Math.floor(columns)));
  return Math.min(
    Math.ceil(minimum / count) * count,
    Math.floor(100 / count) * count,
  );
}
