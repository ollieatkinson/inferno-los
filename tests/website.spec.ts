import { test, expect } from "@playwright/test";
import { encodeLink } from "../src/links";
import type { Scenario } from "../src/model";
const sceneUrl = (scene: unknown) =>
  encodeLink(scene as Scenario, "http://127.0.0.1:5173/");
const snapshot = {
  version: 1,
  kind: "wave",
  wave: 63,
  player: [16, 5],
  pillars: [true, true, true],
  mobs: [{ id: 1, type: "ranger", x: 20, y: 7 }],
};
const pos = (
  box: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
) => ({
  x: box.x + ((x + 0.5) / 29) * box.width,
  y: box.y + ((y + 0.5) / 30) * box.height,
});

test("plugin snapshots load, stepping shows the prayer and replay opens in the same tab", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(sceneUrl(snapshot));
  await expect(page.locator(".board-header")).toContainText("Wave 63");
  await page.getByRole("button", { name: "North ✓" }).click();
  await expect(page.locator(".next-prayer")).toContainText("Missiles");
  await page
    .getByRole("button", { name: "Protect from Missiles", exact: true })
    .click();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 1");
  await expect(page.locator(".last-tick")).toContainText("Protected");
  await expect(page.locator(".attack-ray")).toHaveCount(1);
  await page.locator(".link-input summary").click();
  await page.getByRole("button", { name: "Copy replay link" }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(url).hash).toMatch(/^#IL2-[A-Za-z0-9_-]+$/);
  await page.goto(url);
  await expect(page.locator(".timeline")).toContainText("Replay 0 / 1");
  await page.getByRole("button", { name: /Step \+1/ }).click();
  await expect(page.locator(".last-tick")).toContainText("Protected");
  expect(errors).toEqual([]);
});
test("player and monsters drag, double-click deletes, preferences survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  const svg = page.getByRole("img", { name: /Inferno arena/ }),
    box = (await svg.boundingBox())!;
  const start = pos(box, 16, 5),
    end = pos(box, 12, 10);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByTestId("player").locator("circle")).toHaveAttribute(
    "cx",
    "250",
  );
  await expect(page.getByTestId("player").locator("circle")).toHaveAttribute(
    "cy",
    "210",
  );
  await page.getByRole("button", { name: "Ranger", exact: true }).click();
  const spawn = pos(box, 5, 5);
  await page.mouse.click(spawn.x, spawn.y);
  await expect(page.getByTestId("mob-1")).toBeVisible();
  const target = pos(box, 8, 8);
  await page.mouse.move(spawn.x, spawn.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 5 });
  await page.mouse.up();
  await expect(
    page.getByTestId("mob-1").locator("rect").first(),
  ).toHaveAttribute("x", "162");
  await page.mouse.dblclick(target.x, target.y);
  await expect(page.getByTestId("mob-1")).toHaveCount(0);
  await page.getByLabel("South at top").check();
  await page.getByRole("button", { name: /Light mode/ }).click();
  await page.reload();
  await expect(page.getByLabel("South at top")).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const assets = await page
    .locator("img")
    .evaluateAll((images) =>
      images.every(
        (img) =>
          (img as HTMLImageElement).complete &&
          (img as HTMLImageElement).naturalWidth > 0,
      ),
    );
  expect(assets).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("copies compact links and bare codes, reloads them, and reports damaged codes", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(sceneUrl(snapshot));
  await page
    .getByRole("button", { name: "Share position", exact: true })
    .click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).hash).toMatch(/^#IL2-[A-Za-z0-9_-]+$/);
  await page.locator(".link-input summary").click();
  await page
    .getByRole("button", { name: "Copy share code", exact: true })
    .click();
  const code = await page.evaluate(() => navigator.clipboard.readText());
  expect(code).toBe(new URL(link).hash.slice(1));
  expect(code.length).toBeLessThan(40);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("textbox").fill(code);
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByTestId("mob-1")).toBeVisible();
  await expect(page.locator(".board-header")).toContainText("Wave 63");
  await page.getByRole("textbox").fill(code.slice(0, -3));
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("damaged");
  await expect(page.getByTestId("mob-1")).toBeVisible();
  await page.goto(link);
  await expect(page.getByTestId("mob-1")).toBeVisible();
});

