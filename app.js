// ============================================================================
// DATA LOADING
// ============================================================================

let [changesData, gamesData] = await Promise.all([
    d3.csv("data/manager_changes.csv"),
    d3.csv("data/change_games.csv")
]);


// ============================================================================
// DATA PROCESSING
// ============================================================================

changesData.forEach(d => {
    d.change_id    = +d.change_id;
    d.before_games = +d.before_games;
    d.after_games  = +d.after_games;
    d.is_caretaker = d.is_caretaker === "true";
});

gamesData.forEach(d => {
    d.change_id     = +d.change_id;
    d.game_number   = +d.game_number;
    d.goals_for     = +d.goals_for;
    d.goals_against = +d.goals_against;
    d.points        = +d.points;
    d.is_home       = d.is_home === "true";
});

const gamesByChange = d3.group(gamesData, d => d.change_id);


// ============================================================================
// CONTROLS
// ============================================================================
// Slider lives inside fig2 (histogram)

const sliderRow = d3.select("#fig2-container")
    .insert("div", "#fig2")
    .attr("class", "slider-row");

sliderRow.append("label")
    .attr("for", "window-slider")
    .text("Matches Before/After: ");

const windowLabel = sliderRow.append("span")
    .text("5 games");

sliderRow.append("input")
    .attr("type", "range")
    .attr("id", "window-slider")
    .attr("min", 5)
    .attr("max", 15)
    .attr("value", 5)
    .on("input", function () {
        const n = +this.value;
        windowLabel.text(`${n} game${n === 1 ? "" : "s"}`);
        draw(n);
    });


// ============================================================================
// FIG 1 SETUP — Chelsea: Lampard to Tuchel
// ============================================================================

const margin1 = { top: 40, right: 30, bottom: 55, left: 55 };
const width1  = 660 - margin1.left - margin1.right;
const height1 = 300 - margin1.top  - margin1.bottom;

const svg1 = d3.select("#fig1")
    .append("svg")
    .attr("width",  width1  + margin1.left + margin1.right)
    .attr("height", height1 + margin1.top  + margin1.bottom);

const g1 = svg1.append("g")
    .attr("transform", `translate(${margin1.left},${margin1.top})`);

const xAxisG1 = g1.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height1})`);

const yAxisG1 = g1.append("g")
    .attr("class", "y-axis");

svg1.append("text")
    .attr("class", "x-axis-label")
    .attr("x", margin1.left + width1 / 2)
    .attr("y", margin1.top + height1 + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Game Number  (negative = before change, positive = after)");

svg1.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin1.top + height1 / 2))
    .attr("y", 12)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Points");


// ============================================================================
// FIG 2 SETUP — Bounce Distribution Histogram
// ============================================================================

const margin2 = { top: 40, right: 30, bottom: 55, left: 55 };
const width2  = 660 - margin2.left - margin2.right;
const height2 = 300 - margin2.top  - margin2.bottom;

const svg2 = d3.select("#fig2")
    .append("svg")
    .attr("width",  width2  + margin2.left + margin2.right)
    .attr("height", height2 + margin2.top  + margin2.bottom);

const g2 = svg2.append("g")
    .attr("transform", `translate(${margin2.left},${margin2.top})`);

const xAxisG2 = g2.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height2})`);

const yAxisG2 = g2.append("g")
    .attr("class", "y-axis");

svg2.append("text")
    .attr("class", "x-axis-label")
    .attr("x", margin2.left + width2 / 2)
    .attr("y", margin2.top + height2 + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Change in Points Per Game  (After − Before)");

svg2.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin2.top + height2 / 2))
    .attr("y", 12)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Manager Changes");


// ============================================================================
// DRAW FIG 1 — Chelsea: Lampard to Tuchel
// ============================================================================

