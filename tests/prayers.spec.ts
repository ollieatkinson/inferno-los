import { test, expect, type Page } from "@playwright/test";

const prayer = (page: Page, name: string) =>
  page.getByRole("button", { name: `Protect from ${name}`, exact: true });
async function open(page: Page) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto("/");
}

test("idle circles toggle immediately and reconcile with overhead on fixed ticks", async ({
  page,
}) => {
  await open(page);
  const mage = prayer(page, "Magic"),
    range = prayer(page, "Missiles");
  await expect(page.locator(".prayers button")).toHaveCount(3);
  await expect(page.locator(".tick-track")).toHaveCount(1);
  await mage.click();
  await expect(mage).toHaveAttribute("data-lit", "true");
  await expect(page.getByTestId("player-prayer")).toHaveCount(0);
  await page.clock.runFor(600);
  await expect(page.getByTestId("player-prayer")).toHaveAttribute(
    "data-prayer",
    "mage",
  );
  await page.clock.runFor(100);
  await range.click();
  await expect(mage).toHaveAttribute("data-lit", "true");
  await expect(range).toHaveAttribute("data-lit", "true");
  await page.clock.runFor(499);
  await expect(mage).toHaveAttribute("data-lit", "true");
  await expect(page.getByTestId("player-prayer")).toHaveAttribute(
    "data-prayer",
    "mage",
  );
  await page.clock.runFor(1);
  await expect(mage).toHaveAttribute("data-lit", "false");
  await expect(page.getByTestId("player-prayer")).toHaveAttribute(
    "data-prayer",
    "range",
  );
  await page.clock.runFor(550);
  await mage.click();
  await page.clock.runFor(50);
  await expect(range).toHaveAttribute("data-lit", "false");
  // Explicit off clears the local circle, while committed protection lasts to the tick.
  await mage.click();
  await expect(mage).toHaveAttribute("data-lit", "false");
  await expect(page.getByTestId("player-prayer")).toHaveAttribute(
    "data-prayer",
    "mage",
  );
  await page.clock.runFor(600);
  await expect(page.getByTestId("player-prayer")).toHaveCount(0);
  // Each local bit toggles independently, even when both were lit.
  await mage.click();
  await range.click();
  await mage.click();
  await expect(mage).toHaveAttribute("data-lit", "false");
  await expect(range).toHaveAttribute("data-lit", "true");
  await page.clock.runFor(600);
  await expect(mage).toHaveAttribute("data-lit", "true");
  await expect(range).toHaveAttribute("data-lit", "false");
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 0");
});

test("presses apply before release; pause, manual stepping, back and reset restore protection", async ({
  page,
}) => {
  await open(page);
  const mage = prayer(page, "Magic"),
    range = prayer(page, "Missiles");
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  await page.clock.runFor(550);
  const box = (await mage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(50);
  await expect(page.getByTestId("player-prayer")).toHaveAttribute(
    "data-prayer",
    "mage",
  );
  await page.mouse.up();
  await expect(mage).toHaveAttribute("data-lit", "true");
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await range.click();
  await page.clock.runFor(1800);
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 1");
  await expect(mage).toHaveAttribute("data-lit", "true");
  await expect(range).toHaveAttribute("data-lit", "true");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 2");
  await expect(page.getByTestId("player-prayer")).toHaveAttribute(
    "data-prayer",
    "range",
  );
  await page.getByRole("button", { name: "Back one tick" }).click();
  await expect(page.getByTestId("player-prayer")).toHaveAttribute(
    "data-prayer",
    "mage",
  );
  await expect(range).toHaveAttribute("data-lit", "false");
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await expect(page.getByTestId("player-prayer")).toHaveCount(0);
  await range.click({ button: "right" });
  await expect(range).toHaveAttribute("data-lit", "false");
  await mage.focus();
  await page.keyboard.press("Space");
  await expect(mage).toHaveAttribute("data-lit", "true");
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 0");
  await page.keyboard.press("Enter");
  await expect(mage).toHaveAttribute("data-lit", "false");
  await page.keyboard.press("1");
  await expect(mage).toHaveAttribute("data-lit", "false");
});

test("two-tick alternating protects a complete 60-tick drill without clock drift", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Prayer trainer", exact: true })
    .click();
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  let previous = "";
  for (let tick = 1; tick <= 60; tick++) {
    await page.clock.runFor(100);
    const next = tick % 4 < 1 || tick % 4 === 3 ? "Magic" : "Missiles";
    if (next !== previous) await prayer(page, next).click();
    previous = next;
    await page.clock.runFor(500);
    await expect(page.getByTestId("tick-count")).toHaveText(
      `Tick ${tick} / 60`,
    );
  }
  await expect(page.locator(".score-panel")).toContainText("100%");
  await expect(
    page.getByRole("heading", { name: /Drill complete/ }),
  ).toBeVisible();
});

