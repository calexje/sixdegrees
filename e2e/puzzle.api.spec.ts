import { test, expect } from "@playwright/test";

test("puzzle endpoint returns a valid daily", async ({ request }) => {
    const res = await request.get("/api/puzzle?mode=daily");
    expect(res.status()).toBe(200);
    const body = await res.json();
    // solutionDistance is an even number, greater than 0
    expect(typeof body.solutionDistance).toBe("number");
    expect(body.solutionDistance).toBeGreaterThan(0);
    expect(body.solutionDistance % 2).toBe(0);
    //Origin and targets are both strings that aren't empty
    expect(typeof body.originId).toBe("string");
    expect(typeof body.targetId).toBe("string");
    expect(body.originId.length).toBeGreaterThan(0);
    expect(body.targetId.length).toBeGreaterThan(0);
    //solutionPath should be an array
    expect(Array.isArray(body.solutionPath)).toBe(true);
    //solutionPath length should be solutionDistance + 1
    expect(body.solutionPath.length).toBe(body.solutionDistance + 1);
    //Path starts with origin and ends with target
    expect(body.solutionPath[0]).toBe(body.origin);
    expect(body.solutionPath[body.solutionPath.length - 1]).toBe(body.target);
    //puzzle number is an integer
    expect(Number.isInteger(body.puzzleNumber)).toBe(true)
});