function drawFig1(n) {
    const WINDOW = 10;

    const change = changesData.find(d =>
        d.team === "Chelsea" &&
        d.old_manager.includes("Lampard") &&
        d.new_manager.includes("Tuchel")
    );
    if (!change) return;

    const games = (gamesByChange.get(change.change_id) || [])
        .filter(g => Math.abs(g.game_number) <= WINDOW)
        .sort((a, b) => a.game_number - b.game_number);

    const domain = [...d3.range(-WINDOW, 0), ...d3.range(1, WINDOW + 1)];

    const x = d3.scaleBand()
        .domain(domain)
        .range([0, width1])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, 3])
        .range([height1, 0]);

    xAxisG1.call(d3.axisBottom(x).tickValues([-10, -5, -1, 1, 5, 10]));
    yAxisG1.call(d3.axisLeft(y).tickValues([0, 1, 3]));

    const colorMap = { W: "#4a9e6b", D: "#e8b84b", L: "#c0392b" };
    const MIN_H = 4;

    g1.selectAll("rect.bar")
        .data(games)
        .join("rect")
        .attr("class", "bar")
        .attr("x",      d => x(d.game_number))
        .attr("width",  x.bandwidth())
        .attr("y",      d => d.points === 0 ? height1 - MIN_H : y(d.points))
        .attr("height", d => d.points === 0 ? MIN_H : height1 - y(d.points))
        .attr("fill",   d => colorMap[d.result])
        .attr("opacity", 0.85);

    // Dashed line marking the handover between game -1 and game 1
    const changeX = (x(-1) + x.bandwidth() + x(1)) / 2;

    g1.selectAll("line.change-line")
        .data([0])
        .join("line")
        .attr("class", "change-line")
        .attr("x1", changeX).attr("x2", changeX)
        .attr("y1", 0).attr("y2", height1)
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3");

    // Manager name annotations above the bars
    g1.selectAll("text.label-old")
        .data(["← Lampard"])
        .join("text")
        .attr("class", "label-old")
        .attr("x", changeX - 8)
        .attr("y", -12)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .attr("fill", "#555")
        .text("← Lampard");

    g1.selectAll("text.label-new")
        .data(["Tuchel →"])
        .join("text")
        .attr("class", "label-new")
        .attr("x", changeX + 8)
        .attr("y", -12)
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .attr("fill", "#555")
        .text("Tuchel →");
}


// ============================================================================
// DRAW FIG 2 — Bounce Distribution Histogram
// ============================================================================

