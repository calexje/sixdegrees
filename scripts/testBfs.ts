import {
  buildGraph,
  findShortestPath
} from "../lib/graph";

const graph = buildGraph();

const path = findShortestPath(
  graph,
  "player:Andriy Shevchenko",
  "player:Rio Ngumoha"
);
