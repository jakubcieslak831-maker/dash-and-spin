/**
 * Cosmetics catalog — ball skins, trails, explosions, tunnel themes.
 * All items are data-driven so new cosmetics can be appended freely.
 *
 * Items may be priced in coins (`price`) or premium gems (`gemPrice`).
 * Limited-edition items are grouped by `limitedTag` (e.g. "Season 1") and
 * shown with a badge in the shop.
 */

/**
 * Optional gameplay-affecting effect for premium skins.
 * Kept intentionally small so they're clearly "power" cosmetics, not P2W-crushing.
 * - magnet:  larger coin pickup radius
 * - slowmo:  spinning blades rotate slightly slower
 * - shield:  start each run with one auto-revive on first crash
 * - lucky:   +1 bonus coin whenever a coin is collected
 */
/**
 * - double:   every coin is worth double
 * - guardian: start each run with TWO auto-revives
 */
export type SkinEffect = "magnet" | "slowmo" | "shield" | "lucky" | "double" | "guardian";

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  gemPrice?: number;
  color: string;
  emissive: string;
  metalness: number;
  roughness: number;
  /** For extra flair on premium/limited: brighter emissive + sparkle in shop preview. */
  sparkle?: boolean;
  premium?: boolean;
  /** Limited edition — shown in a special shop section with a badge. */
  limited?: boolean;
  /** Short flavour label for limited items, e.g. "Season 1". */
  limitedTag?: string;
  /** Gameplay effect this skin grants when equipped. */
  effect?: SkinEffect;
  /** Short label describing the effect, e.g. "Coin magnet". */
  effectLabel?: string;
  /** Real-money only ball — cannot be bought with coins or gems. */
  cashPrice?: string;
  /** Unlocked only while the Elite Club subscription is active. */
  eliteOnly?: boolean;
}


export interface TrailDef {
  id: string;
  name: string;
  price: number;
  gemPrice?: number;
  color: string;
  /** Optional secondary color for gradient trails. */
  color2?: string;
  /** Trail dot size multiplier (default 1). */
  size?: number;
  premium?: boolean;
  limited?: boolean;
  limitedTag?: string;
}

export interface ExplosionDef {
  id: string;
  name: string;
  price: number;
  gemPrice?: number;
  colors: string[];
  limited?: boolean;
  limitedTag?: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  price: number;
  gemPrice?: number;
  tunnel: string;
  fog: string;
  blade: string;
  accent: string;
  emoji: string;
  limited?: boolean;
  limitedTag?: string;
}

