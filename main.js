/* 
This is the main js file for the project.
It handles the core logic for user interactions, burst creation and sound effects.

Default settings for the canvas background, burst type and colour.
These variables are used across this file so are declared here at the top for
easy access and modification.

The shpes I used from Konva library are Circle, RegularPolygon and Star.
Reference:
-https://konvajs.org/api/Konva.RegularPolygon.html
-https://konvajs.org/api/Konva.Circle.html
-https://konvajs.org/api/Konva.Star.html
 */

/* Performance optimisations

- Reducing the number of droplets in each burst helps performance optimise 
as more bursts are created on the canvas, the speed can slow down if there are too
many shapes to render. 
- Reducing the shadow blur can also help performance, as complex shadows 
can be computationally expensive to render, especially when there are many shapes
on the canvas. 
*/

/* 
These global variables hold the current/default visual and audio choices
consistently across placement and burst creation, 
so that the user can see and hear the effects of their choices in 
different interactions. 
*/

let currentCanvasTone = "dark";
let currentBurstType = "circle";
let currentColour = "#ff5fa2";

/*
The intro dialog prepares the user for sound and expains the main interaction.
Audio is only started when the user clicks the button because browser audio policies
block autoplay.  
 */

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

/* 
Tone.js is used to connect visual interaction with audio feedback.
This supports Bubble Bloom as an expressive tool rather than a slient image-only canvas. 

The reverb and delay effects are set up to create a more immersive and 
playful sound experience.

A light delay is added to soften the sound slightly and give it a more polished,
playful character without making repeated interactions too muddy.
*/
const reverb = new Tone.Reverb({
  decay: 2.2,
  wet: 0.18,
}).toDestination();

const delay = new Tone.FeedbackDelay({
  delayTime: "16n",
  feedback: 0.12,
  wet: 0.08,
}).connect(reverb);

const burstSynth = new Tone.Synth({
  oscillator: { type: "triangle" },
  envelope: {
    attack: 0.01,
    decay: 0.18,
    sustain: 0.05,
    release: 0.5,
  },
}).connect(reverb);

const growSynth = new Tone.Synth({
  oscillator: { type: "triangle" },
  envelope: {
    attack: 0.02,
    decay: 0.05,
    sustain: 0.12,
    release: 0.08,
  },
  volume: -10,
}).connect(delay);

let audioStarted = false;

// -----------------------------
// Colour helper functions.
// -----------------------------
//Add colour helper functions

/* 
These functions are used to create the gradient fills for the shapes, 
which gives them a more visually rich and playful look.
The lighten and darken functions create hightlight and shadow colours 
based on the user's colour choice, which make the shapes feel more dynamic 
and 3d like, rather than flat and static.
This supports the playful and expressive feel of the tool. 
 */

const DEFAULT_STROKE = "rgba(255,255,255,0.18)";
const DEFAULT_STROKE_WIDTH = 1.6;

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned;

  const num = parseInt(full, 16);

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function mixColour(hex, target, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (start, end) => Math.round(start + (end - start) * amount);
  return `rgb(${mix(r, target.r)}, ${mix(g, target.g)}, ${mix(b, target.b)})`;
}

function lighten(hex, amount = 0.16) {
  return mixColour(hex, { r: 255, g: 255, b: 255 }, amount);
}

function darken(hex, amount = 0.12) {
  return mixColour(hex, { r: 0, g: 0, b: 0 }, amount);
}

// -----------------------------
// Hold to grow logic variables
// -----------------------------

/* 
The hold to grow interaction allows users to create larger shapes by 
holding down on the canvas, which adds a more playful and expressive way to 
create burst marks of different sizes. 
The growing shapes give users a visual feedback of the growing process, and 
the sound feeback makes the interaction feel more responsive and engaging. 
*/

let isHolding = false;
let growthInterval = null;
let growingShape = null;
let growthStartPos = null;
let currentHoldSize = 16;

const minHoldSize = 16;
const maxHoldSize = 72;
const growthStep = 2.6;
const growthSpeed = 45;

// -----------------------------
// Canvas background colour controls
// -----------------------------