test("loads ranked Scouter code with pillar HP and reports malformed input", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("[M1Rooooooo009999]");
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByTestId("mob-1")).toBeVisible();
  await expect(page.getByTestId("mob-0")).toBeVisible();
  await expect(page.getByRole("button", { name: "North ×" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("textbox").fill("[broken]");
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("nine-slot");
});
test("trainer scores hits and prayer input does not postpone game ticks", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Prayer trainer", exact: true })
    .click();
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await page.clock.runFor(300);
    await page.keyboard.press("0");
    await page.clock.runFor(200);
    await page.keyboard.press("1");
    await page.clock.runFor(100);
  }
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 4 / 60");
  await expect(page.locator(".score-panel")).toContainText("1/1");
  await expect(page.locator(".score-panel")).toContainText("100%");
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await page.clock.runFor(1200);
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 4 / 60");
  await page.keyboard.press("2");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await expect(page.locator(".score-panel")).toContainText("2/2");
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  await page.clock.runFor(33000);
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 60 / 60");
  await expect(
    page.getByRole("heading", { name: /Drill complete/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "▶ Play", exact: true }),
  ).toBeDisabled();
});
test("right-hand prayer and ticks stay beside the arena on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const arena = (await page.locator(".arena").boundingBox())!,
    counter = (await page.getByTestId("tick-count").boundingBox())!,
    prayers = (await page.locator(".prayers").boundingBox())!;
  expect(counter.x).toBeGreaterThan(arena.x + arena.width);
  expect(prayers.x).toBeGreaterThan(arena.x + arena.width);
  await page.screenshot({
    path: "test-results/desktop-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Light mode/ }).click();
  await page.screenshot({
    path: "test-results/desktop-light.png",
    fullPage: true,
  });
});

test("opens the RuneLite plugin contract fixture", async ({ page }) => {
  const { readFile } = await import("node:fs/promises");
  const url = await readFile(
    process.env.INFERNO_PLUGIN_FIXTURE_PATH ??
      "tests/fixtures/plugin-wave-url.txt",
    "utf8",
  );
  expect(new URL(url).hash).toBe("#IL2-FKEBBT8CBgPyAikE_AEAANDSVrY");
  await page.goto(url);
  await expect(page.locator(".board-header")).toContainText("Wave 63");
  await expect(page.getByTestId("mob-41")).toBeVisible();
  await expect(page.getByTestId("mob-6")).toBeVisible();
  await expect(page.getByRole("button", { name: "North ×" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByTestId("player").locator("circle")).toHaveAttribute(
    "cx",
    "330",
  );
  await page.keyboard.press("Space");
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 1");
});

test("all monsters keep their LoS when one is selected and dragged", async ({
  page,
}) => {
  const scene = {
    ...snapshot,
    pillars: [false, false, false],
    mobs: [
      { id: 1, type: "mager", x: 1, y: 5 },
      { id: 2, type: "ranger", x: 22, y: 25 },
    ],
  };
  await page.goto(sceneUrl(scene));
  const rangedTile = page.locator('.arena rect.tile[x="460"][y="540"]');
  const overlapTile = page.locator('.arena rect.tile[x="460"][y="400"]');
  const magicTile = page.locator('.arena rect.tile[x="40"][y="0"]');
  await expect(rangedTile).toHaveClass(/\brange\b/);
  await expect(magicTile).toHaveClass(/\bmage\b/);
  await expect(overlapTile).toHaveClass(/\brange\b/);
  const box = (await page.locator(".arena").boundingBox())!;
  const start = pos(box, 1, 5),
    end = pos(box, 6, 5);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(rangedTile).toHaveClass(/\brange\b/);
  await page.mouse.move(end.x, end.y, { steps: 5 });
  await expect(
    page.getByTestId("mob-1").locator("rect").first(),
  ).toHaveAttribute("x", "122");
  await expect(rangedTile).toHaveClass(/\brange\b/);
  await expect(magicTile).toHaveClass(/\bmage\b/);
  await expect(overlapTile).toHaveClass(/\bmixed\b/);
  await page.mouse.up();
  await expect(rangedTile).toHaveClass(/\brange\b/);
  await expect(magicTile).toHaveClass(/\bmage\b/);
});

test("nine-monster drag stays responsive with LoS enabled", async ({
  page,
}, testInfo) => {
  const spawns = [
    [1, 5],
    [22, 5],
    [3, 11],
    [23, 12],
    [16, 17],
    [5, 23],
    [23, 25],
    [1, 28],
    [15, 28],
  ];
  const scene = {
    ...snapshot,
    mobs: spawns.map(([x, y], i) => ({
      id: i + 1,
      type: i % 2 ? "ranger" : "mager",
      x,
      y,
    })),
  };
  await page.goto(sceneUrl(scene));
  await expect(page.getByTestId("mob-9")).toBeVisible();
  const metrics = await page.evaluate(async () => {
    const svg = document.querySelector(".arena")!,
      box = svg.getBoundingClientRect();
    const send = (type: string, x: number, y: number) =>
      svg.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          buttons: type === "pointerup" ? 0 : 1,
          clientX: box.x + ((x + 0.5) / 29) * box.width,
          clientY: box.y + ((y + 0.5) / 30) * box.height,
        }),
      );
    // Synthetic pointers cannot acquire native capture, but exercise the same RAF drag path.
    svg.setPointerCapture = () => {};
    const times: number[] = [];
    send("pointerdown", 1, 5);
    for (let i = 0; i < 90; i++) {
      const start = performance.now();
      send("pointermove", 1 + (i % 12), 4);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      times.push(performance.now() - start);
    }
    send("pointerup", 6, 4);
    times.sort((a, b) => a - b);
    return {
      medianMs: times[Math.floor(times.length / 2)],
      p95Ms: times[Math.floor(times.length * 0.95)],
      maxMs: times.at(-1),
    };
  });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    testInfo.outputPath("drag-performance.json"),
    JSON.stringify(metrics, null, 2),
  );
  await testInfo.attach("drag-performance.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  expect(metrics.p95Ms).toBeLessThan(100); // two animation frames + work; catches severe drag regressions
});