export const SKINS: SkinDef[] = [
  { id: "classic", name: "Classic", price: 0, color: "#f5f5f5", emissive: "#222222", metalness: 0.3, roughness: 0.4 },
  { id: "ember", name: "Ember", price: 200, color: "#ff5522", emissive: "#aa2200", metalness: 0.4, roughness: 0.3 },
  { id: "ocean", name: "Ocean", price: 200, color: "#2288ff", emissive: "#002266", metalness: 0.5, roughness: 0.25 },
  { id: "toxic", name: "Toxic", price: 300, color: "#66ff33", emissive: "#227700", metalness: 0.3, roughness: 0.5 },
  { id: "royal", name: "Royal", price: 300, color: "#ffcc00", emissive: "#664400", metalness: 0.9, roughness: 0.15 },
  { id: "shadow", name: "Shadow", price: 400, color: "#1a1a1a", emissive: "#440066", metalness: 0.8, roughness: 0.15 },
  { id: "bubblegum", name: "Bubblegum", price: 400, color: "#ff77cc", emissive: "#661144", metalness: 0.4, roughness: 0.4 },
  { id: "chrome", name: "Chrome", price: 500, color: "#eeeeee", emissive: "#333333", metalness: 1, roughness: 0.02 },
  { id: "magma", name: "Magma", price: 500, color: "#ff3300", emissive: "#aa2200", metalness: 0.4, roughness: 0.35 },
  { id: "glacier", name: "Glacier", price: 600, color: "#aaeeff", emissive: "#0099cc", metalness: 0.6, roughness: 0.08 },
  { id: "void", name: "Void", price: 700, color: "#4400aa", emissive: "#8800ff", metalness: 0.6, roughness: 0.25 },
  { id: "sunset", name: "Sunset", price: 700, color: "#ff8844", emissive: "#cc2266", metalness: 0.5, roughness: 0.3 },
  { id: "jade", name: "Jade", price: 800, color: "#00cc88", emissive: "#008855", metalness: 0.7, roughness: 0.15 },
  { id: "ruby", name: "Ruby", price: 900, color: "#ee1144", emissive: "#880022", metalness: 0.85, roughness: 0.08, sparkle: true },
  { id: "sapphire", name: "Sapphire", price: 900, color: "#1144ee", emissive: "#002288", metalness: 0.85, roughness: 0.08, sparkle: true },
  { id: "gold", name: "24K Gold", price: 1200, color: "#ffd700", emissive: "#aa7700", metalness: 1, roughness: 0.08, sparkle: true },
  { id: "plasma", name: "Plasma", price: 1500, color: "#ff00ff", emissive: "#cc00cc", metalness: 0.6, roughness: 0.15, sparkle: true },
  { id: "nova", name: "Nova", price: 2000, color: "#ffffff", emissive: "#aabbff", metalness: 0.95, roughness: 0.02, sparkle: true },
  { id: "eclipse", name: "Eclipse", price: 2500, color: "#111111", emissive: "#ff6600", metalness: 0.95, roughness: 0.08, premium: true, sparkle: true },
  { id: "prism", name: "Prism", price: 3000, color: "#e0e0ff", emissive: "#00ffcc", metalness: 1, roughness: 0, premium: true, sparkle: true },
  // ---- Gem-priced elite ----
  { id: "hologram", name: "Hologram", price: 0, gemPrice: 40, color: "#66ffee", emissive: "#00ccff", metalness: 0.9, roughness: 0.04, sparkle: true },
  { id: "obsidian", name: "Obsidian", price: 0, gemPrice: 60, color: "#0a0a0a", emissive: "#5500ff", metalness: 1, roughness: 0.02, sparkle: true },
  // ---- Limited edition · Season 1 ----
  { id: "aurelian", name: "Aurelian", price: 3500, color: "#ffcf5c", emissive: "#ff7b00", metalness: 1, roughness: 0.05, limited: true, limitedTag: "Season 1", sparkle: true },
  { id: "midnight", name: "Midnight Bloom", price: 4000, color: "#b061ff", emissive: "#ff2fae", metalness: 0.8, roughness: 0.08, limited: true, limitedTag: "Season 1", sparkle: true },
  { id: "cyberdream", name: "Cyberdream", price: 0, gemPrice: 80, color: "#00ffcc", emissive: "#ff00cc", metalness: 0.95, roughness: 0.05, limited: true, limitedTag: "Season 1", sparkle: true },
  { id: "phoenixegg", name: "Phoenix Egg", price: 0, gemPrice: 120, color: "#ff9933", emissive: "#ff2200", metalness: 0.9, roughness: 0.1, limited: true, limitedTag: "Founders", sparkle: true, effect: "shield", effectLabel: "Auto-revive x1" },
  // ---- P2W power skins (clearly effect-bearing) ----
  { id: "magnetron", name: "Magnetron", price: 0, gemPrice: 90, color: "#ff3355", emissive: "#ff88aa", metalness: 0.95, roughness: 0.08, sparkle: true, effect: "magnet", effectLabel: "Coin magnet" },
  { id: "chronoshift", name: "Chronoshift", price: 0, gemPrice: 110, color: "#88ccff", emissive: "#3366ff", metalness: 0.9, roughness: 0.05, sparkle: true, premium: true, effect: "slowmo", effectLabel: "Slows blades 15%" },
  { id: "midasorb", name: "Midas Orb", price: 0, gemPrice: 140, color: "#ffdd33", emissive: "#ff9900", metalness: 1, roughness: 0.02, sparkle: true, limited: true, limitedTag: "Founders", effect: "lucky", effectLabel: "+1 bonus coin" },
  // ---- More coin skins ----
  { id: "copper", name: "Copper", price: 250, color: "#c87533", emissive: "#5a2f10", metalness: 0.9, roughness: 0.3 },
  { id: "lagoon", name: "Lagoon", price: 450, color: "#19c7c7", emissive: "#046b6b", metalness: 0.6, roughness: 0.2 },
  { id: "sandstorm", name: "Sandstorm", price: 650, color: "#e8c07a", emissive: "#8a6420", metalness: 0.5, roughness: 0.35 },
  { id: "cobalt", name: "Cobalt", price: 950, color: "#2b4cff", emissive: "#0a1d8c", metalness: 0.9, roughness: 0.1, sparkle: true },
  { id: "peppermint", name: "Peppermint", price: 1100, color: "#ff5566", emissive: "#ffffff", metalness: 0.5, roughness: 0.2 },
  { id: "starlight", name: "Starlight", price: 2600, color: "#f2f6ff", emissive: "#6688ff", metalness: 0.95, roughness: 0.03, sparkle: true },
  // ---- More gem skins ----
  { id: "irid", name: "Iridium", price: 0, gemPrice: 45, color: "#c9d6ff", emissive: "#7f5cff", metalness: 1, roughness: 0.03, sparkle: true },
  { id: "venomorb", name: "Venom Orb", price: 0, gemPrice: 70, color: "#8cff2e", emissive: "#37ff00", metalness: 0.8, roughness: 0.1, sparkle: true },
  { id: "abyssal", name: "Abyssal", price: 0, gemPrice: 95, color: "#001b3d", emissive: "#00e5ff", metalness: 1, roughness: 0.05, sparkle: true },
  // ---- Elite Club (monthly subscription only) ----
  { id: "eliteaether", name: "Aether", price: 0, color: "#dff6ff", emissive: "#00d0ff", metalness: 1, roughness: 0.02, sparkle: true, eliteOnly: true, effect: "magnet", effectLabel: "Coin magnet" },
  { id: "elitesolarflare", name: "Solar Flare", price: 0, color: "#ffb63d", emissive: "#ff3d00", metalness: 0.95, roughness: 0.06, sparkle: true, eliteOnly: true, effect: "lucky", effectLabel: "+1 bonus coin" },
  { id: "elitenebula", name: "Nebula", price: 0, color: "#a06bff", emissive: "#ff3ecb", metalness: 0.9, roughness: 0.05, sparkle: true, eliteOnly: true, effect: "slowmo", effectLabel: "Slows blades 15%" },
  { id: "eliteonyx", name: "Onyx Prime", price: 0, color: "#050505", emissive: "#ff0044", metalness: 1, roughness: 0.01, sparkle: true, eliteOnly: true, effect: "shield", effectLabel: "Auto-revive x1" },
  // ---- Cash-only power balls (real money, gameplay perks) ----
  { id: "titanium", name: "Titanium Guardian", price: 0, cashPrice: "£4.99", color: "#b8c6d4", emissive: "#3a6ea5", metalness: 1, roughness: 0.08, sparkle: true, effect: "guardian", effectLabel: "Auto-revive ×2" },
  { id: "mintprinter", name: "Mint Printer", price: 0, cashPrice: "£5.99", color: "#ffe066", emissive: "#ffa600", metalness: 1, roughness: 0.04, sparkle: true, effect: "double", effectLabel: "All coins ×2" },
  { id: "singularityorb", name: "Singularity", price: 0, cashPrice: "£7.99", color: "#0b0016", emissive: "#b400ff", metalness: 1, roughness: 0, sparkle: true, effect: "slowmo", effectLabel: "Slows blades 15%" },
  { id: "magnetar", name: "Magnetar", price: 0, cashPrice: "£3.99", color: "#ff2d6f", emissive: "#ff86b0", metalness: 0.95, roughness: 0.06, sparkle: true, effect: "magnet", effectLabel: "Coin magnet" },
];


