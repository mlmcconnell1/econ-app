//----------------------------------
// SVG Section
//----------------------------------
// For ESLint:
/* global d3 */

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

//----------------------------------
// Classes and subroutines used later
//----------------------------------

// Line class for managing lines on the graph (supply, demand, etc.)
class Line {
    constructor(endPoints, parameters, className) {
        this.endPoints = [...endPoints]; // Create a copy of the endpoints
        this.parameters = parameters;
        this.className = className;
        
        // Create the SVG path element directly in the constructor
        this.path = svg.append("path")
            .datum(this.endPoints)
            .attr("class", this.className)
            .attr("fill", "none")
            .attr("stroke", parameters.color)
            .attr("stroke-width", parameters.stroke_width)
            .attr("stroke-dasharray", parameters.stroke_dasharray)
            .style("cursor", parameters.cursor)
            .attr("clip-path", "url(#clip)")
            .attr("d", d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
            );
    }

    // Update the line with new parameters
    updateParameters(parameters) {
        // Update the line parameters
        this.path
            .attr("stroke", parameters.color)
            .attr("stroke-width", parameters.stroke_width)
            .attr("stroke-dasharray", parameters.stroke_dasharray)
            .style("cursor", parameters.cursor);
    }
    
    // Hide the line
    hide() {
        this.path.style('opacity',0);
    }

    // Show the line
    show() {
        this.path.style('opacity',1);
    }

    // Update the line's end points
    updateEndPoints(newEndPoints) {

        this.endPoints.splice(0, this.endPoints.length, ...newEndPoints);

        // Update the path
        this.path
            .datum(this.endPoints)
            .attr("d", d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
            );
    }
    
    // Return the current end points
    getEndPoints() {
        return this.endPoints;
    }

    // Calculate intersection point of this line with another
    findIntersection(that) {
        // Check for vertical line(s)
        let dx_this = this.endPoints[1].x - this.endPoints[0].x;
        let dx_that = that.endPoints[1].x - that.endPoints[0].x;

        if (dx_this === 0 && dx_that === 0) {
            throw new Error("Double vertical line intersection requested.");
        } else if (dx_this === 0) {
            // Using the line equation y = mx + b for that line
            let m_that = (that.endPoints[1].y - that.endPoints[0].y) / (that.endPoints[1].x - that.endPoints[0].x);
            let b_that = that.endPoints[0].y - (m_that * that.endPoints[0].x);

            // Solve for x: m1x + b1 = m2x + b2
            let x = this.endPoints[1].x;
            let y = m_that * x + b_that;
            return {x, y};

        } else if (dx_that === 0) {
            // Using the line equation y = mx + b for this line
            let m_this = (this.endPoints[1].y - this.endPoints[0].y) / (this.endPoints[1].x - this.endPoints[0].x);
            let b_this = this.endPoints[0].y - (m_this * this.endPoints[0].x);

            // Solve for x: m1x + b1 = m2x + b2
            let x = that.endPoints[1].x;
            let y = m_this * x + b_this;
            return {x, y};

        } else {
            // Using the line equation y = mx + b for both lines
            let m1 = (this.endPoints[1].y - this.endPoints[0].y) / (this.endPoints[1].x - this.endPoints[0].x);
            let b1 = this.endPoints[0].y - m1 * this.endPoints[0].x;

            let m2 = (that.endPoints[1].y - that.endPoints[0].y) / (that.endPoints[1].x - that.endPoints[0].x);
            let b2 = that.endPoints[0].y - m2 * that.endPoints[0].x;

            // Solve for x: m1x + b1 = m2x + b2
            let x = (b2 - b1) / (m1 - m2);
            let y = m1 * x + b1;
            return {x, y};
        }
    }

    // Calculate point elasticity at a location on the line
    getElasticity(point) {
        // Get slope of the line
        let slope = (this.endPoints[1].y - this.endPoints[0].y) / (this.endPoints[1].x - this.endPoints[0].x);

        // Calculate elasticity using the point elasticity formula: (dQ/dP) * (P/Q)
        // Take absolute value since slope can be negative
        let gradient = Math.abs(1/slope);
        let location = (point.y/point.x);
        return (gradient * location);
    }

    // Calculate quantity for a given price using two points
    getQuantity(price) {
        const slope = (this.endPoints[1].x - this.endPoints[0].x) / (this.endPoints[1].y - this.endPoints[0].y);  // Inverse of price calculation
        return this.endPoints[0].x + slope * (price - this.endPoints[0].y);
    }

