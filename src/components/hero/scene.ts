import {
  BackSide,
  CanvasTexture,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// DESIGN.md §10 "The Sticker Flip": a thick die-cut polaroid sticker, an "aww" bubble and two
// sparkles in the Mint hero panel. Drag flips the polaroid to its match card; release settles it;
// desktop tilts toward the cursor. Vanilla three (no fiber/drei), ~14 draw calls, a few k triangles.

export type HeroAssets = {
  colors: Record<"ink" | "surface" | "bg" | "bubble" | "highlight" | "fresh" | "primary", string>;
  display: string; // Unbounded font-family
  text: string; // Figtree font-family
  caption: string;
  /** Draws the dog illustration into the photo area (Path2D, so the canvas is never tainted). */
  drawPhoto: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
};

const CARD_W = 1;
const CARD_H = 1.28;
const DEPTH = 0.05;
const OUTLINE = 0.016;

function roundedRect(w: number, h: number, r: number, s = new Shape()) {
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Rounded speech bubble with a tail at the bottom left. */
function bubbleShape(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w * 0.34, y);
  s.lineTo(x + w * 0.12, y - h * 0.32); // tail
  s.lineTo(x + w * 0.52, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** The brand sparkle (Glyphs.tsx path), 1 unit wide. */
function sparkleShape() {
  const p = (x: number, y: number) => [(x - 20) / 40, -(y - 20) / 40] as const;
  const s = new Shape();
  s.moveTo(...p(20, 0));
  s.bezierCurveTo(...p(22, 14), ...p(26, 18), ...p(40, 20));
  s.bezierCurveTo(...p(26, 22), ...p(22, 26), ...p(20, 40));
  s.bezierCurveTo(...p(18, 26), ...p(14, 22), ...p(0, 20));
  s.bezierCurveTo(...p(14, 18), ...p(18, 14), ...p(20, 0));
  return s;
}

function extrude(shape: Shape, depth: number) {
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 10,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

function texture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
  draw(canvas.getContext("2d")!);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function mountHero(
  host: HTMLElement,
  a: HeroAssets,
  { onReady, onLost }: { onReady: () => void; onLost: () => void },
) {
  const c = a.colors;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab";
  host.append(canvas);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  // Soft studio light without washing out the token colours (no tone mapping).
  scene.environmentIntensity = 0.62;
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.z = 10;

  const disposables: (BufferGeometry | Material | Texture)[] = [env];
  const keep = <T extends BufferGeometry | Material | Texture>(x: T) => (disposables.push(x), x);
  const ink = keep(new MeshBasicMaterial({ color: c.ink }));
  const hullOf = (geo: BufferGeometry, w: number, h: number) => {
    const m = new Mesh(geo, keep(new MeshBasicMaterial({ color: c.ink, side: BackSide })));
    m.scale.set((w + OUTLINE * 2) / w, (h + OUTLINE * 2) / h, 1.6);
    return m;
  };

  // Polaroid: white extruded body + inverted-hull Plum outline + printed front and back faces.
  const cardGeo = keep(extrude(roundedRect(CARD_W, CARD_H, 0.07), DEPTH));
  const card = new Mesh(cardGeo, keep(new MeshStandardMaterial({ color: c.surface, roughness: 0.8 })));
  const faceW = CARD_W - 0.03;
  const faceH = CARD_H - 0.03;
  const faceGeo = keep(new PlaneGeometry(faceW, faceH));
  const TW = 512;
  const TH = Math.round((TW * faceH) / faceW);
  const pad = TW * 0.05;

  const front = new Mesh(
    faceGeo,
    keep(
      new MeshStandardMaterial({
        roughness: 0.8,
        map: keep(
          texture(TW, TH, (ctx) => {
            ctx.fillStyle = c.surface;
            ctx.fillRect(0, 0, TW, TH);
            const pw = TW - pad * 2;
            const ph = pw * 1.02;
            ctx.save();
            roundRectPath(ctx, pad, pad, pw, ph, 18);
            ctx.fillStyle = c.highlight;
            ctx.fill();
            ctx.clip();
            ctx.translate(pad, pad);
            a.drawPhoto(ctx, pw, ph);
            ctx.restore();
            ctx.fillStyle = c.ink;
            ctx.font = `700 ${TW * 0.075}px ${a.text}`;
            ctx.textBaseline = "middle";
            ctx.fillText(a.caption, pad + 4, pad + ph + (TH - pad - ph) / 2);
          }),
        ),
      }),
    ),
  );
  front.position.z = DEPTH / 2 + 0.013;

  const back = new Mesh(
    faceGeo,
    keep(
      new MeshStandardMaterial({
        roughness: 0.8,
        map: keep(
          texture(TW, TH, (ctx) => {
            ctx.fillStyle = c.surface;
            ctx.fillRect(0, 0, TW, TH);
            ctx.fillStyle = c.ink;
            ctx.textBaseline = "alphabetic";
            ctx.font = `800 ${TW * 0.2}px ${a.display}`;
            ctx.fillText("92%", pad * 1.4, TH * 0.32);
            ctx.font = `800 ${TW * 0.085}px ${a.display}`;
            ctx.fillText("match · great fit", pad * 1.4, TH * 0.42);
            // Three tiny category bars (Mint / Butter), like the results breakdown.
            [0.92, 0.8, 0.64].forEach((v, i) => {
              const y = TH * (0.55 + i * 0.12);
              roundRectPath(ctx, pad * 1.4, y, TW - pad * 2.8, TH * 0.05, 12);
              ctx.fillStyle = c.bg;
              ctx.fill();
              ctx.lineWidth = 5;
              ctx.strokeStyle = c.ink;
              ctx.stroke();
              roundRectPath(ctx, pad * 1.4, y, (TW - pad * 2.8) * v, TH * 0.05, 12);
              ctx.fillStyle = i === 1 ? c.highlight : c.fresh;
              ctx.fill();
              ctx.stroke();
            });
          }),
        ),
      }),
    ),
  );
  back.position.z = -(DEPTH / 2 + 0.013);
  back.rotation.y = Math.PI;

  // Slightly peeled corner (top right): an Oat Milk fold lifted off the face.
  const fold = new Shape();
  fold.moveTo(0, 0);
  fold.lineTo(-0.14, 0);
  fold.lineTo(0, -0.14);
  fold.closePath();
  const corner = new Mesh(
    keep(new ShapeGeometry(fold)),
    keep(new MeshStandardMaterial({ color: c.bg, roughness: 0.8 })),
  );
  corner.position.set(CARD_W / 2 - 0.005, CARD_H / 2 - 0.005, DEPTH / 2 + 0.02);
  corner.rotation.set(0.35, -0.35, 0);

  const flip = new Group();
  flip.add(hullOf(cardGeo, CARD_W, CARD_H), card, front, back, corner);
  const cardRoot = new Group();
  cardRoot.add(flip);
  const cardShadow = new Mesh(keep(new ShapeGeometry(roundedRect(CARD_W, CARD_H, 0.07))), ink);

  // "aww" bubble: Bubblegum with a little sheen.
  const BW = 0.9;
  const BH = 0.56;
  const bubbleGeo = keep(extrude(bubbleShape(BW, BH, 0.2), 0.08));
  const bubbleBody = new Mesh(bubbleGeo, keep(new MeshStandardMaterial({ color: c.bubble, roughness: 0.42 })));
  const bubbleText = new Mesh(
    keep(new PlaneGeometry(BW * 0.9, BH * 0.8)),
    keep(
      new MeshBasicMaterial({
        transparent: true,
        map: keep(
          texture(512, 320, (ctx) => {
            ctx.fillStyle = c.ink;
            ctx.font = `800 128px ${a.display}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("aww.", 256, 168);
          }),
        ),
      }),
    ),
  );
  bubbleText.position.z = 0.04 + 0.013;
  const bubble = new Group();
  bubble.add(hullOf(bubbleGeo, BW, BH), bubbleBody, bubbleText);
  const bubbleShadow = new Mesh(keep(new ShapeGeometry(bubbleShape(BW, BH, 0.2))), ink);

  // Sparkles (same colours as the poster).
  const sparkleGeo = keep(extrude(sparkleShape(), 0.04));
  const sparkles = [c.highlight, c.primary].map((color) => {
    const g = new Group();
    g.add(hullOf(sparkleGeo, 1, 1), new Mesh(sparkleGeo, keep(new MeshStandardMaterial({ color, roughness: 0.6 }))));
    return g;
  });

  scene.add(cardShadow, bubbleShadow, cardRoot, bubble, ...sparkles);

  // Layout from the panel size, matching the poster: polaroid top left, bubble right, sparkles.
  let vw = 1;
  let vh = 1;
  let cardY = 0;
  let bubbleY = 0;
  const layout = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    vw = vh * camera.aspect;
    const s = (0.74 * vh) / CARD_H;
    cardRoot.scale.setScalar(s);
    cardY = vh / 2 - vh * 0.1 - (CARD_H * s) / 2;
    cardRoot.position.set(-vw / 2 + vw * 0.1 + (CARD_W * s) / 2, cardY, 0);
    const bs = Math.min(vw * 0.36, vh * 0.42) / BW;
    bubble.scale.setScalar(bs);
    bubbleY = vh / 2 - vh * 0.5 - (BH * bs) / 2;
    bubble.position.set(vw / 2 - vw * 0.06 - (BW * bs) / 2, bubbleY, 0.4);
    sparkles[0]!.scale.setScalar(vh * 0.13);
    sparkles[0]!.position.set(vw / 2 - vw * 0.17, vh / 2 - vh * 0.16, 0.6);
    sparkles[1]!.scale.setScalar(vh * 0.09);
    sparkles[1]!.position.set(-vw / 2 + vw * 0.09, -vh / 2 + vh * 0.11, 0.6);
    cardShadow.scale.setScalar(s);
    bubbleShadow.scale.setScalar(bs);
    wake(1500);
  };

  // Springs: the flip (Y) settles with a little overshoot; the tilt follows the cursor.
  const flipS = { x: 0, v: 0, to: 0 };
  const tiltX = { x: 0, v: 0, to: 0 };
  const tiltY = { x: 0, v: 0, to: 0 };
  const step = (sp: typeof flipS, dt: number, k = 140, damp = 0.55) => {
    sp.v += (k * (sp.to - sp.x) - 2 * damp * Math.sqrt(k) * sp.v) * dt;
    sp.x += sp.v * dt;
  };
  const resting = (sp: typeof flipS) => Math.abs(sp.to - sp.x) < 1e-3 && Math.abs(sp.v) < 1e-3;

  // Render on demand: a few seconds of idle bob after load or any interaction, then sleep.
  let raf = 0;
  let last = 0;
  let awakeUntil = 0;
  let visible = true;
  let ready = false;
  const wake = (ms = 4000) => {
    awakeUntil = Math.max(awakeUntil, performance.now() + ms);
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
  };
  function tick(t: number) {
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60);
    last = t;
    for (const sp of [flipS, tiltX, tiltY]) step(sp, dt);
    const amp = Math.max(0, Math.min(1, (awakeUntil - t) / 1200));
    const sec = t / 1000;
    cardRoot.position.y = cardY + Math.sin(sec * 1.6) * vh * 0.012 * amp;
    bubble.position.y = bubbleY + Math.sin(sec * 1.6 + 1.2) * vh * 0.015 * amp;
    cardRoot.rotation.z = -0.105 + Math.sin(sec * 0.9) * 0.02 * amp;
    flip.rotation.set(tiltX.x, flipS.x + tiltY.x, 0);
    bubble.rotation.set(
      0,
      tiltY.x * 0.6 + Math.sin(sec * 1.1) * 0.08 * amp,
      0.1 + Math.sin(sec * 1.3 + 1) * 0.03 * amp,
    );
    sparkles.forEach((g, i) => {
      g.rotation.set(0, Math.sin(sec * 0.8 + i) * 0.4 * amp, Math.sin(sec * 0.6 + i * 2) * 0.25 * amp);
    });
    // Flat hard shadows, offset down-right; the card's narrows as it turns.
    const s = cardRoot.scale.x;
    cardShadow.position.set(cardRoot.position.x + 0.07 * s, cardRoot.position.y - 0.07 * s, -0.4);
    cardShadow.rotation.z = cardRoot.rotation.z;
    cardShadow.scale.x = s * Math.max(0.08, Math.abs(Math.cos(flipS.x + tiltY.x)));
    bubbleShadow.position.set(bubble.position.x + 0.05 * bubble.scale.x, bubble.position.y - 0.05 * bubble.scale.x, 0);
    bubbleShadow.rotation.z = bubble.rotation.z;

    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
      onReady();
    }
    const settled = resting(flipS) && resting(tiltX) && resting(tiltY);
    raf = t < awakeUntil || !settled ? requestAnimationFrame(tick) : 0;
    if (!raf) last = 0;
  }

  // Drag/swipe flips (horizontal only; vertical swipes still scroll the page). Release settles.
  let drag: { x: number; from: number } | null = null;
  const onDown = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    drag = { x: e.clientX, from: flipS.x };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
    wake();
  };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (drag) {
      flipS.to = Math.max(-Math.PI, Math.min(Math.PI, drag.from + ((e.clientX - drag.x) / r.width) * Math.PI * 2.2));
    } else if (e.pointerType === "mouse") {
      tiltY.to = ((e.clientX - r.left) / r.width - 0.5) * 0.45;
      tiltX.to = ((e.clientY - r.top) / r.height - 0.5) * 0.3;
    }
    wake();
  };
  const onUp = () => {
    drag = null;
    flipS.to = 0;
    canvas.style.cursor = "grab";
    wake();
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || drag) return;
    tiltX.to = 0;
    tiltY.to = 0;
    wake();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  // Pause off-screen and in hidden tabs.
  const io = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible) wake(1500);
  });
  io.observe(host);
  const onVisibility = () => !document.hidden && wake(1500);
  document.addEventListener("visibilitychange", onVisibility);
  const ro = new ResizeObserver(layout);
  ro.observe(host);

  const lost = (e: Event) => {
    e.preventDefault();
    dispose();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);

  layout();
  wake(6000);

  function dispose() {
    cancelAnimationFrame(raf);
    raf = 0;
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", lost);
    for (const d of disposables) d.dispose();
    pmrem.dispose();
    renderer.dispose();
    canvas.remove();
  }
  return { dispose };
}
