// Initial setup
const totalSupply = 21000000000;
const blocksPerYear = 525600;
const initialCirculatingSupply = 2520000000;
const simulationYears = 100;
const kOriginal = 22;
let labels = [];
let datasets = [];
let originalCirculatingSupply = initialCirculatingSupply;

// Generate labels for each year
for (let year = 2018; year < 2018 + simulationYears; year++) {
    labels.push(year.toString());
}

// Function to generate block rewards
function generateBlockRewards(k, circulatingSupply, labels, startYear = 2018, startPercentage = 0) {
    return labels.map((label, index) => {
        let year = parseInt(label);
        if (year < startYear) return null;
        if (index === 0 || year === startYear) {
            let initialRate = startPercentage / 100;
            let blockReward = circulatingSupply * initialRate;
            circulatingSupply += blockReward * blocksPerYear;
            return circulatingSupply;
        } else {
            for(let i = 0; i < blocksPerYear; i++) {
                let blockReward = (totalSupply - circulatingSupply) / Math.pow(2, k);
                circulatingSupply += blockReward;
            }
            return circulatingSupply;
        }
    }).filter(n => n);
}

// Generate original emission curve
let blockRewardsOriginal = generateBlockRewards(kOriginal, originalCirculatingSupply, labels);
datasets.push({
    label: `PoW Curve`,
    data: blockRewardsOriginal,
    fill: false,
    borderColor: 'rgb(255, 215, 0)', // Golden color
    tension: 0.1
});

// Add event listeners to input fields for automatic chart update
const timeoutDuration = 250;
let updateTimeout;
document.getElementById('inputYear').addEventListener('input', () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateCurves, timeoutDuration);
});
document.getElementById('inputPercentage').addEventListener('input', () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateCurves, timeoutDuration);
});

// Function to generate a curve with emission reduction
function generateSecondCurveWithEmissionReduction(startingSupply, startYear, initialPercentage, emissionReduction) {
    let supply = startingSupply;
    let percentage = initialPercentage;
    let data = new Array(labels.length).fill(NaN); // Initialize with NaN for all years
    for (let i = startYear - 2018; i < labels.length; i++) {
        data[i] = supply;
        if (i != startYear - 2018) {
            percentage *= ((100 - emissionReduction) / 100);
        }
        supply += supply * (percentage / 100);
    }
    return { finalSupply: supply, data: data.map((val) => val > 21e9 ? 21e9 : val) };
}

// Function to find the best emission reduction percentage
function findBestEmissionReduction(startingSupply, startYear, initialPercentage) {
    let closest = { emissionReduction: 0, finalSupply: Number.MAX_VALUE, difference: Number.MAX_VALUE };
    for (let reduction = 0; reduction <= 100; reduction += 0.001) { // Increment by 0.01% for finer granularity
        const { finalSupply } = generateSecondCurveWithEmissionReduction(startingSupply, startYear, initialPercentage, reduction);
        const difference = Math.abs(finalSupply - totalSupply);
        if (difference < closest.difference) {
            closest = { emissionReduction: reduction, finalSupply, difference };
        }
    }
    return closest.emissionReduction;
}

const curves = [
    'Blue curve 1',
    'Blue curve 2',
    'Your curve',
];

function addCurve(startingSupply, inputYear, percentage, name, color) {
    const bestEmissionReduction = findBestEmissionReduction(startingSupply, inputYear, percentage);
    let { data: blockRewardsNewCurve } = generateSecondCurveWithEmissionReduction(startingSupply, inputYear, percentage, bestEmissionReduction);
    // Append the emission reduction rate to the curve's label
    const labelWithEmissionReduction = `${name} (Yearly Emission Reduction: ${bestEmissionReduction.toFixed(2)}%)`;
    if (datasets[curves.indexOf(name)+1]) {
        datasets[curves.indexOf(name)+1].data = blockRewardsNewCurve;
        datasets[curves.indexOf(name)+1].label = labelWithEmissionReduction;
    } else {
        datasets.push({
            label: labelWithEmissionReduction,
            data: blockRewardsNewCurve,
            fill: false,
            borderColor: color,
            tension: 0.1
        });
    }
}

// Function to update the chart with a new curve
function updateCurves() {
    const inputYear = parseInt(document.getElementById('inputYear').value);
    const inputPercentage = parseFloat(document.getElementById('inputPercentage').value);
    const startingSupplyIndex = inputYear - 2018;
    const startingSupply = blockRewardsOriginal[startingSupplyIndex] || originalCirculatingSupply;

    // Update datasets with new curve
    // datasets = datasets.slice(0, 1); // Keep only the original dataset

    // Add the predefined curves first
    addCurve(startingSupply, inputYear, 4.17, curves[0], 'rgb(70, 130, 180)'); // Slightly different blue tone

    const initialRewardRate = (525 * 60 * 24 * 365) / startingSupply * 100; // Convert 525 per minute to annual percentage of the starting supply
    addCurve(startingSupply, inputYear, initialRewardRate, curves[1], 'rgb(100, 149, 237)'); // Another slightly different blue tone

    // Now add "Your Curve" to ensure it is the last one
    addCurve(startingSupply, inputYear, inputPercentage, curves[2], 'rgb(190, 20, 20)'); // Light green color

    // Redraw chart with updated datasets
    drawChart();
}