    // Remove the line from the SVG
    remove() {
        if (this.path) {
            this.path.remove();
            this.path = null;
            return null;
        }
    }
}

class TaxSubLine extends Line {

    constructor(endPoints, parameters, className) {
            super(endPoints, parameters, className);

            this.taxsubRate = null;
            this.shadowLine = null;
    }

    // Override regular method to also adjust location to include taxsub rate,
    // and also update any shadow line's end points
    updateEndPoints(newEndPoints) {

        if (this.taxsubRate === null) {
            this.endPoints.splice(0, this.endPoints.length, ...newEndPoints);
        } else {
            // Put the shadow line at the new end points location
            this.shadowLine.updateEndPoints(newEndPoints);

            // Put this line at the taxsub location
            let taxsubEndPoints = newEndPoints.map(point => ({x: point.x, y: point.y * (1 + this.taxsubRate)}));
            this.endPoints.splice(0, this.endPoints.length, ...taxsubEndPoints);
        }
        
        // Update the path
        this.path
            .datum(this.endPoints)
            .attr("d", d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
            );
    }

    // Move the line based on a tax or subsidy, and show a shadow line
    taxsubAdd(taxsubRate) {
        // Set a tax or subsidy rate and create a shadow line
        this.taxsubRate = taxsubRate

        const shadowLineParameters = {color: 'lightgray', stroke_width: 3, cursor: 'none', stroke_dasharray: "none"};
        this.shadowLine = new Line(this.getEndPoints(), shadowLineParameters, "shadow");

        // Just do an update in place
        let oldEndPoints = this.getEndPoints();
        this.updateEndPoints(oldEndPoints);
    }

    // Remove a previously added tax/subsidy line
    taxsubRemove() {
        if (this.shadowLine !== null) {

            // Get the original position - where the shadow line is
            let shadowEndPoints = this.shadowLine.getEndPoints();

            // Must clear the shadow line and tax info before we call update
            this.shadowLine.remove();
            this.taxsubRate = null;
            this.shadowLine = null;

            // Now return the taxsubLine to its original spot
            this.updateEndPoints(shadowEndPoints);
        }
    }

}

// Reusable function to add event listeners to radio buttons
function addRadioListeners(selector, eventHandler) {
    document.querySelectorAll(selector).forEach(radio => {
        radio.addEventListener('change', (e) => {
            eventHandler(e.target.value);
        });
    });
}

// Get limits for horizontal drag - supply, demand, and quantity
function getXaxisBoundaries(className) {

    let boundaries = null;
    let minSupply = null;
    let maxSupply = null;
    let minDemand = null;
    let maxDemand = null;

    switch(className) {

        case 'demand':
            //Don't let it be dragged past an intersection with supplyLine
            minSupply = Math.min(...supplyLine.getEndPoints().map(point => point.x));
            maxSupply = Math.max(...supplyLine.getEndPoints().map(point => point.x));

            // Return edge of graph and endPoint values
            boundaries = {left_min: 0, right_min: minSupply , left_max: maxSupply, right_max: max_quantity}
            break;
        
        case 'supply':
            //Don't let it be dragged past an intersection with demandLine
            minDemand = Math.min(...demandLine.getEndPoints().map(point => point.x));
            maxDemand = Math.max(...demandLine.getEndPoints().map(point => point.x));

            // Return edge of graph and endPoint values
            boundaries = {left_min: 0, right_min: minDemand , left_max: maxDemand, right_max: max_quantity}
            break;

        case 'quantity-limit':
            //Don't let it be dragged past an intersection with supplyLine
            minSupply = Math.min(...supplyLine.getEndPoints().map(point => point.x));
            maxSupply = Math.max(...supplyLine.getEndPoints().map(point => point.x));
            minDemand = Math.min(...demandLine.getEndPoints().map(point => point.x));
            maxDemand = Math.max(...demandLine.getEndPoints().map(point => point.x));
    
            // Return edge of graph and endPoint values
            boundaries = {left_min: 0, mid_min: minDemand , mid_max: maxDemand, right_max: max_quantity}
            break;
    }
    return boundaries
}
// Get limits for vertical drag - used to drag price limit (ceiling or floor)
function getYaxisBoundaries(className) {

    let boundaries = null;
    let minSupply = null;
    let maxSupply = null;
    let minDemand = null;
    let maxDemand = null;

    switch(className) {

        case ('price-ceiling'):
            //falls through
        case ('price-floor'):
            //Don't let it be dragged past an intersection with supplyLine
            minSupply = Math.min(...supplyLine.getEndPoints().map(point => point.y));
            maxSupply = Math.max(...supplyLine.getEndPoints().map(point => point.y));
            minDemand = Math.min(...demandLine.getEndPoints().map(point => point.y));
            maxDemand = Math.max(...demandLine.getEndPoints().map(point => point.y));


            // Return edge of graph and endPoint values
            boundaries = {bottom_min: 0, mid_min: minSupply , mid_max: maxSupply, top_max: max_price}
            break;
    }
    return boundaries
}

