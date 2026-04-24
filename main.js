//This is the main js file for the project.
//It handles the core logic for user interactions, burst creation and sound effects.

// Default settings for the canvas background, burst type and colour.
// These variables are used across this file so are declared here at the top for
// easy access and modification.
let currentCanvasTone = "light";
let currentBurstType = "circle";
let currentColour = "#ff5fa2";

const introDialog = document.getElementById("intro-dialog");
const dialogCloseButton = document.getElementById("dialog-close-button");
//intro dialog setup
introDialog.showModal();
dialogCloseButton.addEventListener("click", () => {
  introDialog.close();
  Tone.start();
});

// -----------------------------
// Tone.js setup
// -----------------------------

// Setting up the sound with Tone.js allows user interactions to trigger
//aduio feedback, which makes the experience more engaging and playful.
const reverb = new Tone.Reverb({
  decay: 2.5,
  wet: 0.3,
}).toDestination();

const burstSynth = new Tone.Synth({
  oscillator: { type: "triangle" },
  envelope: {
    attack: 0.01,
    decay: 0.18,
    sustain: 0.05,
    release: 0.5,
  },
}).connect(reverb);

let audioStarted = false;

// -----------------------------
// Canvas background colour controls
// -----------------------------
//These buttons allow the user to switch between light and dark canvas,
// which can help to make the bubble bloom marks more visible in different
// colour tones.

const lightCanvasBtn = document.getElementById("lightCanvasBtn");
const darkCanvasBtn = document.getElementById("darkCanvasBtn");

//The event listeners on these buttons changes the canvas background colour
// and updates the current state variable.
lightCanvasBtn.addEventListener("click", () => {
  currentCanvasTone = "light";
  backgroundRect.fill("#f8f5f0");
  backgroundLayer.draw();
});

darkCanvasBtn.addEventListener("click", () => {
  currentCanvasTone = "dark";
  backgroundRect.fill("#1f2330");
  backgroundLayer.draw();
});

// -----------------------------
// Burst type controls
// -----------------------------
//These buttons allow the user to choose different burst types,
// which changes the shape of the burst marks and the sound that is played.
const burstTypeButtons = document.querySelectorAll(".burstTypeBtn");

burstTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentBurstType = button.dataset.burst;
  });
});

// -----------------------------
// Colour controls
// -----------------------------
//These buttons allow the user to choose different colours for the burst marks.

const colourButtons = document.querySelectorAll(".paletteColour");

colourButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentColour = button.dataset.colour;
  });
});

// -----------------------------
// Stage click interaction
// -----------------------------

// Clicking the canvas places a burst mark directly on the chosen position.
//This interaction makes the experience more playful and engaging,
// as users can create their own compositions and patterns on the canvas.

stage.on("click", async () => {
  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }

  const pos = stage.getPointerPosition();
  if (!pos) return;

  placeShape(pos.x, pos.y);
});

// -----------------------------
// Burst creation
// -----------------------------
//PlaceShape
function placeShape(x, y) {
  const placedShape = createMainShape(x, y, 30, currentColour);

  //
  placedShape.scaleX(1);
  placedShape.scaleY(1);

  burstLayer.add(placedShape);
  burstLayer.draw();

  //
  placedShape.hasBurst = false;

  //Hover effects to let users know they can interact with the marks.
  placedShape.on("mouseenter", () => {
    document.body.style.cursor = "pointer";
    placedShape.to({
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 0.2,
    });
  });
  placedShape.on("mouseleave", () => {
    document.body.style.cursor = "default";
    placedShape.to({
      scaleX: 1,
      scaleY: 1,
      duration: 0.2,
    });
  });

  //Clicking a burst mark creates a burst effect and plays a sound.
  placedShape.on("click", async (e) => {
    e.cancelBubble = true;

    //This check prevents multiple bursts from being triggered on the same mark.
    if (placedShape.hasBurst) return;
    placedShape.hasBurst = true;

    if (!audioStarted) {
      await Tone.start();
      audioStarted = true;
    }

    const burstX = placedShape.x();
    const burstY = placedShape.y();

    placedShape.destroy();
    createBurst(burstX, burstY);
    playBurstSound();
  });
}

