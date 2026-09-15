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