// Allow a line to be dragged, then update all calculations based on new
// location
// The drag must be stopped at fixed limits: when an endpoint gets to border of the page
// The drag must be stopped at variable limits: don't allow an enpoint to go past an intersecting line
function dragLine(line) {

    switch(line.className) {

        // These both drag horizontally
        case('demand'):
            //falls through
        case('supply'):
            return d3.drag().on("drag", function(event) {
                let dx = xScale.invert(event.dx) - xScale.invert(0);

                // Since we are dragging in the x direction, calculate current min and max endpoint x values
                let minX = Math.min(...line.endPoints.map(point => point.x));
                let maxX = Math.max(...line.endPoints.map(point => point.x));

                // Don't allow drag outside of our boundary values
                let boundaries = getXaxisBoundaries(line.className);

                if ((minX + dx < boundaries.left_min) || (maxX + dx < boundaries.right_min)) dx = Math.abs(dx);
                if ((minX + dx > boundaries.left_max) || (maxX + dx > boundaries.right_max)) dx = 0- Math.abs(dx);

                // Move line
                line.endPoints.forEach((point) => {
                        point.x += dx;
                });
                line.path.attr("d", d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)));

                // Move tax or subsidy line if it exists
                if (line.shadowLine !== null) {
                    line.shadowLine.endPoints.forEach((point) => {
                        point.x += dx;
                    });
                    line.shadowLine.path.attr("d", d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)));
                }
                findEquilibrium();
                updateCalculations(line.className);
            });

        // This drags vertically
        case('price-ceiling'):
            //falls through
        case('price-floor'):
            return d3.drag().on("drag", function(event) {
                let dy = yScale.invert(event.dy) - yScale.invert(0);

                // Since we are dragging in the y direction, calculate current min and max endpoint y values
                let minY = Math.min(...line.endPoints.map(point => point.y));
                let maxY = Math.max(...line.endPoints.map(point => point.y));

                // Don't allow drag outside of our boundary values
                let boundaries = getYaxisBoundaries(line.className);

                if ((minY + dy < boundaries.bottom_min) || (minY + dy < boundaries.mid_min)) dy = Math.abs(dy);
                if ((maxY + dy > boundaries.top_max) || (maxY + dy > boundaries.mid_max)) dy = 0- Math.abs(dy);

                // Move line
                line.endPoints.forEach((point) => {
                        point.y += dy;
                });
                line.path.attr("d", d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)));

                updateCalculations(line.className);
            });

        // This drags horizontally
        case('quantity-limit'):
            return d3.drag().on("drag", function(event) {
                let dx = xScale.invert(event.dx) - xScale.invert(0);

                // Since we are dragging in the x direction, calculate current min and max endpoint x values
                let minX = Math.min(...line.endPoints.map(point => point.x));
                let maxX = Math.max(...line.endPoints.map(point => point.x));

                // Don't allow drag outside of our boundary values
                let boundaries = getXaxisBoundaries(line.className);

                if ((minX + dx < boundaries.left_min) || (maxX + dx < boundaries.mid_min)) dx = Math.abs(dx);
                if ((minX + dx > boundaries.mid_max) || (maxX + dx > boundaries.right_max)) dx = 0- Math.abs(dx);

                // Move line
                line.endPoints.forEach((point) => {
                        point.x += dx;
                });
                line.path.attr("d", d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)));

                updateCalculations(line.className);
            });

        default:

    }
}

// Get the market equilibrium point
function findEquilibrium() {
    equilibrium = supplyLine.findIntersection(demandLine);
    return equilibrium;
}
// Set/Reset price and quantity lines to be at equilibrium
function updatePriceQuantity() {
    // Update price and quantity lines based on equilibrium
    priceEndPoints = [{x: 0,y: equilibrium.y}, equilibrium];
    priceLine.updateEndPoints(priceEndPoints);
    quantityEndPoints = [{x: equilibrium.x,y: 0},equilibrium];
    quantityLine.updateEndPoints(quantityEndPoints);
}