//
//This is the function to create circle.
function createMainShape(x, y, size, colour) {
  if (currentBurstType === "circle") {
    return new Konva.Circle({
      x: x,
      y: y,
      radius: size,
      fill: colour,
      opacity: 0.9,
      scaleX: 0,
      scaleY: 0,
    });
  }
  //This is the function to create triangle.
  if (currentBurstType === "triangle") {
    return new Konva.RegularPolygon({
      x: x,
      y: y,
      sides: 3,
      radius: size,
      fill: colour,
      opacity: 0.9,
      scaleX: 0,
      scaleY: 0,
    });
  }
  //This is the function to create star.
  if (currentBurstType === "star") {
    return new Konva.Star({
      x: x,
      y: y,
      numPoints: 5,
      innerRadius: size * 0.45,
      outerRadius: size,
      fill: colour,
      opacity: 0.9,
      scaleX: 0,
      scaleY: 0,
    });
  }
}
//This is the function to create circle droplets.
function createDropletShape(x, y, size, colour) {
  if (currentBurstType === "circle") {
    return new Konva.Circle({
      x: x,
      y: y,
      radius: size,
      fill: colour,
      opacity: 0.75,
      scaleX: 0,
      scaleY: 0,
    });
  }
  //This is the function to create triangle droplets.
  if (currentBurstType === "triangle") {
    return new Konva.RegularPolygon({
      x: x,
      y: y,
      sides: 3,
      radius: size,
      fill: colour,
      opacity: 0.75,
      scaleX: 0,
      scaleY: 0,
    });
  }
  //This is the function to create star droplets.
  if (currentBurstType === "star") {
    return new Konva.Star({
      x: x,
      y: y,
      numPoints: 5,
      innerRadius: size * 0.45,
      outerRadius: size,
      fill: colour,
      opacity: 0.75,
      scaleX: 0,
      scaleY: 0,
    });
  }
}
//These are helper functions to create the burst marks in different shapes
//based on the current burst type.
//centreRadius is the size of the centre mark,
//dropletCount is the number of smaller marks that spread out from the centre,
//and spreadDistance is how far the smaller marks can spread out from the centre.

function createBurst(x, y) {
  let centreRadius = 30;
  let dropletCount = 15;
  let spreadDistance = 60;

  if (currentBurstType === "triangle") {
    centreRadius = 18;
    dropletCount = 10;
    spreadDistance = 55;
  }

  if (currentBurstType === "star") {
    centreRadius = 16;
    dropletCount = 20;
    spreadDistance = 70;
  }

  // The selected shape changes both the centre mark and the droplet shapes,
  // so this choice has a visible effect on the final composition.
  const centre = createMainShape(x, y, centreRadius, currentColour);
  burstLayer.add(centre);

  centre.to({
    scaleX: 1,
    scaleY: 1,
    duration: 0.22,
    easing: Konva.Easings.EaseOut,
  });
  // The smaller bubble marks are randomly placed around the main mark within
  // a certain distance, which creates a dynamic burst effect that feels more
  // natural and playful.
  for (let i = 0; i < dropletCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spreadDistance;

    const dropletX = x + Math.cos(angle) * distance;
    const dropletY = y + Math.sin(angle) * distance;

    const droplet = createDropletShape(
      dropletX,
      dropletY,
      Math.random() * 6 + 4,
      currentColour,
    );

    burstLayer.add(droplet);

    droplet.to({
      scaleX: 1,
      scaleY: 1,
      duration: 0.22,
      easing: Konva.Easings.EaseOut,
    });
  }

  burstLayer.draw();
}

// -----------------------------
// Sound logic
// -----------------------------
//The sound that is played changes based on the burst type,
//so users can get different audio feedback for different burst types,
// which makees the experience more playful.

function playBurstSound() {
  // The burst type changes the pitch slightly so different visual behaviours
  // also feel slightly different in sound.
  let notes = ["C4", "E4", "G4"];

  if (currentBurstType === "triangle") {
    notes = ["D4", "F#4", "A4"];
  }

  if (currentBurstType === "star") {
    notes = ["G4", "B4", "D5"];
  }
  const note = notes[Math.floor(Math.random() * notes.length)];

  burstSynth.triggerAttackRelease(note, "8n.");
}

// -----------------------------
// Clear/SaveActions
// -----------------------------

const clearBtn = document.getElementById("clearBtn");
const saveFileBtn = document.getElementById("saveFileBtn");

clearBtn.addEventListener("click", () => {
  // Clearing removes all burst marks so the user can begin again easily.
  burstLayer.destroyChildren();
  burstLayer.draw();
});

//Users can download a png of their canvas creation,
//which allows them to keep a record and share their work.
saveFileBtn.addEventListener("click", () => {
  const dataURL = stage.toDataURL({ pixelRatio: 2 });
  const downloadLink = document.createElement("a");
  downloadLink.href = dataURL;
  downloadLink.download = "bubble-bloom.png";
  downloadLink.click();
  downloadLink.remove();
});
