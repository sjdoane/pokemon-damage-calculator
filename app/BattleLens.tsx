"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  Activity,
  ArrowLeftRight,
  BadgeInfo,
  Bolt,
  Check,
  ChevronRight,
  CircleGauge,
  CloudCheck,
  CloudSun,
  Copy,
  Crosshair,
  Download,
  Edit3,
  Flame,
  FolderOpen,
  Gauge,
  Info,
  Library,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sparkles,
  Swords,
  Target,
  TimerReset,
  Trash2,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import {
  Field,
  Generations,
  Move,
  Pokemon,
  calculate,
  calcStat,
  type Result,
} from "@smogon/calc";
import rawData from "./data/champions-data.json";

type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
type Status = "" | "brn" | "par" | "psn" | "tox" | "slp" | "frz";
type Format = "Doubles" | "Singles";
type SideName = "mine" | "opponent";

type Stats = Record<StatKey, number>;

type MetaRow = {
  name?: string;
  percentage_value?: number | null;
  stat_up?: string;
  stat_down?: string;
  hp_points?: number;
  attack_points?: number;
  defense_points?: number;
  sp_atk_points?: number;
  sp_def_points?: number;
  speed_points?: number;
};

type FormatData = {
  position?: number;
  top: {
    move?: MetaRow | null;
    held_item?: MetaRow | null;
    teammate?: MetaRow | null;
    stat_alignment?: MetaRow | null;
    stat_points?: MetaRow | null;
    ability?: MetaRow | null;
  };
  values: Record<string, string[]>;
};

type FormData = {
  title: string;
  form_name: string;
  saved_name: string;
  slug: string;
  form_kind: string;
  types: string[];
  abilities: string;
  hp: number;
  attack: number;
  defense: number;
  sp_attack: number;
  sp_defense: number;
  speed: number;
  image_path: string;
};

type PokemonData = {
  name: string;
  showdownId: string;
  showdownName: string;
  learnableMoveNames: string[];
  forms: FormData[];
  battle: Record<Format, FormatData>;
};

type Dataset = {
  generatedAt: string;
  dataVersion: string;
  pokemon: PokemonData[];
};

type Build = {
  id: string;
  speciesId: string;
  formSlug: string;
  nature: string;
  ability: string;
  item: string;
  moves: string[];
  sp: Stats;
  status: Status;
};

type BattleState = {
  format: Format;
  weather: "" | "Sun" | "Rain" | "Sand" | "Snow";
  terrain: "" | "Electric" | "Grassy" | "Psychic" | "Misty";
  attackerStage: number;
  defenderStage: number;
  attackerSpeedStage: number;
  defenderSpeedStage: number;
  attackerTailwind: boolean;
  defenderTailwind: boolean;
  screen: boolean;
  crit: boolean;
  spread: boolean;
  defenderHP: number;
};

type LiveRow = {
  category: string;
  rank: number;
  name: string;
  percentage_value: number | null;
  hp_points?: number;
  attack_points?: number;
  defense_points?: number;
  sp_atk_points?: number;
  sp_def_points?: number;
  speed_points?: number;
};

type DamageScenario = {
  label: string;
  description: string;
  result: Result | null;
  defender: Build;
  crit: boolean;
  error?: string;
};

type SavedTeam = {
  id: string;
  name: string;
  team: Build[];
  replicaCode?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ImportedMember = {
  formName: string;
  item?: string;
  ability?: string;
  nature?: string;
  moves?: string[];
  sp?: Partial<Stats>;
};

const DATA = rawData as unknown as Dataset;
const GEN = Generations.get(9);
const POKEMON = DATA.pokemon.filter((pokemon) => pokemon.forms.length > 0);
const POKEMON_BY_ID = new Map(POKEMON.map((pokemon) => [pokemon.showdownId, pokemon]));
const NATURES = [
  "Adamant",
  "Bashful",
  "Bold",
  "Brave",
  "Calm",
  "Careful",
  "Docile",
  "Gentle",
  "Hardy",
  "Hasty",
  "Impish",
  "Jolly",
  "Lax",
  "Lonely",
  "Mild",
  "Modest",
  "Naive",
  "Naughty",
  "Quiet",
  "Quirky",
  "Rash",
  "Relaxed",
  "Sassy",
  "Timid",
  "Serious",
];
const ITEMS = Array.from(GEN.items).map((item) => item.name).sort();
const ALL_ABILITIES = Array.from(new Set(
  POKEMON.flatMap((pokemon) => pokemon.forms.flatMap((form) => form.abilities.split("|").filter(Boolean))),
)).sort();
const EMPTY_STATS: Stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const SPRITE_ROOT = "https://championsbattledata.com/";
const TEAM_STORAGE_KEY = "champion-lens-team-v1";

const TYPE_COLORS: Record<string, string> = {
  Normal: "#aab0bb",
  Fire: "#ff785c",
  Water: "#62a8ff",
  Electric: "#f5cb55",
  Grass: "#67c98a",
  Ice: "#87d9e3",
  Fighting: "#e05a73",
  Poison: "#ae78da",
  Ground: "#d09c63",
  Flying: "#91a9e6",
  Psychic: "#f2769a",
  Bug: "#98bc45",
  Rock: "#c4ad73",
  Ghost: "#737ac6",
  Dragon: "#7a79ef",
  Dark: "#7d7580",
  Steel: "#77a6b4",
  Fairy: "#e98bd4",
};

const MOVE_OVERRIDES: Record<
  string,
  { basePower: number; type: string; category: "Physical" | "Special" | "Status" }
> = {
  Growth: { basePower: 0, type: "Grass", category: "Status" },
  Crabhammer: { basePower: 100, type: "Water", category: "Physical" },
  "Bone Rush": { basePower: 30, type: "Ground", category: "Physical" },
  "Iron Head": { basePower: 80, type: "Steel", category: "Physical" },
  "Night Daze": { basePower: 90, type: "Dark", category: "Special" },
  Moonblast: { basePower: 95, type: "Fairy", category: "Special" },
  "First Impression": { basePower: 100, type: "Bug", category: "Physical" },
  "Spirit Shackle": { basePower: 90, type: "Ghost", category: "Physical" },
  "Fire Lash": { basePower: 90, type: "Fire", category: "Physical" },
  "Trop Kick": { basePower: 85, type: "Grass", category: "Physical" },
  "Beak Blast": { basePower: 120, type: "Flying", category: "Physical" },
  "Snap Trap": { basePower: 35, type: "Steel", category: "Physical" },
  "Apple Acid": { basePower: 90, type: "Grass", category: "Special" },
  "Grav Apple": { basePower: 90, type: "Grass", category: "Physical" },
  "Dire Claw": { basePower: 80, type: "Poison", category: "Physical" },
  "Psyshield Bash": { basePower: 90, type: "Psychic", category: "Physical" },
  "Mountain Gale": { basePower: 120, type: "Ice", category: "Physical" },
  "Infernal Parade": { basePower: 65, type: "Ghost", category: "Special" },
  "Make It Rain": { basePower: 120, type: "Steel", category: "Special" },
  "Syrup Bomb": { basePower: 60, type: "Grass", category: "Special" },
};

const DEFAULT_BATTLE: BattleState = {
  format: "Doubles",
  weather: "",
  terrain: "",
  attackerStage: 0,
  defenderStage: 0,
  attackerSpeedStage: 0,
  defenderSpeedStage: 0,
  attackerTailwind: false,
  defenderTailwind: false,
  screen: false,
  crit: false,
  spread: true,
  defenderHP: 100,
};

function uniqueId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizedTokens(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/g)?.sort().join("") ?? "";
}

