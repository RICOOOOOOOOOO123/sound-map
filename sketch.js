// ================== GLOBAL ==================
let players = [];
let images = [];
let videos = [];
let texts = [];

let fileInputAudio, fileInputImage, fileInputVideo;
let imgOff, imgOn;

let offsetX = 0;
let offsetY = 0;
let scaleFactor = 1;

const BASE_PATH = "uploads/";

const MODE_ADMIN = "admin";
const MODE_PUBLIC = "public";
let mode = MODE_PUBLIC;

let savedLayout; // layout initial

// ================== PRELOAD ==================
function preload() {
  imgOff = loadImage("robinette.png");    // image par défaut
  imgOn = loadImage("robinette2.png");    // image quand lecture
  savedLayout = loadJSON(BASE_PATH + "data/layout.json", layout => {
    loadLayout(layout);
    console.log("layout chargé et appliqué");
  });
}

// ================== SETUP ==================
function setup() {
  createCanvas(1920, 1080);

  if (window.location.pathname.includes("admin") || new URLSearchParams(window.location.search).get("admin") === "1") {
    mode = MODE_ADMIN;
  }

  if (mode === MODE_ADMIN) {
    // --- Bouton sauvegarde layout ---
    let saveBtn = createButton("💾 Sauvegarder layout");
    saveBtn.position(10, 320);
    saveBtn.mousePressed(exportLayout);

    // --- Import audio ---
    fileInputAudio = createFileInput(handleAudio);
    fileInputAudio.position(10, 20);

    // --- Import image ---
    fileInputImage = createFileInput(handleImage);
    fileInputImage.position(10, 70);

    // --- Import vidéo ---
    fileInputVideo = createFileInput(handleVideo);
    fileInputVideo.position(10, 180);

    // --- Ajouter texte titre ---
    let btnTitle = createButton("Ajouter TITRE");
    btnTitle.position(10, 250);
    btnTitle.mousePressed(() => {
      let content = prompt("Texte du titre ?");
      if (content) texts.push(new TextBlock(content, "title", 300, 200));
    });

    // --- Ajouter texte normal ---
    let btnBody = createButton("Ajouter TEXTE");
    btnBody.position(10, 280);
    btnBody.mousePressed(() => {
      let content = prompt("Texte du paragraphe ?");
      if (content) texts.push(new TextBlock(content, "body", 300, 300));
    });
  }
}

// ================== DRAW ==================
function draw() {
  background(230, 255, 255);

  push();
  translate(offsetX, offsetY);
  scale(scaleFactor);

  // --- Images ---
  for (let img of images) img.display();
  images = images.filter(img => !img.toDelete);

  // --- Textes ---
  for (let t of texts) t.display();
  texts = texts.filter(t => !t.toDelete);

  // --- Audio ---
  for (let p of players) p.display();

  // --- Vidéos ---
  for (let v of videos) v.display();
  videos = videos.filter(v => !v.toDelete);

  pop();

  // --- Info UI ---
  noStroke();
  fill(50);
  textAlign(LEFT, TOP);
  text("* SHIFT + drag pour déplacer le canvas", 10, 120);
  if (mode === MODE_ADMIN) {
    text("Importer un son, une image ou une vidéo", 10, 150);
  }
}

// ================== MOUSE INTERACTIONS ==================
let activeObject = null;

function mousePressed() {
  activeObject = null;

  const objects = [...players, ...videos, ...texts, ...images].reverse();
  for (let obj of objects) {
    if (obj.isMouseOver() || obj.isOnCorner() || obj.isOnPlayPause ? obj.isOnPlayPause() : false) {
      activeObject = obj;
      if (obj.mousePressed) obj.mousePressed();
      return;
    }
  }
}

function mouseDragged() {
  if (activeObject) activeObject.mouseDragged();
  else if (mouseIsPressed && keyIsDown(SHIFT)) {
    offsetX += movedX;
    offsetY += movedY;
  }
}

function mouseReleased() {
  if (activeObject) activeObject.mouseReleased();
  activeObject = null;
}

// ================== MOUSE WHEEL ZOOM ==================
function mouseWheel(event) {
  let zoomSpeed = 0.001;
  let zoom = 1 - event.delta * zoomSpeed;

  let newScale = constrain(scaleFactor * zoom, 0.2, 5);

  // Zoom centré sur la souris
  let worldMouse = screenToWorld(mouseX, mouseY);
  offsetX = mouseX - worldMouse.x * newScale;
  offsetY = mouseY - worldMouse.y * newScale;

  scaleFactor = newScale;
  return false;
}