function drawFig2(n) {
    const bounces = changesData
        .filter(d => d.before_games >= n && d.after_games >= n)
        .map(d => {
            const games  = gamesByChange.get(d.change_id) || [];
            const before = games.filter(g => g.game_number >= -n && g.game_number <= -1);
            const after  = games.filter(g => g.game_number >= 1  && g.game_number <= n);
            return d3.mean(after, g => g.points) - d3.mean(before, g => g.points);
        });

    const x = d3.scaleLinear()
        .domain(d3.extent(bounces)).nice()
        .range([0, width2]);

    const bins = d3.bin()
        .domain(x.domain())
        .thresholds(x.ticks(24))
        (bounces);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)]).nice()
        .range([height2, 0]);

    xAxisG2.call(d3.axisBottom(x).ticks(10));
    yAxisG2.call(d3.axisLeft(y).ticks(5));

    g2.selectAll("rect.bar")
        .data(bins)
        .join("rect")
        .attr("class", "bar")
        .attr("x",      d => x(d.x0) + 1)
        .attr("width",  d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y",      d => y(d.length))
        .attr("height", d => height2 - y(d.length))
        .attr("fill",    d => d.x0 >= 0 ? "#4a9e6b" : "#c0392b")
        .attr("opacity", 0.72);

    g2.selectAll("line.zero")
        .data([0])
        .join("line")
        .attr("class", "zero")
        .attr("x1", x(0)).attr("x2", x(0))
        .attr("y1", 0).attr("y2", height2)
        .attr("stroke", "#333")
        .attr("stroke-width", 2);

    const med = d3.median(bounces);

    g2.selectAll("line.median")
        .data([med])
        .join("line")
        .attr("class", "median")
        .attr("x1", x(med)).attr("x2", x(med))
        .attr("y1", 0).attr("y2", height2)
        .attr("stroke", "#555")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,3");

    g2.selectAll("text.median-label")
        .data([med])
        .join("text")
        .attr("class", "median-label")
        .attr("x", x(med) + (med >= 0 ? 6 : -6))
        .attr("y", 14)
        .attr("text-anchor", med >= 0 ? "start" : "end")
        .style("font-size", "13px")
        .attr("fill", "#444")
        .text(`median ${med >= 0 ? "+" : ""}${med.toFixed(2)}`);

    const nBetter = bounces.filter(b => b >= 0).length;
    const nWorse  = bounces.filter(b => b < 0).length;
    const nTotal  = nBetter + nWorse;

    g2.selectAll("text.count-better")
        .data([nBetter])
        .join("text")
        .attr("class", "count-better")
        .attr("x", width2).attr("y", 14)
        .attr("text-anchor", "end")
        .style("font-size", "13px")
        .attr("fill", "#4a9e6b")
        .text(`${nBetter} improved`);

    g2.selectAll("text.count-worse")
        .data([nWorse])
        .join("text")
        .attr("class", "count-worse")
        .attr("x", width2).attr("y", 32)
        .attr("text-anchor", "end")
        .style("font-size", "13px")
        .attr("fill", "#c0392b")
        .text(`${nWorse} declined`);

    g2.selectAll("text.count-total")
        .data([nTotal])
        .join("text")
        .attr("class", "count-total")
        .attr("x", width2).attr("y", -4)
        .attr("text-anchor", "end")
        .style("font-size", "13px")
        .attr("fill", "#000000")
        .text(`${nTotal} Total Managers`);
}


// ============================================================================
// DRAW
// ============================================================================

function draw(n) {
    drawFig1(n);
    drawFig2(n);
}

draw(5);


// ============================================================================
// FIG 3 — Radar Explorer
// ============================================================================

const radarData = await d3.json("data/radar_data.json");

// ── Club crests (PL badge CDN) ──
const CRESTS = {
    'Arsenal':'https://resources.premierleague.com/premierleague/badges/t3.png',
    'Aston Villa':'https://resources.premierleague.com/premierleague/badges/t7.png',
    'Brighton':'https://resources.premierleague.com/premierleague/badges/t36.png',
    'Burnley':'https://resources.premierleague.com/premierleague/badges/t90.png',
    'Chelsea':'https://resources.premierleague.com/premierleague/badges/t8.png',
    'Crystal Palace':'https://resources.premierleague.com/premierleague/badges/t31.png',
    'Everton':'https://resources.premierleague.com/premierleague/badges/t11.png',
    'Fulham':'https://resources.premierleague.com/premierleague/badges/t54.png',
    'Huddersfield':'https://resources.premierleague.com/premierleague/badges/t38.png',
    'Hull':'https://resources.premierleague.com/premierleague/badges/t88.png',
    'Leeds':'https://resources.premierleague.com/premierleague/badges/t2.png',
    'Leicester':'https://resources.premierleague.com/premierleague/badges/t13.png',
    'Liverpool':'https://resources.premierleague.com/premierleague/badges/t14.png',
    'Man United':'https://resources.premierleague.com/premierleague/badges/t1.png',
    'Middlesbrough':'https://resources.premierleague.com/premierleague/badges/t25.png',
    'Newcastle':'https://resources.premierleague.com/premierleague/badges/t4.png',
    'Norwich':'https://resources.premierleague.com/premierleague/badges/t45.png',
    "Nott'm Forest":'https://resources.premierleague.com/premierleague/badges/t17.png',
    'Sheffield United':'https://resources.premierleague.com/premierleague/badges/t49.png',
    'Southampton':'https://resources.premierleague.com/premierleague/badges/t20.png',
    'Stoke':'https://resources.premierleague.com/premierleague/badges/t110.png',
    'Sunderland':'https://resources.premierleague.com/premierleague/badges/t56.png',
    'Swansea':'https://resources.premierleague.com/premierleague/badges/t80.png',
    'Tottenham':'https://resources.premierleague.com/premierleague/badges/t6.png',
    'Watford':'https://resources.premierleague.com/premierleague/badges/t57.png',
    'West Brom':'https://resources.premierleague.com/premierleague/badges/t35.png',
    'West Ham':'https://resources.premierleague.com/premierleague/badges/t21.png',
};