// Calculate end points of shortage line
function getShortageEndPoints() {
    let shortageEndPoints = [
            supplyLine.findIntersection(priceLine),
            demandLine.findIntersection(priceLine)
    ];
    return shortageEndPoints;
}


//----------------------------------
// Set up graph default features
//----------------------------------

// Globals
let interventionState = 'intervention-none'
let equilibrium = null;

// Define supply line elasticity variations
const supplyVariations = {
    elastic: [{x: 20, y: 190}, {x: 180, y: 210}],   // Wide x-range, small y-range
    unit_elastic: [{x: 40, y: 80}, {x: 160, y: 320}],    // Reset to unit elasticity
    inelastic: [{x: 80, y: 50}, {x: 120, y: 350}]    // Narrow x-range, large y-range
};

// Define demand line elasticity variations
const demandVariations = {
    elastic: [{x: 20, y: 210}, {x: 180, y: 190}],
    unit_elastic: [{x: 40, y: 320}, {x: 160, y: 80}],
    inelastic: [{x: 80, y: 350}, {x: 120, y: 50}]
};

// Create supply and demand lines using the TaxSubLine class
const supplyLineParameters = {color: 'red', stroke_width: 3, cursor: 'ew-resize', stroke_dasharray: "none"};
const supplyLine = new TaxSubLine(supplyVariations.unit_elastic, supplyLineParameters, "supply");
const demandLineParameters = {color: 'blue', stroke_width: 3, cursor: 'ew-resize', stroke_dasharray: "none"};
const demandLine = new TaxSubLine(demandVariations.unit_elastic, demandLineParameters, "demand");

// Create price and quantity lines
let intersection = supplyLine.findIntersection(demandLine);

let priceEndPoints = [{x: 0,y: intersection.y}, intersection];
const priceLineParameters = {color: 'gray', stroke_width: 1, cursor: 'none', stroke_dasharray: "4"};
const priceLine = new Line(priceEndPoints, priceLineParameters, "price");

let quantityEndPoints = [{x: intersection.x,y: 0}, intersection];
const quantityLineParameters = {color: 'gray', stroke_width: 1, cursor: 'none', stroke_dasharray: "4"};
const quantityLine = new Line(quantityEndPoints, quantityLineParameters, "quantity")

// Initialize other lines that may or may not be on the graph depending on settings
let shortageLine = null;
let priceLimit = null;
let quantityLimit = null;

// Apply drag functionality to supply and demand line paths
supplyLine.path.call(dragLine(supplyLine));
demandLine.path.call(dragLine(demandLine));

//----------------------------------
// Set up radio buttons and calculation output boxes
//----------------------------------

// Event listeners for supply & demand radio buttons
function supplyButtonClick(variation) {
    supplyLine.updateEndPoints(supplyVariations[variation])
    findEquilibrium();
    updateCalculations('none');
}
addRadioListeners('input[name="supply-slope"]', supplyButtonClick);
function demandButtonClick(variation) {
    demandLine.updateEndPoints(demandVariations[variation])
    findEquilibrium();
    updateCalculations('none');
}
addRadioListeners('input[name="demand-slope"]', demandButtonClick);

// Clear any interventions - called when we change intervention
function clearInterventions(radio_reset) {
    if (radio_reset === true) {
        document.getElementById('intervention-none').checked = true;
    }
    supplyLine.taxsubRemove();
    demandLine.taxsubRemove();
    if (priceLimit !== null) {
        priceLimit.remove();
    }
    if (quantityLimit !== null) {
        quantityLimit.remove();
    }
    if (shortageLine !== null) {
        shortageLine.remove();
    }
    // Make sure price and quantity lines are showing
    priceLine.show()
    quantityLine.show()
}