/* 
These buttons switch between light and dark canvas tones.
This gives users two different visual moods 
and helps colours read clearly in different contexts.
*/

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
/* 
These buttons allow the user to choose different burst types,
which changes the shape of the burst marks and the sound that is played.

Shape selection is limited to three options so the tool stays easy to learn.
Circle feels soft and classic,
triangle has a sharper, more energetic feel,
and start feels more playful and dynamic.
These different shapes give users more creative options and allow them to 
create artworks with different moods and styles. 
*/

const burstTypeButtons = document.querySelectorAll(".burstTypeBtn");

burstTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    //updating the current shape changes both the visual and audio feedback of the bursts,
    //so one choice affects the whole interaction.
    currentBurstType = button.dataset.burst;
  });
});

// -----------------------------
// Colour controls
// -----------------------------
/* 
The colour buttons provide quick visual variation options for the user without 
adding complex controls. This keeps the tool easy to use while still 
allowing for creative expression through colour choice. 
*/

const colourButtons = document.querySelectorAll(".paletteColour");

colourButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentColour = button.dataset.colour;
  });
});

// -----------------------------
// Stage click interaction
// -----------------------------
//Hold to grow feature added

// Clicking the canvas places a burst mark directly on the chosen position.
//This interaction makes the experience more playful and engaging,
// as users can create their own compositions and patterns on the canvas.

/* 
Holding down on the canvas creates a growing shape that follows the user's pointer.
This makes size feel directly controllable by the user, which adds a more playful and expressive
than just placing a fixed size shape. 
The growing shape gives users both visual and audio feedback of the growing process. 
*/
stage.on("mousedown", async (e) => {
  if (e.target !== stage && e.target !== backgroundRect) return;

  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }

  if (isHolding) return;

  const pos = stage.getPointerPosition();
  if (!pos) return;

  isHolding = true;
  growthStartPos = pos;
  currentHoldSize = minHoldSize;

  //PlaceShapeSound
  //playPlaceSound();

  //Playing a sound when starting to hold gives users audio feedback
  startGrowSound();

  // create the temporary growing shape
  growingShape = createShapeByType(
    pos.x,
    pos.y,
    currentHoldSize,
    currentColour,
    currentBurstType,
  );
  growingShape.scaleX(1);
  growingShape.scaleY(1);

  burstLayer.add(growingShape);
  burstLayer.draw();

  //The growth interval updates the size of the growing shape.
  growthInterval = setInterval(() => {
    if (!growingShape) return;

    currentHoldSize += growthStep;

    if (currentHoldSize >= maxHoldSize) {
      currentHoldSize = maxHoldSize;
      clearInterval(growthInterval);
    }
    // The size of the growing shape is updated based on the current hold size,
    //making the size change visible in real time.
    updateShapeSize(growingShape, currentHoldSize);

    const normalizedSize =
      (currentHoldSize - minHoldSize) / (maxHoldSize - minHoldSize);

    //Grow sound rises with size so the user receives audio feedback
    //as well as visual feedback during the hold interaction.
    const freq = 220 + normalizedSize * 220;
    growSynth.frequency.rampTo(freq, 0.05);

    burstLayer.draw();
  }, growthSpeed);
});

/*
Releasing the mouse ends the growing process and places the final interactive shape.
This turns one continuous hold interaction into a full craetive action,
where users can control the size of the shape they place, and then 
immediately interact with it to create bursts. 
This makes the experience more engaging and playful.  
 */

stage.on("mouseup", () => {
  if (!isHolding) return;

  isHolding = false;
  clearInterval(growthInterval);
  //Stopping the grow sound when releasing gives users audio feedback
  // and makes the interaction feel more responsive.
  stopGrowSound();

  if (!growingShape || !growthStartPos) return;

  const finalX = growthStartPos.x;
  const finalY = growthStartPos.y;
  const finalSize = currentHoldSize;

  // remove the temporary grow shape
  growingShape.destroy();
  growingShape = null;
  growthStartPos = null;

  // place the final interactive shape
  placeShape(finalX, finalY, finalSize);
  burstLayer.draw();
});

function createShapeByType(x, y, size, colour, burstType) {
  return createMainShape(x, y, size, colour, burstType);
}
//This function updates the size of a shape based on its type,
//which is used during the hold to grow interaction to visually reflect the growing process.
function updateShapeSize(shape, size) {
  if (shape instanceof Konva.Circle) {
    shape.radius(size);
  }

  if (shape instanceof Konva.RegularPolygon) {
    shape.radius(size);
  }

  if (shape instanceof Konva.Star) {
    shape.innerRadius(size * 0.45);
    shape.outerRadius(size);
  }
}