export const TRAILS: TrailDef[] = [
  { id: "none", name: "None", price: 0, color: "#888888" },
  { id: "spark", name: "Spark", price: 150, color: "#ffffff", size: 1 },
  { id: "flame", name: "Flame", price: 250, color: "#ff6622", color2: "#ffcc00", size: 1.15 },
  { id: "frost", name: "Frost", price: 250, color: "#66ccff", color2: "#ffffff", size: 1.1 },
  { id: "venom", name: "Venom", price: 350, color: "#77ff22", color2: "#00ff88", size: 1.1 },
  { id: "rose", name: "Rose", price: 350, color: "#ff5599", color2: "#ffbbdd", size: 1 },
  { id: "volt", name: "Volt", price: 450, color: "#ffee00", color2: "#ffffff", size: 1.2 },
  { id: "abyss", name: "Abyss", price: 550, color: "#5533ff", color2: "#aa66ff", size: 1.1 },
  { id: "mint", name: "Mint", price: 550, color: "#00ffaa", color2: "#88ffcc", size: 1 },
  { id: "blood", name: "Blood", price: 650, color: "#cc0022", color2: "#ff4466", size: 1.1 },
  { id: "aurora", name: "Aurora", price: 800, color: "#44ffdd", color2: "#aa66ff", size: 1.25 },
  { id: "solar", name: "Solar", price: 900, color: "#ffaa00", color2: "#ffffff", size: 1.25 },
  { id: "ghost", name: "Ghost", price: 1000, color: "#ccccff", color2: "#ffffff", size: 1.3 },
  { id: "neon", name: "Neon", price: 1200, color: "#ff00cc", color2: "#00ffdd", size: 1.3 },
  { id: "galaxy", name: "Galaxy", price: 1500, color: "#aa66ff", color2: "#ffffff", size: 1.4, premium: true },
  // ---- Gem-priced ----
  { id: "rainbow", name: "Rainbow", price: 0, gemPrice: 50, color: "#ff00aa", color2: "#00ffff", size: 1.5 },
  // ---- Limited edition ----
  { id: "comet", name: "Comet", price: 2200, color: "#7cf9ff", color2: "#ffffff", size: 1.4, limited: true, limitedTag: "Season 1" },
  { id: "stardust", name: "Stardust", price: 0, gemPrice: 75, color: "#ffe0aa", color2: "#ff66cc", size: 1.5, limited: true, limitedTag: "Season 1" },
  { id: "emberdust", name: "Ember Dust", price: 400, color: "#ff8c2b", color2: "#ffdd88", size: 1.1 },
  { id: "tidal", name: "Tidal", price: 600, color: "#0af0ff", color2: "#0044ff", size: 1.2 },
  { id: "bloomtrail", name: "Petalfall", price: 750, color: "#ff9ecb", color2: "#fff0f6", size: 1.15 },
  { id: "circuit", name: "Circuit", price: 1300, color: "#00ff88", color2: "#003322", size: 1.25 },
  { id: "eclipsetrail", name: "Eclipse", price: 0, gemPrice: 65, color: "#1a1a2e", color2: "#ff8800", size: 1.45 },
  { id: "quantum", name: "Quantum", price: 0, gemPrice: 90, color: "#7dfaff", color2: "#ff59f8", size: 1.6, premium: true },
  { id: "elitehalo", name: "Elite Halo", price: 0, color: "#fff4c2", color2: "#ffb300", size: 1.6, premium: true, limited: true, limitedTag: "Elite Club" },
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
  { id: "prismshatter", name: "Prism Shatter", price: 0, gemPrice: 30, colors: ["#ff00ff", "#00ffff", "#ffff00"] },
  { id: "singularity", name: "Singularity", price: 0, gemPrice: 60, colors: ["#000000", "#8800ff", "#ffffff"], limited: true, limitedTag: "Season 1" },
  { id: "confetti", name: "Confetti", price: 350, colors: ["#ff4488", "#44ddff", "#ffdd44"] },
  { id: "emp", name: "EMP Pulse", price: 800, colors: ["#66ccff", "#ffffff", "#0044ff"] },
  { id: "inkburst", name: "Ink Burst", price: 900, colors: ["#111122", "#5544ff"] },
  { id: "starfall", name: "Starfall", price: 0, gemPrice: 45, colors: ["#ffffff", "#ffe066", "#88aaff"] },
  { id: "eliterupture", name: "Elite Rupture", price: 0, gemPrice: 120, colors: ["#ffd700", "#ff00aa", "#ffffff"], limited: true, limitedTag: "Elite Club" },
];

