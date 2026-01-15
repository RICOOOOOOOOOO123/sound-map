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

// ================== PRELOAD ==================
function preload() {
  imgOff = loadImage("robinette.png");
  imgOn = loadImage("robinette2.png");
  savedLayout = loadJSON("data/layout.json");
}

// ================== SETUP ==================
function setup() {
  createCanvas(1920, 1080);

const params = new URLSearchParams(window.location.search);
if (params.get("admin") === "1") {
  mode = MODE_ADMIN;
}

  if (mode === MODE_ADMIN) {
    createButton("💾 Sauvegarder layout")
      .position(10, 320)
      .mousePressed(exportLayout);

    fileInputAudio = createFileInput(handleAudio);
    fileInputAudio.position(10, 20);

    fileInputImage = createFileInput(handleImage);
    fileInputImage.position(10, 70);

    fileInputVideo = createFileInput(handleVideo);
    fileInputVideo.position(10, 120);

    createButton("Ajouter TITRE")
      .position(10, 200)
      .mousePressed(() => {
        let t = prompt("Titre ?");
        if (t) texts.push(new TextBlock(t, "title", 300, 200));
      });

    createButton("Ajouter TEXTE")
      .position(10, 230)
      .mousePressed(() => {
        let t = prompt("Texte ?");
        if (t) texts.push(new TextBlock(t, "body", 300, 300));
      });
  }
  if (savedLayout) {
  loadLayout(savedLayout);
  console.log("layout chargé");
}

}

// ================== DRAW ==================
function draw() {
  background(230, 255, 255);
  
  fill(0);
textSize(32);
text("p5 fonctionne", 50, 50);

  push();
  translate(offsetX, offsetY);
  scale(scaleFactor);

  images.forEach(i => i.display());
  videos.forEach(v => v.display());
  texts.forEach(t => t.display());
  players.forEach(p => p.display());

  pop();
}

// ================== ZOOM / PAN ==================
function mouseWheel(e) {
  let zoom = 1 - e.delta * 0.001;
  let newScale = constrain(scaleFactor * zoom, 0.2, 4);

  let wx = (mouseX - offsetX) / scaleFactor;
  let wy = (mouseY - offsetY) / scaleFactor;

  offsetX = mouseX - wx * newScale;
  offsetY = mouseY - wy * newScale;
  scaleFactor = newScale;
  return false;
}

function mouseDragged() {
  if (keyIsDown(SHIFT)) {
    offsetX += movedX;
    offsetY += movedY;
  }
}

// ================== FILE HANDLERS (NO BLOB) ==================
function handleAudio(file) {
  if (!file.name) return;
  let src = BASE_PATH + file.name;

  let p = new AudioPlayerBox(file.name, random(200,600), random(200,600), src);
  p.sound = createAudio(src);
  p.sound.hide();
  players.push(p);
}

function handleImage(file) {
  if (!file.name) return;
  let src = BASE_PATH + file.name;

  loadImage(src, img => {
    images.push(new DraggableImage(img, random(200,600), random(200,600), src));
  });
}

function handleVideo(file) {
  if (!file.name) return;
  let src = BASE_PATH + file.name;

  let vid = createVideo(src, () => {
    vid.loop();
    vid.volume(0);
  });
  vid.hide();

  videos.push(new DraggableVideo(vid, random(200,600), random(200,600), src));
}

// ================== CLASSES ==================
class AudioPlayerBox {
  constructor(label, x, y, src) {
    this.label = label;
    this.x = x;
    this.y = y;
    this.w = 180;
    this.h = 130;
    this.src = src;
    this.sound = null;
  }

  display() {
    let img = this.sound && !this.sound.elt.paused ? imgOn : imgOff;
    image(img, this.x, this.y, this.w, this.h);
    fill(0);
    textAlign(CENTER);
    text(this.label, this.x + this.w/2, this.y + 15);
  }

  toggle() {
    if (this.sound.elt.paused) this.sound.play();
    else this.sound.pause();
  }
}

class DraggableImage {
  constructor(pic, x, y, src) {
    this.pic = pic;
    this.x = x;
    this.y = y;
    this.w = 200;
    this.h = pic.height / pic.width * this.w;
    this.src = src;
  }
  display() {
    image(this.pic, this.x, this.y, this.w, this.h);
  }
}

class DraggableVideo {
  constructor(video, x, y, src) {
    this.video = video;
    this.x = x;
    this.y = y;
    this.w = 320;
    this.h = video.height / video.width * this.w;
    this.src = src;
  }
  display() {
    if (this.video.time() > 10) this.video.time(0);
    image(this.video, this.x, this.y, this.w, this.h);
  }
}

class TextBlock {
  constructor(content, type, x, y) {
    this.content = content;
    this.type = type;
    this.x = x;
    this.y = y;
    this.size = type === "title" ? 42 : 18;
    this.width = type === "title" ? 300 : 400;
  }
  display() {
    textSize(this.size);
    fill(0);
    text(this.content, this.x, this.y, this.width);
  }
}

// ================== SAVE / LOAD ==================
function exportLayout() {
  const data = {
    canvas: { offsetX, offsetY, zoom: scaleFactor },
    images: images.map(i => ({ src: i.src, x: i.x, y: i.y, w: i.w })),
    videos: videos.map(v => ({ src: v.src, x: v.x, y: v.y, w: v.w })),
    texts: texts.map(t => ({
      content: t.content,
      type: t.type,
      x: t.x,
      y: t.y
    })),
    players: players.map(p => ({
      src: p.src,
      x: p.x,
      y: p.y
    }))
  };
  saveJSON(data, "layout.json");
}

function loadLayout(data) {
  if (data.images)
    data.images.forEach(i =>
      loadImage(i.src, img => {
        let d = new DraggableImage(img, i.x, i.y, i.src);
        d.w = i.w;
        images.push(d);
      })
    );

  if (data.videos)
    data.videos.forEach(v => {
      let vid = createVideo(v.src, () => {
        vid.loop();
        vid.volume(0);
      });
      vid.hide();
      let d = new DraggableVideo(vid, v.x, v.y, v.src);
      d.w = v.w;
      videos.push(d);
    });

  if (data.texts)
    data.texts.forEach(t =>
      texts.push(new TextBlock(t.content, t.type, t.x, t.y))
    );

  if (data.players)
    data.players.forEach(p => {
      let pl = new AudioPlayerBox(p.src.split("/").pop(), p.x, p.y, p.src);
      pl.sound = createAudio(p.src);
      pl.sound.hide();
      players.push(pl);
    });

  if (data.canvas) {
    offsetX = data.canvas.offsetX || 0;
    offsetY = data.canvas.offsetY || 0;
    scaleFactor = data.canvas.zoom || 1;
  }
}
