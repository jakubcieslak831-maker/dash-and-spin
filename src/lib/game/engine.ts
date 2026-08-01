/**
 * BladeRunEngine — Three.js tunnel-runner core.
 *
 * A ball travels down a cylindrical tunnel at a *constant* forward speed.
 * The player steers the ball around the inside of the tunnel (left/right) to
 * line it up with the gap in each spinning fan blade before reaching it.
 * Speed ramps up gradually in Endless and per-level in the Levels campaign.
 *
 * Reachability guarantee: blade angular speed is capped below the player's
 * maximum steering speed, and every gap is at least MIN_GAP_DEG wide, so
 * every obstacle is physically completable with careful steering.
 *
 * The engine is data-driven: obstacles implement the `Obstacle` interface so
 * future types (lasers, pistons, hammers…) can be added without touching the
 * core loop. Rotation modes ("linear" | "oscillate" | "static") give the
 * FanBlade a lot of behavioural variety on its own.
 */
import * as THREE from "three";
import { mulberry32 } from "./rng";
import type { SkinDef, TrailDef, ExplosionDef, ThemeDef } from "./cosmetics";

export type GameMode = "level" | "endless" | "daily";

export interface EngineConfig {
  mode: GameMode;
  seed: number;
  skin: SkinDef;
  trail: TrailDef;
  explosion: ExplosionDef;
  theme: ThemeDef;
  /** Levels mode: which level and its tuning (from getLevelConfig). */
  level?: number;
  blades?: number;
  speed?: number;
  difficulty?: number;
  /** Calmer visuals: skip screen shake and cut particle count. */
  reducedMotion?: boolean;
}

export interface HudState {
  timeLeft: number; // interpreted as elapsed time (count-up) for display
  elapsed: number;
  blade: number;
  totalBlades: number;
  coins: number;
}

export interface EngineCallbacks {
  onHud: (hud: HudState) => void;
  onCoin: () => void;
  onDash: () => void;
  onBladePass: (n: number) => void;
  onNearMiss: () => void;
  onDeath: (bladesPassed: number, coins: number) => void;
  onWin: (time: number, coins: number, blades: number) => void;
}

const TUNNEL_RADIUS = 3;
const BALL_RADIUS = 0.3;
/** radius the ball rides at, hugging the tunnel wall */
const RIDE_R = TUNNEL_RADIUS - BALL_RADIUS - 0.08;
const BLADE_SPACING = 14;
/** how far a horizontal drag pixel rotates the ball around the tunnel */
const STEER_SENSITIVITY = 0.014;
/** hard cap on blade angular speed — leaves headroom below player steering */
const MAX_BLADE_SPIN = 3.6; // rad/s (~206°/s)
/** absolute floor on gap width so every blade is completable */
const MIN_GAP_DEG = 55;

/** Radial-gradient sprite used for trail points so they render soft/circular
 *  (default THREE.Points squares are what caused the "cube-like" trail). */
let _softCircleTex: THREE.Texture | null = null;
function softCircleTexture(): THREE.Texture {
  if (_softCircleTex) return _softCircleTex;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.75)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _softCircleTex = new THREE.CanvasTexture(canvas);
  return _softCircleTex;
}


/** Minimal obstacle contract — makes new obstacle types trivial to add. */
interface Obstacle {
  z: number;
  index: number;
  group: THREE.Group;
  passed: boolean;
  update(dt: number, elapsed: number): void;
  /** Returns true if the ball at world angle `ballPhi` collides while crossing. */
  collides(ballPhi: number): boolean;
  /** Angular distance (radians) from the ball to the nearest gap edge (0 = dead center). */
  gapDistance(ballPhi: number): number;
  dispose(): void;
}

/** How a blade rotates over time. */
type RotMode = "linear" | "oscillate" | "static";

interface BladeSpec {
  gaps: { start: number; size: number }[]; // radians (start relative to blade rotation)
  mode: RotMode;
  speed: number; // rad/s (linear speed, or oscillation angular frequency)
  amp: number; // radians (oscillation amplitude when mode === "oscillate")
  startRot: number;
}

class FanBlade implements Obstacle {
  group = new THREE.Group();
  passed = false;
  private rot: number;
  private spec: BladeSpec;

