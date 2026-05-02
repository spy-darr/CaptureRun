import { db, userPromise } from './firebase.js';
import {
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import { haversine, calculateArea } from './utils.js';
import { updateStreak, getStreak } from './game.js';

// MAP
const map = L.map('map').setView([18.5204, 73.8567], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
.addTo(map);

let path = [];
let watchId = null;
let polyline = null;
let polygonsLayer = L.layerGroup().addTo(map);

let totalDistance = 0;
let totalArea = 0;
let userId = null;

// STATUS
const statusEl = document.getElementById("status");

// STREAK INIT
document.getElementById("streak").innerText = getStreak();

// AUTH
userPromise.then(uid => {
  userId = uid;
  listenToAreas();
});

// START
document.getElementById("startBtn").onclick = () => {
  statusEl.innerText = "Running";

  path = [];
  totalDistance = 0;

  watchId = navigator.geolocation.watchPosition(pos => {

    const speed = pos.coords.speed || 0;
    if (speed > 4.2) return;

    const point = [pos.coords.latitude, pos.coords.longitude];

    if (path.length > 0) {
      totalDistance += haversine(path[path.length - 1], point);
    }

    path.push(point);

    drawPath();
    detectLoop();
    updateStats();

  });
};

// STOP
document.getElementById("stopBtn").onclick = () => {
  statusEl.innerText = "Idle";
  navigator.geolocation.clearWatch(watchId);
};

// DRAW
function drawPath() {
  if (polyline) polyline.remove();
  polyline = L.polyline(path, { color: '#00BFFF' }).addTo(map);
}

// LOOP
function detectLoop() {
  if (path.length < 25) return;

  let last = path[path.length - 1];

  for (let i = 0; i < path.length - 15; i++) {
    if (haversine(path[i], last) < 0.03) {

      let loop = path.slice(i);

      capture(loop);

      path = [];
      if (polyline) polyline.remove();
      break;
    }
  }
}

// CAPTURE
async function capture(loop) {
  let area = calculateArea(loop);
  if (area < 0.001) return;

  let streak = updateStreak();
  document.getElementById("streak").innerText = streak;

  // vibration feedback
  if (navigator.vibrate) navigator.vibrate(200);

  await addDoc(collection(db, "areas"), {
    owner: userId,
    coords: loop,
    area,
    createdAt: Date.now()
  });
}

// LIVE
function listenToAreas() {
  onSnapshot(collection(db, "areas"), snapshot => {

    polygonsLayer.clearLayers();
    totalArea = 0;

    let scores = {};

    snapshot.forEach(doc => {
      let d = doc.data();

      let color = d.owner === userId ? "#2ECC71" : "#E74C3C";

      L.polygon(d.coords, { color, fillOpacity: 0.3 })
        .addTo(polygonsLayer);

      if (d.owner === userId) totalArea += d.area;

      if (!scores[d.owner]) scores[d.owner] = 0;
      scores[d.owner] += d.area;
    });

    updateStats();
    renderLeaderboard(scores);
  });
}

// LEADERBOARD
function renderLeaderboard(scores) {
  let list = document.getElementById("leaderboard");
  list.innerHTML = "";

  let arr = Object.entries(scores).sort((a,b)=>b[1]-a[1]);

  arr.slice(0,10).forEach(([uid,area])=>{
    let li = document.createElement("li");
    li.innerText = `${uid.slice(0,6)}... : ${area.toFixed(2)} km²`;
    list.appendChild(li);
  });
}

// STATS
function updateStats() {
  document.getElementById("distance").innerText = totalDistance.toFixed(2);
  document.getElementById("area").innerText = totalArea.toFixed(3);
}
