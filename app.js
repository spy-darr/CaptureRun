let map = L.map('map').setView([18.5204, 73.8567], 15); // Pune default

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

let watchId = null;
let path = [];
let polyline = null;
let polygons = JSON.parse(localStorage.getItem("polygons")) || [];

let totalDistance = 0;
let totalArea = 0;

// 🟢 Start Run
function startRun() {
  path = [];
  totalDistance = 0;

  watchId = navigator.geolocation.watchPosition(pos => {
    let lat = pos.coords.latitude;
    let lng = pos.coords.longitude;

    let point = [lat, lng];
    path.push(point);

    if (polyline) map.removeLayer(polyline);
    polyline = L.polyline(path, { color: 'blue' }).addTo(map);

    map.setView(point);

    calculateDistance();
    detectLoop();

  }, err => {
    alert("GPS error");
  }, {
    enableHighAccuracy: true,
    maximumAge: 1000
  });
}

// 🔴 Stop Run
function stopRun() {
  navigator.geolocation.clearWatch(watchId);
}

// 📏 Distance Calculation
function calculateDistance() {
  totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    totalDistance += getDistance(path[i - 1], path[i]);
  }
  document.getElementById("distance").innerText = totalDistance.toFixed(2);
}

// Haversine formula
function getDistance(p1, p2) {
  let R = 6371;
  let dLat = (p2[0] - p1[0]) * Math.PI / 180;
  let dLng = (p2[1] - p1[1]) * Math.PI / 180;

  let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(p1[0]*Math.PI/180) * Math.cos(p2[0]*Math.PI/180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 🔁 Loop Detection (simple)
function detectLoop() {
  if (path.length < 10) return;

  let start = path[0];
  let current = path[path.length - 1];

  let dist = getDistance(start, current);

  if (dist < 0.05) { // ~50 meters
    captureArea();
    path = [];
  }
}

// 📐 Area Calculation (Shoelace)
function calculateArea(coords) {
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    let j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  return Math.abs(area / 2) * 111 * 111; // approx km²
}

// 🏁 Capture Area
function captureArea() {
  let area = calculateArea(path);
  totalArea += area;

  let newPoly = {
    coords: path,
    area: area,
    shield: 1
  };

  polygons.push(newPoly);
  localStorage.setItem("polygons", JSON.stringify(polygons));

  L.polygon(path, { color: 'green' }).addTo(map);

  document.getElementById("area").innerText = totalArea.toFixed(3);

  updateLeaderboard();
}

// 🏆 Leaderboard
function updateLeaderboard() {
  let score = (totalArea * 1000) + (totalDistance * 10);

  let data = JSON.parse(localStorage.getItem("leaderboard")) || [];

  data.push({
    name: "Player",
    score: score.toFixed(2),
    area: totalArea.toFixed(3),
    distance: totalDistance.toFixed(2)
  });

  localStorage.setItem("leaderboard", JSON.stringify(data));

  renderLeaderboard();
}

// 📋 Render Leaderboard
function renderLeaderboard() {
  let list = document.getElementById("leaderboard");
  list.innerHTML = "";

  let data = JSON.parse(localStorage.getItem("leaderboard")) || [];

  data.sort((a, b) => b.score - a.score);

  data.forEach(player => {
    let li = document.createElement("li");
    li.innerText = `${player.name} - Score: ${player.score}`;
    list.appendChild(li);
  });
}

renderLeaderboard();