  constructor(
    public z: number,
    public index: number,
    spec: BladeSpec,
    color: string,
    scene: THREE.Scene,
  ) {
    this.spec = spec;
    this.rot = spec.startRot;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.45,
      metalness: 0.7,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    // Build solid arcs between gaps
    const gaps = [...spec.gaps].sort((a, b) => a.start - b.start);
    for (let i = 0; i < gaps.length; i++) {
      const gapEnd = gaps[i].start + gaps[i].size;
      const nextStart = gaps[(i + 1) % gaps.length].start + (i + 1 >= gaps.length ? Math.PI * 2 : 0);
      const arcLen = nextStart - gapEnd;
      if (arcLen <= 0.02) continue;
      const geo = new THREE.RingGeometry(0.4, TUNNEL_RADIUS - 0.05, 24, 1, gapEnd, arcLen);
      const mesh = new THREE.Mesh(geo, mat);
      this.group.add(mesh);
    }
    // hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.24, 16).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: "#333333", metalness: 0.9, roughness: 0.2 }),
    );
    this.group.add(hub);
    this.group.position.z = z;
    this.group.rotation.z = this.rot;
    scene.add(this.group);
  }

  update(dt: number, elapsed: number) {
    if (this.spec.mode === "static") {
      // no change
    } else if (this.spec.mode === "oscillate") {
      this.rot = this.spec.startRot + Math.sin(elapsed * this.spec.speed + this.index) * this.spec.amp;
    } else {
      this.rot += this.spec.speed * dt;
    }
    this.group.rotation.z = this.rot;
  }

  private ballAngle() {
    return Math.asin(BALL_RADIUS / RIDE_R) * 1.1;
  }

  collides(ballPhi: number): boolean {
    const TWO_PI = Math.PI * 2;
    let local = (ballPhi - this.rot) % TWO_PI;
    if (local < 0) local += TWO_PI;
    const margin = this.ballAngle();
    for (const g of this.spec.gaps) {
      let gs = g.start % TWO_PI;
      if (gs < 0) gs += TWO_PI;
      let rel = (local - gs) % TWO_PI;
      if (rel < 0) rel += TWO_PI;
      if (rel > margin && rel < g.size - margin) return false; // safely inside a gap
    }
    return true;
  }

  /** Signed angular distance from the ball to the closest gap centre. */
  gapDistance(ballPhi: number): number {
    const TWO_PI = Math.PI * 2;
    let local = (ballPhi - this.rot) % TWO_PI;
    if (local < 0) local += TWO_PI;
    let best = Math.PI;
    for (const g of this.spec.gaps) {
      let gs = g.start % TWO_PI;
      if (gs < 0) gs += TWO_PI;
      const centre = (gs + g.size / 2) % TWO_PI;
      let d = Math.abs(local - centre);
      if (d > Math.PI) d = TWO_PI - d;
      if (d < best) best = d;
    }
    return best;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.group.removeFromParent();
  }
}

