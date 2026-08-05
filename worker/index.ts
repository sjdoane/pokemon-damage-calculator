/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type StoredTeamRow = {
  id: string;
  name: string;
  team_json: string;
  replica_code: string | null;
  created_at: string;
  updated_at: string;
};

const TEAM_SCHEMA = `CREATE TABLE IF NOT EXISTS saved_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_json TEXT NOT NULL,
  replica_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) WITHOUT ROWID`;

const TEAM_UPDATED_INDEX = `CREATE INDEX IF NOT EXISTS idx_saved_teams_updated_at
ON saved_teams(updated_at DESC)`;

let schemaReady: Promise<void> | null = null;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function normalizeTeamId(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

function sanitizeTeam(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return null;
  const serialized = JSON.stringify(value);
  if (serialized.length > 80_000) return null;
  return serialized;
}

async function ensureTeamSchema(db: D1Database) {
  schemaReady ??= db.batch([
    db.prepare(TEAM_SCHEMA),
    db.prepare(TEAM_UPDATED_INDEX),
    db.prepare("PRAGMA optimize"),
  ]).then(() => undefined).catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function publicTeam(row: StoredTeamRow) {
  return {
    id: row.id,
    name: row.name,
    team: JSON.parse(row.team_json),
    replicaCode: row.replica_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function htmlText(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&minus;/g, "-")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

function matchText(segment: string, pattern: RegExp) {
  const match = segment.match(pattern);
  return match ? htmlText(match[1]) : "";
}

// Public team directories sometimes publish a Replica ID and screenshots but
// keep the underlying set data out of their page markup. These entries are
// transcribed from the published in-game screens and kept deterministic so an
// import never relies on OCR, guessing, or an AI service at runtime.
const VERIFIED_SCREENSHOT_TEAMS: Record<string, Record<string, unknown>> = {
  QY3XFXCEJA: {
    name: "Cybertron's Raichu Y Balance",
    replicaCode: "QY3XFXCEJA",
    source: "PokeReplicas (verified screenshots)",
    sourceUrl: "https://pokemonchampionsreplicateams.com/teams/cybertron-s-raichu-y-balance-qy3xfxceja",
    detailLevel: "verified-set",
    team: [
      {
        formName: "Mega Raichu Y",
        item: "Raichunite Y",
        ability: "No Guard",
        nature: "Timid",
        moves: ["Zap Cannon", "Focus Blast", "Fake Out", "Protect"],
        sp: { hp: 32, atk: 0, def: 0, spa: 2, spd: 0, spe: 32 },
      },
      {
        formName: "Mega Staraptor",
        item: "Staraptite",
        ability: "Contrary",
        nature: "Jolly",
        moves: ["Close Combat", "Dual Wingbeat", "Tailwind", "Protect"],
        sp: { hp: 15, atk: 19, def: 0, spa: 0, spd: 0, spe: 32 },
      },
      {
        formName: "Hisuian Arcanine",
        item: "Focus Sash",
        ability: "Rock Head",
        nature: "Jolly",
        moves: ["Flare Blitz", "Head Smash", "Extreme Speed", "Protect"],
        sp: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      },
      {
        formName: "Farigiraf",
        item: "Sitrus Berry",
        ability: "Armor Tail",
        nature: "Calm",
        moves: ["Psychic", "Helping Hand", "Trick Room", "Protect"],
        sp: { hp: 29, atk: 0, def: 21, spa: 0, spd: 16, spe: 0 },
      },
      {
        formName: "Sylveon",
        item: "Fairy Feather",
        ability: "Pixilate",
        nature: "Modest",
        moves: ["Hyper Voice", "Quick Attack", "Hyper Beam", "Detect"],
        sp: { hp: 13, atk: 0, def: 22, spa: 23, spd: 0, spe: 8 },
      },
      {
        formName: "Kingambit",
        item: "Life Orb",
        ability: "Defiant",
        nature: "Adamant",
        moves: ["Kowtow Cleave", "Sucker Punch", "Swords Dance", "Protect"],
        sp: { hp: 32, atk: 32, def: 0, spa: 0, spd: 1, spe: 1 },
      },
    ],
  },
};

function parsePublicTeamPage(html: string, code: string, slug: string) {
  const title = matchText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) || `Replica ${code}`;
  const selectedRoster = Array.from(html.matchAll(/aria-label="Show details for ([^"]+)"/g))
    .map((match) => htmlText(match[1]))
    .filter((name, index, values) => values.indexOf(name) === index)
    .slice(0, 6);
  const headings = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g))
    .filter((match) => !/Damage taken|Damage dealt|Speed tiers/i.test(htmlText(match[1])));
  const roster = selectedRoster.length
    ? selectedRoster
    : headings.slice(0, 6).map((heading, index) => {
        const start = heading.index ?? -1;
        const end = headings[index + 1]?.index ?? html.length;
        const segment = start >= 0 ? html.slice(start, end) : "";
        return matchText(segment, /<span class="[^"]*uppercase[^"]*w-fit[^"]*">([\s\S]*?)<\/span>/)
          || htmlText(heading[1]);
      });

  const members = roster.map((formName, index) => {
    const start = headings[index]?.index ?? -1;
    const end = headings[index + 1]?.index ?? html.length;
    const segment = start >= 0 ? html.slice(start, end) : "";
    const item = matchText(segment, />Item<\/span>[\s\S]*?<button[^>]*>([\s\S]*?)<\/button>/);
    const ability = matchText(segment, />Ability<\/span>[\s\S]*?<button[^>]*>([\s\S]*?)<\/button>/);
    const nature = matchText(segment, />Nature<\/span>[\s\S]*?<span class="text-foreground">([\s\S]*?)<\/span>/);
    const moveArea = segment.split(/>Moves<\/p>/i)[1]?.split(/<div class="grid grid-cols-6|<section/i)[0] ?? "";
    const moves = Array.from(moveArea.matchAll(/data-slot="hover-card-trigger"[^>]*>\s*<img[^>]*>([\s\S]*?)<\/button>/g))
      .map((match) => htmlText(match[1]))
      .filter(Boolean)
      .slice(0, 4);
    const sp: Record<string, number> = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const statMap: Record<string, string> = { HP: "hp", Atk: "atk", Def: "def", SpA: "spa", SpD: "spd", Spe: "spe" };
    for (const stat of segment.matchAll(/>(HP|Atk|Def|SpA|SpD|Spe)<\/span><span[^>]*>\d+<\/span><\/div><span[^>]*>\+<!-- -->(\d+)<\/span>/g)) {
      sp[statMap[stat[1]]] = Math.min(32, Number(stat[2]) || 0);
    }
    return { formName, item, ability, nature, moves, sp };
  });

  return members.length
    ? { name: title, team: members, replicaCode: code, source: "PokeFeed", sourceUrl: `https://pokefeed.app/teams/${slug}` }
    : null;
}

async function lookupPublicReplicaTeam(code: string) {
  if (!/^[A-Z0-9]{10}$/.test(code)) return null;
  for (let page = 1; page <= 8; page += 1) {
    const listing = await fetch(`https://pokefeed.app/teams?page=${page}&rental=true`, {
      headers: { "user-agent": "Champion Lens team importer/1.0" },
    });
    if (!listing.ok) break;
    const listingHtml = await listing.text();
    const codeIndex = listingHtml.indexOf(code);
    if (codeIndex < 0) {
      if (/No teams/i.test(listingHtml)) break;
      continue;
    }
    const beforeCode = listingHtml.slice(0, codeIndex);
    const links = Array.from(beforeCode.matchAll(/href="\/teams\/([^"?]+)(?:\?[^\"]*)?"/g));
    const slug = links.at(-1)?.[1];
    if (!slug || slug === "new") continue;
    const detail = await fetch(`https://pokefeed.app/teams/${slug}?view=expanded`, {
      headers: { "user-agent": "Champion Lens team importer/1.0" },
    });
    if (!detail.ok) return null;
    return parsePublicTeamPage(await detail.text(), code, slug);
  }
  return null;
}

async function lookupPokeReplicasTeam(code: string) {
  if (!/^[A-Z0-9]{10}$/.test(code)) return null;
  const sitemapResponse = await fetch("https://pokemonchampionsreplicateams.com/sitemap.xml", {
    headers: { "user-agent": "Champion Lens team importer/1.0" },
  });
  if (!sitemapResponse.ok) return null;
  const sitemap = await sitemapResponse.text();
  const lowerCode = code.toLowerCase();
  const urls = Array.from(sitemap.matchAll(/<loc>(https:\/\/pokemonchampionsreplicateams\.com\/teams\/[^<]+)<\/loc>/g))
    .map((match) => match[1]);
  const sourceUrl = urls.find((candidate) => candidate.toLowerCase().endsWith(`-${lowerCode}`));
  if (!sourceUrl) return null;

  const detailResponse = await fetch(sourceUrl, {
    headers: { "user-agent": "Champion Lens team importer/1.0" },
  });
  if (!detailResponse.ok) return null;
  const detail = await detailResponse.text();
  const name = matchText(detail, /<h1 class="td-title">([\s\S]*?)<\/h1>/) || `Replica ${code}`;
  const primaryCopy = htmlText(detail.slice(0, detail.indexOf("td-similar") > 0 ? detail.indexOf("td-similar") : detail.length));
  const roster = Array.from(detail.matchAll(/<span class="td-mon-name">([\s\S]*?)<\/span>/g))
    .map((match) => htmlText(match[1]))
    .filter((pokemon, index, values) => values.indexOf(pokemon) === index)
    .slice(0, 6)
    .map((pokemon) => {
      const base = pokemon.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      return new RegExp(`mega[\\s-]+${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(primaryCopy)
        ? `Mega ${pokemon}`
        : pokemon;
    });
  if (!roster.length) return null;
  return {
    name,
    team: roster.map((formName) => ({ formName })),
    replicaCode: code,
    source: "PokeReplicas",
    sourceUrl,
    detailLevel: "roster",
  };
}

async function handleTeamApi(request: Request, env: Env, url: URL) {
  await ensureTeamSchema(env.DB);
  const path = url.pathname.replace(/^\/api\/team-library\/?/, "");

  if (request.method === "GET" && !path) {
    const result = await env.DB.prepare(
      "SELECT id, name, team_json, replica_code, created_at, updated_at FROM saved_teams ORDER BY updated_at DESC",
    ).all<StoredTeamRow>();
    return json({ teams: (result.results ?? []).map(publicTeam) });
  }

  if (request.method === "GET" && path) {
    const id = normalizeTeamId(path);
    const row = await env.DB.prepare(
      "SELECT id, name, team_json, replica_code, created_at, updated_at FROM saved_teams WHERE id = ?",
    ).bind(id).first<StoredTeamRow>();
    return row ? json({ team: publicTeam(row) }) : json({ error: "Team ID not found." }, 404);
  }

  if (request.method === "POST" && !path) {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const teamJson = sanitizeTeam(body?.team);
    const name = String(body?.name ?? "").trim().slice(0, 80);
    if (!teamJson || !name) return json({ error: "A team name and at least one Pokémon are required." }, 400);
    const suppliedId = normalizeTeamId(body?.id);
    const id = suppliedId || `CL${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const replicaCode = normalizeTeamId(body?.replicaCode) || null;
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO saved_teams (id, name, team_json, replica_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         team_json = excluded.team_json,
         replica_code = excluded.replica_code,
         updated_at = excluded.updated_at`,
    ).bind(id, name, teamJson, replicaCode, now, now).run();
    const row = await env.DB.prepare(
      "SELECT id, name, team_json, replica_code, created_at, updated_at FROM saved_teams WHERE id = ?",
    ).bind(id).first<StoredTeamRow>();
    return json({ team: row ? publicTeam(row) : null }, 201);
  }

  if (request.method === "DELETE" && path) {
    const id = normalizeTeamId(path);
    await env.DB.prepare("DELETE FROM saved_teams WHERE id = ?").bind(id).run();
    return json({ deleted: true });
  }

  return json({ error: "Unsupported team-library request." }, 405);
}

async function handleTeamImport(request: Request, env: Env) {
  await ensureTeamSchema(env.DB);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = normalizeTeamId(body?.id);
  if (!id) return json({ error: "Enter a Team ID." }, 400);
  const row = await env.DB.prepare(
    "SELECT id, name, team_json, replica_code, created_at, updated_at FROM saved_teams WHERE id = ?",
  ).bind(id).first<StoredTeamRow>();
  if (row) return json({ source: "Champion Lens", savedTeam: publicTeam(row) });
  if (VERIFIED_SCREENSHOT_TEAMS[id]) return json(VERIFIED_SCREENSHOT_TEAMS[id]);

  try {
    const [pokeFeed, pokeReplicas] = await Promise.allSettled([
      lookupPublicReplicaTeam(id),
      lookupPokeReplicasTeam(id),
    ]);
    if (pokeFeed.status === "fulfilled" && pokeFeed.value) return json(pokeFeed.value);
    if (pokeReplicas.status === "fulfilled" && pokeReplicas.value) return json(pokeReplicas.value);
  } catch {
    // Public community sources are best effort; saved Champion Lens IDs remain exact.
  }
  return json({
    error: "That ID is not in your Champion Lens library or the supported public Replica directory. Pokémon does not provide a public Team ID decoder.",
  }, 404);
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/team-library")) {
      return handleTeamApi(request, env, url);
    }

    if (url.pathname === "/api/team-import" && request.method === "POST") {
      return handleTeamImport(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
