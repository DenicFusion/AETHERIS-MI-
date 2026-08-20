export function generateRefCode() {
  const digits = Math.floor(1000000 + Math.random() * 9000000);
  return `AET-${digits}`;
}