// -----------------------------
// Burst creation
// -----------------------------
//Placing a shape creates an interactive mark that can still be clicked again.
//This gives users a chance to create bursts after placing instead of just fixed shapes.
function placeShape(x, y, size = minHoldSize) {
  const placedShape = createMainShape(
    x,
    y,
    size,
    currentColour,
    currentBurstType,
  );
  placedShape.burstSize = size;
  placedShape.burstType = currentBurstType;
  placedShape.burstColour = currentColour;

  //
  placedShape.scaleX(1);
  placedShape.scaleY(1);

  burstLayer.add(placedShape);
  burstLayer.draw();

  //Playing a sound when placing a bubble gives users audio feedback.
  playPlaceSound();

  //This is to prevent multiple bursts from being triggered on the same shape.
  placedShape.hasBurst = false;

  // A small hover response helps users recognise that placed marks remain interactive.
  // A stroke is added to fit the visual language of the project.
  // This supports learnability without adding more interface text.
  placedShape.on("mouseenter", () => {
    document.body.style.cursor = "pointer";

    placedShape.stroke("#eafb89");
    placedShape.strokeWidth(2.4);

    placedShape.to({
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 0.18,
    });
  });

  placedShape.on("mouseleave", () => {
    document.body.style.cursor = "default";

    placedShape.stroke(DEFAULT_STROKE);
    placedShape.strokeWidth(DEFAULT_STROKE_WIDTH);

    placedShape.to({
      scaleX: 1,
      scaleY: 1,
      duration: 0.18,
    });
  });

  //Clicking a burst mark creates a burst effect and plays a sound.
  //pulse first then burst.
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
    const burstSize = placedShape.burstSize || 30;
    const burstType = placedShape.burstType || currentBurstType;
    const burstColour = placedShape.burstColour || currentColour;

    //A short pulse before the burst before makes the interaction
    //feel less automatic and more expressive
    placedShape.to({
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 0.12,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        placedShape.destroy();
        createBurst(burstX, burstY, burstSize, burstType, burstColour);
        playBurstSound(burstType, burstSize);
      },
    });
  });
}
// Main shapes use light gradients, soft edges, and subtle shadow
// so they feel slightly dimensional while still keeping a clean graphic style.
function createMainShape(x, y, size, colour, burstType = currentBurstType) {
  const highlightColour = lighten(colour, 0.16);
  const midColour = colour;
  const shadowColour = darken(colour, 0.12);

  const commonStyle = {
    opacity: 0.94,
    stroke: DEFAULT_STROKE,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    shadowColor: "rgba(0,0,0,0.08)",
    shadowBlur: 3,
    shadowOffsetX: 1,
    shadowOffsetY: 1.5,
    shadowOpacity: 0.08,
    scaleX: 0,
    scaleY: 0,
  };

  if (burstType === "circle") {
    return new Konva.Circle({
      x: x,
      y: y,
      radius: size,
      fillRadialGradientStartPoint: { x: -size * 0.28, y: -size * 0.28 },
      fillRadialGradientStartRadius: 1,
      fillRadialGradientEndPoint: { x: 0, y: 0 },
      fillRadialGradientEndRadius: size,
      fillRadialGradientColorStops: [
        0,
        highlightColour,
        0.5,
        midColour,
        1,
        shadowColour,
      ],
      ...commonStyle,
    });
  }

  if (burstType === "triangle") {
    return new Konva.RegularPolygon({
      x: x,
      y: y,
      sides: 3,
      radius: size,
      fillLinearGradientStartPoint: { x: -size, y: -size },
      fillLinearGradientEndPoint: { x: size, y: size },
      fillLinearGradientColorStops: [
        0,
        highlightColour,
        0.5,
        midColour,
        1,
        shadowColour,
      ],
      ...commonStyle,
    });
  }

  if (burstType === "star") {
    return new Konva.Star({
      x: x,
      y: y,
      numPoints: 5,
      innerRadius: size * 0.45,
      outerRadius: size,
      fillLinearGradientStartPoint: { x: -size, y: -size },
      fillLinearGradientEndPoint: { x: size, y: size },
      fillLinearGradientColorStops: [
        0,
        highlightColour,
        0.5,
        midColour,
        1,
        shadowColour,
      ],
      ...commonStyle,
    });
  }
}