function screenToWorld(x, y) {
  return { x: (x - offsetX) / scaleFactor, y: (y - offsetY) / scaleFactor };
}

// ================== FILE HANDLERS ==================
function handleAudio(file) {
  if (file.type !== 'audio') return;
  let src = BASE_PATH + file.name;
  let player = new AudioPlayerBox(file.name, random(100, 500), random(100, 400), imgOff, imgOn, src);
  player.sound = createAudio(src);
  player.sound.hide();
  players.push(player);
}

function handleImage(file) {
  if (file.type !== 'image') return;
  loadImage(BASE_PATH + file.name, img => {
    images.push(new DraggableImage(img, random(100, 800), random(100, 600), BASE_PATH + file.name));
  });
}

function handleVideo(file) {
  if (file.type !== 'video') return;
  let vid = createVideo(BASE_PATH + file.name, () => {
    vid.loop();
    vid.volume(0);
  });
  vid.hide();
  videos.push(new DraggableVideo(vid, random(100, 800), random(100, 600), BASE_PATH + file.name));
}

// ================== CLASSES ==================
// --- Audio ---
class AudioPlayerBox {
  constructor(file, x, y, imgOff, imgOn, src) {
    this.file = file;
    this.x = x;
    this.y = y;
    this.w = 180;
    this.h = 130;
    this.src = src;
    this.sound = null;
    this.imgOff = imgOff;
    this.imgOn = imgOn;
    this.dragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.pressX = 0;
    this.pressY = 0;
  }

  display() {
    let img = this.sound && !this.sound.elt.paused ? this.imgOn : this.imgOff;
    image(img, this.x, this.y, this.w, this.h);
    fill(0);
    textAlign(CENTER, CENTER);
    text(this.file, this.x + this.w / 2, this.y + 20);
  }

  isMouseOver() {
    let m = screenToWorld(mouseX, mouseY);
    return m.x > this.x && m.x < this.x + this.w && m.y > this.y && m.y < this.y + this.h;
  }

  mousePressed() {
    let m = screenToWorld(mouseX, mouseY);
    if (this.isMouseOver()) {
      this.dragging = true;
      this.offsetX = m.x - this.x;
      this.offsetY = m.y - this.y;
      this.pressX = m.x;
      this.pressY = m.y;
    }
  }

  mouseDragged() {
    if (mode === MODE_PUBLIC) return;
    if (this.dragging) {
      let m = screenToWorld(mouseX, mouseY);
      this.x = m.x - this.offsetX;
      this.y = m.y - this.offsetY;
    }
  }

  mouseReleased() {
    if (!this.dragging) return;
    let m = screenToWorld(mouseX, mouseY);
    if (dist(this.pressX, this.pressY, m.x, m.y) < 5) this.toggle();
    this.dragging = false;
  }

  toggle() {
    if (!this.sound) return;
    if (this.sound.elt.paused) this.sound.play();
    else this.sound.pause();
  }
}

