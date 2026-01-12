let players = [];
let images = []; // <--- tableau des images importées
let fileInput, fileInputImage;
let imgOff, imgOn;

function preload() {
  imgOff = loadImage("robinette.png"); // image par défaut
  imgOn  = loadImage("robinette2.png");  // image quand lecture
}

function setup() {
  createCanvas(3200, 2160);

  // Bouton pour charger un fichier audio
  fileInput = createFileInput(handleFile);
  fileInput.position(10, 10);

  // Bouton pour charger une image
  fileInputImage = createFileInput(handleImageFile);
  fileInputImage.position(10, 40);
}

function draw() {
  background(230,255,255);

  // afficher les images importées
  for (let img of images) {
    img.display();
  }
   images = images.filter(img => !img.toDelete);

  // afficher les lecteurs audio
  for (let p of players) {
    p.display();
  }
noStroke();
  fill(50);
  textAlign(LEFT, TOP);
  text("Clique sur 'Choisir un fichier' pour ajouter un son\nClique sur le 2ème bouton pour ajouter une image\nAppuie sur espace pour arrêter tous les sons", 10, 70);
}

let activeObject = null;

// --- Souris ---
function mousePressed() {
  activeObject = null;

  // Vérifier d’abord les lecteurs (au premier plan)
  for (let p of players) {
    if (p.isMouseOver()) {
      activeObject = p;
      p.mousePressed();
      return;
    }
  }

  // Sinon vérifier les images
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
}


function mouseReleased() {
  if (activeObject) {
    activeObject.mouseReleased();
    activeObject = null;
  }
}

// --- Gestion du fichier audio uploadé ---
function handleFile(file) {
  if (file.type === 'audio') {
    let newPlayer = new AudioPlayerBox(file.name, random(100, 500), random(100, 400), imgOff, imgOn);

    let url = URL.createObjectURL(file.file);
    newPlayer.sound = createAudio(url);
    newPlayer.sound.hide();

    players.push(newPlayer);
  } else {
    console.log("Ce n'est pas un fichier audio.");
  }
}

// --- Gestion du fichier image uploadé ---
function handleImageFile(file) {
  if (file.type === 'image') {
    loadImage(file.data, (loaded) => {
      images.push(new DraggableImage(loaded, random(100, 800), random(100, 600)));
    });
  } else {
    console.log("Ce n'est pas une image.");
  }
}

// --- Classe lecteur audio avec PNG ---
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
    fill(0,0,255);
    textAlign(CENTER, CENTER);
    text(this.file, this.x + this.w / 2, this.y +20);
  }

  isMouseOver() {
    return mouseX > this.x && mouseX < this.x + this.w &&
           mouseY > this.y && mouseY < this.y + this.h;
  }

  mousePressed() {
    if (this.isMouseOver()) {
      this.dragging = true;
      this.offsetX = mouseX - this.x;
      this.offsetY = mouseY - this.y;
      this.pressX = mouseX;
      this.pressY = mouseY;
    }
  }

  mouseDragged() {
    if (this.dragging) {
      this.x = mouseX - this.offsetX;
      this.y = mouseY - this.offsetY;
    }
  }

  mouseReleased() {
    if (this.dragging) {
      let moved = dist(this.pressX, this.pressY, mouseX, mouseY);
      if (moved < 5) {
        this.toggle();
      }
    }
    this.dragging = false;
  }

  toggle() {
    if (this.sound) {
      if (this.sound.elt.paused) {
        this.sound.play();
      } else {
        this.sound.pause();
        this.sound.currentTime(0);
      }
    }
  }

  stop() {
    if (this.sound) {
      this.sound.stop();
    }
  }
}

// --- Classe image déplaçable + redimensionnable ---
class DraggableImage {
  constructor(pic, x, y) {
    this.pic = pic;
    this.x = x;
    this.y = y;
    this.w = 200;
    this.h = (pic.height / pic.width) * this.w; // conserve ratio
    this.aspect = this.h / this.w;
    this.dragging = false;
    this.resizing = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.toDelete = false; // marque si l’image doit être supprimée
  }

  display() {
    image(this.pic, this.x, this.y, this.w, this.h);

    // carré resize (bas-droite)
    noStroke();
    fill(120, 255, 255);
    rect(this.x + this.w - 5, this.y + this.h - 5, 5, 5);

    // carré suppression (haut-gauche)
    stroke(255);
    fill(0);
    rect(this.x, this.y, 5, 5);

  }

  isMouseOver() {
    return mouseX > this.x && mouseX < this.x + this.w &&
           mouseY > this.y && mouseY < this.y + this.h;
  }

  isOnCorner() {
    let cornerX = this.x + this.w;
    let cornerY = this.y + this.h;
    return dist(mouseX, mouseY, cornerX, cornerY) < 15;
  }

  isOnDeleteCorner() {
    return mouseX > this.x && mouseX < this.x + 10 &&
           mouseY > this.y && mouseY < this.y + 10;
  }

  mousePressed() {
    if (this.isOnDeleteCorner()) {
      this.toDelete = true; // on marque pour suppression
    } else if (this.isOnCorner()) {
      this.resizing = true;
    } else if (this.isMouseOver()) {
      this.dragging = true;
      this.offsetX = mouseX - this.x;
      this.offsetY = mouseY - this.y;
    }
  }

  mouseDragged() {
    if (this.dragging) {
      this.x = mouseX - this.offsetX;
      this.y = mouseY - this.offsetY;
    }
    if (this.resizing) {
      let newW = mouseX - this.x;
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