//This is the function to create circle droplets.
// Droplets are visually simpler than the main shapes.
// This keeps the burst readable
// and helps performance when more marks build up on the canvas.
function createDropletShape(x, y, size, colour, burstType = currentBurstType) {
  if (burstType === "circle") {
    return new Konva.Circle({
      x: x,
      y: y,
      radius: size,
      fill: colour,
      opacity: 0.8,
      scaleX: 0,
      scaleY: 0,
    });
  }
  //Traingle droplets
  if (burstType === "triangle") {
    return new Konva.RegularPolygon({
      x: x,
      y: y,
      sides: 3,
      radius: size,
      fill: colour,
      opacity: 0.78,
      scaleX: 0,
      scaleY: 0,
    });
  }

  //Star droplets
  if (burstType === "star") {
    return new Konva.Star({
      x: x,
      y: y,
      numPoints: 5,
      innerRadius: size * 0.45,
      outerRadius: size,
      fill: colour,
      opacity: 0.78,
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

//Limiting the number of droplets can help maintain performance as more bursts
//are created on the canvas, while still creating a visually satisfying burst effects.

function createBurst(
  x,
  y,
  baseSize = 30,
  burstType = currentBurstType,
  burstColour = currentColour,
) {
  let centreRadius = baseSize;
  let dropletCount = 12;
  let spreadDistance = baseSize * 2;

  if (burstType === "triangle") {
    centreRadius = baseSize * 0.9;
    dropletCount = 14;
    spreadDistance = baseSize * 2.5;
  }

  if (burstType === "star") {
    centreRadius = baseSize * 0.8;
    dropletCount = 16;
    spreadDistance = baseSize * 2.5;
  }

  // The selected shape changes both the centre mark and the droplet shapes,
  // so this choice has a visible effect on the final composition.
  const centre = createMainShape(x, y, centreRadius, burstColour, burstType);
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
      burstColour,
      burstType,
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

//Place sound logic
// The placement sound is kept short and light so it confirms the action
// without overpowering the visual interaction.
const placeSynth = new Tone.Synth({
  oscillator: { type: "triangle" },
  envelope: {
    attack: 0.005,
    decay: 0.06,
    sustain: 0.02,
    release: 0.12,
  },
  volume: -8,
}).connect(delay);

// Grow sound begins when the user starts holding,
// reinforcing the sense that the shape is actively changing.
function startGrowSound() {
  growSynth.triggerAttack("C4");
}

function stopGrowSound() {
  growSynth.triggerRelease();
}

//Sound effects when placing a shape to the canvs.
// Placement sound gives immediate confirmation that a mark has been added.
// Different notes help shape choice feel more distinct without creating a full music system.
function playPlaceSound() {
  let note = "C5";

  if (currentBurstType === "triangle") {
    note = "F5";
  }

  if (currentBurstType === "star") {
    note = "G5";
  }

  placeSynth.triggerAttackRelease(note, "6n");
}

// Burst sound is mapped to shape choice so visual differences
// are reinforced through audio feedback. This gives each shape a clearer character.
function playBurstSound(burstType = currentBurstType, burstSize = 30) {
  // The burst type changes the pitch slightly so different visual behaviours
  // also feel slightly different in sound.
  let notes = ["C4", "E4", "G4"];

  if (burstType === "circle") {
    burstSynth.oscillator.type = "triangle";
    notes = ["C4", "E4", "G5"];
  }

  if (burstType === "triangle") {
    burstSynth.oscillator.type = "sawtooth";
    notes = ["D4", "F#4", "A5"];
  }

  if (burstType === "star") {
    burstSynth.oscillator.type = "square";
    notes = ["G4", "B4", "D5"];
  }
  const note = notes[Math.floor(Math.random() * notes.length)];

  burstSynth.triggerAttackRelease(note, "8n.");
}

// -----------------------------
// Clear/SaveActions
// -----------------------------
/* Clear supports experimentation by letting users restart quickly
   without needing to refresh the page.

   Save allows users to download a image of their creation, which
   supports sharing and keeping a record of their creations, and 
   gives the tool more lasting value beyond just a moment of play.
*/

//This is the logic I got from the class example.

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
