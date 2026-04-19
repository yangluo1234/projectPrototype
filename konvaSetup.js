// Bubble Bloom canvas setup
// Konva is used here to create a full-screen canvas area for placing burst marks.

const stage = new Konva.Stage({
  container: "stageContainer",
  width: window.innerWidth,
  height: window.innerHeight,
});

const backgroundLayer = new Konva.Layer();
const burstLayer = new Konva.Layer();

stage.add(backgroundLayer);
stage.add(burstLayer);

// A simple background rect makes it easy to switch between light and dark canvas tones.
const backgroundRect = new Konva.Rect({
  x: 0,
  y: 0,
  width: stage.width(),
  height: stage.height(),
  fill: "#f8f5f0",
});

backgroundLayer.add(backgroundRect);
backgroundLayer.draw();

// Keep the stage responsive when the browser window changes size.
window.addEventListener("resize", () => {
  stage.width(window.innerWidth);
  stage.height(window.innerHeight);

  backgroundRect.width(stage.width());
  backgroundRect.height(stage.height());

  backgroundLayer.draw();
  burstLayer.draw();
});