test("Jad drills have no pillars and animate real attack poses with pause and stepping", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Prayer trainer", exact: true })
    .click();
  await page.getByLabel("Practice drill").selectOption("jad");
  // SVG href assertions alone also pass when Vite returns HTML for a missing image.
  const loaded = await page.evaluate(async () => {
    const frames = ["mage", "range"].flatMap((style) =>
      Array.from(
        { length: style === "mage" ? 32 : 13 },
        (_, i) => `./icons/jad/jad_${style}_${i + 1}.png`,
      ),
    );
    return Promise.all(
      frames.map(async (src) => {
        const image = new Image();
        image.src = src;
        try {
          await image.decode();
          return image.naturalWidth > 0;
        } catch {
          return false;
        }
      }),
    );
  });
  expect(loaded).toEqual(Array(45).fill(true));
  await expect(page.locator(".arena .pillar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /North [✓×]/ })).toHaveCount(0);
  await expect(page.locator('.arena [data-testid^="mob-"]')).toHaveCount(1);
  await page.getByLabel("Prayer hints").uncheck();
  const sprite = page.getByTestId("mob-1").getByTestId("jad-sprite");
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: /Step \+1/ }).click();
  await expect(sprite).toHaveAttribute("href", /jad_(mage|range)_1\.png/);
  await page.getByRole("button", { name: /▶ Play/ }).click();
  await page.clock.runFor(350);
  await expect(sprite).toHaveAttribute("href", /jad_(mage|range)_4\.png/);
  await page.getByRole("button", { name: /Ⅱ Pause/ }).click();
  const paused = await sprite.getAttribute("href");
  await page.clock.runFor(1200);
  await expect(sprite).toHaveAttribute("href", paused!);
  await page.getByRole("button", { name: /▶ Play/ }).click();
  await page.clock.runFor(100);
  await expect(sprite).toHaveAttribute("href", /jad_(mage|range)_5\.png/);
  await page.getByRole("button", { name: /Ⅱ Pause/ }).click();
  await page.getByRole("button", { name: /Step \+1/ }).click();
  await expect(sprite).toHaveAttribute("href", /jad_(mage|range)_7\.png/);
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await expect(sprite).toHaveAttribute("href", /jad_mage_1\.png/);
  await page.getByLabel("Practice drill").selectOption("triple-jad");
  await expect(page.locator('.arena [data-testid^="mob-"]')).toHaveCount(3);
  await expect(page.locator(".arena .pillar")).toHaveCount(0);
  const styles = new Set<string>();
  for (let i = 0; i < 15; i++) {
    await page.getByRole("button", { name: /Step \+1/ }).click();
    for (const url of await page
      .getByTestId("jad-sprite")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")!))) {
      if (!url.endsWith("_1.png"))
        styles.add(url.includes("jad_mage_") ? "mage" : "range");
    }
  }
  expect([...styles].sort()).toEqual(["mage", "range"]);
  await page.screenshot({
    path: "test-results/triple-jad.png",
    fullPage: true,
  });
  await page.getByLabel("Practice drill").selectOption("alternating");
  await expect(page.locator(".arena .pillar.standing")).toHaveCount(3);
  await expect(page.getByTestId("jad-sprite")).toHaveCount(0);
});

