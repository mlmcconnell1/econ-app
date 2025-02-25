//----------------------------------
// SVG Section
//----------------------------------
const margin = {top: 20, right: 30, bottom: 50, left: 50},
      width = window.innerWidth / 2 - margin.left - margin.right,  // Half the browser width
      height = 800 - margin.top - margin.bottom;

// Create the SVG canvas
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// After creating the SVG and before creating scales, add a clip path
svg.append("defs")
.append("clipPath")
.attr("id", "clip")
.append("rect")
.attr("width", width)
.attr("height", height)
.attr("x", 0)
.attr("y", 0);

// Scales
const max_quantity = 200
const max_price = 500
const xScale = d3.scaleLinear().domain([0, max_quantity]).range([0, width]);  // Quantity
const yScale = d3.scaleLinear().domain([0, max_price]).range([height, 0]); // Price - increased range to match larger height

// Axes
svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

svg.append("g")
    .call(d3.axisLeft(yScale));

// Labels
svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Quantity");

svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Price");

// Use D3 to draw a line between two points.
function createLine(data, color, className) {
 return svg.append("path")
     .datum(data)
     .attr("class", className)
     .attr("fill", "none")
     .attr("stroke", color)
     .attr("stroke-width", 2)
     .style("cursor", "ew-resize")
     .attr("clip-path", "url(#clip)") // Don't show outside of this region
     .attr("d", d3.line()
         .x(d => xScale(d.x))
         .y(d => yScale(d.y))
     );
}

//----------------------------------
// Set up page features
//----------------------------------

// Define supply line variations
const supplyVariations = {
    elastic: [{x: 20, y: 190}, {x: 180, y: 210}],   // Wide x-range, small y-range
    normal: [{x: 50, y: 100}, {x: 150, y: 300}],    // Reset to unit elasticity
    inelastic: [{x: 100, y: 50}, {x: 150, y: 450}]    // Narrow x-range, large y-range
};

// Define demand line variations
const demandVariations = {
    elastic: [{x: 20, y: 210}, {x: 180, y: 190}],
    normal: [{x: 50, y: 300}, {x: 150, y: 100}],
    inelastic: [{x: 100, y: 450}, {x: 150, y: 50}]
};

// Add event listeners to radio buttons
document.querySelectorAll('input[name="supply-slope"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        updatesupplyEndPoints(e.target.value);
    });
});

document.querySelectorAll('input[name="demand-slope"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        updatedemandEndPoints(e.target.value);
    });
});

// Start with supply and demand line end points set at unit elasticity
// The {...} syntax copies values instead of creating a pointer
var supplyEndPoints = [...supplyVariations.normal];
var demandEndPoints = [...demandVariations.normal];

// Create our lines using D3 routine defined above
var supplyLine = createLine(supplyEndPoints, "blue", "supply");
var demandLine = createLine(demandEndPoints, "red", "demand");

// Apply drag functionality to curves
supplyLine.call(dragCurve(supplyEndPoints, supplyLine));
demandLine.call(dragCurve(demandEndPoints, demandLine));

// Function to update supply line
function updatesupplyEndPoints(slopeType) {

    // Update the end points in place
    supplyEndPoints.splice(0, supplyEndPoints.length, ...supplyVariations[slopeType]);

    // Update supply line
    supplyLine
    .datum(supplyEndPoints)
    .attr("d", d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
    );
    
    updateCalculations();
}

function updatedemandEndPoints(slopeType) {
    
    // Update the end points in place
    demandEndPoints.splice(0, supplyEndPoints.length, ...demandVariations[slopeType]);

    // Update demand line
    demandLine
        .datum(demandEndPoints)
        .attr("d", d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
    );
    
    updateCalculations();
}

// Get a first set of calculations from curve positions
updateCalculations();


// Function to calculate point elasticity
function calculatePointElasticity(curve, point) {
    // Get slope of the line
    let slope = (curve[1].y - curve[0].y) / (curve[1].x - curve[0].x);

    // Calculate elasticity using the point elasticity formula: (dQ/dP) * (P/Q)
    // Note: For demand curve, we'll take absolute value since it's normally negative
    let gradient = Math.abs(1/slope)
    let location = (point.y/point.x)
    return (gradient * location);
}

