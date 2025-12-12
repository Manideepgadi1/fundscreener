let chart = null;
let selectedFunds = [];

// Color palette for funds
const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384', '#36A2EB'
];

// Populate fund select dropdown
function populateFundSelect() {
    const select = document.getElementById('fundSelect');
    select.innerHTML = '';
    
    const sortedFunds = window.fundsData.sort((a, b) => 
        a.Fund.localeCompare(b.Fund)
    );
    
    sortedFunds.forEach((fund, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = fund.Fund;
        select.appendChild(option);
    });
}

function updateSelectionInfo() {
    const select = document.getElementById('fundSelect');
    const selected = Array.from(select.selectedOptions);
    const count = selected.length;
    const info = document.getElementById('selectionInfo');
    
    if (count === 0) {
        info.innerHTML = 'Select between 4 and 11 funds';
        info.className = 'info-text';
    } else if (count < 4) {
        info.innerHTML = 'Selected: ' + count + ' - Need at least 4 funds';
        info.className = 'info-text error-text';
    } else if (count > 11) {
        info.innerHTML = 'Selected: ' + count + ' - Maximum 11 funds allowed';
        info.className = 'info-text error-text';
    } else {
        info.innerHTML = 'Selected: ' + count + ' funds ✓';
        info.className = 'info-text success-text';
    }
}

document.getElementById('fundSelect').addEventListener('change', updateSelectionInfo);

function updateChart() {
    const select = document.getElementById('fundSelect');
    const selectedOptions = Array.from(select.selectedOptions);
    const timeValue = document.getElementById('timeSelect').value;
    const metric = document.getElementById('metricSelect').value;
    
    if (selectedOptions.length < 4) {
        alert('Please select at least 4 funds');
        return;
    }
    
    if (selectedOptions.length > 11) {
        alert('Please select maximum 11 funds');
        return;
    }
    
    selectedFunds = selectedOptions.map(opt => window.fundsData[opt.value]);
    
    const datasets = generateDatasets(selectedFunds, timeValue, metric);
    
    if (datasets.length === 0) {
        alert('No valid data available for selected funds and time period');
        return;
    }
    
    createChart(datasets, timeValue, metric);
    updateLegend();
    updateStats(selectedFunds, timeValue, metric);
}

function generateDatasets(funds, timeValue, metric) {
    const datasets = [];
    const months = parseInt(timeValue) * 12;
    
    funds.forEach((fund, index) => {
        let metricValue;
        
        switch(metric) {
            case 'returns':
                metricValue = parseFloat(fund['Returns ' + timeValue + ' Yr']);
                break;
            case 'sharpe':
                metricValue = parseFloat(fund['Sharpe Ratio 3 Yr']);
                break;
            case 'std':
                metricValue = parseFloat(fund['Std 3 Yr']);
                break;
            case 'alpha':
                metricValue = parseFloat(fund['Alpha 3 Yr']);
                break;
        }
        
        if (isNaN(metricValue)) {
            return;
        }
        
        const data = [];
        if (metric === 'returns') {
            const annualReturn = metricValue / 100;
            for (let i = 0; i <= months; i++) {
                const years = i / 12;
                const value = 100 * Math.pow(1 + annualReturn, years);
                data.push({
                    x: i,
                    y: parseFloat(value.toFixed(2))
                });
            }
        } else {
            for (let i = 0; i <= months; i++) {
                data.push({
                    x: i,
                    y: metricValue
                });
            }
        }
        
        datasets.push({
            label: fund.Fund,
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            borderWidth: 3,
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHitRadius: 10
        });
    });
    
    return datasets;
}

