import { describe, it, expect } from "vitest";
import {
  type Graph,
  bfsFrom,
  reconstructPath,
  findShortestPath,
  shortestPathVia,
  shortestDistanceVia,
  bestMove,
} from "../lib/graph";

// Build an undirected graph from a list of edges.
function makeGraph(edges: [string, string][]): Graph {
  const g: Graph = new Map();
  const add = (a: string, b: string) => {
    if (!g.has(a)) g.set(a, new Set());
    g.get(a)!.add(b);
  };
  for (const [a, b] of edges) {
    add(a, b);
    add(b, a);
  }
  return g;
}

// player:1 - A - player:2 - B - player:3   (a 2-jump chain)
// plus a dead-end branch player:1 - C - player:4 leading away from player:3
const graph = makeGraph([
  ["player:1", "clubseason:A"],
  ["clubseason:A", "player:2"],
  ["player:2", "clubseason:B"],
  ["clubseason:B", "player:3"],
  ["player:1", "clubseason:C"],
  ["clubseason:C", "player:4"],
]);

describe("shortest path", () => {
  it("returns the shortest node path", () => {
    expect(
      shortestPathVia(graph, "player:1", "player:3")
    ).toEqual([
      "player:1",
      "clubseason:A",
      "player:2",
      "clubseason:B",
      "player:3",
    ]);
  });

  it("reports distance in jumps (edges/2)", () => {
    expect(
      shortestDistanceVia(graph, "player:1", "player:3")
    ).toBe(2);
  });

  it("routes through a required waypoint", () => {
    const path = shortestPathVia(
      graph,
      "player:1",
      "player:3",
      "player:2"
    );
    expect(path).toContain("player:2");
  });

  it("returns null when a blocked node is the only bridge", () => {
    expect(
      findShortestPath(graph, "player:1", "player:3", new Set(["player:2"]))
    ).toBeNull();
  });
});

describe("bfsFrom / reconstructPath", () => {
  it("gives edge distances and a reconstructable path", () => {
    const { distance, parent } = bfsFrom(graph, "player:1");
    expect(distance.get("player:3")).toBe(4);
    expect(
      reconstructPath(parent, "player:1", "player:3")
    ).toEqual([
      "player:1",
      "clubseason:A",
      "player:2",
      "clubseason:B",
      "player:3",
    ]);
  });
});

describe("bestMove", () => {
  it("picks the neighbour closest to the goal", () => {
    // From player:1, club A leads toward player:3; club C leads away.
    expect(
      bestMove(graph, "player:1", "player:3")
    ).toBe("clubseason:A");
  });
});
