// INIT MAP
let map = L.map('map').setView([18.5204, 73.8567], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let path = [];
let watchId = null;
let myPolygons = [];

let totalDistance = 0;
let totalArea = 0;

// START RUN
function startRun() {
  path = [];

  watchId = navigator.geolocation.watchPosition(pos => {
    let p = [pos.coords.latitude, pos.coords.longitude];
    path.push(p);

    drawPath();
    detectLoop();

    totalDistance += 0.01;
    updateStats();

  }, err => alert("GPS error"));
}

// STOP
function stopRun() {
  navigator.geolocation.clearWatch(watchId);
}

// DRAW
function drawPath() {
  L.polyline(path, { color: 'blue' }).addTo(map);
}

// LOOP DETECTION
function detectLoop() {
  if (path.length < 20) return;

  let last = path[path.length - 1];

  for (let i = 0; i < path.length - 10; i++) {
    if (distance(path[i], last) < 0.03) {
      let loop = path.slice(i);
      capture(loop);
      path = [];
      break;
    }
  }
}

// CAPTURE AREA
function capture(loop) {
  let area = calcArea(loop);

  let data = {
    owner: userId,
    coords: loop,
    area: area,
    shield: 1,
    createdAt: Date.now()
  };

  db.collection("areas").add(data);
}

// LISTEN LIVE AREAS
db.collection("areas").onSnapshot(snapshot => {
  map.eachLayer(l => {
    if (l instanceof L.Polygon) map.removeLayer(l);
  });

  totalArea = 0;

  snapshot.forEach(doc => {
    let d = doc.data();

    let color = d.owner === userId ? "#2ECC71" : "#E74C3C";

    L.polygon(d.coords, { color }).addTo(map);

    if (d.owner === userId) {
      totalArea += d.area;
    }
  });

  updateStats();
});

// LEADERBOARD
db.collection("areas").onSnapshot(snapshot => {
  let scores = {};

  snapshot.forEach(doc => {
    let d = doc.data();

    if (!scores[d.owner]) scores[d.owner] = 0;
    scores[d.owner] += d.area;
  });

  let arr = Object.entries(scores).sort((a,b)=>b[1]-a[1]);

  let list = document.getElementById("leaderboard");
  list.innerHTML = "";

  arr.slice(0,10).forEach(([uid,score])=>{
    let li = document.createElement("li");
    li.innerText = `${uid.slice(0,6)}... : ${score.toFixed(2)} km²`;
    list.appendChild(li);
  });
});

// UTILS
function distance(a,b){
  let dx = a[0]-b[0];
  let dy = a[1]-b[1];
  return Math.sqrt(dx*dx+dy*dy);
}

function calcArea(coords){
  let area = 0;
  for(let i=0;i<coords.length;i++){
    let j=(i+1)%coords.length;
    area += coords[i][0]*coords[j][1];
    area -= coords[j][0]*coords[i][1];
  }
  return Math.abs(area/2)*111*111;
}

function updateStats(){
  document.getElementById("distance").innerText = totalDistance.toFixed(2);
  document.getElementById("area").innerText = totalArea.toFixed(3);
}