function createChart(datasets, timeValue, metric) {
    const ctx = document.getElementById('fundChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    let yAxisLabel = 'Value';
    let yAxisStartFromZero = false;
    let titleText = '';
    
    switch(metric) {
        case 'returns':
            yAxisLabel = 'Portfolio Value (₹)';
            yAxisStartFromZero = false;
            titleText = 'Fund Comparison - ' + timeValue + ' Year Growth from ₹100';
            break;
        case 'sharpe':
            yAxisLabel = 'Sharpe Ratio';
            yAxisStartFromZero = true;
            titleText = 'Fund Comparison - Sharpe Ratio';
            break;
        case 'std':
            yAxisLabel = 'Standard Deviation (%)';
            yAxisStartFromZero = true;
            titleText = 'Fund Comparison - Standard Deviation';
            break;
        case 'alpha':
            yAxisLabel = 'Alpha (%)';
            yAxisStartFromZero = false;
            titleText = 'Fund Comparison - Alpha';
            break;
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: titleText,
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (metric === 'returns') {
                                label += '₹' + context.parsed.y.toFixed(2);
                            } else {
                                label += context.parsed.y.toFixed(2);
                            }
                            return label;
                        },
                        title: function(context) {
                            const months = context[0].parsed.x;
                            const years = Math.floor(months / 12);
                            const remainingMonths = months % 12;
                            return years + 'Y ' + remainingMonths + 'M';
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                    },
                    limits: {
                        y: {min: 'original', max: 'original'},
                        x: {min: 'original', max: 'original'}
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Time (Months)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            const years = Math.floor(value / 12);
                            const months = value % 12;
                            if (months === 0) {
                                return years + 'Y';
                            }
                            return '';
                        },
                        maxRotation: 0,
                        autoSkipPadding: 20
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    beginAtZero: yAxisStartFromZero,
                    title: {
                        display: true,
                        text: yAxisLabel,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            if (metric === 'returns') {
                                return '₹' + value.toFixed(0);
                            }
                            return value.toFixed(1);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

function updateLegend() {
    const container = document.getElementById('legendContainer');
    const items = document.getElementById('legendItems');
    items.innerHTML = '';
    
    selectedFunds.forEach((fund, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = colors[index % colors.length];
        
        const text = document.createElement('span');
        text.className = 'legend-text';
        text.textContent = fund.Fund;
        
        item.appendChild(colorBox);
        item.appendChild(text);
        items.appendChild(item);
    });
    
    container.style.display = 'block';
}

function updateStats(funds, timeValue, metric) {
    const container = document.getElementById('statsContainer');
    container.innerHTML = '';
    
    funds.forEach((fund, index) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.background = 'linear-gradient(135deg, ' + colors[index % colors.length] + ' 0%, ' + colors[(index + 1) % colors.length] + ' 100%)';
        
        const name = document.createElement('h3');
        name.textContent = fund.Fund.length > 40 ? fund.Fund.substring(0, 40) + '...' : fund.Fund;
        
        const value = document.createElement('p');
        let displayValue = '';
        
        switch(metric) {
            case 'returns':
                const returns = parseFloat(fund['Returns ' + timeValue + ' Yr']);
                displayValue = isNaN(returns) ? 'N/A' : returns.toFixed(2) + '%';
                break;
            case 'sharpe':
                const sharpe = parseFloat(fund['Sharpe Ratio 3 Yr']);
                displayValue = isNaN(sharpe) ? 'N/A' : sharpe.toFixed(2);
                break;
            case 'std':
                const std = parseFloat(fund['Std 3 Yr']);
                displayValue = isNaN(std) ? 'N/A' : std.toFixed(2) + '%';
                break;
            case 'alpha':
                const alpha = parseFloat(fund['Alpha 3 Yr']);
                displayValue = isNaN(alpha) ? 'N/A' : alpha.toFixed(2) + '%';
                break;
        }
        
        value.textContent = displayValue;
        
        card.appendChild(name);
        card.appendChild(value);
        container.appendChild(card);
    });
}

function resetZoom() {
    if (chart) {
        chart.resetZoom();
    }
}

function clearSelection() {
    document.getElementById('fundSelect').selectedIndex = -1;
    updateSelectionInfo();
    if (chart) {
        chart.destroy();
        chart = null;
    }
    document.getElementById('legendContainer').style.display = 'none';
    document.getElementById('statsContainer').innerHTML = '';
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', function() {
    if (window.fundsData && window.fundsData.length > 0) {
        populateFundSelect();
    } else {
        setTimeout(populateFundSelect, 100);
    }
});
