"use client";

import { useEffect, useState } from "react";

type Props = {origin: string; target: string};

type ClubSeason = {club: string;season: string};

type Player = {player: string};

type PathNode = | {type: "player"; value: string} | {type: "clubseason"; club: string; season: string};

type Option = | {type: "player"; value: string} | {type: "clubseason"; club: string; season: string};
export default function Game({origin, target,}: Props) {
    const [path, setPath] = useState<PathNode[]>([ { type: "player", value: origin, },]);
    const [options, setOptions] = useState<Option[]>([]);
    const current = path[path.length - 1];
    useEffect(() => {
        async function loadOptions() {
            if (current.type === "player") {
                const response =
                    await fetch(`/api/player?name=${encodeURIComponent(current.value)}`);
                const data: ClubSeason[] =
                    await response.json();
                setOptions(
                    data.map((item) => ({type: "clubseason", club: item.club, season: item.season,}))
                );
            } else {
                const response =
                    await fetch(`/api/clubseason?club=${encodeURIComponent(current.club)}&season=${encodeURIComponent(current.season)}`);
                const data: Player[] =
                    await response.json();
                setOptions(
                    data.map((item) => ({type: "player", value: item.player,}))
                );
            }
        }
		loadOptions();
	}, [current]);
    function selectOption(option: Option) {
        setPath([...path, option,]);
    }
    const currentGame = `${origin} and ${target}`
    const moveCountLabel = `${Math.floor(path.length)} move${path.length > 1 ? "s":""}`;
	return(
<>
 <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
	<div className="border p-4">
				<h3 className="text-xl font-bold mb-4">
						Find a link between;
				</h3>
				<h4 className="text-sm mb-4">
					{currentGame}
				</h4>
		<h3 className="text-xl font-bold mb-4">
			Path ({moveCountLabel})
		</h3>

		<ul>
			{path.map((node, i) => (
				<li key={i} className="py-2">
					{node.type === "player"
						? node.value
						: `${node.club} (${node.season})`}
				</li>
			))}
		</ul>
	</div>
	<div className="border p-4">
		{current.type === "player" && current.value === target ? <h3> "Congrats!"</h3> :
            <>
            <h3 className="text-xl font-bold mb-4">
                Next Move
            </h3>

            <h4 className="text-sm text-gray-500 mb-4">
            {current.type === "player"
                ? `Showing ${current.value}'s Career`
                : `Showing ${current.club} (${current.season}) Squad`}
            </h4>

            <select
                className="w-full border p-2 mb-4"
                defaultValue=""
                onChange={(e) => {
                    const index = Number(e.target.value);

                    if (!Number.isNaN(index)) {
                        selectOption(options[index]);
                    }

                    e.target.value = "";
                }}
            >
                <option value="">
                    Select next move
                </option>

                {options.map((option, i) => (
                    <option key={i} value={i}>
                        {option.type === "player"
                            ? option.value
                            : `${option.club} (${option.season})`}
                    </option>
                ))}
            </select>

            <ul>
                {options.map((option, i) => (
                    <li key={i} className="py-2">
                        {option.type === "player"
                            ? option.value
                            : `${option.club} (${option.season})`}
                    </li>
                ))}
            </ul>
            </>
        }
	</div>
</div>
</>)
}

