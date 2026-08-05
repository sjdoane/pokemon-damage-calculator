import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Champion Lens battle workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Champion Lens — Pokémon Champions Battle Calculator<\/title>/i);
  assert.match(html, /Champion Lens/);
  assert.match(html, /Regulation M-B/);
  assert.match(html, /Your team/);
  assert.match(html, /Opponent team/);
  assert.match(html, /Damage scenarios/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships the current Champions data, team library, and calculator engine", async () => {
  const [source, worker, dataset, packageJson, migration] = await Promise.all([
    readFile(new URL("../app/BattleLens.tsx", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/data/champions-data.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_team_library.sql", import.meta.url), "utf8"),
  ]);
  const parsed = JSON.parse(dataset);

  assert.equal(parsed.pokemon.length, 236);
  assert.ok(parsed.pokemon.some((pokemon) => pokemon.forms.some((form) => form.form_kind === "Mega")));
  assert.match(source, /const MOVE_OVERRIDES/);
  assert.match(source, /66 SP/);
  assert.match(source, /16 EXACT DAMAGE ROLLS/);
  assert.match(source, /TEAM_STORAGE_KEY/);
  assert.match(source, /Your team library/);
  assert.match(source, /importedSpreadIsValid/);
  assert.match(source, /current most-common Stat Point spread/);
  assert.match(source, /Advanced battle modifiers/);
  assert.match(source, /effectiveMoveFor/);
  assert.match(source, /Piercing Drill/);
  assert.match(worker, /QY3XFXCEJA/);
  assert.match(worker, /hp: 13, atk: 0, def: 22, spa: 23, spd: 0, spe: 8/);
  assert.match(source, /Bashful/);
  assert.match(source, /Docile/);
  assert.match(source, /Hardy/);
  assert.match(source, /Quirky/);
  assert.match(dataset, /Defiant/);
  assert.match(worker, /PokeFeed/);
  assert.match(worker, /PokeReplicas/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS saved_teams/);
  assert.match(packageJson, /"@smogon\/calc"/);
});