export const THEMES: ThemeDef[] = [
  { id: "neon", name: "Neon", price: 0, tunnel: "#12081f", fog: "#0a0414", blade: "#ff2266", accent: "#00ffd5", emoji: "🌆" },
  { id: "ice", name: "Ice", price: 800, tunnel: "#0a1a2a", fog: "#061420", blade: "#66bbee", accent: "#bbeeff", emoji: "❄️" },
  { id: "lava", name: "Lava", price: 800, tunnel: "#220a05", fog: "#180503", blade: "#ff5500", accent: "#ffaa00", emoji: "🌋" },
  { id: "space", name: "Space", price: 1000, tunnel: "#05050f", fog: "#020208", blade: "#8866ff", accent: "#ffffff", emoji: "🚀" },
  { id: "factory", name: "Factory", price: 1000, tunnel: "#1a1a18", fog: "#101010", blade: "#ffbb00", accent: "#ff4400", emoji: "🏭" },
  { id: "jungle", name: "Jungle", price: 1200, tunnel: "#0a1f0d", fog: "#051207", blade: "#44cc33", accent: "#ffee44", emoji: "🌿" },
  { id: "sakura", name: "Sakura", price: 0, gemPrice: 40, tunnel: "#22101a", fog: "#160810", blade: "#ff88bb", accent: "#ffddee", emoji: "🌸", limited: true, limitedTag: "Season 1" },
  { id: "vaporwave", name: "Vaporwave", price: 0, gemPrice: 55, tunnel: "#1a0a2a", fog: "#0f0518", blade: "#ff44dd", accent: "#00ffee", emoji: "🌴", limited: true, limitedTag: "Season 1" },
  { id: "aurora", name: "Aurora", price: 1500, tunnel: "#061a20", fog: "#02121a", blade: "#33ffcc", accent: "#88ccff", emoji: "🌌" },
  { id: "sunset", name: "Sunset Drive", price: 1800, tunnel: "#1a0820", fog: "#0f0414", blade: "#ff6688", accent: "#ffcc44", emoji: "🏝️" },
  { id: "obsidian", name: "Obsidian Vault", price: 0, gemPrice: 70, tunnel: "#080008", fog: "#050005", blade: "#ff00aa", accent: "#00ffaa", emoji: "🕳️", limited: true, limitedTag: "Founders" },
  { id: "goldrush", name: "Gold Rush", price: 0, gemPrice: 100, tunnel: "#221408", fog: "#140a05", blade: "#ffd700", accent: "#fff2aa", emoji: "🏆", limited: true, limitedTag: "Founders" },
  { id: "midnightcity", name: "Midnight City", price: 1400, tunnel: "#0d1024", fog: "#05060f", blade: "#4d7cff", accent: "#ff5fa2", emoji: "🌃" },
  { id: "desert", name: "Dune", price: 1200, tunnel: "#241a0c", fog: "#140e06", blade: "#e0a13c", accent: "#ffd28a", emoji: "🏜️" },
  { id: "deepsea", name: "Deep Sea", price: 1600, tunnel: "#04121f", fog: "#010a12", blade: "#00c2ff", accent: "#6ff5d8", emoji: "🐋" },
  { id: "circuitboard", name: "Circuit Board", price: 0, gemPrice: 60, tunnel: "#04140c", fog: "#010a06", blade: "#00ff88", accent: "#aaffcc", emoji: "🔌" },
  { id: "eliteplatinum", name: "Platinum Vault", price: 0, tunnel: "#14161a", fog: "#0a0b0d", blade: "#e6e9ef", accent: "#ffd700", emoji: "🏛️", limited: true, limitedTag: "Elite Club" },
];


