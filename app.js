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
    'Bournemouth':'https://resources.premierleague.com/premierleague/badges/t91.png',
    'Brentford':'https://resources.premierleague.com/premierleague/badges/t94.png',
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
    'Man City':'https://resources.premierleague.com/premierleague/badges/t43.png',
    'Man United':'https://resources.premierleague.com/premierleague/badges/t1.png',
    'Middlesbrough':'https://resources.premierleague.com/premierleague/badges/t25.png',
    'Newcastle':'https://resources.premierleague.com/premierleague/badges/t4.png',
    'Norwich':'https://resources.premierleague.com/premierleague/badges/t45.png',
    "Nott'm Forest":'https://resources.premierleague.com/premierleague/badges/t17.png',
    'QPR':'https://resources.premierleague.com/premierleague/badges/t52.png',
    'Sheffield United':'https://resources.premierleague.com/premierleague/badges/t49.png',
    'Southampton':'https://resources.premierleague.com/premierleague/badges/t20.png',
    'Stoke':'https://resources.premierleague.com/premierleague/badges/t110.png',
    'Sunderland':'https://resources.premierleague.com/premierleague/badges/t56.png',
    'Swansea':'https://resources.premierleague.com/premierleague/badges/t80.png',
    'Tottenham':'https://resources.premierleague.com/premierleague/badges/t6.png',
    'Watford':'https://resources.premierleague.com/premierleague/badges/t57.png',
    'West Brom':'https://resources.premierleague.com/premierleague/badges/t35.png',
    'West Ham':'https://resources.premierleague.com/premierleague/badges/t21.png',
    'Wolves':  'https://resources.premierleague.com/premierleague/badges/t39.png',
};

