export type EffectiveMoveInput = {
  name: string;
  type: string;
  basePower: number;
  category: "Physical" | "Special" | "Status";
  isSound?: boolean;
};

export type EffectiveMoveContext = {
  ability: string;
  item?: string;
  weather?: "" | "Sun" | "Rain" | "Sand" | "Snow";
  terrain?: "" | "Electric" | "Grassy" | "Psychic" | "Misty";
  primaryType?: string;
  grounded?: boolean;
};

export type EffectiveMoveDetails = {
  type: string;
  basePower: number;
  note: string;
};

const NORMAL_CONVERTERS: Record<string, string> = {
  Aerilate: "Flying",
  Dragonize: "Dragon",
  Galvanize: "Electric",
  Pixilate: "Fairy",
  Refrigerate: "Ice",
};

const TERRAIN_TYPES: Record<string, string> = {
  Electric: "Electric",
  Grassy: "Grass",
  Misty: "Fairy",
  Psychic: "Psychic",
};

const WEATHER_TYPES: Record<string, string> = {
  Rain: "Water",
  Sand: "Rock",
  Snow: "Ice",
  Sun: "Fire",
};

/**
 * Returns the move type and displayed power after the type-changing effects
 * that are relevant to the current Champions roster. The damage engine still
 * performs the authoritative calculation; this keeps the battle-side preview
 * honest about what the engine will use.
 */
export function effectiveMoveDetails(
  move: EffectiveMoveInput,
  context: EffectiveMoveContext,
): EffectiveMoveDetails {
  let type = move.type;
  let basePower = move.basePower;
  let note = "";
  const personalWeather = context.ability === "Mega Sol" ? "Sun" : context.weather;

  // These moves resolve their own type before ability-based converters and are
  // intentionally excluded from the -ate/Dragonize/Normalize conversion step.
  const blocksAbilityConversion = new Set([
    "Judgment",
    "Multi-Attack",
    "Natural Gift",
    "Nature Power",
    "Revelation Dance",
    "Struggle",
    "Techno Blast",
    "Terrain Pulse",
    "Weather Ball",
  ]).has(move.name);

  if (move.name === "Weather Ball" && personalWeather) {
    type = WEATHER_TYPES[personalWeather] ?? "Normal";
    basePower *= 2;
    note = `${context.ability === "Mega Sol" ? "Mega Sol" : personalWeather}: Weather Ball becomes ${type}`;
  } else if (move.name === "Terrain Pulse" && context.terrain && context.grounded) {
    type = TERRAIN_TYPES[context.terrain] ?? "Normal";
    basePower *= 2;
    note = `${context.terrain} Terrain: Terrain Pulse becomes ${type}`;
  } else if (move.name === "Revelation Dance" && context.primaryType) {
    type = context.primaryType;
    note = `Revelation Dance matches the user's primary type`;
  }

  if (!blocksAbilityConversion && move.category !== "Status") {
    const convertedType = NORMAL_CONVERTERS[context.ability];
    if (convertedType && type === "Normal") {
      type = convertedType;
      basePower = Math.floor(basePower * 1.2);
      note = `${context.ability}: Normal → ${type}, 1.2× power`;
    } else if (context.ability === "Liquid Voice" && move.isSound) {
      type = "Water";
      note = "Liquid Voice: sound move → Water";
    } else if (context.ability === "Normalize" && move.name !== "Struggle") {
      type = "Normal";
      basePower = Math.floor(basePower * 1.2);
      note = "Normalize: move → Normal, 1.2× power";
    }
  }

  return { type, basePower, note };
}

export function scaleDamage(
  damage: number | number[] | number[][],
  numerator: number,
  denominator: number,
): number | number[] | number[][] {
  if (typeof damage === "number") return Math.max(1, Math.floor((damage * numerator) / denominator));
  return damage.map((value) => Array.isArray(value)
    ? scaleDamage(value, numerator, denominator) as number[]
    : Math.max(1, Math.floor((value * numerator) / denominator))) as number[] | number[][];
}
