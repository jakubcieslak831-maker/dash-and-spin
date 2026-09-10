import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  skinById as getSkin,
  trailById as getTrail,
  themeById as getTheme,
  explosionById as getExplosion,
} from "@/lib/game/cosmetics";

interface Props {
  skinId: string;
  trailId: string;
  themeId: string;
  explosionId?: string;
  /** Full preview: adds spinning blades, coins and a looping explosion demo. */
  full?: boolean;
  className?: string;
}

/**
 * Live 3D preview of the currently selected ball skin + trail inside the
 * selected tunnel theme. In `full` mode it recreates a slice of real gameplay
 * (blades, coins, explosion) so players see exactly what they're buying.
 */
export function CosmeticPreview({ skinId, trailId, themeId, explosionId = "burst", full = false, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfg = useRef({ skinId, trailId, themeId, explosionId });
  cfg.current = { skinId, trailId, themeId, explosionId };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(full ? 62 : 45, 1, 0.1, 60);
    camera.position.set(0, 0.7, full ? 6 : 5.2);
    camera.lookAt(0, 0, full ? -2 : 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 4, 5);
    scene.add(key);
    const ballLight = new THREE.PointLight(0xffffff, 12, 12);
    scene.add(ballLight);

    // tunnel ring backdrop
    const RING_COUNT = full ? 12 : 7;
    const RING_GAP = 2.2;
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.4, roughness: 0.5 });
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.035, 6, 48), ringMat);
      r.position.z = -i * RING_GAP;
      scene.add(r);
      rings.push(r);
    }

    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), ballMat);
    scene.add(ball);

    // ---- full-mode gameplay props: blades + coins ----
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff2266, emissive: 0xff2266, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.25 });
    const blades: THREE.Group[] = [];
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xaa7700, emissiveIntensity: 0.6, metalness: 1, roughness: 0.2 });
    const coins: THREE.Mesh[] = [];
    if (full) {
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        for (let a = 0; a < 3; a++) {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 0.09), bladeMat);
          arm.position.x = 1.05;
          const holder = new THREE.Group();
          holder.rotation.z = (a / 3) * Math.PI * 2;
          holder.add(arm);
          g.add(holder);
        }
        g.position.z = -4 - i * 5;
        g.userData.spin = 0.9 + i * 0.25 * (i % 2 ? -1 : 1);
        scene.add(g);
        blades.push(g);
      }
      for (let i = 0; i < 8; i++) {
        const c = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 18), coinMat);
        c.position.set(Math.sin(i * 1.7) * 1.4, Math.cos(i * 1.3) * 1.1, -3 - i * 3.1);
        scene.add(c);
        coins.push(c);
      }
    }

    // ---- explosion demo particles (full mode) ----
    const EXP_N = 90;
    const expPos = new Float32Array(EXP_N * 3);
    const expColArr = new Float32Array(EXP_N * 3);
    const expGeo = new THREE.BufferGeometry();
    expGeo.setAttribute("position", new THREE.BufferAttribute(expPos, 3));
    expGeo.setAttribute("color", new THREE.BufferAttribute(expColArr, 3));
    const expMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const expPoints = new THREE.Points(expGeo, expMat);
    expPoints.visible = false;
    scene.add(expPoints);
    const expVel: THREE.Vector3[] = [];
    let expT = 0;
    let nextBoom = 4.5;

    const boom = (x: number, y: number) => {
      const def = getExplosion(cfg.current.explosionId);
      expVel.length = 0;
      for (let i = 0; i < EXP_N; i++) {
        expPos[i * 3] = x;
        expPos[i * 3 + 1] = y;
        expPos[i * 3 + 2] = 0;
        const col = new THREE.Color(def.colors[i % def.colors.length]);
        expColArr[i * 3] = col.r;
        expColArr[i * 3 + 1] = col.g;
        expColArr[i * 3 + 2] = col.b;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        const sp = 1.6 + Math.random() * 3.2;
        expVel.push(new THREE.Vector3(Math.sin(ph) * Math.cos(th) * sp, Math.sin(ph) * Math.sin(th) * sp, Math.cos(ph) * sp * 0.6));
      }
      expGeo.attributes.position.needsUpdate = true;
      expGeo.attributes.color.needsUpdate = true;
      expPoints.visible = true;
      expMat.opacity = 1;
      expT = 0;
    };

    // trail: sprite pool following the ball
    const COUNT = full ? 90 : 46;
    const canvasTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const trail: THREE.Sprite[] = [];
    for (let i = 0; i < COUNT; i++) {
      const m = new THREE.SpriteMaterial({
        map: canvasTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const s = new THREE.Sprite(m);
      s.visible = false;
      scene.add(s);
      trail.push(s);
    }
    let head = 0;

    let lastSkin = "";
    let lastTheme = "";
    let lastTrail = "";
    const c1 = new THREE.Color();
    const c2 = new THREE.Color();

    const applyCosmetics = () => {
      const { skinId: sk, trailId: tr, themeId: th } = cfg.current;
      if (sk !== lastSkin) {
        lastSkin = sk;
        const skin = getSkin(sk);
        ballMat.color.set(skin.color);
        ballMat.emissive.set(skin.emissive);
        ballMat.emissiveIntensity = skin.sparkle ? 1.5 : 0.8;
        ballMat.metalness = skin.metalness;
        ballMat.roughness = skin.roughness;
        ballLight.color.set(skin.emissive === "#000000" ? skin.color : skin.emissive);
      }
      if (th !== lastTheme) {
        lastTheme = th;
        const theme = getTheme(th);
        scene.background = new THREE.Color(theme.fog);
        scene.fog = new THREE.Fog(new THREE.Color(theme.fog), full ? 10 : 6, full ? 34 : 20);
        ringMat.color.set(theme.tunnel);
        ringMat.emissive = new THREE.Color(theme.accent);
        ringMat.emissiveIntensity = 0.25;
        bladeMat.color.set(theme.blade);
        bladeMat.emissive.set(theme.blade);
      }
      if (tr !== lastTrail) {
        lastTrail = tr;
        const t = getTrail(tr);
        c1.set(t.color);
        c2.set(t.color2 ?? t.color);
        trail.forEach((s) => (s.visible = false));
      }
    };

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let t = 0;
    let last = performance.now();
    const tmp = new THREE.Color();
    const speed = full ? 7.5 : 2.2;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      applyCosmetics();

      const trailDef = getTrail(cfg.current.trailId);
      // ball weaves through the tunnel like a real run
      const x = Math.sin(t * (full ? 0.9 : 1.1)) * (full ? 1.5 : 1.25);
      const y = Math.sin(t * (full ? 1.6 : 2.2)) * (full ? 1.1 : 0.5);
      ball.position.set(x, y, 0);
      ball.rotation.x -= dt * 2.4;
      ball.rotation.y -= dt * 1.1;
      ballLight.position.set(x, y, 0.9);

      if (trailDef.id !== "none") {
        for (let i = 0; i < 2; i++) {
          const s = trail[head % COUNT];
          head++;
          s.position.set(x, y, -0.05 - i * 0.02);
          s.userData.age = 0;
          s.visible = true;
        }
      }
      for (const s of trail) {
        if (!s.visible) continue;
        s.userData.age = (s.userData.age ?? 0) + dt;
        const a = s.userData.age as number;
        const life = full ? 1.1 : 0.85;
        if (a > life) {
          s.visible = false;
          continue;
        }
        const k = 1 - a / life;
        const mat = s.material as THREE.SpriteMaterial;
        mat.opacity = k * 0.85;
        tmp.copy(c1).lerp(c2, 1 - k);
        mat.color.copy(tmp);
        const size = 0.55 * k * (trailDef.size ?? 1);
        s.scale.set(size, size, size);
        if (full) s.position.z += speed * dt * 0.35;
      }

      for (const r of rings) {
        r.position.z += dt * speed;
        if (r.position.z > RING_GAP) r.position.z -= RING_COUNT * RING_GAP;
      }
      for (const b of blades) {
        b.position.z += dt * speed;
        b.rotation.z += dt * (b.userData.spin as number);
        if (b.position.z > 3) b.position.z -= 25;
      }
      for (const c of coins) {
        c.position.z += dt * speed;
        c.rotation.y += dt * 3;
        if (c.position.z > 3) c.position.z -= 26;
      }

      // looping explosion demo
      if (full) {
        nextBoom -= dt;
        if (nextBoom <= 0) {
          nextBoom = 4.5;
          boom(x, y);
        }
        if (expPoints.visible) {
          expT += dt;
          const pos = expGeo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < EXP_N; i++) {
            pos.array[i * 3] += expVel[i].x * dt;
            pos.array[i * 3 + 1] += expVel[i].y * dt - 0.6 * dt * expT;
            pos.array[i * 3 + 2] += expVel[i].z * dt;
          }
          pos.needsUpdate = true;
          expMat.opacity = Math.max(0, 1 - expT / 1.2);
          if (expT > 1.2) expPoints.visible = false;
        }
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvasTex.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite || o instanceof THREE.Points) {
          (o as THREE.Mesh).geometry?.dispose?.();
          const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[];
          Array.isArray(m) ? m.forEach((x) => x.dispose()) : m?.dispose?.();
        }
      });
      renderer.dispose();
    };
  }, [full]);

  return <canvas ref={canvasRef} className={className} />;
}