// ── Manager headshots (Wikimedia Commons) — falls back to silhouette on error ──
const HEADSHOTS = {
    'Jose Mourinho':       "https://commons.wikimedia.org/wiki/Special:FilePath/Jose_Mourinho%2714.JPG?width=120",
    'Jurgen Klopp':        "https://commons.wikimedia.org/wiki/Special:FilePath/J%C3%BCrgen_Klopp_(cropped).jpg?width=120",
    'Pep Guardiola':       "https://commons.wikimedia.org/wiki/Special:FilePath/Pep_Guardiola_2015.jpg?width=120",
    'Thomas Tuchel':       "https://commons.wikimedia.org/wiki/Special:FilePath/Thomas_Tuchel.jpg?width=120",
    'Mauricio Pochettino': "https://commons.wikimedia.org/wiki/Special:FilePath/Mauricio_Pochettino_2016_(cropped).jpg?width=120",
    'Arsene Wenger':       "https://commons.wikimedia.org/wiki/Special:FilePath/Arsene_Wenger.JPG?width=120",
    'Antonio Conte':       "https://commons.wikimedia.org/wiki/Special:FilePath/20150616_Antonio_Conte.jpg?width=120",
    'Claudio Ranieri':     "https://commons.wikimedia.org/wiki/Special:FilePath/Claudio_Ranieri_Inter_(cropped).jpg?width=120",
    'Rafael Benitez':      "https://commons.wikimedia.org/wiki/Special:FilePath/Rafa_Benitez.JPG?width=120",
    'Ole Gunnar Solskjaer':"https://commons.wikimedia.org/wiki/Special:FilePath/Ole_Gunnar_Solskjaer_Cardiff_manager_cropped.jpg?width=120",
    'Frank Lampard':       "https://commons.wikimedia.org/wiki/Special:FilePath/Frank_Lampard.JPG?width=120",
    'Roberto Martinez':    "https://commons.wikimedia.org/wiki/Special:FilePath/Roberto_Mart%C3%ADnez_2010.jpg?width=120",
    'Ronald Koeman':       "https://commons.wikimedia.org/wiki/Special:FilePath/Ronald_Koeman_20140923.jpg?width=120",
    'Manuel Pellegrini':   "https://commons.wikimedia.org/wiki/Special:FilePath/Manuel_Pellegrini_2012.JPG?width=120",
    'Brendan Rodgers':     "https://commons.wikimedia.org/wiki/Special:FilePath/Brendan_Rodgers_2014_(cropped).jpg?width=120",
    'Eddie Howe':          "https://commons.wikimedia.org/wiki/Special:FilePath/Eddie_Howe_2015.jpg?width=120",
    'Graham Potter':       "https://commons.wikimedia.org/wiki/Special:FilePath/Graham_Potter%2C_Brighton_%26_Hove_Albion_vs_RCD_Espanyol%2C_30_July_2022_(1)_(cropped).jpg?width=120",
    'Unai Emery':          "https://commons.wikimedia.org/wiki/Special:FilePath/Unai_Emery.JPG?width=120",
    'Carlo Ancelotti':     "https://commons.wikimedia.org/wiki/Special:FilePath/Carlo_Ancelotti_2016.jpg?width=120",
    'David Moyes':         "https://commons.wikimedia.org/wiki/Special:FilePath/David_Moyes_2025.jpg?width=120",
    'Sam Allardyce':       "https://commons.wikimedia.org/wiki/Special:FilePath/Sam_Allardyce_2009.jpg?width=120",
    'Tony Pulis':          "https://commons.wikimedia.org/wiki/Special:FilePath/Tony_Pulis.jpg?width=120",
    'Maurizio Sarri':      "https://commons.wikimedia.org/wiki/Special:FilePath/Maurizio_Sarri_2019.jpg?width=120",
    'Sean Dyche':          "https://commons.wikimedia.org/wiki/Special:FilePath/Sean_Dyche_2016.jpg?width=120",
    'Alan Pardew':         "https://commons.wikimedia.org/wiki/Special:FilePath/Alan_Pardew_2014.jpg?width=120",
    'Roy Hodgson':         "https://commons.wikimedia.org/wiki/Special:FilePath/Roy_Hodgson_2010.jpg?width=120",
    'Steve Bruce':         "https://commons.wikimedia.org/wiki/Special:FilePath/Steve_Bruce_2016.jpg?width=120",
    'Mark Hughes':         "https://commons.wikimedia.org/wiki/Special:FilePath/Mark_Hughes_2012.jpg?width=120",
    'Louis van Gaal':      "https://commons.wikimedia.org/wiki/Special:FilePath/Louis_van_Gaal_2014.jpg?width=120",
    'Nuno Espirito Santo': "https://commons.wikimedia.org/wiki/Special:FilePath/Nuno_Esp%C3%ADrito_Santo_2019_(cropped).jpg?width=120",
    'Chris Wilder':        "https://commons.wikimedia.org/wiki/Special:FilePath/Chris_Wilder_2019.jpg?width=120",
    'Dean Smith':          "https://commons.wikimedia.org/wiki/Special:FilePath/Dean_Smith_2019.jpg?width=120",
    'Scott Parker':        "https://commons.wikimedia.org/wiki/Special:FilePath/Scott_Parker_2020.jpg?width=120",
    'Patrick Vieira':      "https://commons.wikimedia.org/wiki/Special:FilePath/Patrick_Vieira.jpg?width=120",
    'Slavisa Jokanovic':   "https://commons.wikimedia.org/wiki/Special:FilePath/Slavisa_Jokanovic.jpg?width=120",
    'Paul Clement':        "https://commons.wikimedia.org/wiki/Special:FilePath/Paul_Clement_2017.jpg?width=120",
    'Walter Mazzarri':     "https://commons.wikimedia.org/wiki/Special:FilePath/Walter_Mazzarri.jpg?width=120",
    'Aitor Karanka':       "https://commons.wikimedia.org/wiki/Special:FilePath/Aitor_Karanka.jpg?width=120",
    'Marco Silva':         "https://commons.wikimedia.org/wiki/Special:FilePath/Marco_Silva_2017.jpg?width=120",
    'Bob Bradley':         "https://commons.wikimedia.org/wiki/Special:FilePath/Bob_Bradley.jpg?width=120",
    'David Wagner':        "https://commons.wikimedia.org/wiki/Special:FilePath/David_Wagner_2017.jpg?width=120",
    'Nigel Pearson':       "https://commons.wikimedia.org/wiki/Special:FilePath/Nigel_Pearson_2014.jpg?width=120",
    'Paul Lambert':        "https://commons.wikimedia.org/wiki/Special:FilePath/Paul_Lambert_2012.jpg?width=120",
    'Roberto Di Matteo':   "https://commons.wikimedia.org/wiki/Special:FilePath/Roberto_Di_Matteo_2016.jpg?width=120",
    'Martin O\'Neill':     "https://commons.wikimedia.org/wiki/Special:FilePath/Martin_O%27Neill.jpg?width=120",
    'Bruno Lage':          "https://commons.wikimedia.org/wiki/Special:FilePath/Bruno_Lage_2021.jpg?width=120",
    'Tim Sherwood':        "https://commons.wikimedia.org/wiki/Special:FilePath/Tim_Sherwood_2014.jpg?width=120",
    'Ralf Rangnick':       "https://commons.wikimedia.org/wiki/Special:FilePath/Ralf_Rangnick_2021.jpg?width=120",
    'Erik ten Hag':        "https://commons.wikimedia.org/wiki/Special:FilePath/Erik_ten_Hag_2022.jpg?width=120",
    'Ange Postecoglou':    "https://commons.wikimedia.org/wiki/Special:FilePath/Ange_Postecoglou_2023.jpg?width=120",
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


// ============================================================================
// FIG 4 — Scatter: Before vs. After (all 159 changes)
// ============================================================================

// ── State ──
let s4Teams          = new Set();  // highlighted teams; empty = all equal
let s4Metric         = "ppg";      // "ppg" | "gd"
let s4ShowCaretakers = true;
let s4Window         = 5;
let s4ActiveId       = null;       // change_id of the currently selected dot

// ── SVG setup ──
const margin4 = { top: 40, right: 30, bottom: 60, left: 50 };
const width4  = 322;
const height4 = 322;

const svg4 = d3.select("#fig4")
    .append("svg")
    .attr("width",  width4  + margin4.left + margin4.right)
    .attr("height", height4 + margin4.top  + margin4.bottom);

const g4 = svg4.append("g")
    .attr("transform", `translate(${margin4.left},${margin4.top})`);

const xAxisG4 = g4.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0,${height4})`);
const yAxisG4 = g4.append("g").attr("class", "y-axis");

const diagG4  = g4.append("g");  // diagonal + zero lines
const dotsG4  = g4.append("g");  // data dots
const annotG4 = g4.append("g");  // quadrant annotations — must be last so text sits above dots

const xLabel4 = svg4.append("text")
    .attr("x", margin4.left + width4 / 2)
    .attr("y", margin4.top + height4 + 55)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "sans-serif")
    .attr("fill", "#444");

const yLabel4 = svg4.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin4.top + height4 / 2))
    .attr("y", 14)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "sans-serif")
    .attr("fill", "#444");

// ── Clip path: keeps dots inside the plot area during zoom ──
svg4.append("defs")
    .append("clipPath").attr("id", "scatter-clip")
    .append("rect").attr("width", width4).attr("height", height4);

diagG4.attr("clip-path", "url(#scatter-clip)");
dotsG4.attr("clip-path", "url(#scatter-clip)");

// ── Zoom state (base scales, set by drawFig4 on each redraw) ──
let x4ref = null, y4ref = null, lo4 = 0, hi4 = 3;

// ── Zoom behaviour ──
const zoom4 = d3.zoom()
    .scaleExtent([1, 12])
    .on("zoom", function(event) {
        if (!x4ref) return;
        const t  = event.transform;
        const xz = t.rescaleX(x4ref);
        const yz = t.rescaleY(y4ref);

        xAxisG4.call(d3.axisBottom(xz).ticks(5));
        yAxisG4.call(d3.axisLeft(yz).ticks(5));

        dotsG4.selectAll("circle.dot")
            .attr("cx", d => xz(d.bVal))
            .attr("cy", d => yz(d.aVal));

        diagG4.select(".diag-line")
            .attr("x1", xz(lo4)).attr("y1", yz(lo4))
            .attr("x2", xz(hi4)).attr("y2", yz(hi4));

        const zx = diagG4.select(".zero-x");
        if (!zx.empty()) {
            zx.attr("x1", xz(0)).attr("x2", xz(0));
            diagG4.select(".zero-y").attr("y1", yz(0)).attr("y2", yz(0));
        }

        if (s4ActiveId !== null) applyHighlight(s4ActiveId, s4Teams.size > 0);
    });

svg4.call(zoom4);
svg4.on("dblclick.zoom", null); // disable default dblclick-to-zoom
svg4.on("dblclick", () => svg4.transition().duration(350).call(zoom4.transform, d3.zoomIdentity));

// ── Club grid (multi-select toggle) ──
{
    const teams = [...new Set(changesData.map(d => d.team))].sort();
    const grid  = document.getElementById("scatter-club-grid");

    teams.forEach(team => {
        const btn  = document.createElement("button");
        btn.className    = "club-btn";
        btn.dataset.team = team;

        const img = document.createElement("img");
        img.src   = CRESTS[team] || "";
        img.alt   = "";
        img.onerror = function () { this.style.display = "none"; };

        const span = document.createElement("span");
        span.textContent = SHORT_NAMES[team] || team;

        btn.appendChild(img);
        btn.appendChild(span);
        btn.addEventListener("click", () => {
            if (s4Teams.has(team)) {
                s4Teams.delete(team);
                btn.classList.remove("active");
            } else {
                s4Teams.add(team);
                btn.classList.add("active");
            }
            drawFig4(s4Window);
        });
        grid.appendChild(btn);
    });
}

// ── Metric buttons ──
document.querySelectorAll(".metric-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        s4Metric = btn.dataset.metric;
        document.querySelectorAll(".metric-btn").forEach(b =>
            b.classList.toggle("active", b.dataset.metric === s4Metric));
        drawFig4(s4Window);
    });
});

// ── Caretaker toggle ──
document.getElementById("btn-caretaker").addEventListener("click", function () {
    s4ShowCaretakers = !s4ShowCaretakers;
    this.classList.toggle("hidden", !s4ShowCaretakers);
    this.textContent = s4ShowCaretakers ? "Showing Caretakers" : "Hiding Caretakers";
    drawFig4(s4Window);
});

// ── Window slider ──
document.getElementById("scatter-slider").addEventListener("input", function () {
    s4Window = +this.value;
    document.getElementById("scatter-window-label").textContent =
        `${s4Window} game${s4Window === 1 ? "" : "s"}`;
    drawFig4(s4Window);
});

// ── Data computation ──
function computeS4Point(d, n) {
    const games  = gamesByChange.get(d.change_id) || [];
    const before = games.filter(g => g.game_number >= -n && g.game_number <= -1);
    const after  = games.filter(g => g.game_number >= 1  && g.game_number <= n);
    if (before.length === 0 || after.length === 0) return null;

    const bPPG = d3.mean(before, g => g.points);
    const aPPG = d3.mean(after,  g => g.points);
    const bGD  = d3.mean(before, g => g.goals_for - g.goals_against);
    const aGD  = d3.mean(after,  g => g.goals_for - g.goals_against);

    const bVal = s4Metric === "ppg" ? bPPG : bGD;
    const aVal = s4Metric === "ppg" ? aPPG : aGD;

    return {
        ...d, bVal, aVal, bPPG, aPPG, bGD, aGD,
        bW: before.filter(g => g.result === "W").length,
        bD: before.filter(g => g.result === "D").length,
        bL: before.filter(g => g.result === "L").length,
        aW: after.filter(g => g.result === "W").length,
        aD: after.filter(g => g.result === "D").length,
        aL: after.filter(g => g.result === "L").length,
        nBefore: before.length, nAfter: after.length,
    };
}

// ── Draw ──
function drawFig4(n) {
    const pts = changesData
        .filter(d => d.before_games >= n && d.after_games >= n)
        .filter(d => s4ShowCaretakers || !d.is_caretaker)
        .map(d => computeS4Point(d, n))
        .filter(Boolean);

    // Symmetric domain so diagonal is truly y=x
    const allVals = pts.flatMap(p => [p.bVal, p.aVal]);
    let lo = Math.min(...allVals), hi = Math.max(...allVals);
    if (s4Metric === "ppg") { lo = Math.min(lo, 0); hi = Math.max(hi, 3); }
    const pad = (hi - lo) * 0.07;
    lo -= pad; hi += pad;

    const x4 = d3.scaleLinear().domain([lo, hi]).range([0, width4]);
    const y4 = d3.scaleLinear().domain([lo, hi]).range([height4, 0]);

    xAxisG4.call(d3.axisBottom(x4).ticks(5));
    yAxisG4.call(d3.axisLeft(y4).ticks(5));

    x4ref = x4; y4ref = y4; lo4 = lo; hi4 = hi;

    const metricLabel = s4Metric === "ppg" ? "Points Per Game" : "Goal Diff Per Game";
    xLabel4.text(`Before change — ${metricLabel}`);
    yLabel4.text(`After change — ${metricLabel}`);

    // Diagonal y = x
    diagG4.selectAll("*").remove();
    diagG4.append("line")
        .attr("class", "diag-line")
        .attr("x1", x4(lo)).attr("y1", y4(lo))
        .attr("x2", x4(hi)).attr("y2", y4(hi))
        .attr("stroke", "#bbb").attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,4");

    // Zero reference lines for goal differential
    if (s4Metric === "gd" && lo < 0 && hi > 0) {
        diagG4.append("line")
            .attr("class", "zero-x")
            .attr("x1", x4(0)).attr("y1", 0)
            .attr("x2", x4(0)).attr("y2", height4)
            .attr("stroke", "#e0ddd8").attr("stroke-width", 1);
        diagG4.append("line")
            .attr("class", "zero-y")
            .attr("x1", 0).attr("y1", y4(0))
            .attr("x2", width4).attr("y2", y4(0))
            .attr("stroke", "#e0ddd8").attr("stroke-width", 1);
    }

    // Quadrant labels
    annotG4.selectAll("*").remove();
    annotG4.append("text")
        .attr("x", 6).attr("y", 16)
        .style("font-size", "11px").style("font-family", "sans-serif")
        .attr("fill", "#4a9e6b").attr("font-weight", "600")
        .attr("stroke", "white").attr("stroke-width", "4")
        .style("paint-order", "stroke fill")
        .text("▲ Improved");
    annotG4.append("text")
        .attr("x", width4 - 6).attr("y", height4 - 6)
        .attr("text-anchor", "end")
        .style("font-size", "11px").style("font-family", "sans-serif")
        .attr("fill", "#c0392b").attr("font-weight", "600")
        .attr("stroke", "white").attr("stroke-width", "4")
        .style("paint-order", "stroke fill")
        .text("▼ Declined");

    // Count label
    annotG4.append("text")
        .attr("x", width4).attr("y", -28)
        .attr("text-anchor", "end")
        .style("font-size", "12px").style("font-family", "sans-serif")
        .attr("fill", "#888")
        .text(`${pts.length} changes`);

    // Dots
    const anySelected = s4Teams.size > 0;

    dotsG4.selectAll("circle.dot")
        .data(pts, d => d.change_id)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", d => x4(d.bVal))
        .attr("cy", d => y4(d.aVal))
        .attr("fill", d => d.aVal >= d.bVal ? "#4a9e6b" : "#c0392b")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("r", d => (anySelected && s4Teams.has(d.team)) ? 7 : 5.5)
        .attr("opacity", d => {
            if (!anySelected) return 0.65;
            return s4Teams.has(d.team) ? 0.92 : 0.08;
        })
        .style("filter", "none")
        .style("cursor", d => (anySelected && !s4Teams.has(d.team)) ? "default" : "pointer")
        .on("click", function (event, d) {
            if (anySelected && !s4Teams.has(d.team)) return;
            event.stopPropagation();
            s4ActiveId = d.change_id;
            applyHighlight(d.change_id, anySelected);
            showS4Info(d);
        });

    // Click SVG background to clear selection
    svg4.on("click", () => {
        s4ActiveId = null;
        const _any = s4Teams.size > 0;
        dotsG4.selectAll("circle.dot")
            .attr("r", d => (_any && s4Teams.has(d.team)) ? 7 : 5.5)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .style("filter", "none");
        document.getElementById("scatter-swap").classList.remove("show");
        document.getElementById("scatter-left-empty").style.display = "";
        document.getElementById("scatter-stats").classList.remove("show");
        document.getElementById("scatter-right-empty").style.display = "";
    });

    // Refresh stats panel; clear selection if the active point was filtered out
    if (s4ActiveId !== null) {
        const activePt = pts.find(p => p.change_id === s4ActiveId);
        if (activePt) {
            showS4Info(activePt);
        } else {
            s4ActiveId = null;
            document.getElementById("scatter-swap").classList.remove("show");
            document.getElementById("scatter-left-empty").style.display = "";
            document.getElementById("scatter-stats").classList.remove("show");
            document.getElementById("scatter-right-empty").style.display = "";
        }
    }

    // Reset zoom to identity — the zoom handler repositions dots and re-applies highlight
    svg4.call(zoom4.transform, d3.zoomIdentity);
}

function applyHighlight(changeId, anySelected) {
    // Reset all dots to base style first
    dotsG4.selectAll("circle.dot")
        .attr("r", p => {
            if (p.change_id === changeId) return 9;
            return (anySelected && s4Teams.has(p.team)) ? 7 : 5.5;
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("filter", "none");
    // Apply strong highlight to the active dot
    dotsG4.selectAll("circle.dot")
        .filter(p => p.change_id === changeId)
        .attr("stroke", "#1a1a1a")
        .attr("stroke-width", 3)
        .style("filter", "drop-shadow(0 0 5px rgba(0,0,0,0.55)) drop-shadow(0 0 2px rgba(0,0,0,0.8))");
}

// ── Generic manager silhouette SVG ──
function silhouetteSVG() {
    return `<svg viewBox="0 0 50 50" width="50" height="50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="25" fill="#e4e1db"/>
        <circle cx="25" cy="17" r="8" fill="#c4bfb6"/>
        <path d="M7,47 Q8,31 25,31 Q42,31 43,47 Z" fill="#c4bfb6"/>
        <circle cx="38" cy="38" r="9" fill="#fafaf8" stroke="#d4d0c8" stroke-width="1.5"/>
        <text x="38" y="42.5" text-anchor="middle" font-size="11"
              font-family="sans-serif" fill="#aaa" font-weight="bold">?</text>
    </svg>`;
}

// ── Set manager avatar — headshot if available, silhouette otherwise ──
function setManagerAvatar(divEl, name) {
    const url = HEADSHOTS[name];
    if (url) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = name;
        img.style.cssText = "width:50px;height:50px;border-radius:50%;object-fit:cover;object-position:top center;display:block";
        img.onerror = () => { divEl.innerHTML = silhouetteSVG(); };
        divEl.innerHTML = "";
        divEl.appendChild(img);
    } else {
        divEl.innerHTML = silhouetteSVG();
    }
}

// ── Populate side panels on dot click ──
function showS4Info(d) {
    const sign = v => v >= 0 ? "+" : "";
    const f2   = v => v.toFixed(2);

    // ── Left panel: club crest + manager swap ──
    document.getElementById("scatter-left-empty").style.display = "none";

    const crestEl = document.getElementById("swap-crest");
    crestEl.src = CRESTS[d.team] || "";
    crestEl.style.display = CRESTS[d.team] ? "" : "none";

    document.getElementById("swap-club-name").textContent = d.team;
    setManagerAvatar(document.getElementById("swap-old-avatar"), d.old_manager);
    document.getElementById("swap-old-name").textContent = d.old_manager;
    setManagerAvatar(document.getElementById("swap-new-avatar"), d.new_manager);
    document.getElementById("swap-new-name").textContent = d.new_manager;
    document.getElementById("swap-meta").textContent =
        `${d.season} · ${d.change_date}` + (d.is_caretaker ? "\nCaretaker" : "");

    document.getElementById("scatter-swap").classList.add("show");

    // ── Right panel: stats breakdown ──
    document.getElementById("scatter-right-empty").style.display = "none";

    const ppgDiff = d.aPPG - d.bPPG;
    const gdDiff  = d.aGD  - d.bGD;
    const ppgCls  = ppgDiff >= 0 ? "better" : "worse";
    const gdCls   = gdDiff  >= 0 ? "better" : "worse";

    document.getElementById("scatter-stats").innerHTML = `
        <div class="stat-win">${s4Window} game window each side</div>
        <div class="stat-block">
            <div class="stat-block-label">Record</div>
            <div class="stat-block-value">${d.bW}W–${d.bD}D–${d.bL}L</div>
            <div class="stat-block-value" style="color:#888;font-size:.65rem">&#8595;</div>
            <div class="stat-block-value">${d.aW}W–${d.aD}D–${d.aL}L</div>
        </div>
        <div class="stat-block">
            <div class="stat-block-label">Pts / Game</div>
            <div class="stat-block-value">${f2(d.bPPG)} &#8594; ${f2(d.aPPG)}</div>
            <div class="stat-block-delta ${ppgCls}">${sign(ppgDiff)}${f2(ppgDiff)} ${ppgDiff >= 0 ? "&#9650;" : "&#9660;"}</div>
        </div>
        <div class="stat-block">
            <div class="stat-block-label">Goal Diff / Game</div>
            <div class="stat-block-value">${f2(d.bGD)} &#8594; ${f2(d.aGD)}</div>
            <div class="stat-block-delta ${gdCls}">${sign(gdDiff)}${f2(gdDiff)} ${gdDiff >= 0 ? "&#9650;" : "&#9660;"}</div>
        </div>
    `;
    document.getElementById("scatter-stats").classList.add("show");
}

drawFig4(5);