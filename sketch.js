
let players = [];
let images = [];
let videos = [];
let texts = [];

let mediaFiles = [];


let fileInputTextTitle, fileInputTextBody;
let imgOff, imgOn;

let offsetX = 0;
let offsetY = 0;
let scaleFactor = 1;

const MODE_ADMIN = "admin";
const MODE_PUBLIC = "public";
let mode = MODE_PUBLIC;

let savedLayout; // layout chargé depuis JSON

// ================== PRELOAD ==================
function preload() {
  imgOff = loadImage("robinette.png");
  imgOn = loadImage("robinette2.png");

    loadJSON("uploads/manifest.json", data => {
  mediaFiles = data.files || [];
});

  savedLayout = loadJSON("data/layout.json", layout => {
    loadLayout(layout);
    console.log("Layout chargé et appliqué");
  });
}

// ================== SETUP ==================
function setup() {
  createCanvas(1920, 1080);

  // --------- Détecter mode admin via paramètre URL ---------
  const params = new URLSearchParams(window.location.search);
  if (params.get("admin") === "1") mode = MODE_ADMIN;

  if (mode === MODE_ADMIN) {
  loadJSON("uploads/manifest.json", data => {
    let y = 360;

    data.files.forEach(file => {
      let type = getFileType(file);

      let label =
        type === "image" ? "🖼 " :
        type === "video" ? "🎬 " :
        type === "audio" ? "🔊 " : "❓ ";

      createButton(label + file)
        .position(10, y)
        .mousePressed(() => importMedia(file, type));

      y += 28;
    });
  });
}


  // --------- Boutons Admin ---------
  if (mode === MODE_ADMIN) {
    createButton("💾 Sauvegarder layout")
      .position(10, 320)
      .mousePressed(exportLayout);

  
  

    fileInputTextTitle = createButton("Ajouter un TITRE");
    fileInputTextTitle.position(10, 250);
    fileInputTextTitle.mousePressed(() => {
      let content = prompt("Texte du titre ?");
      if (content) texts.push(new TextBlock(content, "title", 300, 200));
    });

    fileInputTextBody = createButton("Ajouter un TEXTE");
    fileInputTextBody.position(10, 280);
    fileInputTextBody.mousePressed(() => {
      let content = prompt("Texte du paragraphe ?");
      if (content) texts.push(new TextBlock(content, "body", 300, 300));
    });
  }

  userStartAudio(); // nécessaire pour activer l'audio sur navigateur
}

// ================== DRAW ==================
function draw() {
  background(230, 255, 255);

  push();
  translate(offsetX, offsetY);
  scale(scaleFactor);



  // Images
  for (let img of images) img.display();
  images = images.filter(img => !img.toDelete);

  // Textes
  for (let t of texts) t.display();
  texts = texts.filter(t => !t.toDelete);

  // Audio
  for (let p of players) p.display();

  // Vidéos
  for (let v of videos) v.display();
  videos = videos.filter(v => !v.toDelete);

  pop();

  // UI Info
  noStroke();
  fill(50);
  textAlign(LEFT, TOP);
  text("*Appuie sur espace pour arrêter tous les sons, shift+drag pour déplacer le canvas", 10, 120);
}
//========================filetype============================

function getFileType(filename) {
  let ext = filename.split(".").pop().toLowerCase();

  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "image";
  if (["mp4","webm","ogg"].includes(ext)) return "video";
  if (["mp3","wav","ogg"].includes(ext)) return "audio";

  return "unknown";
}






//======================importmedia================
function importMedia(file, type) {
  let path = "uploads/" + file;

  if (type === "image") {
    loadImage(path, img => {
      images.push(new DraggableImage(img, 300, 200, path));
    });
  }

  if (type === "video") {
    let v = createVideo(path, () => {
      v.loop();
      v.volume(0);
    });
    v.hide();
    videos.push(new DraggableVideo(v, 300, 300, path));
  }

  if (type === "audio") {
    players.push(
      new AudioPlayerBox(
        file,
        300,
        400,
        imgOff,
        imgOn,
        path
      )
    );
  }
}



//======================helper=====================

function button(x, y, w, h, label) {
  if (
    mouseX > x && mouseX < x + w &&
    mouseY > y && mouseY < y + h
  ) {
    fill(200);
    if (mouseIsPressed) return true;
  } else fill(240);

  rect(x, y, w, h);
  fill(0);
  textAlign(LEFT, CENTER);
  text(label, x + 5, y + h / 2);
  return false;
}


// ================== MOUSE INTERACTIONS ==================
let activeObject = null;