test("mobile accepts overlapping fingers on consecutive ticks and prevents prayer drags scrolling", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await open(page);
    const buttons = [prayer(page, "Magic"), prayer(page, "Missiles")];
    await buttons[0].evaluate((el) => el.scrollIntoView({ block: "center" }));
    const points = await Promise.all(
      buttons.map(async (button) => {
        const r = (await button.boundingBox())!;
        expect(r.width).toBeGreaterThanOrEqual(44);
        expect(r.height).toBeGreaterThanOrEqual(44);
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }),
    );
    const cdp = await context.newCDPSession(page);
    let held = { ...points[0], id: 1 };
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [held],
    });
    await page.clock.runFor(600);
    for (let tick = 2; tick <= 24; tick++) {
      await page.clock.runFor(100);
      const next = { ...points[(tick - 1) % 2], id: tick };
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [held, next],
      });
      for (const button of buttons)
        await expect(button).toHaveAttribute("data-lit", "true");
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [held],
      });
      held = next;
      await page.clock.runFor(500);
      await expect(buttons[(tick - 1) % 2]).toHaveAttribute("data-lit", "true");
      await expect(buttons[tick % 2]).toHaveAttribute("data-lit", "false");
    }
    const scroll = await page.evaluate(() => scrollY);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...held, y: held.y - 100 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByTestId("tick-count")).toHaveText("Tick 0");
  } finally {
    await context.close();
  }
});

test("native audio waits for ticks, coalesces flicks and obeys persistent settings", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const logs: { duration: number; gain: number }[] = [];
    Object.assign(window, { prayerAudioStarts: logs });
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      lastGain = 0;
      override createGain() {
        const gain = super.createGain();
        const connect = gain.connect.bind(gain);
        gain.connect = ((...args: Parameters<typeof connect>) => {
          this.lastGain = gain.gain.value;
          return connect(...args);
        }) as typeof gain.connect;
        return gain;
      }
      override createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (...args) => {
          logs.push({
            duration: source.buffer?.duration || 0,
            gain: this.lastGain,
          });
          start(...args);
        };
        return source;
      }
    };
  });
  const starts = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            prayerAudioStarts: { duration: number; gain: number }[];
          }
        ).prayerAudioStarts,
    );
  await open(page);
  await page.locator(".site-settings summary").click();
  await page.getByRole("slider", { name: "Prayer volume" }).fill("25");
  await page.reload();
  await page.waitForLoadState("networkidle");
  const magic = prayer(page, "Magic");
  const startsCount = async () => (await starts()).length;
  await magic.click();
  await page.clock.runFor(599);
  expect(await startsCount()).toBe(0);
  await page.clock.runFor(1);
  await expect.poll(startsCount).toBe(1);
  await magic.click();
  await page.clock.runFor(600);
  await expect.poll(startsCount).toBe(2);
  const played = await starts();
  expect(played.every((p) => p.duration > 0 && p.gain === 0.25)).toBe(true);
  expect(played[0].duration).not.toBe(played[1].duration);
  for (let i = 0; i < 4; i++) await magic.click();
  await page.clock.runFor(600);
  await expect.poll(startsCount).toBe(4);
  const flick = (await starts()).slice(2);
  expect(flick[0].duration).toBe(played[1].duration);
  expect(flick[1].duration).toBe(played[0].duration);
  await magic.click();
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await page.clock.runFor(600);
  expect(await startsCount()).toBe(4);
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await magic.click();
  await page.clock.runFor(1200);
  expect(await startsCount()).toBe(4);
  await page.getByRole("button", { name: /Step \+1/ }).click();
  await expect.poll(startsCount).toBe(5);
  await page.locator(".site-settings summary").click();
  await page.getByLabel("Prayer sounds").uncheck();
  await page.reload();
  await page.locator(".site-settings summary").click();
  await expect(page.getByLabel("Prayer sounds")).not.toBeChecked();
  await expect(page.getByRole("slider", { name: "Prayer volume" })).toHaveValue(
    "25",
  );
  await magic.click();
  await page.clock.runFor(600);
  expect(await startsCount()).toBe(0);
});

test("a delayed browser tick pauses instead of advancing a misleading burst", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  await prayer(page, "Magic").click();
  await page.clock.fastForward(2000);
  await expect(page.getByRole("status")).toContainText("browser delay");
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 0");
  await expect(page.locator(".prayer-clock")).toContainText("Tick paused");
  await page.clock.runFor(1200);
  await expect(page.getByTestId("player-prayer")).toHaveCount(0);
  await page.getByRole("button", { name: "▶ Play", exact: true }).click();
  await page.clock.runFor(600);
  await expect(page.getByTestId("tick-count")).toHaveText("Tick 1");
  await expect(page.getByTestId("player-prayer")).toHaveAttribute(
    "data-prayer",
    "mage",
  );
});

for (const width of [1280, 390]) {
  test(`finishing and retrying at ${width}px keeps the prayer controls in place`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await open(page);
    await page
      .getByRole("button", { name: "Prayer trainer", exact: true })
      .click();
    await page.getByRole("button", { name: "▶ Play", exact: true }).click();
    await page.clock.runFor(59 * 600);
    await page
      .locator(".prayer-panel")
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    const positions = () =>
      page.evaluate(() => ({
        scroll: scrollY,
        controls: document.querySelector(".prayers")!.getBoundingClientRect()
          .top,
      }));
    const before = await positions();
    await page.clock.runFor(600);
    expect(await positions()).toEqual(before);
    const retry = page.getByRole("button", { name: "Retry", exact: true });
    await expect(retry).toBeInViewport();
    await retry.click();
    await expect(page.getByTestId("tick-count")).toHaveText("Tick 0 / 60");
    await expect(
      page.getByRole("button", { name: "Ⅱ Pause", exact: true }),
    ).toBeVisible();
    expect(await positions()).toEqual(before);
    await page.clock.runFor(600);
    await expect(page.getByTestId("tick-count")).toHaveText("Tick 1 / 60");
  });
}