function importedBuild(member: ImportedMember, format: Format): Build | null {
  const wanted = normalizedName(member.formName);
  let matchedPokemon: PokemonData | undefined;
  let matchedForm: FormData | undefined;

  for (const pokemon of POKEMON) {
    const form = pokemon.forms.find((candidate) => {
      const aliases = [
        candidate.form_name,
        candidate.saved_name,
        candidate.slug,
        candidate.title,
        pokemon.name,
        pokemon.showdownId,
        pokemon.showdownName,
        `${pokemon.name}-${candidate.form_kind}`,
      ];
      const wantedTokens = normalizedTokens(member.formName);
      return aliases.some((alias) => normalizedName(alias) === wanted || normalizedTokens(alias) === wantedTokens);
    });
    if (form) {
      matchedPokemon = pokemon;
      matchedForm = form;
      break;
    }
  }

  if (!matchedPokemon || !matchedForm) return null;
  const base = commonBuild(matchedPokemon.showdownId, format);
  const formAbilities = matchedForm.abilities.split("|").filter(Boolean);
  const importedAbility = member.ability && formAbilities.includes(member.ability)
    ? member.ability
    : formAbilities[0] || member.ability || base.ability;
  const sp: Stats = {
    hp: Math.min(32, Math.max(0, Number(member.sp?.hp) || 0)),
    atk: Math.min(32, Math.max(0, Number(member.sp?.atk) || 0)),
    def: Math.min(32, Math.max(0, Number(member.sp?.def) || 0)),
    spa: Math.min(32, Math.max(0, Number(member.sp?.spa) || 0)),
    spd: Math.min(32, Math.max(0, Number(member.sp?.spd) || 0)),
    spe: Math.min(32, Math.max(0, Number(member.sp?.spe) || 0)),
  };
  const total = Object.values(sp).reduce((sum, value) => sum + value, 0);

  return {
    ...base,
    id: uniqueId(),
    formSlug: matchedForm.slug,
    nature: member.nature && NATURES.includes(member.nature) ? member.nature : base.nature,
    ability: importedAbility,
    item: member.item ?? base.item,
    moves: member.moves?.length ? [...member.moves, "", "", "", ""].slice(0, 4) : base.moves,
    sp: total <= 66 ? sp : base.sp,
  };
}

function getPokemon(build?: Build | null) {
  return build ? POKEMON_BY_ID.get(build.speciesId) : undefined;
}

