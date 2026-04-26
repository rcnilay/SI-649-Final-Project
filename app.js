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
