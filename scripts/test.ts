import { getClubSeasonPlayers } from "../lib/db";

// club_id 985 = Manchester United; season ids are stored like "2013.0".
console.log(getClubSeasonPlayers("985", "2013.0"));