test("current-stack training preserves the scene imported in Explore", async ({
  page,
}) => {
  await page.goto(sceneUrl(snapshot));
  await page
    .getByRole("button", { name: "Prayer trainer", exact: true })
    .click();
  await page.getByLabel("Practice drill").selectOption("current");
  await expect(page.getByTestId("mob-1")).toBeVisible();
  await expect(page.locator('.arena [data-testid^="mob-"]')).toHaveCount(1);
  await expect(
    page.getByTestId("mob-1").locator("rect").first(),
  ).toHaveAttribute("x", "402");
  await page.getByRole("button", { name: /Step \+1/ }).click();
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 0");
  await expect(
    page.getByTestId("mob-1").locator("rect").first(),
  ).toHaveAttribute("y", "102");
});

test("trainer pauses when hidden and keeps the latest tick in view", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Prayer trainer", exact: true })
    .click();
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  await page.clock.runFor(12000);
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 20 / 60");
  const inView = await page.locator(".tape").evaluate((el) => {
    const row = el.querySelector("tr.latest")!.getBoundingClientRect(),
      box = el.getBoundingClientRect();
    return row.bottom <= box.bottom + 1 && row.top >= box.top;
  });
  expect(inView).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "▶ Play", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(1200);
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 20 / 60");
});

