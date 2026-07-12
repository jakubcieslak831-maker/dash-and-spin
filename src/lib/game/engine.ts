/**
 * BladeRunEngine — Three.js tunnel-runner core.
 *
 * A ball auto-rolls down a cylindrical tunnel; spinning fan blades block the
 * way, each with one or more gaps. The player taps to dash forward and time
 * their way through the gap as it sweeps past the bottom of the tunnel.
 *
 * The engine is fully data-driven: obstacles implement the `Obstacle`
 * interface so future types (lasers, pistons, hammers…) can be added without
 * touching the core loop.
 */
import * as THREE from "three";
import { mulberry32 } from "./rng";
import type { SkinDef, TrailDef, ExplosionDef, ThemeDef } from "./cosmetics";

export type GameMode = "classic" | "endless" | "daily";

export interface EngineConfig {
  mode: GameMode;
  seed: number;
  skin: SkinDef;
  trail: TrailDef;
  explosion: ExplosionDef;
  theme: ThemeDef;
}

export interface HudState {
  timeLeft: number;
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
  onDeath: (bladesPassed: number, coins: number) => void;
  onWin: (time: number, coins: number) => void;
}

const TUNNEL_RADIUS = 3;
const BALL_RADIUS = 0.28;
const BLADE_SPACING = 16;
const BASE_SPEED = 5.5;
const DASH_SPEED = 26;
const DASH_TIME = 0.32;

/** Minimal obstacle contract — makes new obstacle types trivial to add. */
interface Obstacle {
  z: number;
  index: number;
  group: THREE.Group;
  passed: boolean;
  update(dt: number, elapsed: number): void;
  /** Returns true if the ball (at bottom of tunnel) collides while crossing. */
  collides(): boolean;
  dispose(): void;
}