function uniqueForms(pokemon: PokemonData) {
  const seen = new Set<string>();
  return pokemon.forms.filter((form) => {
    const key = [
      form.types.join("/"),
      form.abilities,
      form.hp,
      form.attack,
      form.defense,
      form.sp_attack,
      form.sp_defense,
      form.speed,
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getForm(build?: Build | null) {
  const pokemon = getPokemon(build);
  if (!pokemon) return undefined;
  return pokemon.forms.find((form) => form.slug === build?.formSlug) ?? pokemon.forms[0];
}

function spriteUrl(form?: FormData) {
  if (!form) return "";
  return `${SPRITE_ROOT}${form.image_path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function parseStatSpread(row?: MetaRow | null): Stats {
  return {
    hp: row?.hp_points ?? 0,
    atk: row?.attack_points ?? 0,
    def: row?.defense_points ?? 0,
    spa: row?.sp_atk_points ?? 0,
    spd: row?.sp_def_points ?? 0,
    spe: row?.speed_points ?? 0,
  };
}

function chooseMegaForItem(pokemon: PokemonData, item: string) {
  if (!/ite(?:\s[XY])?$/i.test(item)) return pokemon.forms[0];
  const megas = pokemon.forms.filter((form) => form.form_kind === "Mega");
  if (!megas.length) return pokemon.forms[0];
  if (/\sX$/i.test(item)) {
    return megas.find((form) => /\sX$/i.test(form.form_name)) ?? megas[0];
  }
  if (/\sY$/i.test(item)) {
    return megas.find((form) => /\sY$/i.test(form.form_name)) ?? megas[0];
  }
  return megas[0];
}

function commonBuild(speciesId: string, format: Format = "Doubles"): Build {
  const pokemon = POKEMON_BY_ID.get(speciesId) ?? POKEMON[0];
  const meta = pokemon.battle[format];
  const item = meta?.top.held_item?.name || "";
  const form = chooseMegaForItem(pokemon, item);
  const ability =
    meta?.top.ability?.name || form.abilities.split("|").filter(Boolean)[0] || "";
  const moves = (meta?.values.move ?? pokemon.learnableMoveNames).filter(Boolean).slice(0, 4);

  return {
    id: uniqueId(),
    speciesId: pokemon.showdownId,
    formSlug: form.slug,
    nature: meta?.top.stat_alignment?.name || "Serious",
    ability,
    item,
    moves: [...moves, "", "", "", ""].slice(0, 4),
    sp: parseStatSpread(meta?.top.stat_points),
    status: "",
  };
}

function firstAvailable(ids: string[], count: number) {
  return ids
    .map((id) => POKEMON_BY_ID.get(id))
    .filter(Boolean)
    .slice(0, count)
    .map((pokemon) => commonBuild(pokemon!.showdownId));
}

const DEMO_TEAM = firstAvailable(["garchomp", "incineroar", "whimsicott"], 3);
const DEMO_OPPONENT = firstAvailable(["metagross", "primarina", "dragonite"], 3);

function natureMultiplier(nature: string, stat: StatKey) {
  const plusMinus: Record<string, [StatKey, StatKey]> = {
    Adamant: ["atk", "spa"],
    Bold: ["def", "atk"],
    Brave: ["atk", "spe"],
    Calm: ["spd", "atk"],
    Careful: ["spd", "spa"],
    Gentle: ["spd", "def"],
    Hasty: ["spe", "def"],
    Impish: ["def", "spa"],
    Jolly: ["spe", "spa"],
    Lax: ["def", "spd"],
    Lonely: ["atk", "def"],
    Mild: ["spa", "def"],
    Modest: ["spa", "atk"],
    Naive: ["spe", "spd"],
    Naughty: ["atk", "spd"],
    Quiet: ["spa", "spe"],
    Rash: ["spa", "spd"],
    Relaxed: ["def", "spe"],
    Sassy: ["spd", "spe"],
    Timid: ["spe", "atk"],
  };
  if (plusMinus[nature]?.[0] === stat) return 1.1;
  if (plusMinus[nature]?.[1] === stat) return 0.9;
  return 1;
}

function baseStatsFromForm(form: FormData): Stats {
  return {
    hp: form.hp - 75,
    atk: form.attack - 20,
    def: form.defense - 20,
    spa: form.sp_attack - 20,
    spd: form.sp_defense - 20,
    spe: form.speed - 20,
  };
}

function visibleStats(build: Build): Stats {
  const form = getForm(build);
  if (!form) return { ...EMPTY_STATS };
  const base = baseStatsFromForm(form);
  return {
    hp: form.hp + build.sp.hp,
    atk: Math.floor((base.atk + build.sp.atk + 20) * natureMultiplier(build.nature, "atk")),
    def: Math.floor((base.def + build.sp.def + 20) * natureMultiplier(build.nature, "def")),
    spa: Math.floor((base.spa + build.sp.spa + 20) * natureMultiplier(build.nature, "spa")),
    spd: Math.floor((base.spd + build.sp.spd + 20) * natureMultiplier(build.nature, "spd")),
    spe: Math.floor((base.spe + build.sp.spe + 20) * natureMultiplier(build.nature, "spe")),
  };
}

function stageMultiplier(stage: number) {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

function speedValue(
  build: Build,
  stage: number,
  weather: BattleState["weather"],
  tailwind: boolean,
) {
  let speed = visibleStats(build).spe;
  speed = Math.floor(speed * stageMultiplier(stage));
  if (build.status === "par") speed = Math.floor(speed / 2);
  if (build.item === "Choice Scarf") speed = Math.floor(speed * 1.5);
  if (build.item === "Iron Ball" || build.item === "Macho Brace") speed = Math.floor(speed / 2);
  if (
    (build.ability === "Swift Swim" && weather === "Rain") ||
    (build.ability === "Chlorophyll" && weather === "Sun") ||
    (build.ability === "Sand Rush" && weather === "Sand") ||
    (build.ability === "Slush Rush" && weather === "Snow")
  ) {
    speed *= 2;
  }
  if (tailwind) speed *= 2;
  return Math.floor(speed);
}

function speedRange(build: Build) {
  const form = getForm(build);
  if (!form) return [0, 0] as const;
  const base = baseStatsFromForm(form).spe;
  return [
    Math.floor((base + 20) * 0.9),
    Math.floor((base + 32 + 20) * 1.1),
  ] as const;
}

function calcNameFor(pokemon: PokemonData, form: FormData) {
  if (form.form_kind !== "Mega") return pokemon.showdownName;
  const withoutMega = form.form_name.replace(/^Mega\s+/i, "");
  const suffix = withoutMega.match(/\s([XY])$/i)?.[1]?.toUpperCase();
  const base = suffix ? withoutMega.replace(/\s[XY]$/i, "") : withoutMega;
  return `${base.replace(/\s+/g, "-")}-Mega${suffix ? `-${suffix}` : ""}`;
}

function findBaseForTarget(
  stat: Exclude<StatKey, "hp">,
  target: number,
  sp: number,
  nature: string,
) {
  for (let base = 1; base <= 255; base += 1) {
    const value = calcStat(GEN, stat, base, 31, sp * 8, 50, nature as never);
    if (value === target) return base;
  }
  return Math.max(1, target - sp - 20);
}

function makeMove(name: string, build: Build, crit: boolean, spread: boolean) {
  const initial = new Move(GEN, name);
  const champions = MOVE_OVERRIDES[name];
  const overrides: Record<string, unknown> = champions
    ? {
        basePower: champions.basePower,
        type: champions.type,
        category: champions.category,
      }
    : {};
  const type = champions?.type ?? initial.type;
  const basePower = champions?.basePower ?? initial.bp;

  if (build.ability === "Dragonize" && type === "Normal" && basePower > 0) {
    overrides.type = "Dragon";
    overrides.basePower = Math.floor(basePower * 1.2);
  }
  if (!spread) overrides.target = "any";

  return new Move(GEN, name, {
    isCrit: crit,
    overrides: overrides as never,
  });
}

function makeCalcPokemon(
  build: Build,
  boosts: Partial<Stats>,
  currentHPPercent = 100,
  fireManeStat?: "atk" | "spa",
) {
  const pokemon = getPokemon(build);
  const form = getForm(build);
  if (!pokemon || !form) throw new Error("Choose both Pokémon first.");
  const baseStats = baseStatsFromForm(form);

  if (fireManeStat) {
    const current = visibleStats(build)[fireManeStat];
    baseStats[fireManeStat] = findBaseForTarget(
      fireManeStat,
      Math.floor(current * 1.5),
      build.sp[fireManeStat],
      build.nature,
    );
  }

  const displayStats = visibleStats(build);
  const currentHP = Math.max(1, Math.floor((displayStats.hp * currentHPPercent) / 100));
  const ability = build.ability === "Eelevate" ? "Levitate" : build.ability;
  const options = {
    level: 50,
    nature: build.nature,
    ability,
    item: build.item || undefined,
    status: build.status,
    evs: Object.fromEntries(
      Object.entries(build.sp).map(([key, value]) => [key, value * 8]),
    ),
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    boosts,
    curHP: currentHP,
    overrides: {
      name: calcNameFor(pokemon, form),
      types: form.types,
      baseStats,
      abilities: { 0: ability },
    },
  };

  const preferred = calcNameFor(pokemon, form);
  try {
    return new Pokemon(GEN, preferred, options as never);
  } catch {
    return new Pokemon(GEN, pokemon.showdownName, options as never);
  }
}

function runDamage(
  attacker: Build,
  defender: Build,
  moveName: string,
  state: BattleState,
  crit = state.crit,
) {
  const movePreview = makeMove(moveName, attacker, crit, state.spread);
  const attackingStat = movePreview.category === "Physical" ? "atk" : "spa";
  const defensiveStat = movePreview.category === "Physical" ? "def" : "spd";
  const fireManeStat =
    attacker.ability === "Fire Mane" && movePreview.type === "Fire"
      ? attackingStat
      : undefined;
  const atk = makeCalcPokemon(
    attacker,
    { [attackingStat]: state.attackerStage },
    100,
    fireManeStat,
  );
  const def = makeCalcPokemon(
    defender,
    { [defensiveStat]: state.defenderStage },
    state.defenderHP,
  );

  const weather = attacker.ability === "Mega Sol" ? "Sun" : state.weather || undefined;
  const field = new Field({
    gameType: state.format,
    weather,
    terrain: state.terrain || undefined,
    isFairyAura:
      attacker.ability === "Fairy Aura" || defender.ability === "Fairy Aura",
    attackerSide: {
      isTailwind: state.attackerTailwind,
    },
    defenderSide: {
      isReflect: state.screen && movePreview.category === "Physical",
      isLightScreen: state.screen && movePreview.category === "Special",
      isTailwind: state.defenderTailwind,
    },
  } as never);

  return calculate(GEN, atk, def, movePreview, field);
}

function bulkyBuild(build: Build, category: string) {
  const sp: Stats = { ...EMPTY_STATS, hp: 32, [category === "Physical" ? "def" : "spd"]: 32 };
  sp[category === "Physical" ? "spd" : "def"] = 2;
  return {
    ...build,
    id: uniqueId(),
    nature: category === "Physical" ? "Bold" : "Calm",
    sp,
  };
}

function damageRolls(result: Result | null) {
  if (!result) return [];
  const flatten = (value: unknown): number[] =>
    Array.isArray(value) ? value.flatMap(flatten) : typeof value === "number" ? [value] : [];
  return flatten(result.damage);
}

function koChance(result: Result | null, defender: Build, hpPercent: number) {
  if (!result) return 0;
  const rolls = damageRolls(result);
  const maxHP = visibleStats(defender).hp;
  const currentHP = Math.max(1, Math.floor((maxHP * hpPercent) / 100));
  if (!rolls.length) return 0;
  return (rolls.filter((damage) => damage >= currentHP).length / rolls.length) * 100;
}

function percent(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(value >= 10 ? 1 : 2)}%` : "";
}

function formatSpread(sp: Stats) {
  const labels: Record<StatKey, string> = {
    hp: "HP",
    atk: "Atk",
    def: "Def",
    spa: "SpA",
    spd: "SpD",
    spe: "Spe",
  };
  return (Object.entries(sp) as [StatKey, number][])
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${value} ${labels[key]}`)
    .join(" / ") || "0 SP";
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="type-badge"
      style={{ "--type": TYPE_COLORS[type] ?? "#8a93a5" } as CSSProperties}
    >
      {type}
    </span>
  );
}

function Sprite({ build, size = 64 }: { build?: Build | null; size?: number }) {
  const form = getForm(build);
  return form ? (
    <img
      className="pokemon-sprite"
      src={spriteUrl(form)}
      alt={form.form_name}
      width={size}
      height={size}
      loading="lazy"
    />
  ) : (
    <div className="sprite-placeholder" style={{ width: size, height: size }}>
      <Plus size={18} />
    </div>
  );
}

function TeamSlot({
  build,
  index,
  active,
  side,
  onSelect,
  onEdit,
}: {
  build?: Build;
  index: number;
  active: boolean;
  side: SideName;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const form = getForm(build);
  const pokemon = getPokemon(build);
  return (
    <div className={`team-slot ${active ? "is-active" : ""} ${side}`}>
      <button
        className="team-slot-main"
        onClick={build ? onSelect : onEdit}
        aria-label={build ? `Select ${form?.form_name}` : `Add Pokémon in slot ${index + 1}`}
      >
        <span className="slot-number">{index + 1}</span>
        <Sprite build={build} size={52} />
        <span className="team-slot-copy">
          <strong>{form?.form_name ?? "Add Pokémon"}</strong>
          <small>
            {build
              ? `${build.item || "No item"} · ${build.nature}`
              : side === "mine"
                ? "Build this slot"
                : "Log the opponent"}
          </small>
        </span>
      </button>
      {build && (
        <button className="icon-button edit-slot" onClick={onEdit} title={`Edit ${pokemon?.name}`}>
          <Edit3 size={14} />
        </button>
      )}
    </div>
  );
}

function CombatantCard({
  build,
  role,
  stage,
  speedStage,
  onStage,
  onSpeedStage,
  onStatus,
}: {
  build?: Build;
  role: "Attacker" | "Defender";
  stage: number;
  speedStage: number;
  onStage: (stage: number) => void;
  onSpeedStage: (stage: number) => void;
  onStatus: (status: Status) => void;
}) {
  const form = getForm(build);
  const stats = build ? visibleStats(build) : null;
  return (
    <article className={`combatant ${role.toLowerCase()}`}>
      <div className="combatant-kicker">
        {role === "Attacker" ? <Crosshair size={14} /> : <Shield size={14} />}
        {role}
      </div>
      <div className="combatant-main">
        <Sprite build={build} size={88} />
        <div className="combatant-copy">
          <h2>{form?.form_name ?? `Choose ${role.toLowerCase()}`}</h2>
          <div className="type-row">
            {form?.types.map((type) => <TypeBadge key={type} type={type} />)}
          </div>
          {build && (
            <p>{build.item || "No item"} <span>·</span> {build.ability || "No ability"}</p>
          )}
        </div>
      </div>
      {build && stats && (
        <>
          <div className="quick-stat-row">
            <span><b>{stats.hp}</b> HP</span>
            <span><b>{stats.atk}</b> Atk</span>
            <span><b>{stats.spa}</b> SpA</span>
            <span><b>{stats.spe}</b> Spe</span>
          </div>
          <div className="combatant-controls">
            <label>
              <span>{role === "Attacker" ? "Power" : "Guard"}</span>
              <select value={stage} onChange={(event) => onStage(Number(event.target.value))}>
                {Array.from({ length: 13 }, (_, index) => index - 6).map((value) => (
                  <option key={value} value={value}>{value > 0 ? `+${value}` : value}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Speed</span>
              <select value={speedStage} onChange={(event) => onSpeedStage(Number(event.target.value))}>
                {Array.from({ length: 13 }, (_, index) => index - 6).map((value) => (
                  <option key={value} value={value}>{value > 0 ? `+${value}` : value}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={build.status} onChange={(event) => onStatus(event.target.value as Status)}>
                <option value="">Healthy</option>
                <option value="brn">Burned</option>
                <option value="par">Paralyzed</option>
                <option value="psn">Poisoned</option>
                <option value="tox">Badly poisoned</option>
                <option value="slp">Asleep</option>
                <option value="frz">Frozen</option>
              </select>
            </label>
          </div>
        </>
      )}
    </article>
  );
}

function SpeedBanner({
  attacker,
  defender,
  state,
  move,
  onChange,
}: {
  attacker?: Build;
  defender?: Build;
  state: BattleState;
  move?: Move;
  onChange: (patch: Partial<BattleState>) => void;
}) {
  const attackerSpeed = attacker
    ? speedValue(attacker, state.attackerSpeedStage, state.weather, state.attackerTailwind)
    : 0;
  const defenderSpeed = defender
    ? speedValue(defender, state.defenderSpeedStage, state.weather, state.defenderTailwind)
    : 0;
  const range = defender ? speedRange(defender) : [0, 0];
  const priority = move?.priority ?? 0;
  const verdict =
    !attacker || !defender
      ? "Select both sides"
      : priority > 0
        ? `Priority +${priority}`
        : attackerSpeed > defenderSpeed
          ? "You move first"
          : attackerSpeed < defenderSpeed
            ? "Opponent moves first"
            : "Speed tie";

  return (
    <section className="speed-banner" aria-label="Speed comparison">
      <div className="speed-verdict">
        <span className="speed-icon"><Zap size={19} /></span>
        <div>
          <small>TURN ORDER</small>
          <strong>{verdict}</strong>
        </div>
      </div>
      <div className="speed-matchup">
        <div>
          <span>Attacker</span>
          <b>{attackerSpeed || "—"}</b>
          <label className="mini-check">
            <input
              type="checkbox"
              checked={state.attackerTailwind}
              onChange={(event) => onChange({ attackerTailwind: event.target.checked })}
            />
            Tailwind
          </label>
        </div>
        <ChevronRight size={18} />
        <div>
          <span>Defender</span>
          <b>{defenderSpeed || "—"}</b>
          <label className="mini-check">
            <input
              type="checkbox"
              checked={state.defenderTailwind}
              onChange={(event) => onChange({ defenderTailwind: event.target.checked })}
            />
            Tailwind
          </label>
        </div>
      </div>
      <div className="speed-range">
        <CircleGauge size={17} />
        <div>
          <small>OPPONENT NATURAL RANGE</small>
          <strong>{defender ? `${range[0]}–${range[1]}` : "—"}</strong>
        </div>
        <span>0 SP hindering → 32 SP boosting</span>
      </div>
    </section>
  );
}

function DamageRow({
  scenario,
  hpPercent,
  moveName,
}: {
  scenario: DamageScenario;
  hpPercent: number;
  moveName: string;
}) {
  const range = scenario.result?.range() ?? [0, 0];
  const maxHP = visibleStats(scenario.defender).hp || 1;
  const low = (range[0] / maxHP) * 100;
  const high = (range[1] / maxHP) * 100;
  const chance = koChance(scenario.result, scenario.defender, hpPercent);
  const koText = chance === 100 ? "Guaranteed KO" : chance > 0 ? `${chance.toFixed(1)}% KO` : "No 1-hit KO";
  return (
    <div className={`damage-row ${scenario.crit ? "critical" : ""}`}>
      <div className="scenario-copy">
        <div className="scenario-title">
          {scenario.crit ? <Sparkles size={15} /> : <Target size={15} />}
          <strong>{scenario.label}</strong>
        </div>
        <span>{scenario.description}</span>
      </div>
      {scenario.error ? (
        <div className="damage-error"><TriangleAlert size={15} /> {scenario.error}</div>
      ) : (
        <>
          <div className="damage-amount">
            <strong>{range[0]}–{range[1]}</strong>
            <span>{low.toFixed(1)}–{high.toFixed(1)}%</span>
          </div>
          <div className="damage-track" aria-label={`${moveName} damage ${low.toFixed(1)} to ${high.toFixed(1)} percent`}>
            <span className="damage-fill" style={{ width: `${Math.min(100, high)}%` }} />
            <span className="damage-min" style={{ left: `${Math.min(100, low)}%` }} />
            <span className="damage-ko" />
          </div>
          <div className={`ko-chip ${chance > 0 ? "has-chance" : ""}`}>{koText}</div>
        </>
      )}
    </div>
  );
}

function ScoutBar({ label, value, max = 100 }: { label: string; value?: number | null; max?: number }) {
  return (
    <div className="scout-bar">
      <div><span>{label}</span><b>{percent(value)}</b></div>
      <span className="scout-track"><span style={{ width: `${Math.min(100, ((value ?? 0) / max) * 100)}%` }} /></span>
    </div>
  );
}

function ScoutPanel({
  build,
  format,
  liveRows,
  loading,
}: {
  build?: Build;
  format: Format;
  liveRows: LiveRow[];
  loading: boolean;
}) {
  const pokemon = getPokemon(build);
  const form = getForm(build);
  const meta = pokemon?.battle[format];
  const byCategory = (category: string) => liveRows.filter((row) => row.category === category).slice(0, 6);
  const moves = byCategory("move");
  const items = byCategory("held_item");
  const natures = byCategory("stat_alignment");
  const fallbackMoves = meta?.values.move?.slice(0, 6) ?? [];

  if (!pokemon || !build || !form) {
    return (
      <section className="scout-panel empty-state">
        <Crosshair size={28} />
        <h3>Opponent intel</h3>
        <p>Add an opposing Pokémon to see its current moves, item, nature, spread, and speed range.</p>
      </section>
    );
  }

  return (
    <section className="scout-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow"><Activity size={13} /> LIVE BATTLE DATA</span>
          <h3>{form.form_name}</h3>
        </div>
        {loading && <RefreshCw className="spin" size={15} />}
      </div>
      <div className="scout-summary">
        <Sprite build={build} size={72} />
        <div>
          <div className="type-row">{form.types.map((type) => <TypeBadge key={type} type={type} />)}</div>
          <strong>#{meta?.position ?? "—"} in {format}</strong>
          <span>{meta?.top.teammate?.name ? `Often paired with ${meta.top.teammate.name}` : "Current Regulation M-B"}</span>
        </div>
      </div>
      <div className="scout-section">
        <h4>Likely moves</h4>
        {(moves.length ? moves : fallbackMoves.map((name, index) => ({ name, percentage_value: index === 0 ? meta?.top.move?.percentage_value ?? null : null } as LiveRow))).map((row) => (
          <ScoutBar key={row.name} label={row.name} value={row.percentage_value} />
        ))}
      </div>
      <div className="scout-section compact">
        <h4>Set tells</h4>
        <div className="tell-grid">
          <div><span>Item</span><strong>{items[0]?.name ?? meta?.top.held_item?.name ?? "Unknown"}</strong><small>{percent(items[0]?.percentage_value ?? meta?.top.held_item?.percentage_value)}</small></div>
          <div><span>Ability</span><strong>{meta?.top.ability?.name ?? build.ability}</strong><small>{percent(meta?.top.ability?.percentage_value)}</small></div>
          <div><span>Nature</span><strong>{natures[0]?.name ?? meta?.top.stat_alignment?.name ?? build.nature}</strong><small>{percent(natures[0]?.percentage_value ?? meta?.top.stat_alignment?.percentage_value)}</small></div>
          <div><span>Common SP</span><strong>{formatSpread(parseStatSpread(meta?.top.stat_points))}</strong><small>{percent(meta?.top.stat_points?.percentage_value)}</small></div>
        </div>
      </div>
      <p className="source-note"><Info size={12} /> Current ranked sample from Champions Battle Data; values refresh when available.</p>
    </section>
  );
}

function BuilderModal({
  side,
  initial,
  format,
  onClose,
  onSave,
}: {
  side: SideName;
  initial?: Build;
  format: Format;
  onClose: () => void;
  onSave: (build: Build) => void;
}) {
  const [query, setQuery] = useState(initial ? getPokemon(initial)?.name ?? "" : "");
  const [draft, setDraft] = useState<Build>(() => initial ? { ...initial, sp: { ...initial.sp }, moves: [...initial.moves] } : commonBuild(POKEMON[0].showdownId, format));
  const pokemon = getPokemon(draft)!;
  const form = getForm(draft)!;
  const totalSP = Object.values(draft.sp).reduce((sum, value) => sum + value, 0);
  const sortedPokemon = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...POKEMON]
      .filter((entry) => !needle || entry.name.toLowerCase().includes(needle) || entry.forms.some((candidate) => candidate.form_name.toLowerCase().includes(needle)))
      .sort((a, b) => (a.battle[format]?.position ?? 999) - (b.battle[format]?.position ?? 999))
      .slice(0, 80);
  }, [query, format]);

  const choosePokemon = (entry: PokemonData) => {
    const next = commonBuild(entry.showdownId, format);
    setDraft({ ...next, id: initial?.id ?? next.id });
    setQuery(entry.name);
  };

  const setSP = (key: StatKey, raw: number) => {
    const without = totalSP - draft.sp[key];
    const value = Math.max(0, Math.min(32, Number.isFinite(raw) ? raw : 0, 66 - without));
    setDraft((current) => ({ ...current, sp: { ...current.sp, [key]: value } }));
  };

  const updateMove = (index: number, move: string) => {
    const moves = [...draft.moves];
    moves[index] = move;
    setDraft((current) => ({ ...current, moves }));
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="builder-modal" role="dialog" aria-modal="true" aria-label={`Edit ${side === "mine" ? "your" : "opponent"} Pokémon`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="builder-header">
          <div>
            <span className="eyebrow">{side === "mine" ? "YOUR TEAM" : "OPPONENT"} · SLOT EDITOR</span>
            <h2>Configure battle set</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close editor"><X size={20} /></button>
        </header>
        <div className="builder-body">
          <aside className="pokemon-browser">
            <label className="search-box">
              <Search size={17} />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search 236 eligible Pokémon…" />
            </label>
            <div className="pokemon-results">
              {sortedPokemon.map((entry) => {
                const preview = commonBuild(entry.showdownId, format);
                return (
                  <button key={entry.showdownId} className={entry.showdownId === draft.speciesId ? "selected" : ""} onClick={() => choosePokemon(entry)}>
                    <Sprite build={preview} size={46} />
                    <span><strong>{entry.name}</strong><small>#{entry.battle[format]?.position ?? "—"} · {entry.forms[0].types.join(" / ")}</small></span>
                    {entry.showdownId === draft.speciesId && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </aside>
          <main className="set-editor">
            <div className="set-identity">
              <Sprite build={draft} size={116} />
              <div>
                <span className="eyebrow">CURRENT BUILD</span>
                <h3>{form.form_name}</h3>
                <div className="type-row">{form.types.map((type) => <TypeBadge key={type} type={type} />)}</div>
                <p>{form.abilities.split("|").join(" · ")}</p>
              </div>
            </div>
            <div className="field-grid three">
              <label>
                <span>Form</span>
                <select value={draft.formSlug} onChange={(event) => {
                  const nextForm = pokemon.forms.find((candidate) => candidate.slug === event.target.value) ?? pokemon.forms[0];
                  setDraft((current) => ({ ...current, formSlug: nextForm.slug, ability: nextForm.abilities.split("|")[0] || current.ability }));
                }}>
                  {uniqueForms(pokemon).map((candidate) => <option key={candidate.slug} value={candidate.slug}>{candidate.form_name}</option>)}
                </select>
              </label>
              <label>
                <span>Nature / alignment</span>
                <select value={draft.nature} onChange={(event) => setDraft((current) => ({ ...current, nature: event.target.value }))}>
                  {NATURES.map((nature) => <option key={nature}>{nature}</option>)}
                </select>
              </label>
              <label>
                <span>Ability</span>
                <input list="champions-abilities" value={draft.ability} onChange={(event) => setDraft((current) => ({ ...current, ability: event.target.value }))} placeholder="Choose ability" />
                <datalist id="champions-abilities">
                  {Array.from(new Set([...form.abilities.split("|").filter(Boolean), ...ALL_ABILITIES])).map((ability) => <option key={ability} value={ability} />)}
                </datalist>
              </label>
              <label className="wide-field">
                <span>Held item</span>
                <input list="champions-items" value={draft.item} onChange={(event) => setDraft((current) => ({ ...current, item: event.target.value }))} placeholder="No item" />
                <datalist id="champions-items">{ITEMS.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
            </div>
            <section className="editor-section">
              <div className="editor-section-heading"><div><h4>Moves</h4><span>Champions learnset for {pokemon.name}</span></div></div>
              <datalist id="champions-moves">{pokemon.learnableMoveNames.map((move) => <option key={move} value={move} />)}</datalist>
              <div className="move-grid">
                {Array.from({ length: 4 }, (_, index) => (
                  <label key={index}><span>{index + 1}</span><input list="champions-moves" value={draft.moves[index] ?? ""} onChange={(event) => updateMove(index, event.target.value)} placeholder="Choose move" /></label>
                ))}
              </div>
            </section>
            <section className="editor-section">
              <div className="editor-section-heading">
                <div><h4>Stat Points</h4><span>Champions Lv. 50 · 32 max per stat</span></div>
                <div className={`budget ${totalSP > 66 ? "over" : ""}`}><b>{totalSP}</b> / 66 SP</div>
              </div>
              <div className="budget-track"><span style={{ width: `${Math.min(100, (totalSP / 66) * 100)}%` }} /></div>
              <div className="stat-inputs">
                {(["hp", "atk", "def", "spa", "spd", "spe"] as StatKey[]).map((key) => (
                  <label key={key}>
                    <span>{key === "spa" ? "SpA" : key === "spd" ? "SpD" : key.toUpperCase()}</span>
                    <input type="number" min="0" max="32" value={draft.sp[key]} onChange={(event) => setSP(key, Number(event.target.value))} />
                    <small>{visibleStats(draft)[key]}</small>
                  </label>
                ))}
              </div>
            </section>
          </main>
        </div>
        <footer className="builder-footer">
          <span><BadgeInfo size={14} /> IVs and EVs are not entered in Champions; SP is applied directly at Lv. 50.</span>
          <div><button className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" onClick={() => onSave(draft)}><Save size={16} /> Save set</button></div>
        </footer>
      </div>
    </div>
  );
}

function TeamLibraryModal({
  currentTeam,
  format,
  onClose,
  onLoad,
}: {
  currentTeam: Build[];
  format: Format;
  onClose: () => void;
  onLoad: (team: Build[]) => void;
}) {
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [teamName, setTeamName] = useState("My team");
  const [teamId, setTeamId] = useState("");
  const [pendingReplicaCode, setPendingReplicaCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "import" | string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    const response = await fetch("/api/team-library", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load your team library.");
    setTeams(payload.teams ?? []);
  };

  useEffect(() => {
    refresh()
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load your team library."))
      .finally(() => setLoading(false));
  }, []);

  const loadTeam = (team: Build[]) => {
    onLoad(team.slice(0, 6).map((build) => ({ ...build, id: uniqueId() })));
    setMessage("Team loaded into the battle workspace.");
    setError("");
  };

  const saveCurrent = async () => {
    if (!currentTeam.length) {
      setError("Add at least one Pokémon before saving this team.");
      return;
    }
    setBusy("save");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/team-library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() || "My team", team: currentTeam, replicaCode: pendingReplicaCode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save this team.");
      await refresh();
      setMessage(`Saved as ${payload.team.id}. Use that Team ID on any computer.`);
      setTeamId(payload.team.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save this team.");
    } finally {
      setBusy(null);
    }
  };

  const importById = async () => {
    const normalized = teamId.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized) {
      setError("Enter a Team ID first.");
      return;
    }
    setBusy("import");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/team-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: normalized }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "That Team ID could not be imported.");
      if (payload.savedTeam) {
        loadTeam(payload.savedTeam.team);
        setTeamName(payload.savedTeam.name);
        setPendingReplicaCode(payload.savedTeam.replicaCode ?? "");
        setMessage(`Loaded ${payload.savedTeam.name} from your Champion Lens library.`);
        return;
      }
      const imported = (payload.team as ImportedMember[])
        .map((member) => importedBuild(member, format))
        .filter((build): build is Build => Boolean(build))
        .slice(0, 6);
      if (!imported.length) throw new Error("The public listing was found, but its Pokémon could not be matched to the current Champions roster.");
      loadTeam(imported);
      setTeamName(payload.name || `Replica ${normalized}`);
      setPendingReplicaCode(payload.replicaCode || normalized);
      setMessage(payload.detailLevel === "roster"
        ? `Imported the ${imported.length}-Pokémon roster from ${payload.source}. That source does not publish every set detail on the web, so common current builds were filled in for review.`
        : `Imported ${imported.length} Pokémon with their published sets from ${payload.source}. Review them, then save the team to get a permanent Champion Lens ID.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "That Team ID could not be imported.");
    } finally {
      setBusy(null);
    }
  };

  const deleteTeam = async (team: SavedTeam) => {
    if (!window.confirm(`Delete “${team.name}” from your team library?`)) return;
    setBusy(team.id);
    setError("");
    try {
      const response = await fetch(`/api/team-library/${team.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not delete this team.");
      setTeams((current) => current.filter((entry) => entry.id !== team.id));
      setMessage(`${team.name} was deleted.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete this team.");
    } finally {
      setBusy(null);
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setMessage(`Copied Team ID ${id}.`);
    } catch {
      setTeamId(id);
      setMessage(`Team ID ${id} is ready to copy from the import field.`);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="team-library-modal" role="dialog" aria-modal="true" aria-labelledby="team-library-title">
        <header className="builder-header">
          <div><span className="eyebrow">CLOUD TEAM STORAGE</span><h2 id="team-library-title">Your team library</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close team library"><X size={17} /></button>
        </header>

        <div className="library-body">
          <section className="library-import-card">
            <div className="library-section-title">
              <span className="library-icon"><Download size={18} /></span>
              <div><h3>Enter a Team ID</h3><p>Loads an exact Champion Lens ID or a publicly listed Champions Replica ID.</p></div>
            </div>
            <div className="library-input-row">
              <input value={teamId} onChange={(event) => setTeamId(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === "Enter" && importById()} placeholder="e.g. CL8F2A7C91 or 4122KDDUN0" aria-label="Team ID" />
              <button className="button primary" onClick={importById} disabled={busy !== null}>
                {busy === "import" ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />} Import team
              </button>
            </div>
            <p className="library-helper"><Info size={13} /> Pokémon does not offer a public decoder for every private Replica ID. Publicly shared IDs are imported when a supported listing is available.</p>
          </section>

          <section className="library-save-card">
            <div className="library-section-title">
              <span className="library-icon lime"><CloudCheck size={18} /></span>
              <div><h3>Save the team currently on screen</h3><p>Creates a permanent Champion Lens ID that works on your Windows or Mac browser.</p></div>
            </div>
            <div className="current-team-preview">
              <div className="library-sprites">
                {currentTeam.map((build) => <span key={build.id}><Sprite build={build} size={45} /></span>)}
                {!currentTeam.length && <small>No Pokémon in the current team</small>}
              </div>
              <span>{currentTeam.length}/6</span>
            </div>
            <div className="library-input-row">
              <input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Team name" maxLength={80} aria-label="Name for saved team" />
              <button className="button primary" onClick={saveCurrent} disabled={busy !== null || !currentTeam.length}>
                {busy === "save" ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Save new team
              </button>
            </div>
          </section>

          <section className="saved-teams-section">
            <div className="saved-teams-heading">
              <div><span className="eyebrow">SAVED TEAMS</span><h3>{teams.length} in your library</h3></div>
              {loading && <LoaderCircle className="spin" size={17} />}
            </div>
            {!loading && !teams.length ? (
              <div className="library-empty"><FolderOpen size={24} /><p>Save your current team to create the first reusable Team ID.</p></div>
            ) : (
              <div className="saved-team-list">
                {teams.map((team) => (
                  <article className="saved-team-row" key={team.id}>
                    <div className="saved-team-main">
                      <div className="library-sprites compact">{team.team.map((build) => <span key={build.id}><Sprite build={build} size={39} /></span>)}</div>
                      <div><strong>{team.name}</strong><button className="team-id-copy" onClick={() => copyId(team.id)} title="Copy Team ID"><code>{team.id}</code><Copy size={12} /></button></div>
                    </div>
                    <div className="saved-team-meta">
                      {team.replicaCode && <span>Replica {team.replicaCode}</span>}
                      <span>Updated {new Date(team.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="saved-team-actions">
                      <button className="button secondary" onClick={() => loadTeam(team.team)}><FolderOpen size={14} /> Load</button>
                      <button className="icon-button delete-team" onClick={() => deleteTeam(team)} disabled={busy === team.id} title={`Delete ${team.name}`}><Trash2 size={14} /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="library-footer">
          <div aria-live="polite">{error ? <span className="library-error"><TriangleAlert size={14} />{error}</span> : message ? <span className="library-message"><Check size={14} />{message}</span> : <span>Your saved teams are available anywhere you open this private app.</span>}</div>
          <button className="button secondary" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}

export function BattleLens() {
  const [myTeam, setMyTeam] = useState<Build[]>(DEMO_TEAM);
  const [opponentTeam, setOpponentTeam] = useState<Build[]>(DEMO_OPPONENT);
  const [myActive, setMyActive] = useState(0);
  const [opponentActive, setOpponentActive] = useState(0);
  const [perspective, setPerspective] = useState<"mine" | "theirs">("mine");
  const [battle, setBattle] = useState<BattleState>(DEFAULT_BATTLE);
  const [moveName, setMoveName] = useState("");
  const [editor, setEditor] = useState<{ side: SideName; index: number } | null>(null);
  const [teamLibraryOpen, setTeamLibraryOpen] = useState(false);
  const [liveRows, setLiveRows] = useState<LiveRow[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TEAM_STORAGE_KEY);
      if (stored) setMyTeam(JSON.parse(stored));
    } catch {
      // Local storage is optional; the app remains fully usable without it.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(myTeam));
  }, [myTeam, hydrated]);

  const mine = myTeam[myActive];
  const opponent = opponentTeam[opponentActive];
  const attacker = perspective === "mine" ? mine : opponent;
  const defender = perspective === "mine" ? opponent : mine;
  const attackerTeam = perspective === "mine" ? myTeam : opponentTeam;
  const attackerPokemon = getPokemon(attacker);

  const availableMoves = useMemo(() => {
    if (!attacker || !attackerPokemon) return [];
    const saved = attacker.moves.filter(Boolean);
    return Array.from(new Set([...saved, ...attackerPokemon.learnableMoveNames]));
  }, [attacker, attackerPokemon]);

  useEffect(() => {
    const first = attacker?.moves.find(Boolean) ?? availableMoves[0] ?? "";
    if (!availableMoves.includes(moveName) || !moveName) setMoveName(first);
  }, [attacker?.id, perspective, availableMoves, moveName, attacker]);

  const move = useMemo(() => {
    if (!moveName || !attacker) return undefined;
    try {
      return makeMove(moveName, attacker, battle.crit, battle.spread);
    } catch {
      return undefined;
    }
  }, [moveName, attacker, battle.crit, battle.spread]);

  useEffect(() => {
    if (!opponent) {
      setLiveRows([]);
      return;
    }
    const controller = new AbortController();
    setLiveLoading(true);
    fetch(`https://championsbattledata.com/api/battle/${battle.format}/${opponent.speciesId}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("No live data")))
      .then((payload) => setLiveRows(payload.rows ?? []))
      .catch(() => setLiveRows([]))
      .finally(() => setLiveLoading(false));
    return () => controller.abort();
  }, [opponent?.speciesId, battle.format, opponent]);

  const scenarios = useMemo<DamageScenario[]>(() => {
    if (!attacker || !defender || !moveName || !move) return [];
    const output: DamageScenario[] = [];
    const defenderIsOpponent = perspective === "mine";
    const exactLabel = defenderIsOpponent ? "Logged opponent set" : "Your exact set";
    const exactDescription = `${defender.nature} · ${formatSpread(defender.sp)}${defender.item ? ` · ${defender.item}` : ""}`;

    const add = (label: string, description: string, set: Build, crit: boolean) => {
      try {
        output.push({ label, description, defender: set, crit, result: runDamage(attacker, set, moveName, battle, crit) });
      } catch (error) {
        output.push({ label, description, defender: set, crit, result: null, error: error instanceof Error ? error.message : "Calculation unavailable" });
      }
    };

    add(exactLabel, exactDescription, defender, battle.crit);
    if (defenderIsOpponent) {
      const common = commonBuild(defender.speciesId, battle.format);
      add("Most common ranked build", `${common.nature} · ${formatSpread(common.sp)}${common.item ? ` · ${common.item}` : ""}`, common, battle.crit);
      const bulky = bulkyBuild(common, move.category);
      add(`Maximum ${move.category === "Physical" ? "physical" : "special"} bulk`, `${bulky.nature} · ${formatSpread(bulky.sp)} · plausible ceiling`, bulky, battle.crit);
      add("Critical vs common build", "Critical multiplier; favorable defensive boosts are ignored", common, true);
    } else {
      const commonAttacker = commonBuild(attacker.speciesId, battle.format);
      try {
        output.push({ label: "Most common attacker set", description: `${commonAttacker.nature} · ${formatSpread(commonAttacker.sp)} · ${commonAttacker.item || "No item"}`, defender, crit: battle.crit, result: runDamage(commonAttacker, defender, moveName, battle, battle.crit) });
      } catch {
        // Exact set remains the primary useful result.
      }
      add("Critical hit into your set", "Critical multiplier; favorable defensive boosts are ignored", defender, true);
    }
    return output;
  }, [attacker, defender, moveName, move, battle, perspective]);

  const updateBattle = (patch: Partial<BattleState>) => setBattle((current) => ({ ...current, ...patch }));

  const updateActiveBuild = (role: "attacker" | "defender", patch: Partial<Build>) => {
    const side: SideName =
      role === "attacker"
        ? perspective === "mine" ? "mine" : "opponent"
        : perspective === "mine" ? "opponent" : "mine";
    const index = side === "mine" ? myActive : opponentActive;
    const setter = side === "mine" ? setMyTeam : setOpponentTeam;
    setter((current) => current.map((build, buildIndex) => buildIndex === index ? { ...build, ...patch } : build));
  };

  const saveEditor = (build: Build) => {
    if (!editor) return;
    const setter = editor.side === "mine" ? setMyTeam : setOpponentTeam;
    setter((current) => {
      const next = [...current];
      next[editor.index] = build;
      return next.filter(Boolean).slice(0, 6);
    });
    if (editor.side === "mine") setMyActive(editor.index);
    else setOpponentActive(editor.index);
    setEditor(null);
  };

  const newBattle = () => {
    setOpponentTeam([]);
    setOpponentActive(0);
    setPerspective("mine");
    setBattle(DEFAULT_BATTLE);
    setLiveRows([]);
  };

  const moveMeta = move ? `${move.type} · ${move.category} · ${move.bp || "—"} power${move.priority ? ` · +${move.priority} priority` : ""}` : "Choose a damaging move";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Crosshair size={19} /></span>
          <div><strong>Champion Lens</strong><span>Battle-side calculator</span></div>
        </div>
        <div className="regulation-strip">
          <span className="live-dot" />
          <strong>Regulation M-B</strong>
          <span>Lv. 50 · 66 SP · Mega Evolution</span>
          <span>Current through Sep 2, 2026</span>
        </div>
        <div className="top-actions">
          <button className="button secondary team-library-button" onClick={() => setTeamLibraryOpen(true)}><Library size={16} /> <span>My teams</span></button>
          <label className="format-select" title="Battle format">
            <Swords size={15} />
            <select value={battle.format} onChange={(event) => updateBattle({ format: event.target.value as Format })}>
              <option>Doubles</option>
              <option>Singles</option>
            </select>
          </label>
          <button className="button danger" onClick={newBattle}><TimerReset size={16} /> New battle</button>
        </div>
      </header>

      <aside className="team-rail my-team">
        <div className="rail-heading"><div><span className="eyebrow">CURRENT TEAM</span><h2>Your team</h2></div><span>{myTeam.length}/6</span></div>
        <div className="team-slots">
          {Array.from({ length: 6 }, (_, index) => (
            <TeamSlot key={myTeam[index]?.id ?? `mine-${index}`} build={myTeam[index]} index={index} active={index === myActive} side="mine" onSelect={() => { setMyActive(index); if (perspective === "mine") setMoveName(""); }} onEdit={() => setEditor({ side: "mine", index })} />
          ))}
        </div>
        <button className="team-library-rail-button" onClick={() => setTeamLibraryOpen(true)}><Library size={15} /><span><strong>Team library</strong><small>Save, load, or enter a Team ID</small></span><ChevronRight size={15} /></button>
        <div className="rail-note"><Save size={14} /><span>This team remains your local draft. Save named teams to your library for Windows and Mac access.</span></div>
      </aside>

      <main className="battle-workspace">
        <SpeedBanner attacker={attacker} defender={defender} state={battle} move={move} onChange={updateBattle} />

        <section className="calculator-panel">
          <div className="matchup-grid">
            <CombatantCard build={attacker} role="Attacker" stage={battle.attackerStage} speedStage={battle.attackerSpeedStage} onStage={(attackerStage) => updateBattle({ attackerStage })} onSpeedStage={(attackerSpeedStage) => updateBattle({ attackerSpeedStage })} onStatus={(status) => updateActiveBuild("attacker", { status })} />
            <button className="swap-button" onClick={() => { setPerspective((current) => current === "mine" ? "theirs" : "mine"); setMoveName(""); }} title="Flip attacker and defender"><ArrowLeftRight size={19} /><span>{perspective === "mine" ? "Your attack" : "Their attack"}</span></button>
            <CombatantCard build={defender} role="Defender" stage={battle.defenderStage} speedStage={battle.defenderSpeedStage} onStage={(defenderStage) => updateBattle({ defenderStage })} onSpeedStage={(defenderSpeedStage) => updateBattle({ defenderSpeedStage })} onStatus={(status) => updateActiveBuild("defender", { status })} />
          </div>

          <div className="move-and-field">
            <div className="move-selector-wrap">
              <label className="move-selector">
                <span><Bolt size={16} /> SELECT MOVE</span>
                <select value={moveName} onChange={(event) => setMoveName(event.target.value)} disabled={!attacker}>
                  {attacker?.moves.filter(Boolean).length ? <optgroup label="Set moves">{attacker.moves.filter(Boolean).map((name) => <option key={`set-${name}`}>{name}</option>)}</optgroup> : null}
                  <optgroup label="Full Champions learnset">{availableMoves.filter((name) => !attacker?.moves.includes(name)).map((name) => <option key={name}>{name}</option>)}</optgroup>
                </select>
              </label>
              <div className="move-meta">
                {move && <TypeBadge type={move.type} />}
                <span>{moveMeta}</span>
                {moveName && MOVE_OVERRIDES[moveName] && <b title="Champions-specific move rebalance applied">Champions value</b>}
              </div>
            </div>
            <div className="field-controls">
              <label><span><CloudSun size={14} /> Weather</span><select value={battle.weather} onChange={(event) => updateBattle({ weather: event.target.value as BattleState["weather"] })}><option value="">Clear</option><option>Sun</option><option>Rain</option><option>Sand</option><option>Snow</option></select></label>
              <label><span><Sparkles size={14} /> Terrain</span><select value={battle.terrain} onChange={(event) => updateBattle({ terrain: event.target.value as BattleState["terrain"] })}><option value="">None</option><option>Electric</option><option>Grassy</option><option>Psychic</option><option>Misty</option></select></label>
              <label><span><Activity size={14} /> Target HP</span><select value={battle.defenderHP} onChange={(event) => updateBattle({ defenderHP: Number(event.target.value) })}>{[100, 90, 75, 50, 33, 25, 10].map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
              <label className="toggle-control"><input type="checkbox" checked={battle.screen} onChange={(event) => updateBattle({ screen: event.target.checked })} /><span><Shield size={14} /> Screen</span></label>
              <label className="toggle-control"><input type="checkbox" checked={battle.crit} onChange={(event) => updateBattle({ crit: event.target.checked })} /><span><Sparkles size={14} /> Critical</span></label>
              {battle.format === "Doubles" && <label className="toggle-control"><input type="checkbox" checked={battle.spread} onChange={(event) => updateBattle({ spread: event.target.checked })} /><span><Target size={14} /> Spread</span></label>}
            </div>
          </div>

          <section className="damage-results">
            <div className="results-heading">
              <div><span className="eyebrow">16 EXACT DAMAGE ROLLS</span><h2>{moveName || "Damage scenarios"}</h2></div>
              <div className="legend"><span><i className="range-swatch" /> Roll range</span><span><i className="ko-swatch" /> Current HP</span></div>
            </div>
            {scenarios.length ? scenarios.map((scenario) => <DamageRow key={`${scenario.label}-${scenario.description}`} scenario={scenario} hpPercent={battle.defenderHP} moveName={moveName} />) : <div className="results-empty"><Crosshair size={27} /><p>Select an attacker, defender, and damaging move to compare the known set with the most common and bulkiest ranked builds.</p></div>}
          </section>

          <div className="calc-footnotes">
            <span><Check size={13} /> Champions stat formula</span>
            <span><Check size={13} /> STAB & type chart</span>
            <span><Check size={13} /> Burn, screens & crits</span>
            <span><Check size={13} /> Weather, terrain & spread</span>
            <span><Check size={13} /> Items & abilities</span>
          </div>
        </section>
      </main>

      <aside className="opponent-rail">
        <section className="opponent-team-panel">
          <div className="rail-heading"><div><span className="eyebrow">THIS BATTLE</span><h2>Opponent team</h2></div><span>{opponentTeam.length}/6</span></div>
          <div className="opponent-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <TeamSlot key={opponentTeam[index]?.id ?? `opponent-${index}`} build={opponentTeam[index]} index={index} active={index === opponentActive} side="opponent" onSelect={() => setOpponentActive(index)} onEdit={() => setEditor({ side: "opponent", index })} />
            ))}
          </div>
        </section>
        <ScoutPanel build={opponent} format={battle.format} liveRows={liveRows} loading={liveLoading} />
      </aside>

      <footer className="app-footer">
        <span>Champion Lens is an unofficial fan-made reference tool.</span>
        <span>Rules: Pokémon Champions Regulation M-B · Usage snapshot {new Date(DATA.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </footer>

      {editor && (
        <BuilderModal
          side={editor.side}
          initial={(editor.side === "mine" ? myTeam : opponentTeam)[editor.index]}
          format={battle.format}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
        />
      )}
      {teamLibraryOpen && (
        <TeamLibraryModal
          currentTeam={myTeam}
          format={battle.format}
          onClose={() => setTeamLibraryOpen(false)}
          onLoad={(team) => {
            setMyTeam(team);
            setMyActive(0);
            setPerspective("mine");
            setMoveName("");
          }}
        />
      )}
    </div>
  );
}