export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const trailById = (id: string) => TRAILS.find((t) => t.id === id) ?? TRAILS[0];
export const explosionById = (id: string) => EXPLOSIONS.find((e) => e.id === id) ?? EXPLOSIONS[0];
export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Purchasable gem bundles — simulated IAP for now, ready for a native SDK later. */
export interface GemBundle {
  id: string;
  gems: number;
  bonus?: number;
  priceLabel: string;
  best?: boolean;
}
export const GEM_BUNDLES: GemBundle[] = [
  { id: "starter", gems: 20, priceLabel: "£0.99" },
  { id: "handful", gems: 60, bonus: 5, priceLabel: "£2.49" },
  { id: "medium", gems: 100, bonus: 10, priceLabel: "£3.99" },
  { id: "large", gems: 300, bonus: 60, priceLabel: "£9.99", best: true },
  { id: "mega", gems: 800, bonus: 200, priceLabel: "£19.99" },
  { id: "titan", gems: 2000, bonus: 700, priceLabel: "£39.99" },
];

/** Special one-time offers (no-ads, premium 2x coins) — also simulated IAP. */
export interface OfferDef {
  id: "removeAds" | "premium" | "starterPack" | "vip" | "ultimate" | "goldVault" | "levelSkip";
  title: string;
  subtitle: string;
  priceLabel: string;
  icon: string;
  /** highlight as the headline deal */
  best?: boolean;
  /** small strike-through "was" price for perceived value */
  wasLabel?: string;
}
export const OFFERS: OfferDef[] = [
  { id: "removeAds", title: "Remove Ads", subtitle: "No more interstitials, ever.", priceLabel: "£2.99", icon: "🚫" },
  { id: "premium", title: "Premium Pass", subtitle: "Double all coins earned, forever.", priceLabel: "£4.99", icon: "👑" },
  { id: "starterPack", title: "Starter Pack", subtitle: "500 coins + 40 gems + Ember skin.", priceLabel: "£1.99", icon: "🎁", wasLabel: "£5.99" },
  {
    id: "vip",
    title: "BladeRun VIP",
    subtitle: "No ads + 2× coins + 5 💎 every day you play.",
    priceLabel: "£4.99 / month",
    icon: "⭐",
    best: true,
  },
  {
    id: "goldVault",
    title: "Gold Vault",
    subtitle: "25,000 coins — buy any coin cosmetic instantly.",
    priceLabel: "£6.99",
    icon: "🏦",
    wasLabel: "£12.99",
  },
  {
    id: "levelSkip",
    title: "Level Skip ×5",
    subtitle: "Stuck? Instantly clear five campaign levels.",
    priceLabel: "£2.99",
    icon: "⏭",
  },
  {
    id: "ultimate",
    title: "Ultimate Bundle",
    subtitle: "VIP + Premium Pass + 1,200 💎 + 25,000 coins + every limited skin.",
    priceLabel: "£29.99",
    icon: "👑",
    wasLabel: "£64.99",
  },
];

