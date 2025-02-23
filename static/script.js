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

// For debugging
console.log("SVG dimensions:", { width, height, fullWidth: width + margin.left + margin.right, fullHeight: height + margin.top + margin.bottom });

// After creating the SVG and before creating scales, add a clip path
svg.append("defs")
.append("clipPath")
.attr("id", "clip")
.append("rect")
.attr("width", width)
.attr("height", height)
.attr("x", 0)
.attr("y", 0);

// Modify the drawCurve function to use the clip path
function drawCurve(data, color, className) {
 return svg.append("path")
     .datum(data)
     .attr("class", className)
     .attr("fill", "none")
     .attr("stroke", color)
     .attr("stroke-width", 2)
     .style("cursor", "ew-resize")
     .attr("clip-path", "url(#clip)")  // Add this line
     .attr("d", d3.line()
         .x(d => xScale(d.x))
         .y(d => yScale(d.y))
     );
}

// Scales
const xScale = d3.scaleLinear().domain([0, 200]).range([0, width]);  // Quantity
const yScale = d3.scaleLinear().domain([0, 500]).range([height, 0]); // Price - increased range to match larger height

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

// Sample supply and demand curves with unit elasticity
let supplyCurve = [{x: 50, y: 100}, {x: 150, y: 300}];  // 1:1 ratio of % changes
let demandCurve = [{x: 50, y: 300}, {x: 150, y: 100}];  // 1:1 ratio of % changes

// Define slope variations
const slopeVariations = {
    elastic: {
        supply: [{x: 20, y: 190}, {x: 180, y: 210}],    // Wide x-range, small y-range
        demand: [{x: 20, y: 210}, {x: 180, y: 190}]
    },
    normal: {
        supply: [{x: 50, y: 100}, {x: 150, y: 300}],    // Current slopes
        demand: [{x: 50, y: 300}, {x: 150, y: 100}]
    },
    inelastic: {
        supply: [{x: 100, y: 50}, {x: 150, y: 450}],    // Narrow x-range, large y-range
        demand: [{x: 100, y: 450}, {x: 150, y: 50}]
    }
};

// Function to calculate point elasticity
function calculatePointElasticity(curve, point) {
    // Get slope of the line
    const slope = (curve[1].y - curve[0].y) / (curve[1].x - curve[0].x);
    
    // Calculate elasticity using the point elasticity formula: (dQ/dP) * (P/Q)
    // Note: For demand curve, we'll take absolute value since it's normally negative
    return Math.abs((1/slope) * (point.y/point.x));
}

// Function to update the total revenue and elasticity box
function updateTotalRevenue() {
    const intersection = findIntersection(supplyCurve, demandCurve);
    const price = Math.round(intersection.y);
    const quantity = Math.round(intersection.x);
    const totalRevenue = price * quantity;

    // Calculate elasticities at equilibrium
    const supplyElasticity = calculatePointElasticity(supplyCurve, intersection);
    const demandElasticity = calculatePointElasticity(demandCurve, intersection);
    
    document.getElementById('total-revenue').innerHTML = `
        <div class="revenue-box">
            <h3>Market Equilibrium</h3>
            <p>Price: $${price}</p>
            <p>Quantity: ${quantity}</p>
            <p><strong>Total Revenue: $${totalRevenue.toLocaleString()}</strong></p>
        </div>
        <div class="elasticity-box">
            <h3>Price Elasticity at Equilibrium</h3>
            <p style="color: blue;">Supply Elasticity: ${supplyElasticity.toFixed(2)}</p>
            <p style="color: red;">Demand Elasticity: ${demandElasticity.toFixed(2)}</p>
        </div>
    `;
}

// Function to update curves
function updateSupplyCurve(slopeType) {
    // Update supply data points
    supplyCurve[0] = {...slopeVariations[slopeType].supply[0]};
    supplyCurve[1] = {...slopeVariations[slopeType].supply[1]};
    
    // Update supply line
    supplyLine.attr("d", d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
    );
    
    // Update intersection line and table
    updateIntersectionLine();
    updatePriceTable();
    updateTotalRevenue();
}

function updateDemandCurve(slopeType) {
    // Update demand data points
    demandCurve[0] = {...slopeVariations[slopeType].demand[0]};
    demandCurve[1] = {...slopeVariations[slopeType].demand[1]};
    
    // Update demand line
    demandLine.attr("d", d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
    );
    
    // Update intersection line and table
    updateIntersectionLine();
    updatePriceTable();
    updateTotalRevenue();
}

// Add event listeners to radio buttons
document.querySelectorAll('input[name="supply-slope"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateSupplyCurve(e.target.value);
    });
});

document.querySelectorAll('input[name="demand-slope"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateDemandCurve(e.target.value);
    });
});

// Draw curves
let supplyLine = drawCurve(supplyCurve, "blue", "supply");
let demandLine = drawCurve(demandCurve, "red", "demand");


// Apply drag functionality
supplyLine.call(dragCurve(supplyCurve, supplyLine));
demandLine.call(dragCurve(demandCurve, demandLine));

// Function to calculate quantity for a given price using two points
function calculateQuantity(price, curve) {
    const [p1, p2] = curve;
    const slope = (p2.x - p1.x) / (p2.y - p1.y);  // Inverse of price calculation
    return p1.x + slope * (price - p1.y);
}

// Function to update the price table
function updatePriceTable() {
    let tableHTML = `
        <table class="price-table">
            <tr><th>Price</th>`;
    
    // First row: prices
    for (let p = 0; p <= 500; p += 50) {
        tableHTML += `<td>${p}</td>`;
    }
    
    // Second row: Quantity Supplied (in blue)
    tableHTML += `</tr><tr><th style="color: blue">Quantity Supplied</th>`;
    for (let p = 0; p <= 500; p += 50) {
        const supplyQty = Math.round(calculateQuantity(p, supplyCurve));
        tableHTML += `<td>${supplyQty >= 0 ? supplyQty : '-'}</td>`;
    }

    // Third row: Quantity Demanded (in red)
    tableHTML += `</tr><tr><th style="color: red">Quantity Demanded</th>`;
    for (let p = 0; p <= 500; p += 50) {
        const demandQty = Math.round(calculateQuantity(p, demandCurve));
        tableHTML += `<td>${demandQty >= 0 ? demandQty : '-'}</td>`;
    }
        
    
    tableHTML += '</tr></table>';
    
    document.getElementById('price-table').innerHTML = tableHTML;
}

// Initial table creation
updatePriceTable();

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

// Function to update the intersection line
function updateIntersectionLine() {
    // Remove existing intersection line if it exists
    svg.selectAll(".intersection-line").remove();
    
    // Calculate intersection
    const intersection = findIntersection(supplyCurve, demandCurve);
    
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
        data.forEach(point => point.x += dx);
        line.attr("d", d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)));
        updatePriceTable();
        updateIntersectionLine(); // Add this line
        updateTotalRevenue();
    });
}

// Initial intersection line and revenue
updateIntersectionLine();
updateTotalRevenue();