function mousePressed() {
  userStartAudio(); // autoriser audio au premier clic

  if (mode === MODE_PUBLIC) {
    // lecture uniquement pour audio/vidéo
    for (let p of players) if (p.isMouseOver()) { p.toggle(); return; }
    for (let v of videos) if (v.isOnPlayPause()) { v.mousePressed(); return; }
    return;
  }

  activeObject = null;

  // Audio
  for (let i = players.length - 1; i >= 0; i--) {
    let p = players[i];
    if (p.isMouseOver()) { activeObject = p; p.mousePressed(); return; }
  }

  // Vidéo
  for (let i = videos.length - 1; i >= 0; i--) {
    let v = videos[i];
    if (v.isMouseOver() || v.isOnCorner() || v.isOnPlayPause()) {
      activeObject = v; v.mousePressed(); return;
    }
  }

  // Textes
  for (let i = texts.length - 1; i >= 0; i--) {
    let t = texts[i];
    if (t.isMouseOver()) { activeObject = t; t.mousePressed(); return; }
  }

  // Images
  for (let i = images.length - 1; i >= 0; i--) {
    let img = images[i];
    if (img.isMouseOver() || img.isOnCorner()) { activeObject = img; img.mousePressed(); return; }
  }
}

function mouseDragged() {
  if (mode === MODE_PUBLIC) return;

  if (activeObject) activeObject.mouseDragged();
  else if (mouseIsPressed && keyIsDown(SHIFT)) {
    offsetX += movedX;
    offsetY += movedY;
  }
}

function mouseReleased() {
  if (mode === MODE_PUBLIC) return;
  if (activeObject) activeObject.mouseReleased();
  activeObject = null;
}