// Event listener for interventions radio button
function interventionsButtonClick(intervention) {
    let shortageLineParameters = null;
    let priceLimitParameters = null;
    let quantityLimitParameters = null;

    clearInterventions(false);
    interventionState = intervention;

    // Set price and quantity lines back to equilibrium to begin new intervention
    findEquilibrium();
    updatePriceQuantity();

    switch (intervention) {

        // Shift supply or demand line, create a tax or subsidy line and slave it to the master line
        case 'tax-supply':
            supplyLine.taxsubAdd(0.1);
            break;
        case 'subsidy-supply':
            supplyLine.taxsubAdd(-0.1);
            break;
        case 'tax-demand':
            demandLine.taxsubAdd(-0.1);
            break;
        case 'subsidy-demand':
            demandLine.taxsubAdd(0.1);
            break;
        // Add a draggable line to set price or quantity limits
        case 'price-ceiling':
            shortageLineParameters = {color: 'orange', stroke_width: 2, cursor: 'none', stroke_dasharray: "8"};
            shortageLine = new Line(getShortageEndPoints(), shortageLineParameters, "shortage");

            priceLimitParameters = ({color: 'gray', stroke_width: 3, cursor: 'ns-resize', stroke_dasharray: "8"});
            priceLimit = new Line(priceLine.getEndPoints(), priceLimitParameters, "price-ceiling");
            priceLimit.path.call(dragLine(priceLimit));
        break;
        case 'price-floor':
            priceLimitParameters = ({color: 'gray', stroke_width: 3, cursor: 'ns-resize', stroke_dasharray: "8"});
            priceLimit = new Line(priceLine.getEndPoints(), priceLimitParameters, "price-floor");
            priceLimit.path.call(dragLine(priceLimit));
        break;
        case 'quantity-limit':
            quantityLimitParameters = ({color: 'gray', stroke_width: 3, cursor: 'ew-resize', stroke_dasharray: "8"});
            quantityLimit = new Line(quantityLine.getEndPoints(), quantityLimitParameters, "quantity-limit");
            quantityLimit.path.call(dragLine(quantityLimit));
        break;
        default:
    }
    findEquilibrium();
    updateCalculations();
}
addRadioListeners('input[name="intervention-type"]', interventionsButtonClick);

// Reset radio buttons in case they are cached
document.getElementById('supply-normal').checked = true;
document.getElementById('demand-normal').checked = true;
document.getElementById('intervention-none').checked = true;

// We should have everything set to find market equilibrium
findEquilibrium();

// Then get a first set of calculations from equilibrium and curve positions
updateCalculations('none');

//----------------------------------
// Calculation functions - run each time a line is moved
//----------------------------------

// Function to write out a price table
function writePriceTable() {
    let tableHTML = `
        <table class="price-table">
            <tr><th>Price</th>`;
    
    // First row: prices
    for (let p = 50; p <= 500; p += 50) {
        tableHTML += `<td>${p}</td>`;
    }
    
    // Second row: Quantity Supplied (in red)
    tableHTML += `</tr><tr><th style="color: red">Quantity Supplied</th>`;
    for (let p = 50; p <= 500; p += 50) {
        const supplyQty = Math.round(supplyLine.getQuantity(p));
        tableHTML += `<td>${supplyQty >= 0 ? supplyQty : '-'}</td>`;
    }

    // Third row: Quantity Demanded (in blue)
    tableHTML += `</tr><tr><th style="color: blue">Quantity Demanded</th>`;
    for (let p = 50; p <= 500; p += 50) {
        const demandQty = Math.round(demandLine.getQuantity(p));
        tableHTML += `<td>${demandQty >= 0 ? demandQty : '-'}</td>`;
    }
    
    tableHTML += '</tr></table>';
    document.getElementById('price-table').innerHTML = tableHTML;
}

// Perform calculations for values output to screen, based on line locations
function updateCalculatedValues() {
    // Use taxLine intersection if it exists
    let intersection = supplyLine.findIntersection(demandLine);
    let price = Math.round(intersection.y);
    let quantity = Math.round(intersection.x);
    let totalRevenue = price * quantity;

    // Update market equilibrium values
    document.getElementById('equilibrium-price').textContent = price;
    document.getElementById('equilibrium-quantity').textContent = quantity;
    document.getElementById('total-revenue-value').textContent = totalRevenue.toLocaleString();
    
    // Calculate elasticities at equilibrium
    let supplyElasticity = supplyLine.getElasticity(intersection);
    let demandElasticity = demandLine.getElasticity(intersection);

    // Update elasticity values
    document.getElementById('supply-elasticity').textContent = supplyElasticity.toFixed(2);
    document.getElementById('demand-elasticity').textContent = demandElasticity.toFixed(2);
}

