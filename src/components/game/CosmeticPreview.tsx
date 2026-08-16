import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getSkin, getTrail, getTheme } from "@/lib/game/cosmetics";

interface Props {
  skinId: string;
  trailId: string;
  themeId: string;
  className?: string;
}

/**
 * Live 3D preview of the currently selected ball skin + trail inside the
 * selected tunnel theme. Runs a tiny standalone Three.js scene.
 */
export function CosmeticPreview({ skinId, trailId, themeId, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfg = useRef({ skinId, trailId, themeId });
  cfg.current = { skinId, trailId, themeId };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(0, 0.7, 5.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 4, 5);
    scene.add(key);
    const ballLight = new THREE.PointLight(0xffffff, 12, 12);
    scene.add(ballLight);

    // tunnel ring backdrop
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.4, roughness: 0.5 });
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.035, 6, 48), ringMat);
      r.position.z = -i * 2.2;
      scene.add(r);
      rings.push(r);
    }

    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), ballMat);
    scene.add(ball);

    // trail: sprite pool following the ball
    const COUNT = 46;
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
      const t = new THREE.CanvasTexture(c);
      return t;
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
        scene.fog = new THREE.Fog(new THREE.Color(theme.fog), 6, 20);
        ringMat.color.set(theme.tunnel);
        ringMat.emissive = new THREE.Color(theme.accent);
        ringMat.emissiveIntensity = 0.25;
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

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      applyCosmetics();

      const trailDef = getTrail(cfg.current.trailId);
      // ball orbits gently in a figure-8
      const x = Math.sin(t * 1.1) * 1.25;
      const y = Math.sin(t * 2.2) * 0.5;
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
        const life = 0.85;
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
      }

      for (const r of rings) {
        r.position.z += dt * 2.2;
        if (r.position.z > 2.2) r.position.z -= 7 * 2.2;
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvasTex.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          (o as THREE.Mesh).geometry?.dispose?.();
          const m = o.material as THREE.Material | THREE.Material[];
          Array.isArray(m) ? m.forEach((x) => x.dispose()) : m?.dispose?.();
        }
      });
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
