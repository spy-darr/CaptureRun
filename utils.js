export function haversine(p1, p2) {
  const R = 6371;
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLng = (p2[1] - p1[1]) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1[0] * Math.PI / 180) *
    Math.cos(p2[0] * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateArea(coords) {
  let area = 0;

  for (let i = 0; i < coords.length; i++) {
    let j = (i + 1) % coords.length;
    area += coords[i][1] * coords[j][0];
    area -= coords[j][1] * coords[i][0];
  }

  return Math.abs(area / 2) * 111 * 111;
}
