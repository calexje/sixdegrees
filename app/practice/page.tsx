import Header from "@/components/header";
import Footer from "@/components/footer";
import Game from "@/components/game";
import { getPuzzle } from "@/lib/puzzle";

export default async function Home() {
  const puzzle = await getPuzzle();
  return (
    <>
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">

        <div className="grid grid-cols-12 gap-8">

          <aside className="hidden xl:block col-span-2">
            <div
              className="
                border
                rounded-lg
                p-4
                text-center
                text-sm
                text-gray-500
              "
            >
              Advertisement
            </div>
          </aside>

          <section className="col-span-12 xl:col-span-8">
            <div
              className="
                bg-white
                dark:bg-zinc-900
                rounded-xl
                shadow-xl
                p-8
              "
            >
              <Game
                origin={puzzle.origin}
                target={puzzle.target}
              />
            </div>
          </section>

          <aside className="hidden xl:block col-span-2">
            <div
              className="
                border
                rounded-lg
                p-4
                text-center
                text-sm
                text-gray-500
              "
            >
              Advertisement
            </div>
          </aside>

        </div>

      </main>

      <Footer />
    </>
  );
}