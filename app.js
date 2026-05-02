import { db, userId } from './firebase.js';
import { collection, addDoc, onSnapshot, updateDoc, doc } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import { haversine, calculateArea, isOverlapping } from './utils.js';

let map = L.map('map').setView([18.5204, 73.8567], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let path = [];
let watchId = null;
let polyline = null;

let totalDistance = 0;
let totalArea = 0;

// START RUN
window.startRun = function() {
  path = [];
  totalDistance = 0;

  watchId = navigator.geolocation.watchPosition(pos => {

    let speed = pos.coords.speed || 0;

    if (speed > 4.2) return; // anti cheat

    let point = [pos.coords.latitude, pos.coords.longitude];

    if (path.length > 0) {
      totalDistance += haversine(path[path.length - 1], point);
    }

    path.push(point);

    drawPath();
    detectLoop();

    updateStats();

  }, err => alert("GPS Error"), {
    enableHighAccuracy: true
  });
};

// STOP
window.stopRun = function() {
  navigator.geolocation.clearWatch(watchId);
};

// DRAW PATH
function drawPath() {
  if (polyline) map.removeLayer(polyline);
  polyline = L.polyline(path, { color: 'blue' }).addTo(map);
}

// LOOP DETECTION
function detectLoop() {
  if (path.length < 25) return;

  let last = path[path.length - 1];

  for (let i = 0; i < path.length - 15; i++) {
    if (haversine(path[i], last) < 0.03) {

      let loop = path.slice(i);

      if (loop.length > 20) {
        captureArea(loop);
      }

      path = [];
      break;
    }
  }
}

// CAPTURE AREA
async function captureArea(loop) {

  let area = calculateArea(loop);

  if (area < 0.001) return;

  await addDoc(collection(db, "areas"), {
    owner: userId,
    coords: loop,
    area: area,
    shield: 1,
    createdAt: Date.now()
  });
}

// LIVE MAP
onSnapshot(collection(db, "areas"), snapshot => {

  map.eachLayer(layer => {
    if (layer instanceof L.Polygon) map.removeLayer(layer);
  });

  totalArea = 0;

  snapshot.forEach(docSnap => {
    let d = docSnap.data();

    let color = d.owner === userId ? "#2ECC71" : "#E74C3C";

    L.polygon(d.coords, {
      color: d.shield === 2 ? "gold" : color
    }).addTo(map);

    if (d.owner === userId) totalArea += d.area;
  });

  updateStats();
  updateLeaderboard(snapshot);
});

// LEADERBOARD
function updateLeaderboard(snapshot) {

  let scores = {};

  snapshot.forEach(doc => {
    let d = doc.data();

    if (!scores[d.owner]) {
      scores[d.owner] = { area: 0 };
    }

    scores[d.owner].area += d.area;
  });

  let arr = Object.entries(scores).sort((a,b)=>b[1].area - a[1].area);

  let list = document.getElementById("leaderboard");
  list.innerHTML = "";

  arr.slice(0,10).forEach(([uid,data])=>{
    let li = document.createElement("li");
    li.innerText = `${uid.slice(0,6)}... : ${data.area.toFixed(2)} km²`;
    list.appendChild(li);
  });
}

// STATS
function updateStats() {
  document.getElementById("distance").innerText = totalDistance.toFixed(2);
  document.getElementById("area").innerText = totalArea.toFixed(3);
}
