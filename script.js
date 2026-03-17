const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d', { alpha: false });

function resizeCanvasToDisplaySize() {
  const cssW = Math.floor(window.innerWidth);
  const cssH = Math.floor(window.innerHeight);

  // Keep the canvas pixel size in CSS pixels so MediaPipe Drawing Utils,
  // which maps normalized landmarks using canvas.width/height, stays correct.
  if (canvasEl.width !== cssW || canvasEl.height !== cssH) {
    canvasEl.width = cssW;
    canvasEl.height = cssH;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function clearBackground() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.restore();
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function drawHands(results) {
  resizeCanvasToDisplaySize();
  clearBackground();

  // Optionally mirror to feel natural (like a selfie camera).
  const mirror = true;

  ctx.save();
  if (mirror) {
    ctx.translate(window.innerWidth, 0);
    ctx.scale(-1, 1);
  }

  const landmarkLineStyle = { color: '#35ff66', lineWidth: 2 };
  const landmarkPointStyle = { color: '#ff3b3b', lineWidth: 1, radius: 3 };

  const landmarksList = results.multiHandLandmarks || [];
  for (const landmarks of landmarksList) {
    // MediaPipe's drawing utils draw in pixel space if we pass width/height options.
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, landmarkLineStyle);
    drawLandmarks(ctx, landmarks, landmarkPointStyle);

    // Hook for future generative effects:
    // - Use a few key points as "seeds" (e.g. index fingertip, wrist).
    // - Use velocity between frames for randomness.
    // Example: const tip = landmarks[8]; // index fingertip (normalized)
    // const x = clamp01(tip.x) * window.innerWidth;
    // const y = clamp01(tip.y) * window.innerHeight;
  }

  ctx.restore();

  // Small HUD for debugging / future expansion.
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('Random Genesis — MediaPipe Hands', 14, 22);
  ctx.fillText(`hands: ${landmarksList.length}`, 14, 40);
  ctx.restore();
}

async function start() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('This browser does not support getUserMedia.');
    return;
  }

  resizeCanvasToDisplaySize();
  clearBackground();

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
    selfieMode: true,
  });

  hands.onResults(drawHands);

  const camera = new Camera(videoEl, {
    onFrame: async () => {
      await hands.send({ image: videoEl });
    },
    width: 1280,
    height: 720,
  });

  await camera.start();
}

window.addEventListener('resize', () => {
  resizeCanvasToDisplaySize();
  clearBackground();
});

start().catch((err) => {
  console.error(err);
  alert(`Failed to start: ${err?.message || err}`);
});