test("wave picker generates, retries and shares layouts, with pillar-free Jad waves", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  });
  await page.goto("/");
  await page.getByRole("spinbutton", { name: "Wave", exact: true }).fill("63");
  await page.getByRole("button", { name: "Spawn wave", exact: true }).click();
  await expect(page.locator(".board-header")).toContainText("Wave 63");
  await expect(page.locator(".board-header")).toContainText("Practice setup");
  await expect(page.locator('[data-testid^="mob-"]')).toHaveCount(8);
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 0");
  const share = async () => {
    await page
      .getByRole("button", { name: "Share position", exact: true })
      .click();
    return page.evaluate(() => navigator.clipboard.readText());
  };
  const first = await share();
  await page.getByRole("button", { name: /Step \+1/ }).click();
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 1");
  await page
    .getByRole("button", { name: /Reset/, exact: false })
    .first()
    .click();
  expect(await share()).toBe(first);
  await page.getByRole("button", { name: "Spawn wave", exact: true }).click();
  expect(await share()).not.toBe(first);
  await page.goto(first);
  expect(await share()).toBe(first);
  await page.getByRole("spinbutton", { name: "Wave", exact: true }).fill("68");
  await page.getByRole("button", { name: "Spawn wave", exact: true }).click();
  await expect(page.locator('[data-testid^="mob-"]')).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^North [✓×]/ })).toHaveCount(
    0,
  );
  await page.getByRole("spinbutton", { name: "Wave", exact: true }).fill("1");
  await page.getByRole("button", { name: "Spawn wave", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "North ✓", exact: true }),
  ).toBeVisible();
  await page.goto("/?wave=63");
  await expect(page.locator(".board-header")).toContainText("Wave 63");
  await expect(
    page.getByRole("spinbutton", { name: "Wave", exact: true }),
  ).toHaveValue("63");
  await page.goto("/?wave=69");
  await expect(page.getByRole("status")).toContainText("Zuk");
});

test("meleers visibly dig, preserve a mid-dig share and delay prayer checks after emergence", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(
    sceneUrl({
      version: 1,
      kind: "custom",
      player: [16, 5],
      pillars: [true, true, true],
      mobs: [
        {
          id: 1,
          type: "melee",
          x: 20,
          y: 7,
          dig: {
            timer: 1,
            count: 0,
            sinceAttack: 15,
            remaining: 0,
            recovery: 0,
          },
        },
      ],
    }),
  );
  const step = page.getByRole("button", { name: /Step \+1/ });
  await step.click();
  await expect(page.getByTestId("mob-1")).toContainText("DIG 6");
  await expect(page.getByTestId("mob-1").locator("image")).toHaveAttribute(
    "opacity",
    "0.15",
  );
  await expect(page.locator("rect.tile.melee")).toHaveCount(0);
  await expect(page.locator(".last-tick")).toContainText("Meleer burrows");
  await page
    .getByRole("button", { name: "Share position", exact: true })
    .click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto(url);
  await expect(page.getByTestId("mob-1")).toContainText("DIG 6");
  for (let i = 0; i < 6; i++) await step.click();
  await expect(page.getByTestId("mob-1")).toContainText("EMERGE");
  await expect(page.locator(".last-tick")).toContainText(
    "attack delay 6 ticks",
  );
  await page.screenshot({
    path: "test-results/meleer-emergence.png",
    fullPage: true,
  });
  for (let i = 0; i < 5; i++) {
    await step.click();
    await expect(page.locator(".attack-ray")).toHaveCount(0);
  }
  await expect(page.locator(".next-prayer")).toContainText("Melee");
  await page
    .getByRole("button", { name: "Protect from Melee", exact: true })
    .click();
  await step.click();
  await expect(page.locator(".last-tick")).toContainText("Protected");
  await expect(
    page.locator(".tape").getByTitle("Meleer emerges"),
  ).toHaveCount(1);
});

test("Inferno Stats links import captured tiles instead of generating a random wave", async ({
  page,
}) => {
  await page.goto(
    "/?source=inferno-stats&wave=63&location=INFERNO&mager=[[1,5]]&copyable",
  );
  await expect(page.locator(".board-header")).toContainText("Wave 63");
  await expect(page.locator('[data-testid^="mob-"]')).toHaveCount(1);
  await expect(
    page.getByTestId("mob-1").locator("rect").first(),
  ).toHaveAttribute("x", "22");
  await expect(
    page.getByText(/Inferno Stats supplies monster spawns only/),
  ).toBeVisible();
});