// Find the price/quantity intersection based on interventions state
function updateLines(lastDrag) {
    let priceLimitEndPoints = null;
    let quantityLimitEndPoints = null;

    switch (interventionState) {
        
        // Price limit line is draggable
        case 'price-ceiling':
            // Find intersection of draggable priceLimit and supply line
            intersection = priceLimit.findIntersection(supplyLine);

            // Readjust price limit line length based on price
            priceLimitEndPoints = [intersection, {x: 0, y: intersection.y}];
            priceLimit.updateEndPoints(priceLimitEndPoints);
    
            if (priceLimitEndPoints[0].y < equilibrium.y) {
                // Price limit is binding, so make it black
                priceLimit.updateParameters({color: 'black', stroke_width: 3, cursor: 'ns-resize', stroke_dasharray: "none"});
                
                // Hide the price line, show shortage line
                priceLine.hide()
                shortageLine.show()

                // Adjust quantity line
                quantityEndPoints = [intersection, {x: intersection.x, y: 0}];
                quantityLine.updateEndPoints(quantityEndPoints);

                // Adjust shortage line
                shortageLine.updateEndPoints(getShortageEndPoints());
             } else {
                // Price limit is not binding, so make it gray
                priceLimit.updateParameters({color: 'gray', stroke_width: 3, cursor: 'ns-resize', stroke_dasharray: "8"});

                // Adjust quantity line
                intersection = demandLine.findIntersection(supplyLine);
                quantityEndPoints = [intersection, {x: intersection.x,y: 0}];
                quantityLine.updateEndPoints(quantityEndPoints);

                // Hide shortage line, show price line
                shortageLine.hide();
                priceLine.show();
             }
        break;

        case 'price-floor':
            // Find intersection of draggable price and demand line
            intersection = priceLimit.findIntersection(demandLine);
            // Adjust price limit line length
            priceLimitEndPoints = [intersection, {x: 0, y: intersection.y}];
            priceLimit.updateEndPoints(priceLimitEndPoints);
            
            equilibrium = supplyLine.findIntersection(demandLine);
            if (priceLimitEndPoints[0].y > equilibrium.y) {
                // Price line is binding, so make it black
                priceLimit.updateParameters({color: 'black', stroke_width: 3, cursor: 'ns-resize', stroke_dasharray: "none"});

                // Hide price line, show shortage line
                priceLine.hide()

                // Adjust quantity line
                quantityEndPoints = [intersection, {x: intersection.x, y: 0}];
                quantityLine.updateEndPoints(quantityEndPoints);

             } else {
                // Price limit is not binding, so make it gray
                priceLimit.updateParameters({color: 'gray', stroke_width: 3, cursor: 'ns-resize', stroke_dasharray: "8"});

                // Hide price line, show shortage line
                priceLine.show()

                // Adjust quantity line
                intersection = demandLine.findIntersection(supplyLine);
                quantityEndPoints = [intersection, {x: intersection.x,y: 0}];
                quantityLine.updateEndPoints(quantityEndPoints);
             }
        break;

        case 'quantity-limit':
            // Find intersection with demand line
            intersection = quantityLimit.findIntersection(demandLine);
            // Adjust quantity limit line length
            quantityLimitEndPoints = [{x: intersection.x,y: 0}, intersection];
            quantityLimit.updateEndPoints(quantityLimitEndPoints);

            equilibrium = supplyLine.findIntersection(demandLine);
            if (quantityLimitEndPoints[0].x < equilibrium.x) {
                // Quantity limit is binding, so make it black
                quantityLimit.updateParameters({color: 'black', stroke_width: 3, cursor: 'ew-resize', stroke_dasharray: "none"});

                // Hide the quantity line
                quantityLine.hide()

                // Adjust price line
                priceEndPoints = [{x: 0,y: intersection.y}, intersection];
                priceLine.updateEndPoints(priceEndPoints);
            } else {
                // Quantity line is not binding, so make it gray
                quantityLimit.updateParameters({color: 'gray', stroke_width: 3, cursor: 'ew-resize', stroke_dasharray: "8"});

                // Show the quantity line
                quantityLine.show()

                // Adjust price line to equilibrium
                intersection = demandLine.findIntersection(supplyLine);
                priceEndPoints = [{x: 0,y: intersection.y}, intersection];
                priceLine.updateEndPoints(priceEndPoints);
            }
        break;

        // All these interventionStates require price and quantity to be adjusted 
        // case 'tax-supply':
        // case 'subsidy-supply':
        // case 'tax-demand':
        // case 'subsidy-demand':
        default:
            // Update the price and quantity lines to be at equilibrium
            updatePriceQuantity();
      }
};

// Initial intersection line and revenue
function updateCalculations(lastDrag) {
    writePriceTable();
    updateLines(lastDrag);
    updateCalculatedValues();
};