// ================== MOUSE WHEEL ZOOM ==================
function mouseWheel(event) {
  let zoomSpeed = 0.001;
  let zoom = 1 - event.delta * zoomSpeed;

  let newScale = constrain(scaleFactor * zoom, 0.2, 5);
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
function handleAudioFile(file) {
  if (file.type === 'audio') {
    let url = URL.createObjectURL(file.file);
    let player = new AudioPlayerBox(file.name, random(100,500), random(100,400), imgOff, imgOn, url);
    player.sound.hide();
    players.push(player);
  }
}

function handleImageFile(file) {
  if (file.type === 'image') {
    loadImage(file.data, img => {
      images.push(new DraggableImage(img, random(100,800), random(100,600), file.name));
    });
  }
}

function handleVideoFile(file) {
  if (file.type === 'video') {
    let url = URL.createObjectURL(file.file);
    let vid = createVideo(url, () => { vid.loop(); vid.volume(0); });
    vid.hide();
    videos.push(new DraggableVideo(vid, random(100,800), random(100,600), file.name, true));
  }
}

// ================== CLASSES ==================
class AudioPlayerBox {
  constructor(file, x, y, imgOff, imgOn, src) {
    this.file = file;
    this.src = src;
    this.sound = createAudio(src);
    this.sound.hide();
    this.x = x; this.y = y;
    this.w = 180; this.h = 130;
    this.dragging = false;
    this.offsetX = 0; this.offsetY = 0;
    this.imgOff = imgOff; this.imgOn = imgOn;
    this.pressX = 0; this.pressY = 0;
  }

  display() {
    let currentImg = (this.sound && !this.sound.elt.paused) ? this.imgOn : this.imgOff;
    image(currentImg, this.x, this.y, this.w, this.h);
    noStroke(); fill(0,0,255); textAlign(CENTER, CENTER);
    text(this.file, this.x + this.w/2, this.y + 20);
  }

  isMouseOver() {
    let m = screenToWorld(mouseX, mouseY);
    return m.x > this.x && m.x < this.x+this.w && m.y > this.y && m.y < this.y+this.h;
  }

  mousePressed() {
    let m = screenToWorld(mouseX, mouseY);
    this.dragging = true;
    this.offsetX = m.x - this.x;
    this.offsetY = m.y - this.y;
    this.pressX = m.x; this.pressY = m.y;
  }

  mouseDragged() {
    if (!this.dragging || mode===MODE_PUBLIC) return;
    let m = screenToWorld(mouseX, mouseY);
    this.x = m.x - this.offsetX;
    this.y = m.y - this.offsetY;
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

// --------- Draggable Image ---------
class DraggableImage {
   constructor(pic, x, y, src) {
    this.pic = pic;
    this.src = src;
    this.x = x;
    this.y = y;
    this.w = 200;
    this.h = (pic.height / pic.width) * this.w;
    this.aspect = this.h / this.w;
    this.dragging = false;
    this.resizing = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.toDelete = false;
  }

  display() {
    image(this.pic, this.x, this.y, this.w, this.h);

    if (mode === MODE_ADMIN) {
    noStroke();
    fill(120, 255, 255);
    rect(this.x + this.w - 5, this.y + this.h - 5, 5, 5);
    stroke(255);
    fill(0);
    rect(this.x, this.y, 5, 5);
  }
  }

  isMouseOver() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    return worldMouse.x > this.x && worldMouse.x < this.x + this.w &&
           worldMouse.y > this.y && worldMouse.y < this.y + this.h;
  }

  isOnCorner() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    let cornerX = this.x + this.w;
    let cornerY = this.y + this.h;
    return dist(worldMouse.x, worldMouse.y, cornerX, cornerY) < 15;
  }

  isOnDeleteCorner() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    return worldMouse.x > this.x && worldMouse.x < this.x + 10 &&
           worldMouse.y > this.y && worldMouse.y < this.y + 10;
  }

  mousePressed() {
    
     if (mode === MODE_PUBLIC) return;
     
    let worldMouse = screenToWorld(mouseX, mouseY);
    if (this.isOnDeleteCorner()) this.toDelete = true;
    else if (this.isOnCorner()) this.resizing = true;
    else if (this.isMouseOver()) {
      this.dragging = true;
      this.offsetX = worldMouse.x - this.x;
      this.offsetY = worldMouse.y - this.y;
    }
  }

  mouseDragged() {
     if (mode === MODE_PUBLIC) return;
    let worldMouse = screenToWorld(mouseX, mouseY);
    if (this.dragging) {
      this.x = worldMouse.x - this.offsetX;
      this.y = worldMouse.y - this.offsetY;
    }
    if (this.resizing) {
      let newW = worldMouse.x - this.x;
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

// --------- Draggable Video ---------
class DraggableVideo {
  constructor(video, x, y, src, playing = true) {
    this.video = video;
    this.src = src;
    this.x = x;
    this.y = y;
    this.w = 320;
    this.h = (video.height / video.width) * this.w;
    this.aspect = this.h / this.w;
    this.dragging = false;
    this.resizing = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.toDelete = false;
this.playing = playing;
this.video.volume(0); // obligatoire navigateur
this.video.loop();    // force le chargement visuel
this.playing = true;


  }

  display() {
    push();
    if (this.video.time() > 10) this.video.time(0);
    image(this.video, this.x, this.y, this.w, this.h);

    if (mode === MODE_ADMIN) {

    noStroke();
    fill(120, 255, 255);
    rect(this.x + this.w - 5, this.y + this.h - 5, 5, 5);

    stroke(255);
    fill(0);
    rect(this.x, this.y, 10, 10);  
    }

    let btnSize = 15;
    fill(this.playing ? 'green' : 'red');
    rect(this.x + this.w - btnSize, this.y, btnSize, btnSize);
    pop();
  }

  isMouseOver() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    return worldMouse.x > this.x && worldMouse.x < this.x + this.w &&
           worldMouse.y > this.y && worldMouse.y < this.y + this.h;
  }

  isOnCorner() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    let cornerX = this.x + this.w;
    let cornerY = this.y + this.h;
    return dist(worldMouse.x, worldMouse.y, cornerX, cornerY) < 15;
  }

  isOnDeleteCorner() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    return worldMouse.x > this.x && worldMouse.x < this.x + 10 &&
           worldMouse.y > this.y && worldMouse.y < this.y + 10;
  }

  isOnPlayPause() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    let btnSize = 15;
    return worldMouse.x > this.x + this.w - btnSize && worldMouse.x < this.x + this.w &&
           worldMouse.y > this.y && worldMouse.y < this.y + btnSize;
  }

 mousePressed() {

  // ✅ AUTORISER play/pause en mode visiteur
  if (mode === MODE_PUBLIC) {
    if (this.isOnPlayPause()) {
      if (this.playing) this.video.pause();
      else this.video.play();
      this.playing = !this.playing;
    }
    return;
  }

  // ----- MODE ADMIN -----
  if (this.isOnDeleteCorner()) {
    this.video.remove();
    this.toDelete = true;
    return;
  }

  if (this.isOnCorner()) {
    this.resizing = true;
    return;
  }

  if (this.isOnPlayPause()) {
    if (this.playing) this.video.pause();
    else this.video.play();
    this.playing = !this.playing;
    return;
  }

  if (this.isMouseOver()) {
    let worldMouse = screenToWorld(mouseX, mouseY);
    this.dragging = true;
    this.offsetX = worldMouse.x - this.x;
    this.offsetY = worldMouse.y - this.y;
  }
}


  mouseDragged() {
     if (mode === MODE_PUBLIC) return;
    let worldMouse = screenToWorld(mouseX, mouseY);
    if (this.dragging) {
      this.x = worldMouse.x - this.offsetX;
      this.y = worldMouse.y - this.offsetY;
    }
    if (this.resizing) {
      let newW = worldMouse.x - this.x;
      if (newW < 40) newW = 40;
      this.w = newW;
      this.h = this.w * this.aspect;
    }
  }

  mouseReleased() {
    this.dragging = false;
    this.resizing = false;
  }
}