const SHORT_NAMES = {
    'Crystal Palace':'C. Palace', 'Man United':'Man Utd', 'Middlesbrough':'Boro',
    "Nott'm Forest":'Forest', 'Sheffield United':'Sheff Utd',
    'Huddersfield':'Hudds', 'Southampton':'Soton'
};

// ── Radar geometry ──
const RW = 420, RH = 420, RCX = RW/2, RCY = RH/2, RADIUS = 155, LEVELS = 5;

function radarAngle(i, total) {
    return (Math.PI * 2 * i / total) - Math.PI / 2;
}

function drawRadarFrame(axes) {
    const svg = d3.select("#radar-svg");
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${RCX},${RCY})`);
    const n = axes.length;

    // Concentric rings
    for (let lv = 1; lv <= LEVELS; lv++) {
        const r = RADIUS * lv / LEVELS;
        const pts = d3.range(n).map(i => {
            const a = radarAngle(i, n);
            return [r * Math.cos(a), r * Math.sin(a)];
        });
        g.append("polygon")
            .attr("points", pts.map(p => p.join(",")).join(" "))
            .attr("fill", "none")
            .attr("stroke", "#e0ddd8")
            .attr("stroke-width", lv === LEVELS ? 1.5 : 0.7);
    }

    // Spokes
    for (let i = 0; i < n; i++) {
        const a = radarAngle(i, n);
        g.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", RADIUS * Math.cos(a))
            .attr("y2", RADIUS * Math.sin(a))
            .attr("stroke", "#ddd").attr("stroke-width", 0.7);
    }

    // Axis labels
    for (let i = 0; i < n; i++) {
        const a = radarAngle(i, n);
        const lx = (RADIUS + 22) * Math.cos(a);
        const ly = (RADIUS + 22) * Math.sin(a);
        g.append("text")
            .attr("x", lx).attr("y", ly)
            .attr("text-anchor", Math.abs(lx) < 5 ? "middle" : lx > 0 ? "start" : "end")
            .attr("dominant-baseline", Math.abs(ly) < 5 ? "middle" : ly > 0 ? "hanging" : "auto")
            .style("font-size", "12px")
            .attr("fill", "#555")
            .text(axes[i].label);
    }

    return g;
}

function drawRadarPolygon(g, values, axes, color, opacity) {
    const n = axes.length;
    const pts = axes.map((ax, i) => {
        const v = values[ax.key] || 0;
        const r = RADIUS * Math.max(0.02, v);
        const a = radarAngle(i, n);
        return [r * Math.cos(a), r * Math.sin(a)];
    });

    g.append("polygon")
        .attr("points", pts.map(p => p.join(",")).join(" "))
        .attr("fill", color).attr("fill-opacity", opacity)
        .attr("stroke", color).attr("stroke-width", 2).attr("stroke-opacity", 0.9);

    pts.forEach(p => {
        g.append("circle")
            .attr("cx", p[0]).attr("cy", p[1])
            .attr("r", 3.5)
            .attr("fill", color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);
    });
}

function updateRadar(evt) {
    const axes = radarData.axes;
    const g = drawRadarFrame(axes);

    drawRadarPolygon(g, evt.before, axes, "#c0392b", 0.12);
    drawRadarPolygon(g, evt.after, axes, "#2d7a4f", 0.15);

    document.getElementById("radar-title").textContent =
        `${evt.old} \u2192 ${evt.new}`;
    document.getElementById("radar-sub").textContent =
        `${evt.team} \u00b7 ${evt.season} \u00b7 ${evt.date}`;

    // Stat table
    const labels = {
        goals_for: "Goals Scored / game",
        shots_ot: "Shots on Target / game",
        corners: "Corners / game",
        clean_sheets: "Clean Sheet %",
        goals_against: "Goals Conceded / game",
        win_rate: "Win Rate"
    };
    const fmt = (k, v) =>
        (k === "clean_sheets" || k === "win_rate")
            ? (v * 100).toFixed(0) + "%"
            : v.toFixed(2);

    const tbody = document.getElementById("stat-body");
    tbody.innerHTML = "";
    axes.forEach(ax => {
        const bv = evt.before_raw[ax.key];
        const av = evt.after_raw[ax.key];
        const diff = av - bv;
        const improved = ax.invert ? diff < 0 : diff > 0;
        const cls = Math.abs(diff) < 0.01 ? "same" : (improved ? "better" : "worse");
        const sign = diff > 0 ? "+" : "";
        const diffStr = (ax.key === "clean_sheets" || ax.key === "win_rate")
            ? sign + (diff * 100).toFixed(0) + "%"
            : sign + diff.toFixed(2);

        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${labels[ax.key] || ax.label}</td>
            <td class="num">${fmt(ax.key, bv)}</td>
            <td class="num">${fmt(ax.key, av)}</td>
            <td class="num ${cls}">${diffStr}</td>`;
        tbody.appendChild(tr);
    });
}

