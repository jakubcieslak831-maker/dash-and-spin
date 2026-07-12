/**
 * Cosmetics catalog — ball skins, trails, explosions, tunnel themes.
 * All items are data-driven so new cosmetics can be appended freely.
 */

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  color: string;
  emissive: string;
  metalness: number;
  roughness: number;
  premium?: boolean;
}

export interface TrailDef {
  id: string;
  name: string;
  price: number;
  color: string;
  premium?: boolean;
}

export interface ExplosionDef {
  id: string;
  name: string;
  price: number;
  colors: string[];
}

export interface ThemeDef {
  id: string;
  name: string;
  price: number;
  tunnel: string;
  fog: string;
  blade: string;
  accent: string;
  emoji: string;
}

export const SKINS: SkinDef[] = [
  { id: "classic", name: "Classic", price: 0, color: "#f5f5f5", emissive: "#222222", metalness: 0.3, roughness: 0.4 },
  { id: "ember", name: "Ember", price: 200, color: "#ff5522", emissive: "#661100", metalness: 0.4, roughness: 0.3 },
  { id: "ocean", name: "Ocean", price: 200, color: "#2288ff", emissive: "#001a44", metalness: 0.4, roughness: 0.3 },
  { id: "toxic", name: "Toxic", price: 300, color: "#66ff33", emissive: "#114400", metalness: 0.3, roughness: 0.5 },
  { id: "royal", name: "Royal", price: 300, color: "#ffcc00", emissive: "#443300", metalness: 0.9, roughness: 0.15 },
  { id: "shadow", name: "Shadow", price: 400, color: "#1a1a1a", emissive: "#000000", metalness: 0.7, roughness: 0.2 },
  { id: "bubblegum", name: "Bubblegum", price: 400, color: "#ff77cc", emissive: "#440022", metalness: 0.2, roughness: 0.6 },
  { id: "chrome", name: "Chrome", price: 500, color: "#cccccc", emissive: "#111111", metalness: 1, roughness: 0.05 },
  { id: "magma", name: "Magma", price: 500, color: "#ff3300", emissive: "#992200", metalness: 0.3, roughness: 0.4 },
  { id: "glacier", name: "Glacier", price: 600, color: "#aaeeff", emissive: "#0088aa", metalness: 0.5, roughness: 0.1 },
  { id: "void", name: "Void", price: 700, color: "#330066", emissive: "#5500aa", metalness: 0.6, roughness: 0.3 },
  { id: "sunset", name: "Sunset", price: 700, color: "#ff8844", emissive: "#aa2255", metalness: 0.4, roughness: 0.35 },
  { id: "jade", name: "Jade", price: 800, color: "#00cc88", emissive: "#004433", metalness: 0.6, roughness: 0.2 },
  { id: "ruby", name: "Ruby", price: 900, color: "#ee1144", emissive: "#660011", metalness: 0.8, roughness: 0.1 },
  { id: "sapphire", name: "Sapphire", price: 900, color: "#1144ee", emissive: "#001166", metalness: 0.8, roughness: 0.1 },
  { id: "gold", name: "24K Gold", price: 1200, color: "#ffd700", emissive: "#664400", metalness: 1, roughness: 0.1 },
  { id: "plasma", name: "Plasma", price: 1500, color: "#ff00ff", emissive: "#aa00aa", metalness: 0.5, roughness: 0.2 },
  { id: "nova", name: "Nova", price: 2000, color: "#ffffff", emissive: "#8899ff", metalness: 0.9, roughness: 0.05 },
  { id: "eclipse", name: "Eclipse", price: 2500, color: "#111111", emissive: "#ff6600", metalness: 0.9, roughness: 0.1, premium: true },
  { id: "prism", name: "Prism", price: 3000, color: "#e0e0ff", emissive: "#00ffcc", metalness: 1, roughness: 0, premium: true },
];

export const TRAILS: TrailDef[] = [
  { id: "none", name: "None", price: 0, color: "#888888" },
  { id: "spark", name: "Spark", price: 150, color: "#ffffff" },
  { id: "flame", name: "Flame", price: 250, color: "#ff6622" },
  { id: "frost", name: "Frost", price: 250, color: "#66ccff" },
  { id: "venom", name: "Venom", price: 350, color: "#77ff22" },
  { id: "rose", name: "Rose", price: 350, color: "#ff5599" },
  { id: "volt", name: "Volt", price: 450, color: "#ffee00" },
  { id: "abyss", name: "Abyss", price: 550, color: "#5533ff" },
  { id: "mint", name: "Mint", price: 550, color: "#00ffaa" },
  { id: "blood", name: "Blood", price: 650, color: "#cc0022" },
  { id: "aurora", name: "Aurora", price: 800, color: "#44ffdd" },
  { id: "solar", name: "Solar", price: 900, color: "#ffaa00" },
  { id: "ghost", name: "Ghost", price: 1000, color: "#ccccff" },
  { id: "neon", name: "Neon", price: 1200, color: "#ff00cc" },
  { id: "galaxy", name: "Galaxy", price: 1500, color: "#aa66ff", premium: true },
];

export const EXPLOSIONS: ExplosionDef[] = [
  { id: "burst", name: "Burst", price: 0, colors: ["#ffffff", "#aaaaaa"] },
  { id: "inferno", name: "Inferno", price: 200, colors: ["#ff4400", "#ffaa00"] },
  { id: "shatter", name: "Ice Shatter", price: 200, colors: ["#88ddff", "#ffffff"] },
  { id: "acid", name: "Acid Splash", price: 300, colors: ["#66ff00", "#ccff66"] },
  { id: "voidrip", name: "Void Rip", price: 400, colors: ["#6600ff", "#cc66ff"] },
  { id: "goldrain", name: "Gold Rain", price: 500, colors: ["#ffd700", "#ffaa33"] },
  { id: "bloom", name: "Petal Bloom", price: 600, colors: ["#ff77bb", "#ffbbdd"] },
  { id: "storm", name: "Storm", price: 700, colors: ["#4488ff", "#aaddff"] },
  { id: "supernova", name: "Supernova", price: 1000, colors: ["#ffffff", "#ff88ff", "#88ffff"] },
  { id: "phoenix", name: "Phoenix", price: 1500, colors: ["#ff2200", "#ffcc00", "#ff6600"] },
];

export const THEMES: ThemeDef[] = [
  { id: "neon", name: "Neon", price: 0, tunnel: "#12081f", fog: "#0a0414", blade: "#ff2266", accent: "#00ffd5", emoji: "🌆" },
  { id: "ice", name: "Ice", price: 800, tunnel: "#0a1a2a", fog: "#061420", blade: "#66bbee", accent: "#bbeeff", emoji: "❄️" },
  { id: "lava", name: "Lava", price: 800, tunnel: "#220a05", fog: "#180503", blade: "#ff5500", accent: "#ffaa00", emoji: "🌋" },
  { id: "space", name: "Space", price: 1000, tunnel: "#05050f", fog: "#020208", blade: "#8866ff", accent: "#ffffff", emoji: "🚀" },
  { id: "factory", name: "Factory", price: 1000, tunnel: "#1a1a18", fog: "#101010", blade: "#ffbb00", accent: "#ff4400", emoji: "🏭" },
  { id: "jungle", name: "Jungle", price: 1200, tunnel: "#0a1f0d", fog: "#051207", blade: "#44cc33", accent: "#ffee44", emoji: "🌿" },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const trailById = (id: string) => TRAILS.find((t) => t.id === id) ?? TRAILS[0];
export const explosionById = (id: string) => EXPLOSIONS.find((e) => e.id === id) ?? EXPLOSIONS[0];
export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