// --------- TextBlock ---------
class TextBlock {
  constructor(content, type, x, y,  maxWidth = null) {
    this.content = content;
    this.type = type;
    this.x = x;
    this.y = y;
    
     
this.textSizeValue = type === "title" ? 42 : 18;
this.maxWidth = maxWidth || (type === "title" ? 300 : 400);
this.bg = color(0, 0, 0, 0);
this.txtColor = type === "title" ? color(0) : color(0, 0, 255);
    
    
    this.padding = 15;
    this.dragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.toDelete = false;

  
  }

  display() {
    push();
    textSize(this.textSizeValue);
    textAlign(LEFT, TOP);

    let h = this.getTextHeight();
    noStroke();
    fill(this.bg);
    rect(this.x, this.y, this.maxWidth + this.padding * 2, h + this.padding * 2);

    fill(this.txtColor);
    text(this.content, this.x + this.padding, this.y + this.padding, this.maxWidth);
    
if (mode === MODE_ADMIN) {
    stroke(255);
    fill(0);
  rect(this.x, this.y, 10, 10)
  }
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
      if (textWidth(test) > this.maxWidth) {
        line = w + " ";
        y += lineHeight;
      } else line = test;
    }
    pop();
    return y + lineHeight;
  }

  isMouseOver() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    let h = this.getTextHeight() + this.padding * 2;
    return worldMouse.x > this.x && worldMouse.x < this.x + this.maxWidth + this.padding * 2 &&
           worldMouse.y > this.y && worldMouse.y < this.y + h;
  }

  mousePressed() {
     if (mode === MODE_PUBLIC) return;
    let worldMouse = screenToWorld(mouseX, mouseY);
    if (worldMouse.x > this.x && worldMouse.x < this.x + 10 &&
        worldMouse.y > this.y && worldMouse.y < this.y + 10) {
      this.toDelete = true;
      return;
    }
    this.dragging = true;
    this.offsetX = worldMouse.x - this.x;
    this.offsetY = worldMouse.y - this.y;
  }

  mouseDragged() {
     if (mode === MODE_PUBLIC) return;
    if (this.dragging) {
      let worldMouse = screenToWorld(mouseX, mouseY);
      this.x = worldMouse.x - this.offsetX;
      this.y = worldMouse.y - this.offsetY;
    }
  }

  mouseReleased() {
    this.dragging = false;
  }
}

function exportLayout() {
  const data = {
    canvas: { zoom: scaleFactor, offsetX, offsetY },
    images: images.map(i => ({ src:i.src,x:i.x,y:i.y,w:i.w,h:i.h })),
    videos: videos.map(v => ({ src:v.src,x:v.x,y:v.y,w:v.w,h:v.h,playing:v.playing })),
    texts: texts.map(t => ({ content:t.content,type:t.type,x:t.x,y:t.y,maxWidth:t.maxWidth,fontSize:t.textSizeValue })),
    players: players.map(p => ({ src:p.src,x:p.x,y:p.y,w:p.w,h:p.h }))
  };
  saveJSON(data,"layout.json");
}

function loadLayout(data) {
  if (data.images) data.images.forEach(img => {
    loadImage(img.src, loaded => {
      let i = new DraggableImage(loaded,img.x,img.y,img.src);
      i.w = img.w; i.h = img.h; images.push(i);
    });
  });

  if (data.videos) data.videos.forEach(v => {
    let vid = createVideo(v.src, () => { if(v.playing) vid.loop(); else vid.pause(); vid.volume(0); });
    vid.hide();
    let dv = new DraggableVideo(vid,v.x,v.y,v.src,v.playing??true);
    dv.w = v.w; dv.h = v.h; videos.push(dv);
  });

  if (data.texts) data.texts.forEach(t => {
    let tb = new TextBlock(t.content,t.type,t.x,t.y);
    if(t.maxWidth) tb.maxWidth = t.maxWidth;
    if(t.fontSize) tb.textSizeValue = t.fontSize;
    texts.push(tb);
  });

  if (data.players) data.players.forEach(a => {
    let fileName = a.src.split("/").pop();
    let p = new AudioPlayerBox(fileName,a.x,a.y,imgOff,imgOn,a.src);
    p.w = a.w ?? p.w; p.h = a.h ?? p.h; players.push(p);
  });

  if (data.canvas) {
    scaleFactor = data.canvas.zoom ?? 1;
    offsetX = data.canvas.offsetX ?? 0;
    offsetY = data.canvas.offsetY ?? 0;
  }
}