// --- Draggable Image ---
class DraggableImage {
  constructor(pic, x, y, src) {
    this.pic = pic;
    this.x = x;
    this.y = y;
    this.w = 200;
    this.h = pic.height / pic.width * this.w;
    this.aspect = this.h / this.w;
    this.src = src;
    this.dragging = false;
    this.resizing = false;
    this.toDelete = false;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  display() {
    image(this.pic, this.x, this.y, this.w, this.h);
    // Coins resize & delete
    noStroke();
    fill(120, 255, 255);
    rect(this.x + this.w - 5, this.y + this.h - 5, 10, 10); // resize
    fill(255, 0, 0);
    rect(this.x, this.y, 10, 10); // delete
  }

  isMouseOver() {
    let m = screenToWorld(mouseX, mouseY);
    return m.x > this.x && m.x < this.x + this.w && m.y > this.y && m.y < this.y + this.h;
  }

  isOnCorner() {
    let m = screenToWorld(mouseX, mouseY);
    return dist(m.x, m.y, this.x + this.w, this.y + this.h) < 10;
  }

  isOnDeleteCorner() {
    let m = screenToWorld(mouseX, mouseY);
    return m.x > this.x && m.x < this.x + 10 && m.y > this.y && m.y < this.y + 10;
  }

  mousePressed() {
    if (mode === MODE_PUBLIC) return;
    if (this.isOnDeleteCorner()) this.toDelete = true;
    else if (this.isOnCorner()) this.resizing = true;
    else if (this.isMouseOver()) {
      this.dragging = true;
      let m = screenToWorld(mouseX, mouseY);
      this.offsetX = m.x - this.x;
      this.offsetY = m.y - this.y;
    }
  }

  mouseDragged() {
    if (mode === MODE_PUBLIC) return;
    let m = screenToWorld(mouseX, mouseY);
    if (this.dragging) {
      this.x = m.x - this.offsetX;
      this.y = m.y - this.offsetY;
    }
    if (this.resizing) {
      let newW = m.x - this.x;
      if (newW < 20) newW = 20;
      this.w = newW;
      this.h = this.w * this.aspect;
    }
  }

  mouseReleased() {
    this.dragging = false;
    this.resizing = false;
  }
}

// --- Draggable Video ---
class DraggableVideo {
  constructor(video, x, y, src, playing = true) {
    this.video = video;
    this.x = x;
    this.y = y;
    this.w = 320;
    this.h = video.height / video.width * this.w;
    this.aspect = this.h / this.w;
    this.src = src;
    this.dragging = false;
    this.resizing = false;
    this.toDelete = false;
    this.playing = playing;
    if (this.playing) this.video.loop();
    else this.video.pause();
  }

  display() {
    push();
    if (this.video.time() > 10) this.video.time(0);
    image(this.video, this.x, this.y, this.w, this.h);

    // Coins resize / delete / play
    noStroke();
    fill(120, 255, 255);
    rect(this.x + this.w - 5, this.y + this.h - 5, 10, 10); // resize
    fill(255, 0, 0);
    rect(this.x, this.y, 10, 10); // delete
    fill(this.playing ? 'green' : 'red');
    rect(this.x + this.w - 15, this.y, 15, 15); // play/pause
    pop();
  }

  isMouseOver() {
    let m = screenToWorld(mouseX, mouseY);
    return m.x > this.x && m.x < this.x + this.w && m.y > this.y && m.y < this.y + this.h;
  }

  isOnCorner() { return this.isMouseOver() && dist(screenToWorld(mouseX, mouseY).x, screenToWorld(mouseX, mouseY).y, this.x + this.w, this.y + this.h) < 10; }
  isOnDeleteCorner() { let m = screenToWorld(mouseX, mouseY); return m.x > this.x && m.x < this.x + 10 && m.y > this.y && m.y < this.y + 10; }
  isOnPlayPause() { let m = screenToWorld(mouseX, mouseY); return m.x > this.x + this.w - 15 && m.x < this.x + this.w && m.y > this.y && m.y < this.y + 15; }

  mousePressed() {
    if (mode === MODE_PUBLIC) return;
    if (this.isOnDeleteCorner()) { this.video.remove(); this.toDelete = true; return; }
    if (this.isOnCorner()) { this.resizing = true; return; }
    if (this.isOnPlayPause()) { this.playing ? this.video.pause() : this.video.play(); this.playing = !this.playing; return; }
    if (this.isMouseOver()) {
      this.dragging = true;
      let m = screenToWorld(mouseX, mouseY);
      this.offsetX = m.x - this.x;
      this.offsetY = m.y - this.y;
    }
  }

  mouseDragged() {
    if (mode === MODE_PUBLIC) return;
    let m = screenToWorld(mouseX, mouseY);
    if (this.dragging) { this.x = m.x - this.offsetX; this.y = m.y - this.offsetY; }
    if (this.resizing) { this.w = Math.max(40, m.x - this.x); this.h = this.w * this.aspect; }
  }

  mouseReleased() {
    this.dragging = false;
    this.resizing = false;
  }
}

// --- TextBlock ---
class TextBlock {
  constructor(content, type, x, y, maxWidth = null) {
    this.content = content;
    this.type = type;
    this.x = x;
    this.y = y;
    this.textSizeValue = type === "title" ? 42 : 18;
    this.maxWidth = maxWidth || (type === "title" ? 300 : 400);
    this.padding = 15;
    this.dragging = false;
    this.toDelete = false;
  }

