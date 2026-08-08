import test from "node:test";
import assert from "node:assert/strict";

import { effectiveMoveDetails, scaleDamage } from "../app/champions-mechanics.ts";

const hyperVoice = {
  name: "Hyper Voice",
  type: "Normal",
  basePower: 90,
  category: "Special",
  isSound: true,
};

test("Pixilate converts Normal moves to Fairy and applies its power boost", () => {
  assert.deepEqual(effectiveMoveDetails(hyperVoice, { ability: "Pixilate" }), {
    type: "Fairy",
    basePower: 108,
    note: "Pixilate: Normal → Fairy, 1.2× power",
  });
});

test("Liquid Voice changes sound moves without an additional power boost", () => {
  assert.deepEqual(effectiveMoveDetails(hyperVoice, { ability: "Liquid Voice" }), {
    type: "Water",
    basePower: 90,
    note: "Liquid Voice: sound move → Water",
  });
});

test("weather and terrain resolve dynamic move types", () => {
  assert.deepEqual(effectiveMoveDetails({
    name: "Weather Ball", type: "Normal", basePower: 50, category: "Special",
  }, { ability: "Mega Sol", weather: "Rain" }), {
    type: "Fire",
    basePower: 100,
    note: "Mega Sol: Weather Ball becomes Fire",
  });
  assert.deepEqual(effectiveMoveDetails({
    name: "Terrain Pulse", type: "Normal", basePower: 50, category: "Special",
  }, { ability: "Mega Launcher", terrain: "Electric", grounded: true }), {
    type: "Electric",
    basePower: 100,
    note: "Electric Terrain: Terrain Pulse becomes Electric",
  });
});

test("protection-piercing damage is quartered roll by roll", () => {
  assert.deepEqual(scaleDamage([101, 120, [80, 99]], 1, 4), [25, 30, [20, 24]]);
});