interface BladeSpec {
  gaps: { start: number; size: number }[]; // radians
  speed: number; // rad/s (sign = direction)
  wobble: number; // 0..1 — speed oscillation intensity
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
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.35,
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
    let speed = this.spec.speed;
    if (this.spec.wobble > 0) {
      // slow-down-then-accelerate pattern
      speed *= 1 + this.spec.wobble * Math.sin(elapsed * 1.7 + this.index);
    }
    this.rot += speed * dt;
    this.group.rotation.z = this.rot;
  }

  collides(): boolean {
    // Ball sits at the bottom of the tunnel → world angle -PI/2.
    // Convert into blade-local angle and test against gaps.
    const TWO_PI = Math.PI * 2;
    let local = (-Math.PI / 2 - this.rot) % TWO_PI;
    if (local < 0) local += TWO_PI;
    // angular half-width of the ball at its radial distance
    const ballAngle = Math.asin(BALL_RADIUS / (TUNNEL_RADIUS - BALL_RADIUS)) * 1.15;
    for (const g of this.spec.gaps) {
      let gs = g.start % TWO_PI;
      if (gs < 0) gs += TWO_PI;
      const margin = ballAngle;
      // is `local` inside [gs+margin, gs+size-margin] (mod 2π)?
      let rel = (local - gs) % TWO_PI;
      if (rel < 0) rel += TWO_PI;
      if (rel > margin && rel < g.size - margin) return false;
    }
    return true;
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
  private obstacles: Obstacle[] = [];
  private coinMeshes: { mesh: THREE.Mesh; z: number; taken: boolean }[] = [];
  private trailPoints: THREE.Points;
  private trailData: Float32Array;
  private trailIdx = 0;
  private explosionPoints: THREE.Points | null = null;
  private explosionVel: THREE.Vector3[] = [];

  private rng: () => number;
  private cfg: EngineConfig;
  private cb: EngineCallbacks;

  private ballZ = 8;
  private speed = BASE_SPEED;
  private dashT = 0;
  private elapsed = 0;
  private timeLimit: number;
  private bladesPassed = 0;
  private totalBlades: number;
  private coins = 0;
  private dashes = 0;
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

  get dashCount() {
    return this.dashes;
  }

  constructor(canvas: HTMLCanvasElement, cfg: EngineConfig, cb: EngineCallbacks) {
    this.cfg = cfg;
    this.cb = cb;
    this.rng = mulberry32(cfg.seed);
    this.totalBlades = cfg.mode === "endless" ? Infinity : 15;
    this.timeLimit = cfg.mode === "endless" ? Infinity : cfg.mode === "daily" ? 70 : 75;
    this.finishZ = cfg.mode === "endless" ? -Infinity : -(15 * BLADE_SPACING + 14);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    this.camera = new THREE.PerspectiveCamera(72, canvas.clientWidth / canvas.clientHeight, 0.1, 120);

    const theme = cfg.theme;
    this.scene.fog = new THREE.Fog(new THREE.Color(theme.fog), 12, 70);
    this.scene.background = new THREE.Color(theme.fog);

    // Tunnel — inside-out cylinder with subtle rings
    const tunnelGeo = new THREE.CylinderGeometry(TUNNEL_RADIUS, TUNNEL_RADIUS, 400, 24, 80, true);
    tunnelGeo.rotateX(Math.PI / 2);
    const tunnelMat = new THREE.MeshStandardMaterial({
      color: theme.tunnel,
      side: THREE.BackSide,
      metalness: 0.3,
      roughness: 0.8,
      wireframe: false,
    });
    this.tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    this.tunnel.position.z = -150;
    this.scene.add(this.tunnel);

    // Guide rings every BLADE_SPACING for depth perception
    const ringMat = new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.16 });
    for (let i = 0; i < 24; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(TUNNEL_RADIUS - 0.02, 0.03, 6, 40), ringMat);
      ring.position.z = -i * BLADE_SPACING - 8;
      this.scene.add(ring);
    }

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    this.ballLight = new THREE.PointLight(new THREE.Color(theme.accent), 12, 24);
    this.scene.add(this.ballLight);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(2, 5, 3);
    this.scene.add(dir);

    // Ball
    const skin = cfg.skin;
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 24, 18),
      new THREE.MeshStandardMaterial({
        color: skin.color,
        emissive: skin.emissive,
        emissiveIntensity: 0.8,
        metalness: skin.metalness,
        roughness: skin.roughness,
      }),
    );
    this.scene.add(this.ball);

    // Trail particles (ring buffer)
    const TRAIL_N = 80;
    this.trailData = new Float32Array(TRAIL_N * 3).fill(9999);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(this.trailData, 3));
    this.trailPoints = new THREE.Points(
      trailGeo,
      new THREE.PointsMaterial({
        color: cfg.trail.color,
        size: 0.14,
        transparent: true,
        opacity: cfg.trail.id === "none" ? 0 : 0.8,
        depthWrite: false,
      }),
    );
    this.scene.add(this.trailPoints);

    this.buildLevel();
    if (cfg.mode !== "endless") this.buildChest();
  }

  /* ---------------- level generation ---------------- */

  private bladeSpec(i: number): BladeSpec {
    const r = this.rng;
    const difficulty = this.cfg.mode === "daily" ? 1.25 : 1;
    // speed ramps up with index; later blades may reverse & wobble
    const base = (0.9 + i * 0.16) * difficulty;
    const dirFlip = i >= 6 && r() < 0.35 ? -1 : 1;
    const gapCount = i >= 10 && r() < 0.4 ? 2 : 1;
    // gaps shrink from ~95° to ~48°
    const gapSize = THREE.MathUtils.degToRad(Math.max(46, 95 - i * 3.2) / gapCount / (gapCount > 1 ? 0.8 : 1));
    const gaps: { start: number; size: number }[] = [];
    const first = r() * Math.PI * 2;
    for (let g = 0; g < gapCount; g++) {
      gaps.push({ start: first + (g * Math.PI * 2) / gapCount, size: gapSize });
    }
    return {
      gaps,
      speed: base * dirFlip,
      wobble: i >= 8 && r() < 0.4 ? 0.45 : 0,
      startRot: r() * Math.PI * 2,
    };
  }

  private addBlade(i: number) {
    const z = -(i + 1) * BLADE_SPACING;
    this.obstacles.push(new FanBlade(z, i, this.bladeSpec(i), this.cfg.theme.blade, this.scene));
    // coin between blades (60% chance)
    if (this.rng() < 0.6) {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16).rotateZ(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: "#ffd700", emissive: "#aa7700", emissiveIntensity: 0.7, metalness: 1, roughness: 0.2 }),
      );
      coin.position.set(0, -(TUNNEL_RADIUS - 0.6), z + BLADE_SPACING / 2);
      this.scene.add(coin);
      this.coinMeshes.push({ mesh: coin, z: coin.position.z, taken: false });
    }
  }

  private buildLevel() {
    const initial = this.cfg.mode === "endless" ? 8 : 15;
    for (let i = 0; i < initial; i++) this.addBlade(i);
    this.nextEndlessIdx = initial;
  }

  private buildChest() {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: "#8b5a2b", roughness: 0.7 });
    const gold = new THREE.MeshStandardMaterial({ color: "#ffd700", emissive: "#886600", emissiveIntensity: 0.6, metalness: 1, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1), wood);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1), wood);
    lid.position.y = 0.7;
    lid.rotation.x = -0.5;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), gold);
    glow.position.y = 0.7;
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 0.2), gold);
    g.add(body, lid, glow, band);
    g.position.set(0, -(TUNNEL_RADIUS - 0.7), this.finishZ - 2);
    const light = new THREE.PointLight(0xffd700, 20, 18);
    light.position.copy(g.position).add(new THREE.Vector3(0, 1, 2));
    this.scene.add(g, light);
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

  dash() {
    if (!this.running || this.dead || this.won) return;
    this.dashT = DASH_TIME;
    this.dashes++;
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

    // endless gets gradually faster
    const endlessBoost = this.cfg.mode === "endless" ? Math.min(4, this.bladesPassed * 0.12) : 0;
    let v = BASE_SPEED + endlessBoost;
    if (this.dashT > 0) {
      this.dashT -= dt;
      v = DASH_SPEED + endlessBoost;
    }
    this.speed = v;
    this.ballZ -= v * dt;

    // obstacles
    for (const o of this.obstacles) {
      o.update(dt, this.elapsed);
      if (!o.passed && this.ballZ - BALL_RADIUS < o.z + 0.15 && this.ballZ + BALL_RADIUS > o.z - 0.35) {
        if (this.invulnT <= 0 && o.collides()) {
          this.die();
          return;
        }
      }
      if (!o.passed && this.ballZ < o.z - 0.5) {
        o.passed = true;
        this.bladesPassed = o.index + 1;
        this.cb.onBladePass(this.bladesPassed);
        if (this.cfg.mode === "endless") {
          this.coins += 2;
          // spawn ahead, cull behind
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

    // coins
    for (const c of this.coinMeshes) {
      if (!c.taken) {
        c.mesh.rotation.y += 4 * dt;
        if (Math.abs(this.ballZ - c.z) < 0.7) {
          c.taken = true;
          c.mesh.visible = false;
          this.coins += 5;
          this.cb.onCoin();
        }
      }
    }

    // win
    if (this.ballZ <= this.finishZ) {
      this.won = true;
      this.cb.onWin(this.elapsed, this.coins);
      return;
    }

    // timer
    if (this.timeLimit !== Infinity && this.elapsed >= this.timeLimit) {
      this.die();
      return;
    }

    // HUD throttle (~8/s)
    this.hudAccum += dt;
    if (this.hudAccum > 0.12) {
      this.hudAccum = 0;
      this.cb.onHud({
        timeLeft: this.timeLimit === Infinity ? this.elapsed : Math.max(0, this.timeLimit - this.elapsed),
        elapsed: this.elapsed,
        blade: this.bladesPassed,
        totalBlades: this.cfg.mode === "endless" ? -1 : 15,
        coins: this.coins,
      });
    }
  }

  private die() {
    this.dead = true;
    this.shakeT = 0.5;
    this.ball.visible = false;
    this.spawnExplosion();
    this.cb.onDeath(this.bladesPassed, this.coins);
  }

  private spawnExplosion() {
    const N = 60;
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
      new THREE.PointsMaterial({ color: colors[0], size: 0.16, transparent: true, opacity: 1, depthWrite: false }),
    );
    this.scene.add(this.explosionPoints);
  }

  /* ---------------- rendering ---------------- */

  private render(dt: number) {
    // ball placement + rolling
    const y = -(TUNNEL_RADIUS - BALL_RADIUS - 0.02);
    this.ball.position.set(0, y, this.ballZ);
    this.ball.rotation.x -= (this.speed / BALL_RADIUS) * dt;
    this.ballLight.position.set(0, y + 1.4, this.ballZ + 1);

    // invulnerability blink
    if (this.invulnT > 0) this.ball.visible = Math.floor(this.invulnT * 10) % 2 === 0;
    else if (!this.dead) this.ball.visible = true;

    // trail ring buffer
    if (this.running && !this.dead && this.cfg.trail.id !== "none") {
      const i = this.trailIdx++ % (this.trailData.length / 3);
      this.trailData[i * 3] = (Math.random() - 0.5) * 0.15;
      this.trailData[i * 3 + 1] = y + (Math.random() - 0.5) * 0.15;
      this.trailData[i * 3 + 2] = this.ballZ + 0.25;
      (this.trailPoints.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
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

    // camera: smooth follow + shake
    let sx = 0,
      sy = 0;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeT * 0.5;
      sx = (Math.random() - 0.5) * s;
      sy = (Math.random() - 0.5) * s;
    }
    const target = new THREE.Vector3(sx, y + 1.5 + sy, this.ballZ + 4.6);
    this.camera.position.lerp(target, 1 - Math.pow(0.0001, dt));
    this.camera.lookAt(0, y + 0.6, this.ballZ - 6);

    this.renderer.render(this.scene, this.camera);
  }
}
