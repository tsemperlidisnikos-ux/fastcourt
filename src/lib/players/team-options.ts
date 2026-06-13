export function getRosterTeamOptions(teams: string[]): string[] {
  const list = [...new Set(teams.map((t) => String(t || "").trim()).filter(Boolean))];
  const realTeams = list.filter((t) => t !== "No Team");
  if (realTeams.length) {
    return realTeams.sort((a, b) => a.localeCompare(b));
  }
  return list.length ? list : ["No Team"];
}

export function defaultRosterTeam(teams: string[], preferred?: string): string {
  const options = getRosterTeamOptions(teams);
  const norm = String(preferred || "").trim();
  if (norm && options.includes(norm)) return norm;
  return options[0] || "No Team";
}

export function isRealTeam(team: string) {
  return String(team || "").trim() !== "" && team !== "No Team";
}