export class BladeRunEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private ball: THREE.Mesh;
  private ballLight: THREE.PointLight;
  private tunnel: THREE.Mesh;
  private chest: THREE.Group | null = null;
  private chestLid: THREE.Group | null = null;
  private chestLight: THREE.PointLight | null = null;
  private chestBeam: THREE.Mesh | null = null;
  private chestSparks: THREE.Points | null = null;
  private chestSparkPhase: Float32Array | null = null;
  private winT = 0;
  private winFired = false;
  private goldBurst: THREE.Points | null = null;
  private goldVel: THREE.Vector3[] = [];
  private obstacles: Obstacle[] = [];
  private coinMeshes: { mesh: THREE.Mesh; z: number; phi: number; taken: boolean }[] = [];
  private trailPoints: THREE.Points;
  private trailData: Float32Array;
  private trailColors: Float32Array;
  private trailIdx = 0;
  private explosionPoints: THREE.Points | null = null;
  private explosionVel: THREE.Vector3[] = [];


  private rng: () => number;
  private cfg: EngineConfig;
  private cb: EngineCallbacks;

  private ballZ = 8;
  /** ball world angle around the tunnel; -PI/2 is the bottom */
  private phi = -Math.PI / 2;
  private targetPhi = -Math.PI / 2;
  private speed = 6;
  private baseSpeed = 6;
  private elapsed = 0;
  private timeLimit: number;
  private bladesPassed = 0;
  private lastEmitPos = new THREE.Vector3(9999, 9999, 9999);
  private shieldAvailable = false;

  private totalBlades: number;
  private difficulty: number;
  private coins = 0;
  private steers = 0;
  private running = false;
  private dead = false;
  private won = false;
  private invulnT = 0;
  private shakeT = 0;
  private raf = 0;
  private lastT = 0;
  private finishZ: number;
  private nextEndlessIdx = 0;
  private hudAccum = 0;

  /** kept for stats compatibility (counts steer inputs) */
  get dashCount() {
    return this.steers;
  }

  constructor(canvas: HTMLCanvasElement, cfg: EngineConfig, cb: EngineCallbacks) {
    this.cfg = cfg;
    this.cb = cb;
    this.rng = mulberry32(cfg.seed);
    this.difficulty = cfg.difficulty ?? (cfg.mode === "daily" ? 1.25 : 1);
    this.baseSpeed = cfg.speed ?? (cfg.mode === "daily" ? 7 : 6.5);
    this.speed = this.baseSpeed;

    if (cfg.mode === "endless") {
      this.totalBlades = Infinity;
      this.finishZ = -Infinity;
    } else {
      this.totalBlades = cfg.blades ?? 15;
      this.finishZ = -((this.totalBlades + 1) * BLADE_SPACING + 6);
    }
    this.timeLimit = Infinity;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: window.devicePixelRatio < 2,
      powerPreference: "high-performance",
      stencil: false,
    });
    // cap DPR: sharp on phones, but never render more pixels than we need
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);


    this.camera = new THREE.PerspectiveCamera(72, canvas.clientWidth / canvas.clientHeight, 0.1, 120);

    const theme = cfg.theme;
    this.scene.fog = new THREE.Fog(new THREE.Color(theme.fog), 12, 70);
    this.scene.background = new THREE.Color(theme.fog);

    // Tunnel — inside-out cylinder
    const tunnelGeo = new THREE.CylinderGeometry(TUNNEL_RADIUS, TUNNEL_RADIUS, 400, 24, 80, true);
    tunnelGeo.rotateX(Math.PI / 2);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: theme.tunnel,
      side: THREE.BackSide,
      metalness: 0.3,
      roughness: 0.8,
    });
    this.tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    this.tunnel.position.z = -150;
    this.scene.add(this.tunnel);

    // Guide rings for depth perception
    const ringMat = new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.18 });
    for (let i = 0; i < 24; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(TUNNEL_RADIUS - 0.02, 0.03, 6, 40), ringMat);
      ring.position.z = -i * BLADE_SPACING - 8;
      this.scene.add(ring);
    }

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    this.ballLight = new THREE.PointLight(new THREE.Color(theme.accent), 14, 26);
    this.scene.add(this.ballLight);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(2, 5, 3);
    this.scene.add(dir);

    // Ball
    const skin = cfg.skin;
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 28, 20),
      new THREE.MeshStandardMaterial({
        color: skin.color,
        emissive: skin.emissive,
        emissiveIntensity: skin.sparkle ? 1.15 : 0.75,
        metalness: skin.metalness,
        roughness: skin.roughness,
      }),
    );
    this.scene.add(this.ball);

    // Trail — soft additive sprites, denser + interpolated for a smooth ribbon
    const TRAIL_N = 260;
    this.trailData = new Float32Array(TRAIL_N * 3).fill(9999);
    this.trailColors = new Float32Array(TRAIL_N * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(this.trailData, 3));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(this.trailColors, 3));
    const trailSize = 0.34 * (cfg.trail.size ?? 1);
    this.trailPoints = new THREE.Points(
      trailGeo,
      new THREE.PointsMaterial({
        size: trailSize,
        map: softCircleTexture(),
        transparent: true,
        opacity: cfg.trail.id === "none" ? 0 : 1,
        depthWrite: false,
        vertexColors: true,
        alphaTest: 0.01,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.trailPoints);

    // P2W skin effects
    this.shieldAvailable = cfg.skin.effect === "shield";

    this.buildLevel();

    if (cfg.mode !== "endless") this.buildChest();
  }

  /* ---------------- level generation ---------------- */

  private bladeSpec(i: number): BladeSpec {
    const r = this.rng;
    const d = this.difficulty;
    const slowmo = this.cfg.skin.effect === "slowmo" ? 0.85 : 1;
    const rawSpeed = (0.55 + i * 0.055) * d;
    const dirFlip = i >= 5 && r() < 0.4 ? -1 : 1;
    const roll = r();
    let mode: RotMode = "linear";
    let amp = 0;
    let speed = Math.min(MAX_BLADE_SPIN, rawSpeed) * dirFlip * slowmo;
    if (i >= 6 && roll < 0.18) {
      mode = "oscillate";
      amp = 0.9 + Math.min(1.4, i * 0.02);
      speed = (1.1 + Math.min(2.2, i * 0.03) * dirFlip) * slowmo;
    } else if (i >= 4 && roll < 0.26) {
      mode = "static";
      speed = 0;
    }
    const gapCount = i >= 8 && r() < 0.3 ? 2 : 1;
    const gapDeg = Math.max(MIN_GAP_DEG, 105 - i * 1.1 - (d - 1) * 18);
    const gapSize = THREE.MathUtils.degToRad(gapDeg) / (gapCount > 1 ? 1.6 : 1);
    const gaps: { start: number; size: number }[] = [];
    const first = r() * Math.PI * 2;
    for (let g = 0; g < gapCount; g++) {
      gaps.push({ start: first + (g * Math.PI * 2) / gapCount, size: gapSize });
    }
    return { gaps, mode, speed, amp, startRot: r() * Math.PI * 2 };
  }


  private addBlade(i: number) {
    const z = -(i + 1) * BLADE_SPACING;
    this.obstacles.push(new FanBlade(z, i, this.bladeSpec(i), this.cfg.theme.blade, this.scene));
    // coin between blades (60% chance), placed at a random angle to reward steering
    if (this.rng() < 0.6) {
      const phi = this.rng() * Math.PI * 2;
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: "#ffd700", emissive: "#aa7700", emissiveIntensity: 0.8, metalness: 1, roughness: 0.2 }),
      );
      const cz = z + BLADE_SPACING / 2;
      coin.position.set(RIDE_R * Math.cos(phi), RIDE_R * Math.sin(phi), cz);
      this.scene.add(coin);
      this.coinMeshes.push({ mesh: coin, z: cz, phi, taken: false });
    }
  }

  private buildLevel() {
    const initial = this.cfg.mode === "endless" ? 8 : this.totalBlades;
    for (let i = 0; i < initial; i++) this.addBlade(i);
    this.nextEndlessIdx = initial;
  }

  /**
   * A proper treasure chest: dark lacquered oak body, rounded gold-banded lid,
   * corner studs, a lock plate, a glowing halo ring behind it and a soft light
   * shaft. Floats in the middle of the tunnel so the run finishes head-on.
   */
  private buildChest() {
    const g = new THREE.Group();

    const wood = new THREE.MeshStandardMaterial({ color: "#5b3418", roughness: 0.55, metalness: 0.15 });
    const woodDark = new THREE.MeshStandardMaterial({ color: "#3d2210", roughness: 0.65, metalness: 0.1 });
    const gold = new THREE.MeshStandardMaterial({
      color: "#ffcf47",
      emissive: "#8a6100",
      emissiveIntensity: 0.55,
      metalness: 1,
      roughness: 0.22,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: "#ffd97a",
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const W = 1.7,
      H = 0.95,
      D = 1.15;

    // --- base ---
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wood);
    body.position.y = H / 2;
    g.add(body);

    // vertical plank grooves
    for (let i = -1; i <= 1; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.06, H * 0.98, D + 0.02), woodDark);
      plank.position.set(i * 0.45, H / 2, 0);
      g.add(plank);
    }

    // gold bands around the base
    for (const bx of [-W / 2 + 0.16, W / 2 - 0.16]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, H + 0.04, D + 0.04), gold);
      band.position.set(bx, H / 2, 0);
      g.add(band);
    }
    const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.1, D + 0.06), gold);
    rim.position.y = H;
    g.add(rim);

    // corner studs
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), gold);
        stud.position.set(sx * (W / 2 - 0.06), 0.16, sz * (D / 2 - 0.06));
        g.add(stud);
      }

    // --- lid (hinged group, pivots at the back edge) ---
    const lid = new THREE.Group();
    lid.position.set(0, H, -D / 2);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, W, 20, 1, false, 0, Math.PI), wood);
    shell.rotation.z = Math.PI / 2;
    shell.position.set(0, 0, D / 2);
    lid.add(shell);
    for (const bx of [-W / 2 + 0.16, W / 2 - 0.16]) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(D / 2 + 0.01, 0.045, 8, 20, Math.PI),
        gold,
      );
      arc.rotation.y = Math.PI / 2;
      arc.position.set(bx, 0, D / 2);
      lid.add(arc);
    }
    g.add(lid);
    this.chestLid = lid;

    // lock plate + keyhole
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.08), gold);
    lock.position.set(0, H - 0.14, D / 2 + 0.02);
    const keyhole = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), woodDark);
    keyhole.position.set(0, H - 0.14, D / 2 + 0.07);
    g.add(lock, keyhole);

    // --- treasure glow inside the chest ---
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), glowMat);
    inner.position.y = H - 0.05;
    inner.name = "innerGlow";
    g.add(inner);

    // halo ring behind the chest
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 8, 48), glowMat);
    halo.position.set(0, H / 2, -0.9);
    halo.name = "halo";
    g.add(halo);

    // soft light shaft rising out of the chest
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.05, 4.2, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#ffdb8a",
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    beam.position.y = H + 2.0;
    g.add(beam);
    this.chestBeam = beam;

    // orbiting sparkles
    const SP = this.cfg.reducedMotion ? 14 : 44;
    const spPos = new Float32Array(SP * 3);
    this.chestSparkPhase = new Float32Array(SP * 3);
    for (let i = 0; i < SP; i++) {
      this.chestSparkPhase[i * 3] = Math.random() * Math.PI * 2; // angle
      this.chestSparkPhase[i * 3 + 1] = 0.9 + Math.random() * 1.2; // radius
      this.chestSparkPhase[i * 3 + 2] = Math.random() * 2.4; // height offset
    }
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
    this.chestSparks = new THREE.Points(
      spGeo,
      new THREE.PointsMaterial({
        color: "#ffe6a3",
        size: 0.13,
        map: softCircleTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    g.add(this.chestSparks);

    // pedestal ring the chest floats above
    const pad = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 40), gold);
    pad.rotation.x = Math.PI / 2;
    pad.position.y = -0.25;
    g.add(pad);

    g.position.set(0, -0.4, this.finishZ + 3);
    const light = new THREE.PointLight(0xffce55, 26, 24, 2);
    light.position.set(0, 1.2, 1.6);
    g.add(light);
    this.chestLight = light;

    this.scene.add(g);
    this.chest = g;
  }


  /* ---------------- public controls ---------------- */

  start() {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - this.lastT) / 1000);
      this.lastT = t;
      if (this.running && !this.dead && !this.won) this.step(dt);
      this.render(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.running = false;
  }

  resume() {
    if (this.dead || this.won) return;
    this.running = true;
    this.lastT = performance.now();
  }

  /** Steer the ball around the tunnel. `dx` is a horizontal drag delta (px). */
  steer(dx: number) {
    if (!this.running || this.dead || this.won) return;
    if (dx === 0) return;
    this.targetPhi += dx * STEER_SENSITIVITY;
    this.steers++;
    this.cb.onDash();
  }

  /** Revive after death (rewarded-ad continue): brief invulnerability. */
  revive() {
    this.dead = false;
    this.invulnT = 2.2;
    this.ball.visible = true;
    this.running = true;
    this.lastT = performance.now();
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.obstacles.forEach((o) => o.dispose());
    this.renderer.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        const m = o.material as THREE.Material | THREE.Material[];
        Array.isArray(m) ? m.forEach((x) => x.dispose()) : m.dispose();
      }
    });
  }

  /* ---------------- simulation ---------------- */

  private step(dt: number) {
    this.elapsed += dt;
    if (this.invulnT > 0) this.invulnT -= dt;

    // endless gets gradually faster; levels use a fixed per-level speed
    const endlessBoost = this.cfg.mode === "endless" ? Math.min(5, this.bladesPassed * 0.11) : 0;
    this.speed = this.baseSpeed + endlessBoost;
    this.ballZ -= this.speed * dt;

    // smoother steering follow — softer lerp than snap-to-target
    const followK = 1 - Math.pow(0.008, dt);
    this.phi += (this.targetPhi - this.phi) * followK;


    // endless difficulty ramps gently with distance and stays reachable
    if (this.cfg.mode === "endless") {
      this.difficulty = 1 + Math.min(1.4, this.bladesPassed * 0.022);
    }

    // obstacles
    for (const o of this.obstacles) {
      o.update(dt, this.elapsed);
      if (!o.passed && this.ballZ - BALL_RADIUS < o.z + 0.2 && this.ballZ + BALL_RADIUS > o.z - 0.35) {
        if (this.invulnT <= 0 && o.collides(this.phi)) {
          this.die();
          return;
        }
      }
      if (!o.passed && this.ballZ < o.z - 0.5) {
        o.passed = true;
        this.bladesPassed = o.index + 1;
        // near-miss detection: within ~13° of a gap edge counts
        const d = o.gapDistance(this.phi);
        if (d < 0.22) {
          this.coins += 1;
          this.cb.onNearMiss();
        }
        this.cb.onBladePass(this.bladesPassed);
        if (this.cfg.mode === "endless") {
          this.coins += 2;
          this.addBlade(this.nextEndlessIdx++);
        }
      }
    }
    // cull passed endless obstacles far behind
    if (this.cfg.mode === "endless") {
      while (this.obstacles.length && this.obstacles[0].z > this.ballZ + 30) {
        this.obstacles.shift()!.dispose();
      }
    }

    // coins — magnet skin widens the pickup radius; lucky skin adds bonus
    const ballX = RIDE_R * Math.cos(this.phi);
    const ballY = RIDE_R * Math.sin(this.phi);
    const isMagnet = this.cfg.skin.effect === "magnet";
    const isLucky = this.cfg.skin.effect === "lucky";
    const rZ = isMagnet ? 1.9 : 0.7;
    const rXY = isMagnet ? 2.0 : 0.9;
    for (const c of this.coinMeshes) {
      if (!c.taken) {
        c.mesh.rotation.z += 4 * dt;
        if (Math.abs(this.ballZ - c.z) < rZ) {
          const dx = ballX - c.mesh.position.x;
          const dy = ballY - c.mesh.position.y;
          if (dx * dx + dy * dy < rXY * rXY) {
            c.taken = true;
            c.mesh.visible = false;
            this.coins += isLucky ? 6 : 5;
            this.cb.onCoin();
          }
        }
      }
    }


    // win — kick off the chest-opening celebration; onWin fires when it ends
    if (this.cfg.mode !== "endless" && this.ballZ <= this.finishZ + 3.2) {
      this.won = true;
      this.winT = 0;
      this.winFired = false;
      this.cb.onHud({
        timeLeft: this.elapsed,
        elapsed: this.elapsed,
        blade: this.totalBlades,
        totalBlades: this.totalBlades,
        coins: this.coins,
      });
      return;
    }


    // HUD throttle (~8/s)
    this.hudAccum += dt;
    if (this.hudAccum > 0.12) {
      this.hudAccum = 0;
      this.cb.onHud({
        timeLeft: this.elapsed,
        elapsed: this.elapsed,
        blade: this.bladesPassed,
        totalBlades: this.cfg.mode === "endless" ? -1 : this.totalBlades,
        coins: this.coins,
      });
    }
  }

  private die() {
    // Shield skin auto-revives once
    if (this.shieldAvailable) {
      this.shieldAvailable = false;
      this.invulnT = 2.0;
      return;
    }
    this.dead = true;
    this.shakeT = this.cfg.reducedMotion ? 0 : 0.5;
    this.ball.visible = false;
    this.spawnExplosion();
    this.cb.onDeath(this.bladesPassed, this.coins);
  }


  private spawnExplosion() {
    const N = this.cfg.reducedMotion ? 18 : 70;
    const pos = new Float32Array(N * 3);
    this.explosionVel = [];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = this.ball.position.x;
      pos[i * 3 + 1] = this.ball.position.y;
      pos[i * 3 + 2] = this.ball.position.z;
      this.explosionVel.push(
        new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 7, (Math.random() - 0.3) * 8),
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const colors = this.cfg.explosion.colors;
    this.explosionPoints = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: colors[0],
        size: 0.18,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.explosionPoints);
  }

  /* ---------------- rendering ---------------- */

  private render(dt: number) {
    // ball placement around the tunnel + rolling
    const x = RIDE_R * Math.cos(this.phi);
    const y = RIDE_R * Math.sin(this.phi);
    this.ball.position.set(x, y, this.ballZ);
    this.ball.rotation.x -= (this.speed / BALL_RADIUS) * dt;
    this.ballLight.position.set(x * 0.6, y * 0.6, this.ballZ + 1);

    // invulnerability blink
    if (this.invulnT > 0) this.ball.visible = Math.floor(this.invulnT * 10) % 2 === 0;
    else if (!this.dead) this.ball.visible = true;

    // trail — emit multiple interpolated points between frames for smoothness
    if (this.running && !this.dead && this.cfg.trail.id !== "none") {
      const N = this.trailData.length / 3;
      const c1 = new THREE.Color(this.cfg.trail.color);
      const c2 = new THREE.Color(this.cfg.trail.color2 ?? this.cfg.trail.color);
      const cur = new THREE.Vector3(x, y, this.ballZ + 0.24);
      const prev = this.lastEmitPos.x === 9999 ? cur : this.lastEmitPos;
      const dist = prev.distanceTo(cur);
      const maxSteps = this.cfg.reducedMotion ? 3 : 8;
      const steps = Math.max(1, Math.min(maxSteps, Math.ceil(dist / 0.09)));
      for (let k = 1; k <= steps; k++) {
        const tt = k / steps;
        const i = this.trailIdx++ % N;
        this.trailData[i * 3] = prev.x + (cur.x - prev.x) * tt;
        this.trailData[i * 3 + 1] = prev.y + (cur.y - prev.y) * tt;
        this.trailData[i * 3 + 2] = prev.z + (cur.z - prev.z) * tt;
        const mix = ((this.trailIdx * 0.06) % 1) < 0.5;
        const c = mix ? c1 : c2;
        this.trailColors[i * 3] = c.r;
        this.trailColors[i * 3 + 1] = c.g;
        this.trailColors[i * 3 + 2] = c.b;
      }
      this.lastEmitPos.copy(cur);
      (this.trailPoints.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (this.trailPoints.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
    }


    // explosion particles
    if (this.explosionPoints) {
      const attr = this.explosionPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < this.explosionVel.length; i++) {
        const v = this.explosionVel[i];
        v.y -= 9.8 * dt;
        attr.setXYZ(i, attr.getX(i) + v.x * dt, attr.getY(i) + v.y * dt, attr.getZ(i) + v.z * dt);
      }
      attr.needsUpdate = true;
      const mat = this.explosionPoints.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, mat.opacity - dt * 1.2);
    }

    // chest idle bob
    if (this.chest) this.chest.rotation.y += dt * 0.8;

    // tunnel follows ball so it never ends
    this.tunnel.position.z = this.ballZ - 150;

    // camera: centered behind, leaning slightly toward the ball, + shake
    let sx = 0,
      sy = 0;
    if (this.shakeT > 0 && !this.cfg.reducedMotion) {
      this.shakeT -= dt;
      const s = this.shakeT * 0.5;
      sx = (Math.random() - 0.5) * s;
      sy = (Math.random() - 0.5) * s;
    }
    const target = new THREE.Vector3(x * 0.25 + sx, y * 0.25 + sy, this.ballZ + 5.2);
    this.camera.position.lerp(target, 1 - Math.pow(0.0001, dt));
    this.camera.lookAt(x * 0.15, y * 0.15, this.ballZ - 8);

    this.renderer.render(this.scene, this.camera);
  }
}
