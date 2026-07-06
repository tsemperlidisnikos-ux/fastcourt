import { Suspense } from "react";
import { FilmRoomScreen } from "@/components/film-room/FilmRoomScreen";

export default function ScoutingPage() {
  return (
    <Suspense
      fallback={
        <div id="screen-film-room" className="fc-film-room-screen">
          <p className="fc-film-empty">Loading film room…</p>
        </div>
      }
    >
      <FilmRoomScreen navModuleId="scouting" />
    </Suspense>
  );
}
