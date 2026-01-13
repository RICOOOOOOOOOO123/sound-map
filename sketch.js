let players = [];
let images = [];
let videos = [];
let texts = [];

let fileInput, fileInputImage, fileInputVideo;
let fileInputTextTitle, fileInputTextBody;
let imgOff, imgOn;

let offsetX = 0;
let offsetY = 0;
let scaleFactor = 1;

// ------------------- PRELOAD -------------------
function preload() {
  imgOff = loadImage("robinette.png"); // image par défaut
  imgOn = loadImage("robinette2.png"); // image quand lecture
}

// ------------------- SETUP -------------------
function setup() {
  createCanvas(1920, 1080);

  // Audio
  fileInput = createFileInput(handleFile);
  fileInput.position(10, 20);

  // Image
  fileInputImage = createFileInput(handleImageFile);
  fileInputImage.position(10, 70);

  // Vidéo
  fileInputVideo = createFileInput(handleVideoFile);
  fileInputVideo.position(10, 180);

  // Titre
  fileInputTextTitle = createButton("Ajouter un TITRE");
  fileInputTextTitle.position(10, 250);
  fileInputTextTitle.mousePressed(() => {
    let content = prompt("Texte du titre ?");
    if (content) texts.push(new TextBlock(content, "title", 300, 200));
  });

  // Texte normal
  fileInputTextBody = createButton("Ajouter un TEXTE");
  fileInputTextBody.position(10, 280);
  fileInputTextBody.mousePressed(() => {
    let content = prompt("Texte du paragraphe ?");
    if (content) texts.push(new TextBlock(content, "body", 300, 300));
  });
}

// ------------------- DRAW -------------------
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

  // Info UI
  noStroke();
  fill(50);
  textAlign(LEFT, TOP);
  text("*Appuie sur espace pour arrêter tous les sons, shift clic pour se deplacer", 10, 120);
  text("importe un son", 10, 45);
  text("importe une image", 10, 95);
  text("importe une vidéo", 10, 200);
}

// ------------------- MOUSE INTERACTIONS -------------------
let activeObject = null;

function mousePressed() {
  activeObject = null;

  // Audio
  for (let p of players) {
    if (p.isMouseOver()) {
      activeObject = p;
      p.mousePressed();
      return;
    }
  }

  // Vidéo
  for (let v of videos) {
    if (v.isMouseOver() || v.isOnCorner() || v.isOnPlayPause()) {
      activeObject = v;
      v.mousePressed();
      return;
    }
  }

  // Textes
  for (let t of texts) {
    if (t.isMouseOver()) {
      activeObject = t;
      t.mousePressed();
      return;
    }
  }

  // Images
  for (let img of images) {
    if (img.isMouseOver() || img.isOnCorner()) {
      activeObject = img;
      img.mousePressed();
      return;
    }
  }
}

function mouseDragged() {
  if (activeObject) activeObject.mouseDragged();
  else if (mouseIsPressed && keyIsDown(SHIFT)) { 
    // déplace le canvas avec SHIFT+drag
    offsetX += movedX;
    offsetY += movedY;
  }
}

function mouseReleased() {
  if (activeObject) activeObject.mouseReleased();
  activeObject = null;
}

// ------------------- MOUSE WHEEL ZOOM -------------------
function mouseWheel(event) {
  let zoomSpeed = 0.001;
  let zoom = 1 - event.delta * zoomSpeed;

  let newScale = constrain(scaleFactor * zoom, 0.2, 5);

  // Zoom centré sur souris
  let worldMouse = screenToWorld(mouseX, mouseY);
  offsetX = mouseX - worldMouse.x * newScale;
  offsetY = mouseY - worldMouse.y * newScale;

  scaleFactor = newScale;
  return false;
}

// ------------------- HELPER -------------------
function screenToWorld(x, y) {
  return {
    x: (x - offsetX) / scaleFactor,
    y: (y - offsetY) / scaleFactor
  };
}

// ------------------- FILE HANDLERS -------------------
function handleFile(file) {
  if (file.type === 'audio') {
    let newPlayer = new AudioPlayerBox(file.name, random(100, 500), random(100, 400), imgOff, imgOn);
    let url = URL.createObjectURL(file.file);
    newPlayer.sound = createAudio(url);
    newPlayer.sound.hide();
    players.push(newPlayer);
  }
}