/** Monthly subscription tiers (simulated recurring IAP). */
export interface SubscriptionDef {
  id: "elite";
  title: string;
  subtitle: string;
  priceLabel: string;
  icon: string;
  perks: string[];
}
export const SUBSCRIPTIONS: SubscriptionDef[] = [
  {
    id: "elite",
    title: "Elite Club",
    subtitle: "Every Elite ball, trail, theme and boom — while subscribed.",
    priceLabel: "£9.99 / month",
    icon: "🔱",
    perks: [
      "All Elite-only cosmetics unlocked",
      "15 💎 every day you play",
      "No ads + 2× coins",
      "New Elite ball drops each month",
    ],
  },
];

/** Skins that are only obtainable with real money. */
export const CASH_SKINS = SKINS.filter((s) => !!s.cashPrice);
/** Skins unlocked by the Elite Club subscription. */
export const ELITE_SKINS = SKINS.filter((s) => s.eliteOnly);
export const ELITE_TRAILS = TRAILS.filter((t) => t.limitedTag === "Elite Club");
export const ELITE_THEMES = THEMES.filter((t) => t.limitedTag === "Elite Club");
export const ELITE_EXPLOSIONS = EXPLOSIONS.filter((e) => e.limitedTag === "Elite Club");
export const ELITE_IDS = {
  skin: ELITE_SKINS.map((s) => s.id),
  trail: ELITE_TRAILS.map((t) => t.id),
  theme: ELITE_THEMES.map((t) => t.id),
  explosion: ELITE_EXPLOSIONS.map((e) => e.id),
};

