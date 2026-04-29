// MAP INIT
let map = L.map('map').setView([18.5204, 73.8567], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// STATE
let path = [];
let watchId = null;
let polyline = null;

let polygons = JSON.parse(localStorage.getItem("polygons")) || [];

let totalDistance = 0;
let totalArea = 0;

// START RUN
function startRun() {
  path = [];
  totalDistance = 0;

  watchId = navigator.geolocation.watchPosition(pos => {
    let speed = pos.coords.speed || 0;

    // 🚫 Anti-cheat (ignore if > 15 km/h)
    if (speed > 4.2) return;

    let point = [pos.coords.latitude, pos.coords.longitude];
    path.push(point);

    drawPath();
    calculateDistance();
    detectLoop();

  }, err => alert("GPS Error"), {
    enableHighAccuracy: true
  });
}

// STOP RUN
function stopRun() {
  navigator.geolocation.clearWatch(watchId);
}

// DRAW PATH
function drawPath() {
  if (polyline) map.removeLayer(polyline);
  polyline = L.polyline(path, { color: 'blue' }).addTo(map);
  map.panTo(path[path.length - 1]);
}

// DISTANCE
function calculateDistance() {
  totalDistance = 0;

  for (let i = 1; i < path.length; i++) {
    totalDistance += haversine(path[i - 1], path[i]);
  }

  document.getElementById("distance").innerText = totalDistance.toFixed(2);
}

// HAVERSINE
function haversine(p1, p2) {
  let R = 6371;
  let dLat = (p2[0] - p1[0]) * Math.PI / 180;
  let dLng = (p2[1] - p1[1]) * Math.PI / 180;

  let a = Math.sin(dLat/2)**2 +
          Math.cos(p1[0]*Math.PI/180) *
          Math.cos(p2[0]*Math.PI/180) *
          Math.sin(dLng/2)**2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// LOOP DETECTION (advanced)
function detectLoop() {
  if (path.length < 20) return;

  let last = path[path.length - 1];

  for (let i = 0; i < path.length - 10; i++) {
    let dist = haversine(path[i], last);

    if (dist < 0.03) { // ~30 meters
      let loop = path.slice(i);
      captureArea(loop);
      path = [];
      break;
    }
  }
}

// AREA (Shoelace)
function calculateArea(coords) {
  let area = 0;

  for (let i = 0; i < coords.length; i++) {
    let j = (i + 1) % coords.length;
    area += coords[i][1] * coords[j][0];
    area -= coords[j][1] * coords[i][0];
  }

  return Math.abs(area / 2) * 111 * 111;
}

// CAPTURE AREA
function captureArea(loop) {
  let newArea = calculateArea(loop);

  if (newArea < 0.001) return; // ignore tiny loops

  let newPoly = {
    coords: loop,
    area: newArea,
    shield: 1
  };

  // CHECK OVERLAPS
  polygons.forEach(poly => {
    if (isOverlapping(poly.coords, loop)) {

      if (poly.shield === 2) {
        poly.shield = 1; // break shield
        return;
      }

      // steal area
      poly.area = 0;
    }
  });

  polygons.push(newPoly);
  localStorage.setItem("polygons", JSON.stringify(polygons));

  L.polygon(loop, { color: 'green' }).addTo(map);

  calculateTotalArea();
  updateLeaderboard();
}

// SIMPLE OVERLAP CHECK
function isOverlapping(poly1, poly2) {
  return poly1.some(p1 =>
    poly2.some(p2 =>
      haversine(p1, p2) < 0.02
    )
  );
}

// TOTAL UNIQUE AREA
function calculateTotalArea() {
  totalArea = polygons.reduce((sum, p) => sum + p.area, 0);

  document.getElementById("area").innerText = totalArea.toFixed(3);
}

// LEADERBOARD
function updateLeaderboard() {
  let score = (totalArea * 1000) + (totalDistance * 10);

  let data = JSON.parse(localStorage.getItem("leaderboard")) || [];

  data[0] = {
    name: "You",
    score,
    area: totalArea,
    distance: totalDistance
  };

  localStorage.setItem("leaderboard", JSON.stringify(data));

  renderLeaderboard();
}

// RENDER LEADERBOARD
function renderLeaderboard() {
  let list = document.getElementById("leaderboard");
  list.innerHTML = "";

  let data = JSON.parse(localStorage.getItem("leaderboard")) || [];

  data.sort((a, b) => b.score - a.score);

  data.forEach(p => {
    let li = document.createElement("li");
    li.innerText = `${p.name} | Score: ${p.score.toFixed(1)} | Area: ${p.area.toFixed(2)}`;
    list.appendChild(li);
  });
}

// INIT DRAW
function loadPolygons() {
  polygons.forEach(p => {
    if (p.area > 0) {
      L.polygon(p.coords, {
        color: p.shield === 2 ? 'gold' : 'green'
      }).addTo(map);
    }
  });

  calculateTotalArea();
}

loadPolygons();
renderLeaderboard();