function handleImageFile(file) {
  if (file.type === 'image') {
    loadImage(file.data, loaded => {
      images.push(new DraggableImage(loaded, random(100, 800), random(100, 600)));
    });
  }
}

function handleVideoFile(file) {
  if (file.type === 'video') {
    let url = URL.createObjectURL(file.file);
    let vid = createVideo(url, () => {
      vid.loop();
      vid.volume(0);
    });
    vid.hide();
    videos.push(new DraggableVideo(vid, random(100, 800), random(100, 600)));
  }
}

// ------------------- CLASSES -------------------
class AudioPlayerBox {
  constructor(file, x, y, imgOff, imgOn) {
    this.file = file;
    this.sound = null;
    this.x = x;
    this.y = y;
    this.w = 180;
    this.h = 130;
    this.dragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.imgOff = imgOff;
    this.imgOn = imgOn;
    this.pressX = 0;
    this.pressY = 0;
  }

  display() {
    let currentImg = (this.sound && !this.sound.elt.paused) ? this.imgOn : this.imgOff;
    image(currentImg, this.x, this.y, this.w, this.h);

    noStroke();
    fill(0, 0, 255);
    textAlign(CENTER, CENTER);
    text(this.file, this.x + this.w / 2, this.y + 20);
  }

  isMouseOver() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    return worldMouse.x > this.x && worldMouse.x < this.x + this.w &&
           worldMouse.y > this.y && worldMouse.y < this.y + this.h;
  }

  mousePressed() {
    let worldMouse = screenToWorld(mouseX, mouseY);
    if (worldMouse.x > this.x && worldMouse.x < this.x + this.w &&
        worldMouse.y > this.y && worldMouse.y < this.y + this.h) {
      this.dragging = true;
      this.offsetX = worldMouse.x - this.x;
      this.offsetY = worldMouse.y - this.y;
      this.pressX = worldMouse.x;
      this.pressY = worldMouse.y;
    }
  }

  mouseDragged() {
    if (this.dragging) {
      let worldMouse = screenToWorld(mouseX, mouseY);
      this.x = worldMouse.x - this.offsetX;
      this.y = worldMouse.y - this.offsetY;
    }
  }

  mouseReleased() {
    if (!this.dragging) return;
    let worldMouse = screenToWorld(mouseX, mouseY);
    let moved = dist(this.pressX, this.pressY, worldMouse.x, worldMouse.y);
    if (moved < 5) this.toggle();
    this.dragging = false;
  }

  toggle() {
    if (!this.sound) return;
    if (this.sound.elt.paused) this.sound.play();
    else {
      this.sound.pause();
      this.sound.currentTime(0);
    }
  }
}

// --------- Draggable Image ---------
class DraggableImage {
  constructor(pic, x, y) {
    this.pic = pic;
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
    noStroke();
    fill(120, 255, 255);
    rect(this.x + this.w - 5, this.y + this.h - 5, 5, 5);
    stroke(255);
    fill(0);
    rect(this.x, this.y, 5, 5);
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
  constructor(video, x, y) {
    this.video = video;
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
    this.playing = true;
    this.video.loop();
    this.video.volume(0);
    this.video.hide();
  }

  display() {
    push();
    if (this.video.time() > 10) this.video.time(0);
    image(this.video, this.x, this.y, this.w, this.h);

    noStroke();
    fill(120, 255, 255);
    rect(this.x + this.w - 5, this.y + this.h - 5, 5, 5);

    stroke(255);
    fill(0);
    rect(this.x, this.y, 10, 10);

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
  constructor(content, type, x, y) {
    this.content = content;
    this.type = type;
    this.x = x;
    this.y = y;
    this.padding = 15;
    this.dragging = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.toDelete = false;

    if (type === "title") {
      this.textSizeValue = 42;
      this.bg = color(0, 0, 0, 0);
      this.txtColor = color(0);
      this.maxWidth = 300;
    } else {
      this.textSizeValue = 18;
      this.bg = color(0, 0, 0, 0);
      this.txtColor = color(0, 0, 255, 255);
      this.maxWidth = 400;
    }
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

    stroke(255);
    fill(0);
    rect(this.x, this.y, 10, 10);
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
