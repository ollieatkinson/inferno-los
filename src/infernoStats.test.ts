import { expect, it } from "vitest";
import { decodeLink, encodeLink } from "./links";

it("imports Inferno Stats' existing spawn format and preserves wave metadata", () => {
  const url =
    "https://los.inferno.tips/?source=inferno-stats&wave=63&location=INFERNO&blob=[[1,5],[22,5]]&melee=[[3,11]]&ranger=[[23,12]]&mager=[[16,17]]&copyable";
  const { scenario: s } = decodeLink(url)!;
  expect(s.wave).toBe(63);
  expect(s.kind).toBe("wave");
  expect(s.mobs).toHaveLength(5);
  expect(s.mobs[4]).toMatchObject({ type: "mager", x: 16, y: 17 });
  expect(s.warnings?.[0]).toContain("practice defaults");
  expect(
    decodeLink(encodeLink(s, "https://los.inferno.tips/"))?.scenario,
  ).toEqual(s);
  expect(
    decodeLink(
      "https://infernostats.github.io/inferno.html?mager=[[1,5]]&copyable",
    )?.scenario.mobs,
  ).toHaveLength(1);
});
it("keeps empty captures empty and rejects malformed, unsupported or out-of-bounds stats links", () => {
  expect(
    decodeLink(
      "https://los.inferno.tips/?source=inferno-stats&wave=3&location=INFERNO&copyable",
    )?.scenario.mobs,
  ).toEqual([]);
  for (const query of [
    "mager=no",
    "mager={}",
    "mager=[[1]]",
    "mager=[[99,5]]",
    "mager=[[17,5]]",
    "source=inferno-stats&wave=68",
    "source=inferno-stats&wave=0",
    "source=inferno-stats&location=FIGHT_CAVES",
  ])
    expect(() => decodeLink("https://los.inferno.tips/?" + query)).toThrow();
});

it("imports current player/pillars and actual NPC indices, then shares a compact code", () => {
  const input =
    "https://los.inferno.tips/?source=inferno-stats&kind=current&location=INFERNO&player=[16,5]&pillars=[true,false,true]&mager=[[20,8]]&magerIds=[42]&ranger=[[22,12]]&rangerIds=[6]&copyable";
  const s = decodeLink(input)!.scenario;
  expect(s.kind).toBe("current");
  expect(s.wave).toBeUndefined();
  expect(s.player).toEqual([16, 5]);
  expect(s.pillars).toEqual([true, false, true]);
  expect(s.mobs.map((m) => m.id)).toEqual([6, 42]);
  expect(s.warnings?.join(" ")).not.toContain("practice defaults");
  expect(s.warnings?.join(" ")).toContain("Nibblers");
  const shared = encodeLink(s, "https://los.inferno.tips/");
  expect(shared).toContain("#IL2-");
  expect(decodeLink(shared)?.scenario).toEqual(s);
});

it("preserves explicit empty current captures and wave-start context", () => {
  const base =
    "https://los.inferno.tips/?source=inferno-stats&location=INFERNO&player=[16,5]&pillars=[false,false,false]";
  expect(decodeLink(base + "&kind=current")?.scenario).toMatchObject({
    kind: "current",
    player: [16, 5],
    pillars: [false, false, false],
    mobs: [],
  });
  expect(
    decodeLink(base + "&kind=wave&wave=63&mager=[[1,5]]&magerIds=[42]")
      ?.scenario,
  ).toMatchObject({
    kind: "wave",
    wave: 63,
    player: [16, 5],
    pillars: [false, false, false],
    mobs: [{ id: 42, type: "mager", x: 1, y: 5 }],
  });
});

it("rejects malformed capture metadata and mismatched, duplicate or invalid indices", () => {
  for (const query of [
    "kind=wrong",
    "player=[]",
    "player=[99,5]",
    "player=[16,5,6]",
    "player=null",
    "pillars=[true]",
    "pillars=[1,0,1]",
    "pillars=null",
    "magerIds=[42]",
    "mager=[[1,5]]&magerIds=[]",
    "mager=[[1,5]]&magerIds=[-1]",
    "mager=[[1,5]]&magerIds=[65536]",
    "mager=[[1,5]]&magerIds=[1.5]",
    "mager=[[1,5]]&magerIds=[42]&ranger=[[22,5]]",
    "mager=[[1,5]]&magerIds=[42]&ranger=[[22,5]]&rangerIds=[42]",
  ])
    expect(() =>
      decodeLink("https://los.inferno.tips/?source=inferno-stats&" + query),
    ).toThrow();
});
