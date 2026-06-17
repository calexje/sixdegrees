import Game from "@/components/game";

async function getPuzzle() {
  const response = await fetch(
    "http://localhost:3000/api/puzzle",
    {
      cache: "no-store",
    }
  );

  return response.json();
}

export default async function Home() {
  const puzzle = await getPuzzle();

  return (
    <Game
      origin={puzzle.origin}
      target={puzzle.target}
    />
  );
}