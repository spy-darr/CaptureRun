import { db } from './firebase.js';
import {
  collection,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import { haversine, calculateArea } from './utils.js';
import { updateStreak, getStreak } from './game.js';

// USER LOGIN
let username = localStorage.getItem("username");

window.saveUser = function () {
  const input = document.getElementById("usernameInput").value.trim();

  if (!input) return alert("Enter your name");

  localStorage.setItem("username", input);
  location.reload();
};

if (!username) {
  document.getElementById("loginScreen").style.display = "flex";
} else {
  document.getElementById("loginScreen").style.display = "none";
}

// MAP
const map = L.map('map').setView([18.5204, 73.8567], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
.addTo(map);

// STATE
let path = [];
let watchId = null;
let polyline = null;
let polygonsLayer = L.layerGroup().addTo(map);

let totalDistance = 0;
let totalArea = 0;

// STREAK
document.getElementById("streak").innerText = getStreak();

// START
document.getElementById("startBtn").onclick = () => {

  path = [];
  totalDistance = 0;

  watchId = navigator.geolocation.watchPosition(pos => {

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
  navigator.geolocation.clearWatch(watchId);
};

// DRAW PATH
function drawPath() {
  if (polyline) polyline.remove();
  polyline = L.polyline(path, { color: '#00BFFF' }).addTo(map);
}

// LOOP DETECTION
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

  await addDoc(collection(db, "areas"), {
    owner: username,
    coords: loop,
    area,
    createdAt: Date.now()
  });
}

// LIVE MAP
onSnapshot(collection(db, "areas"), snapshot => {

  polygonsLayer.clearLayers();
  totalArea = 0;

  let scores = {};

  snapshot.forEach(doc => {
    let d = doc.data();

    let color = d.owner === username ? "#2ECC71" : "#E74C3C";

    L.polygon(d.coords, { color, fillOpacity: 0.3 })
      .addTo(polygonsLayer);

    if (d.owner === username) totalArea += d.area;

    if (!scores[d.owner]) scores[d.owner] = 0;
    scores[d.owner] += d.area;
  });

  updateStats();
  renderLeaderboard(scores);
});

// LEADERBOARD
function renderLeaderboard(scores) {
  let list = document.getElementById("leaderboard");
  list.innerHTML = "";

  let arr = Object.entries(scores).sort((a,b)=>b[1]-a[1]);

  arr.forEach(([name,area],i)=>{
    let li = document.createElement("li");
    li.innerText = `${i+1}. ${name} — ${area.toFixed(2)} km²`;
    list.appendChild(li);
  });
}

// STATS
function updateStats() {
  document.getElementById("distance").innerText = totalDistance.toFixed(2);
  document.getElementById("area").innerText = totalArea.toFixed(3);
}