// ── Build club grid ──
{
    const teams = [...new Set(radarData.events.map(e => e.team))].sort();
    const grid = document.getElementById("club-grid");

    teams.forEach(team => {
        const btn = document.createElement("button");
        btn.className = "club-btn";
        btn.dataset.team = team;

        const img = document.createElement("img");
        img.src = CRESTS[team] || "";
        img.alt = "";
        img.onerror = function () { this.style.display = "none"; };

        const span = document.createElement("span");
        span.textContent = SHORT_NAMES[team] || team;

        btn.appendChild(img);
        btn.appendChild(span);
        btn.addEventListener("click", () => selectRadarTeam(team));
        grid.appendChild(btn);
    });
}

function selectRadarTeam(team) {
    // Update button highlights
    document.querySelectorAll(".club-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.team === team);
    });

    // Build event chips
    const row = document.getElementById("event-row");
    row.innerHTML = "";
    row.classList.add("show");

    const teamEvents = radarData.events.filter(e => e.team === team);
    teamEvents.forEach((evt, i) => {
        const chip = document.createElement("button");
        chip.className = "event-chip";
        const shortOld = evt.old.replace(/\s*\(Caretaker\)\s*/g, " \u24B8").trim();
        const shortNew = evt.new.replace(/\s*\(Caretaker\)\s*/g, " \u24B8").trim();
        chip.innerHTML = `${shortOld} <span class="arrow">\u2192</span> ${shortNew} <span style="color:#999;font-size:.75rem">${evt.season}</span>`;
        chip.addEventListener("click", () => selectRadarEvent(evt, i));
        row.appendChild(chip);
    });

    // Auto-select first
    if (teamEvents.length > 0) selectRadarEvent(teamEvents[0], 0);

    document.getElementById("radar-empty").style.display = "none";
}

function selectRadarEvent(evt, idx) {
    document.querySelectorAll(".event-chip").forEach((c, i) => {
        c.classList.toggle("active", i === idx);
    });
    document.getElementById("radar-panel").classList.add("show");
    updateRadar(evt);
}