// Function to update the total revenue and elasticity box
function updateTotalRevenue() {
    let intersection = findIntersection(supplyEndPoints, demandEndPoints);
    let price = Math.round(intersection.y);
    let quantity = Math.round(intersection.x);
    let totalRevenue = price * quantity;

    // Calculate elasticities at equilibrium
    let supplyElasticity = calculatePointElasticity(supplyEndPoints, intersection);
    let demandElasticity = calculatePointElasticity(demandEndPoints, intersection);

    document.getElementById('total-revenue').innerHTML = `
        <div class="revenue-box">
            <h3>Market Equilibrium</h3>
            <p>Price: $${price}</p>
            <p>Quantity: ${quantity}</p>
            <p><strong>Total Revenue ( P x Q ): $${totalRevenue.toLocaleString()}</strong></p>
        </div>
        <div class="elasticity-box">
            <h3>Price Elasticity at Equilibrium</h3>
            <h4>%ΔP / %ΔQ</h4>
            <p style="color: blue;">Supply Elasticity: ${supplyElasticity.toFixed(2)}</p>
            <p style="color: red;">Demand Elasticity: ${demandElasticity.toFixed(2)}</p>
        </div>
    `;
}

// Function to calculate quantity for a given price using two points
function calculateQuantity(price, endPoints) {
    const slope = (endPoints[1].x - endPoints[0].x) / (endPoints[1].y - endPoints[0].y);  // Inverse of price calculation
    return endPoints[0].x + slope * (price - endPoints[0].y);
}

// Function to update the price table
function updatePriceTable() {
    let tableHTML = `
        <table class="price-table">
            <tr><th>Price</th>`;
    
    // First row: prices
    for (let p = 50; p <= 500; p += 50) {
        tableHTML += `<td>${p}</td>`;
    }
    
    // Second row: Quantity Supplied (in blue)
    tableHTML += `</tr><tr><th style="color: blue">Quantity Supplied</th>`;
    for (let p = 50; p <= 500; p += 50) {
        const supplyQty = Math.round(calculateQuantity(p, supplyEndPoints));
        tableHTML += `<td>${supplyQty >= 0 ? supplyQty : '-'}</td>`;
    }

    // Third row: Quantity Demanded (in red)
    tableHTML += `</tr><tr><th style="color: red">Quantity Demanded</th>`;
    for (let p = 50; p <= 500; p += 50) {
        const demandQty = Math.round(calculateQuantity(p, demandEndPoints));
        tableHTML += `<td>${demandQty >= 0 ? demandQty : '-'}</td>`;
    }
    
    tableHTML += '</tr></table>';
    document.getElementById('price-table').innerHTML = tableHTML;
}

// Function to calculate intersection point
function findIntersection(supply, demand) {
    // Using the line equation y = mx + b for both lines
    const m1 = (supply[1].y - supply[0].y) / (supply[1].x - supply[0].x);
    const b1 = supply[0].y - m1 * supply[0].x;
    
    const m2 = (demand[1].y - demand[0].y) / (demand[1].x - demand[0].x);
    const b2 = demand[0].y - m2 * demand[0].x;
    
    // Solve for x: m1x + b1 = m2x + b2
    const x = (b2 - b1) / (m1 - m2);
    const y = m1 * x + b1;
    
    return {x, y};
}

// Function to update the intersection lines
function updateIntersectionLine() {
    // Remove existing intersection line if it exists
    svg.selectAll(".intersection-line").remove();
    
    // Calculate intersection
    const intersection = findIntersection(supplyEndPoints, demandEndPoints);
    
    // Add vertical dashed line
    svg.append("line")
        .attr("class", "intersection-line")
        .attr("x1", xScale(intersection.x))
        .attr("y1", yScale(intersection.y))
        .attr("x2", xScale(intersection.x))
        .attr("y2", height)
        .attr("stroke", "#999")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

    // Add horizontal dashed line
    svg.append("line")
        .attr("class", "intersection-line")
        .attr("x1", 0)
        .attr("y1", yScale(intersection.y))
        .attr("x2", xScale(intersection.x))
        .attr("y2", yScale(intersection.y))
        .attr("stroke", "#999")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");
}


// Update dragCurve function to also update the intersection line
function dragCurve(data, line) {
    return d3.drag().on("drag", function(event) {
        let dx = xScale.invert(event.dx) - xScale.invert(0);

        // Calculate min and max movement allowed
        let minX = Math.min(...data.map(point => point.x));
        let maxX = Math.max(...data.map(point => point.x));

        // Adjust dx to prevent dragging past bounds
        if (minX + dx < 0) dx = -minX;
        if (maxX + dx > max_quantity) dx = max_quantity - maxX;

        data.forEach((point) => {
                point.x += dx;
        });
        line.attr("d", d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)));
        
        updateCalculations();
    });
}

// Initial intersection line and revenue
function updateCalculations() {
    updatePriceTable();
    updateIntersectionLine();
    updateTotalRevenue();
};
