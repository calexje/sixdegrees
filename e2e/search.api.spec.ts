import { test, expect } from "@playwright/test";

test("search endpoint returns valid results", async ({ request }) => {
    const res = await request.get("/api/search?q=ri");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body.length).toBeLessThanOrEqual(20);
    expect(typeof body[0].id).toBe("string");
    expect(typeof body[0].name).toBe("string");
});


test("one character search returns nothing", async ({ request }) => {
    const res = await request.get("/api/search?q=r");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
});