// Function to draw the chart
function drawChart() {
    const ctx = document.getElementById('emissionCurve').getContext('2d');
    if (window.emissionChart) {
        // Update the chart's data and options instead of destroying and recreating it
        window.emissionChart.data.labels = labels;
        window.emissionChart.data.datasets = datasets;
        window.emissionChart.update();
    } else {
        // Create the chart for the first time
        window.emissionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const dataset = context.dataset.data;
                                const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
                                if (index < dataset.length - 1) {
                                    const currentYearSupply = dataset[index];
                                    const nextYearSupply = dataset[index + 1];
                                    const emissionRate = ((nextYearSupply - currentYearSupply) / currentYearSupply) * 100;
                                    return `Year: ${labels[index]}, Emission Rate: ${emissionRate.toFixed(2)}%, Supply: ${formatter.format(dataset[index])}`;
                                } else {
                                    return `Supply at ${labels[index]}: ${formatter.format(dataset[index])}`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    updateCurveValuesTable();
}

// Update the curve values table
function updateCurveValuesTable() {
    const table = document.getElementById('curveValuesTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // Clear existing data
    thead.innerHTML = ''; // Clear header
    tbody.innerHTML = ''; // Clear body rows

    // Create the first header row for 'Year' and dataset labels
    const headerRow = document.createElement('tr');
    const yearHeaderCell = document.createElement('th');
    yearHeaderCell.textContent = 'Year';
    headerRow.appendChild(yearHeaderCell);

    // Add dataset labels as headers for the first row, including a line break after each name
    datasets.forEach(dataset => {
        const th = document.createElement('th');
        th.colSpan = "2"; // Spanning two columns: one for supply and one for emission rate
        // Insert a line break after the curve name
        const labelWithLineBreak = dataset.label.replace(/(.+?)( \(|$)/, '$1<br>$2');
        th.innerHTML = labelWithLineBreak; // Use innerHTML to include the <br> tag
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    // Create a second header row for 'Supply' and 'Emission Rate' under each dataset
    const subHeaderRow = document.createElement('tr');
    const emptyCellForYearLabel = document.createElement('th'); // Empty cell under 'Year' label
    subHeaderRow.appendChild(emptyCellForYearLabel);

    // For each dataset, add 'Supply' and 'Emission Rate' sub-headers
    datasets.forEach(() => {
        const supplyHeader = document.createElement('th');
        supplyHeader.textContent = 'Supply';
        subHeaderRow.appendChild(supplyHeader);

        const emissionRateHeader = document.createElement('th');
        emissionRateHeader.textContent = 'Emission Rate';
        subHeaderRow.appendChild(emissionRateHeader);
    });

    thead.appendChild(subHeaderRow);

    // Populate rows, one for each year
    labels.forEach((label, yearIndex) => {
        const row = document.createElement('tr');
        const yearCell = document.createElement('td');
        yearCell.textContent = label; // Year label
        row.appendChild(yearCell);

        // Add data cells for each curve in this year, including supply and emission rate
        datasets.forEach((dataset, datasetIndex) => {
            const supplyCell = document.createElement('td');
            const emissionRateCell = document.createElement('td');
            const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }); // Adjusted for no decimals

            const currentYearSupply = dataset.data[yearIndex];
            const nextYearSupply = dataset.data[yearIndex + 1];
            const emissionRate = yearIndex < dataset.data.length - 1 ? ((nextYearSupply - currentYearSupply) / currentYearSupply) * 100 : '—';

            // Check for NaN and replace with dash
            supplyCell.textContent = currentYearSupply !== undefined ? (isNaN(currentYearSupply) ? '—' : formatter.format(currentYearSupply)) : '—'; // Supply value
            emissionRateCell.textContent = emissionRate !== '—' ? (isNaN(emissionRate) ? '—' : `${emissionRate.toFixed(2)}%`) : '—'; // Emission Rate value

            // Apply the dataset's borderColor as the left border color for the cells
            const borderColor = dataset.borderColor;
            supplyCell.style.borderLeft = `4px solid ${borderColor}`;
            emissionRateCell.style.borderLeft = `4px solid ${borderColor}`;

            row.appendChild(supplyCell);
            row.appendChild(emissionRateCell);
        });

        tbody.appendChild(row);
    });
}

drawChart(); // Initial chart draw
updateCurves(); // Update chart on load
