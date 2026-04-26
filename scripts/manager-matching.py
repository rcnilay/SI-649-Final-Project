import pandas as pd
import glob
import os
from datetime import datetime

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MATCH_DIR = SCRIPT_DIR  # Directory containing the season CSV files (14-15.csv, 15-16.csv, etc.)
MANAGER_FILE = os.path.join(SCRIPT_DIR, "manager-stats-named.xlsx")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "all_matches_with_managers.csv")

# --- Load manager data ---
mgr = pd.read_excel(MANAGER_FILE)
mgr.columns = mgr.columns.str.strip()

# Parse manager dates (dd/mm/yyyy)
mgr["From"] = pd.to_datetime(mgr["From"], format="%d/%m/%Y", dayfirst=True)
# "Until" = None means still in charge, fill with a far future date
mgr["Until"] = pd.to_datetime(mgr["Until"], format="%d/%m/%Y", dayfirst=True, errors="coerce")
mgr["Until"] = mgr["Until"].fillna(pd.Timestamp("2099-12-31"))

# --- Load and combine all season CSVs ---
pattern = os.path.join(MATCH_DIR, "*.csv")
season_files = sorted(glob.glob(pattern))

# Filter to only files matching the XX-XX.csv naming pattern
import re
season_files = [f for f in season_files if re.search(r"\d{2}-\d{2}\.csv$", f)]

print(f"Found {len(season_files)} season files:")
for f in season_files:
    print(f"  {os.path.basename(f)}")

frames = []
for f in season_files:
    df = pd.read_csv(f, encoding="latin-1")
    # Extract season label from filename
    basename = os.path.basename(f).replace(".csv", "")
    df["Season"] = basename
    frames.append(df)

matches = pd.concat(frames, ignore_index=True)

# Drop rows with empty team names (some CSVs have trailing blank rows)
matches = matches.dropna(subset=["HomeTeam", "AwayTeam"])
matches = matches[matches["HomeTeam"].str.strip() != ""]

# Parse match dates: could be dd/mm/yy or dd/mm/yyyy
matches["MatchDate"] = pd.to_datetime(matches["Date"], dayfirst=True)

print(f"\nTotal matches loaded: {len(matches)}")
print(f"Date range: {matches['MatchDate'].min()} to {matches['MatchDate'].max()}")

# --- Build a lookup: for each team, sorted list of (from, until, manager) ---
team_managers = {}
for _, row in mgr.iterrows():
    team = row["Team"]
    if team not in team_managers:
        team_managers[team] = []
    team_managers[team].append((row["From"], row["Until"], row["Manager"]))

# Sort each team's managers by start date
for team in team_managers:
    team_managers[team].sort(key=lambda x: x[0])

def find_manager(team, match_date):
    """Find the manager for a team on a given date."""
    managers = team_managers.get(team)
    if not managers:
        return None
    for start, end, name in managers:
        if start <= match_date <= end:
            return name
    return None

# --- Match managers ---
print("\nMatching managers to fixtures...")
matches["HomeManager"] = matches.apply(lambda r: find_manager(r["HomeTeam"], r["MatchDate"]), axis=1)
matches["AwayManager"] = matches.apply(lambda r: find_manager(r["AwayTeam"], r["MatchDate"]), axis=1)

# --- Report any unmatched ---
home_missing = matches["HomeManager"].isna().sum()
away_missing = matches["AwayManager"].isna().sum()
print(f"\nUnmatched home managers: {home_missing}")
print(f"Unmatched away managers: {away_missing}")

if home_missing > 0:
    unmatched_home = matches[matches["HomeManager"].isna()][["Season", "Date", "HomeTeam"]].drop_duplicates("HomeTeam")
    print("\nSample unmatched home teams:")
    print(unmatched_home.to_string(index=False))

if away_missing > 0:
    unmatched_away = matches[matches["AwayManager"].isna()][["Season", "Date", "AwayTeam"]].drop_duplicates("AwayTeam")
    print("\nSample unmatched away teams:")
    print(unmatched_away.to_string(index=False))

# --- Reorder columns: put Season, HomeManager, AwayManager near the front ---
# Move Season after Date, then HomeManager after HomeTeam, AwayManager after AwayTeam
cols = list(matches.columns)
# Remove the columns we want to reposition
for c in ["Season", "MatchDate", "HomeManager", "AwayManager"]:
    cols.remove(c)

# Insert them in logical positions
date_idx = cols.index("Date") + 1
cols.insert(date_idx, "Season")

home_idx = cols.index("HomeTeam") + 1
cols.insert(home_idx, "HomeManager")

away_idx = cols.index("AwayTeam") + 1
cols.insert(away_idx, "AwayManager")

# Drop the temporary MatchDate column (keep original Date string)
matches = matches[cols]

# --- Save ---
matches.to_csv(OUTPUT_FILE, index=False)
print(f"\nSaved combined file: {OUTPUT_FILE}")
print(f"Total rows: {len(matches)}, Total columns: {len(matches.columns)}")