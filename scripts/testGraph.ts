import { buildGraph } from "../lib/graph";

const graph = buildGraph();

console.log(
  graph.get(
    "clubseason:Manchester United:2013-14"
  )
);
console.log(graph.size);