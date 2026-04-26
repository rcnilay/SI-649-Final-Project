import csv
from datetime import datetime

WINDOW = 15
MIN_MATCHES = 3
INPUT = "data/all_matches_with_managers.csv"
OUTPUT_CHANGES = "data/manager_changes.csv"
OUTPUT_GAMES   = "data/change_games.csv"


def parse_date(s):
    s = s.strip()
    for fmt in ("%d/%m/%y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


# ── 1. Read and clean matches ─────────────────────────────────────────────────

matches = []

with open(INPUT, encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        if not (row.get("HomeTeam") and row.get("AwayTeam") and row.get("FTR") and row.get("Date")):
            continue
        date = parse_date(row["Date"])
        if date is None:
            continue
        try:
            home_goals = int(float(row["FTHG"]))
            away_goals = int(float(row["FTAG"]))
        except (ValueError, KeyError):
            continue

        matches.append({
            "date":         date,
            "season":       row["Season"].strip(),
            "home_team":    row["HomeTeam"].strip(),
            "home_manager": (row.get("HomeManager") or "Unknown").strip(),
            "away_team":    row["AwayTeam"].strip(),
            "away_manager": (row.get("AwayManager") or "Unknown").strip(),
            "home_goals":   home_goals,
            "away_goals":   away_goals,
            "ftr":          row["FTR"].strip(),
        })

matches.sort(key=lambda m: m["date"])


# ── 2. Build per-team match histories ─────────────────────────────────────────
# Each entry is from that team's perspective: goals for/against, result, opponent.

team_matches = {}

for m in matches:
    for team, manager, gf, ga, win_code, is_home in [
        (m["home_team"], m["home_manager"], m["home_goals"], m["away_goals"], "H", True),
        (m["away_team"], m["away_manager"], m["away_goals"], m["home_goals"], "A", False),
    ]:
        result = "D" if m["ftr"] == "D" else ("W" if m["ftr"] == win_code else "L")
        opponent = m["away_team"] if is_home else m["home_team"]

        if team not in team_matches:
            team_matches[team] = []

        team_matches[team].append({
            "date":           m["date"],
            "season":         m["season"],
            "manager":        manager,
            "goals_for":      gf,
            "goals_against":  ga,
            "points":         3 if result == "W" else (1 if result == "D" else 0),
            "result":         result,
            "opponent":       opponent,
            "is_home":        is_home,
        })

for history in team_matches.values():
    history.sort(key=lambda x: x["date"])


# ── 3. Detect manager changes and build output rows ───────────────────────────

change_summary = []
change_games   = []
change_id      = 0

for team, history in sorted(team_matches.items()):
    for i in range(1, len(history)):
        if history[i]["manager"] == history[i - 1]["manager"]:
            continue

        before = history[max(0, i - WINDOW) : i]
        after  = history[i : min(len(history), i + WINDOW)]

        if len(before) < MIN_MATCHES or len(after) < MIN_MATCHES:
            continue

        change_id    += 1
        old_manager   = history[i - 1]["manager"]
        new_manager   = history[i]["manager"]
        change_date   = history[i]["date"].strftime("%Y-%m-%d")
        season        = history[i]["season"]

        change_summary.append({
            "change_id":    change_id,
            "team":         team,
            "old_manager":  old_manager,
            "new_manager":  new_manager,
            "change_date":  change_date,
            "season":       season,
            "before_games": len(before),
            "after_games":  len(after),
            "is_caretaker": "true" if "Caretaker" in new_manager else "false",
        })

        # Games before the change: game_number counts backwards from -1
        for j, game in enumerate(before):
            change_games.append({
                "change_id":    change_id,
                "team":         team,
                "old_manager":  old_manager,
                "new_manager":  new_manager,
                "change_date":  change_date,
                "season":       season,
                "phase":        "before",
                "game_number":  j - len(before),   # -15 … -1
                "date":         game["date"].strftime("%Y-%m-%d"),
                "opponent":     game["opponent"],
                "is_home":      "true" if game["is_home"] else "false",
                "manager":      game["manager"],
                "goals_for":    game["goals_for"],
                "goals_against":game["goals_against"],
                "points":       game["points"],
                "result":       game["result"],
            })

        # Games after the change: game_number counts forward from 1
        for j, game in enumerate(after):
            change_games.append({
                "change_id":    change_id,
                "team":         team,
                "old_manager":  old_manager,
                "new_manager":  new_manager,
                "change_date":  change_date,
                "season":       season,
                "phase":        "after",
                "game_number":  j + 1,             # 1 … 15
                "date":         game["date"].strftime("%Y-%m-%d"),
                "opponent":     game["opponent"],
                "is_home":      "true" if game["is_home"] else "false",
                "manager":      game["manager"],
                "goals_for":    game["goals_for"],
                "goals_against":game["goals_against"],
                "points":       game["points"],
                "result":       game["result"],
            })


# ── 4. Write CSVs ─────────────────────────────────────────────────────────────

SUMMARY_FIELDS = [
    "change_id", "team", "old_manager", "new_manager", "change_date", "season",
    "before_games", "after_games", "is_caretaker",
]

with open(OUTPUT_CHANGES, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=SUMMARY_FIELDS)
    writer.writeheader()
    writer.writerows(change_summary)

GAMES_FIELDS = [
    "change_id", "team", "old_manager", "new_manager", "change_date", "season",
    "phase", "game_number", "date", "opponent", "is_home",
    "manager", "goals_for", "goals_against", "points", "result",
]

with open(OUTPUT_GAMES, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=GAMES_FIELDS)
    writer.writeheader()
    writer.writerows(change_games)

print(f"Wrote {len(change_summary):>4} rows to {OUTPUT_CHANGES}")
print(f"Wrote {len(change_games):>4} rows to {OUTPUT_GAMES}")
