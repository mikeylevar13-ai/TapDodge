const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText = document.getElementById("ovText");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");

const BEST_KEY = "tapdodge_best_v1";

let W=0, H=0, DPR=1;

function resize(){
  DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  W = Math.floor(rect.width * DPR);
  H = Math.floor(rect.height * DPR);
  canvas.width = W;
  canvas.height = H;
}
window.addEventListener("resize", resize);

function rand(min, max){ return Math.random()*(max-min)+min; }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

const state = {
  running:false,
  paused:false,
  gameOver:false,
  t:0,
  score:0,
  best: Number(localStorage.getItem(BEST_KEY) || 0),

  player:{
    x:0, y:0,
    w:0, h:0,
    speed:0
  },

  blocks: [],
  spawnTimer:0,
  spawnEvery: 0.85, // seconds
  fallSpeed: 260, // px/s (in CSS px; we convert with DPR)
};

bestEl.textContent = state.best;

function resetGame(){
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.t = 0;
  state.score = 0;
  state.blocks = [];
  state.spawnTimer = 0;
  state.spawnEvery = 0.85;
  state.fallSpeed = 260;

  setupPlayer();
  scoreEl.textContent = "0";
  pauseBtn.textContent = "Pause";
}

function setupPlayer(){
  // Work in "CSS pixels" then multiply by DPR for drawing.
  const cssW = W / DPR, cssH = H / DPR;
  state.player.w = Math.max(34, cssW * 0.09);
  state.player.h = Math.max(34, cssH * 0.06);
  state.player.x = cssW/2 - state.player.w/2;
  state.player.y = cssH - state.player.h - Math.max(18, cssH*0.04);
  state.player.speed = Math.max(420, cssW * 1.2);
}

function cssToPx(v){ return v * DPR; }

function showOverlay(title, text){
  ovTitle.textContent = title;
  ovText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideOverlay(){
  overlay.classList.add("hidden");
}

function spawnBlock(){
  const cssW = W / DPR;
  const size = rand(cssW*0.06, cssW*0.12);
  const x = rand(8, cssW - size - 8);
  const y = -size - 10;

  state.blocks.push({
    x, y, w:size, h:size,
    vx: rand(-20, 20),
    color: pickColor()
  });
}

function pickColor(){
  const colors = ["#fb7185","#a78bfa","#60a5fa","#34d399","#fbbf24"];
  return colors[(Math.random()*colors.length)|0];
}

function rectsHit(a,b){
  return !(a.x+a.w < b.x || a.x > b.x+b.w || a.y+a.h < b.y || a.y > b.y+b.h);
}

let last = 0;
function loop(ms){
  requestAnimationFrame(loop);
  if(!state.running || state.paused) return;

  const now = ms/1000;
  const dt = Math.min(0.033, now - last); // cap
  last = now;

  update(dt);
  draw();
}

function update(dt){
  state.t += dt;
  state.score += dt * 10; // 10 pts/sec
  scoreEl.textContent = Math.floor(state.score);

  // Difficulty ramp
  state.fallSpeed = 260 + state.t * 10;
  state.spawnEvery = clamp(0.85 - state.t * 0.01, 0.30, 0.85);

  state.spawnTimer += dt;
  if(state.spawnTimer >= state.spawnEvery){
    state.spawnTimer = 0;
    spawnBlock();
  }

  // Move blocks
  const p = state.player;
  state.blocks.forEach(b=>{
    b.y += (state.fallSpeed * dt);
    b.x += b.vx * dt;
  });

  // Remove offscreen
  const cssH = H / DPR;
  state.blocks = state.blocks.filter(b => b.y < cssH + 120);

  // Collisions
  for(const b of state.blocks){
    if(rectsHit(p, b)){
      endGame();
      break;
    }
  }
}

function endGame(){
  state.running = false;
  state.gameOver = true;

  const finalScore = Math.floor(state.score);
  if(finalScore > state.best){
    state.best = finalScore;
    localStorage.setItem(BEST_KEY, String(state.best));
    bestEl.textContent = state.best;
  }

  showOverlay("Game Over", `Score: ${finalScore} • Best: ${state.best}\nTap Restart to try again.`);
}

function draw(){
  ctx.clearRect(0,0,W,H);

  // Background grid
  const cssW = W/DPR, cssH = H/DPR;
  ctx.save();
  ctx.scale(DPR, DPR);

  // soft vignette
  const grd = ctx.createRadialGradient(cssW*0.5, cssH*0.2, cssW*0.1, cssW*0.5, cssH*0.6, cssW*0.9);
  grd.addColorStop(0, "rgba(167,139,250,0.22)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,cssW,cssH);

  // grid lines
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = "#eaf0ff";
  ctx.lineWidth = 1;
  const step = 28;
  for(let x=0;x<cssW;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,cssH); ctx.stroke(); }
  for(let y=0;y<cssH;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cssW,y); ctx.stroke(); }
  ctx.globalAlpha = 1;

  // Player
  const p = state.player;
  roundRect(p.x, p.y, p.w, p.h, 10, "rgba(234,240,255,0.95)", "rgba(167,139,250,0.9)");

  // Blocks
  state.blocks.forEach(b=>{
    roundRect(b.x, b.y, b.w, b.h, 10, b.color, "rgba(255,255,255,0.35)");
  });

  ctx.restore();
}

function roundRect(x,y,w,h,r,fill,stroke){
  const rr = Math.min(r, w/2, h/2);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function move(dir){
  // dir: -1 left, +1 right
  const p = state.player;
  const cssW = W / DPR;
  p.x += dir * p.speed * (1/20); // a small "tap impulse"
  p.x = clamp(p.x, 8, cssW - p.w - 8);
}

function handleTap(clientX){
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  if(x < rect.width/2) move(-1);
  else move(1);
}

// Touch + mouse
canvas.addEventListener("pointerdown", (e)=>{
  e.preventDefault();
  handleTap(e.clientX);
}, {passive:false});

// Buttons
startBtn.addEventListener("click", ()=>{
  resize();
  resetGame();
  hideOverlay();
  state.running = true;
  last = performance.now()/1000;
  draw();
});

restartBtn.addEventListener("click", ()=>{
  resize();
  resetGame();
  hideOverlay();
  state.running = true;
  last = performance.now()/1000;
  draw();
});

pauseBtn.addEventListener("click", ()=>{
  if(state.gameOver) return;
  if(!state.running){
    // if not running, start
    resize();
    resetGame();
    hideOverlay();
    state.running = true;
    last = performance.now()/1000;
    draw();
    return;
  }
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  if(!state.paused){
    last = performance.now()/1000;
  }
});

function boot(){
  resize();
  setupPlayer();
  draw();
  showOverlay("TapDodge", "Tap the left or right side to move.\nAvoid falling blocks.\n\nHit Start.");
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}
boot();
requestAnimationFrame(loop);
