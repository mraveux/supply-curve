// Check if the screen width is 768 pixels or less
const isMobile = () => window.innerWidth <= 768;

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
    label: `GREEN Curve (PoW)`,
    data: blockRewardsOriginal,
    fill: false,
    borderColor: 'rgb(90, 200, 90)', // Green color
    tension: 0.1,
    pointRadius: isMobile() ? 0 : 1 // Hide the data points
});

// Add event listeners to input fields for automatic chart update
const timeoutDuration = 500;
let updateTimeout;
document.getElementById('inputYear').addEventListener('input', () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateCurves, timeoutDuration);
});
document.getElementById('inputPercentage').addEventListener('input', () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateCurves, timeoutDuration);
});

window.addEventListener('resize', () => {
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
    for (let reduction = 0; reduction <= 100; reduction += 0.01) { // Increment by 0.01% for finer granularity
        const { finalSupply } = generateSecondCurveWithEmissionReduction(startingSupply, startYear, initialPercentage, reduction);
        const difference = Math.abs(finalSupply - totalSupply);
        if (difference < closest.difference) {
            closest = { emissionReduction: reduction, finalSupply, difference };
        }
    }
    return closest.emissionReduction;
}

const curves = [
    'BLUE Curve',
    'RED Curve',
    'Your curve',
];

function addCurve(startingSupply, inputYear, percentage, name, color) {
    const bestEmissionReduction = findBestEmissionReduction(startingSupply, inputYear, percentage);
    let { data: blockRewardsNewCurve } = generateSecondCurveWithEmissionReduction(
        startingSupply, inputYear, percentage, bestEmissionReduction);

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
            tension: 0.1,
            pointRadius: isMobile() ? 0 : 1, // Hide the data points
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
    addCurve(startingSupply, inputYear, 4.17, curves[0], 'rgb(90, 90, 200)'); // Blue

    const initialRewardRate = (525 * 60 * 24 * 365) / startingSupply * 100; // Convert 525 per minute to annual percentage of the starting supply
    addCurve(startingSupply, inputYear, initialRewardRate, curves[1], 'rgb(200, 90, 90)'); // Red

    // Now add "Your Curve" to ensure it is the last one
    addCurve(startingSupply, inputYear, inputPercentage, curves[2], 'rgb(255, 215, 0)'); // Golden color

    // Redraw chart with updated datasets
    drawChart();
}

// Function to draw the chart
function drawChart() {
    const ctx = document.getElementById('emissionCurve').getContext('2d');
    if (window.emissionChart) {
        window.emissionChart.data.labels = labels;
        window.emissionChart.data.datasets = datasets.map(dataset => ({
            ...dataset,
            pointRadius: isMobile() ? 0 : 2 // Hide the data points on mobile
        }));
        // Adjust font size for mobile
        window.emissionChart.options.plugins.legend.labels.font.size = isMobile() ? 10 : 14; // Example sizes, adjust as needed
        window.emissionChart.options.scales.x.ticks.font.size = isMobile() ? 10 : 14; // Adjust x-axis font size
        window.emissionChart.options.scales.y.ticks.font.size = isMobile() ? 10 : 14; // Adjust y-axis font size
        window.emissionChart.options.aspectRatio = isMobile() ? 1 : 2; // Adjust y-axis font size
        window.emissionChart.options.scales.y.display = isMobile() ? false : true;
        window.emissionChart.update();
    } else {
        window.emissionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets.map(dataset => ({
                    ...dataset,
                    pointRadius: isMobile() ? 0 : 2 // Hide the data points on mobile
                }))
            },
            options: {
                animation: false,
                aspectRatio: isMobile() ? 1 : 2,
                scales: {
                    y: {
                        display: isMobile() ? false : true,
                        ticks: {
                            font: {
                                size: isMobile() ? 10 : 14, // Reduce font size by 30% on mobile
                            },
                        },
                    },
                    x: {
                        ticks: {
                            font: {
                                size: isMobile() ? 10 : 14, // Reduce font size by 30% on mobile
                            },
                        },
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                size: isMobile() ? 10 : 14, // Reduce font size by 30% on mobile
                            },
                        },
                    },
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

    // Update or create the header
    let headerRow = thead.querySelector('tr');
    if (!headerRow) {
        headerRow = document.createElement('tr');
        thead.appendChild(headerRow);
    }

    // Ensure the 'Year' column is always present
    if (headerRow.cells.length === 0) {
        const yearHeaderCell = document.createElement('th');
        yearHeaderCell.textContent = 'Year';
        headerRow.appendChild(yearHeaderCell);
    }

    // Update dataset headers
    datasets.forEach((dataset, index) => {
        let th = headerRow.cells[index + 1]; // +1 to skip the 'Year' column
        if (!th) {
            th = document.createElement('th');
            headerRow.appendChild(th);
        }
        th.colSpan = "2"; // Spanning two columns: one for supply and one for emission rate
        th.innerHTML = `${dataset.label}<br>(Supply, Emission Rate)`; // Use innerHTML to include the <br> tag
    });

    // Adjust the number of header cells to match the datasets count
    while (headerRow.cells.length > datasets.length + 1) {
        headerRow.removeChild(headerRow.lastChild);
    }

    // Update body rows
    labels.forEach((label, yearIndex) => {
        let row = tbody.rows[yearIndex];
        if (!row) {
            row = tbody.insertRow();
        }

        // Ensure the 'Year' cell is always present
        let yearCell = row.cells[0];
        if (!yearCell) {
            yearCell = row.insertCell();
        }
        yearCell.textContent = label;

        datasets.forEach((dataset, datasetIndex) => {
            const dataIndex = datasetIndex * 2; // Each dataset has two columns: supply and emission rate
            let supplyCell = row.cells[dataIndex + 1]; // +1 to skip the 'Year' cell
            let emissionRateCell = row.cells[dataIndex + 2];

            if (!supplyCell) {
                supplyCell = row.insertCell(dataIndex + 1);
            }
            if (!emissionRateCell) {
                emissionRateCell = row.insertCell(dataIndex + 2);
            }

            const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
            const currentYearSupply = dataset.data[yearIndex];
            const nextYearSupply = dataset.data[yearIndex + 1];
            const emissionRate = yearIndex < dataset.data.length - 1 ? ((nextYearSupply - currentYearSupply) / currentYearSupply) * 100 : '—';

            supplyCell.textContent = currentYearSupply !== undefined ? (isNaN(currentYearSupply) ? '—' : formatter.format(currentYearSupply)) : '—';
            emissionRateCell.textContent = emissionRate !== '—' ? (isNaN(emissionRate) ? '—' : `${emissionRate.toFixed(2)}%`) : '—';

            // Apply the dataset's borderColor as the left border color for the cells
            const borderColor = dataset.borderColor;
            supplyCell.style.borderLeft = `4px solid ${borderColor}`;
            emissionRateCell.style.borderLeft = `4px solid ${borderColor}`;
        });

        // Adjust the number of cells in the row to match the datasets count
        while (row.cells.length > datasets.length * 2 + 1) {
            row.removeChild(row.lastChild);
        }
    });

    // Adjust the number of rows to match the labels count
    while (tbody.rows.length > labels.length) {
        tbody.deleteRow(tbody.rows.length - 1);
    }
}

document.addEventListener('DOMContentLoaded', updateCurves); // Wait for the page to be fully loaded before updating curves