  display() {
    push();
    textSize(this.textSizeValue);
    textAlign(LEFT, TOP);
    let h = this.getTextHeight();
    noStroke();
    fill(0, 0, 0, 0);
    rect(this.x, this.y, this.maxWidth + this.padding * 2, h + this.padding * 2);
    fill(this.type === "title" ? 0 : color(0,0,255));
    text(this.content, this.x + this.padding, this.y + this.padding, this.maxWidth);
    fill(255,0,0);
    rect(this.x, this.y, 10, 10); // delete
    pop();
  }

  getTextHeight() {
    push();
    textSize(this.textSizeValue);
    let words = this.content.split(" ");
    let line = "";
    let y = 0;
    let lineHeight = this.textSizeValue * 1.4;
    for (let w of words) {
      let test = line + w + " ";
      if (textWidth(test) > this.maxWidth) { line = w + " "; y += lineHeight; } else line = test;
    }
    pop();
    return y + lineHeight;
  }

  isMouseOver() {
    let m = screenToWorld(mouseX, mouseY);
    return m.x > this.x && m.x < this.x + this.maxWidth + this.padding * 2 &&
           m.y > this.y && m.y < this.y + this.getTextHeight() + this.padding * 2;
  }

  mousePressed() {
    if (mode === MODE_PUBLIC) return;
    let m = screenToWorld(mouseX, mouseY);
    if (m.x > this.x && m.x < this.x + 10 && m.y > this.y && m.y < this.y + 10) { this.toDelete = true; return; }
    this.dragging = true;
    this.offsetX = m.x - this.x;
    this.offsetY = m.y - this.y;
  }

  mouseDragged() {
    if (mode === MODE_PUBLIC) return;
    if (this.dragging) {
      let m = screenToWorld(mouseX, mouseY);
      this.x = m.x - this.offsetX;
      this.y = m.y - this.offsetY;
    }
  }

  mouseReleased() { this.dragging = false; }
}

// ================== SAVE / LOAD ==================
function exportLayout() {
  const data = {
    canvas: { zoom: scaleFactor, offsetX, offsetY },
    images: images.map(i => ({ src: i.src, x: i.x, y: i.y, w: i.w, h: i.h })),
    videos: videos.map(v => ({ src: v.src, x: v.x, y: v.y, w: v.w, h: v.h, playing: v.playing })),
    texts: texts.map(t => ({ content: t.content, type: t.type, x: t.x, y: t.y, maxWidth: t.maxWidth, fontSize: t.textSizeValue })),
    players: players.map(p => ({ src: p.src, x: p.x, y: p.y, w: p.w, h: p.h }))
  };
  saveJSON(data, "layout.json");
}

function loadLayout(data) {
  // --- Images ---
  if (data.images) data.images.forEach(i => {
    loadImage(i.src, img => {
      let d = new DraggableImage(img, i.x, i.y, i.src);
      d.w = i.w; d.h = i.h;
      images.push(d);
    });
  });

  // --- Videos ---
  if (data.videos) data.videos.forEach(v => {
    let vid = createVideo(v.src, () => { if (v.playing) vid.loop(); else vid.pause(); vid.volume(0); });
    vid.hide();
    let d = new DraggableVideo(vid, v.x, v.y, v.src, v.playing ?? true);
    d.w = v.w; d.h = v.h;
    videos.push(d);
  });

  // --- Textes ---
  if (data.texts) data.texts.forEach(t => {
    let tb = new TextBlock(t.content, t.type, t.x, t.y);
    if (t.maxWidth) tb.maxWidth = t.maxWidth;
    if (t.fontSize) tb.textSizeValue = t.fontSize;
    texts.push(tb);
  });

  // --- Players ---
  if (data.players) data.players.forEach(p => {
    let player = new AudioPlayerBox(p.src.split("/").pop(), p.x, p.y, imgOff, imgOn, p.src);
    player.sound = createAudio(p.src);
    player.sound.hide();
    player.w = p.w; player.h = p.h;
    players.push(player);
  });

  // --- Canvas ---
  if (data.canvas) { scaleFactor = data.canvas.zoom ?? 1; offsetX = data.canvas.offsetX ?? 0; offsetY = data.canvas.offsetY ?? 0; }
}
