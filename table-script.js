const API_BASE_URL = window.location.origin;

let currentPage = 1;
let perPage = 10;
let totalPages = 1;
let totalRecords = 0;
let allColumns = [];
let visibleColumns = [];
let allData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = null;
let columnFilters = {};
let columnWidths = {};
let isResizing = false;
let currentResizeColumn = null;
let startX = 0;
let startWidth = 0;

// Default visible columns
const DEFAULT_VISIBLE_COLUMNS = [
    'Fund', 'Amc', 'Product', 'Aum', 'Returns 1 Yr', 'Returns 3 Yr', 'Returns 5 Yr',
    'Sharpe Ratio 1 Yr', 'Sharpe Ratio 3 Yr', 'Alpha 1 Yr', 'Alpha 3 Yr'
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('applySelection').addEventListener('click', applyColumnSelection);
    document.getElementById('exportBtn').addEventListener('click', handleExport);
    document.getElementById('perPageSelect').addEventListener('change', handlePerPageChange);
    document.getElementById('globalSearch').addEventListener('input', handleGlobalSearch);
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    
    document.getElementById('firstPage').addEventListener('click', () => goToPage(1));
    document.getElementById('prevPage').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('lastPage').addEventListener('click', () => goToPage(totalPages));
}

async function initializeApp() {
    console.log('Initializing Mutual Fund Screener...');
    await loadAllData();
}

async function loadAllData() {
    showLoading();
    
    try {
        // Load all data at once for client-side filtering/sorting
        const url = `${API_BASE_URL}/api/funds?page=1&per_page=10000`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            allColumns = result.columns;
            allData = result.data;
            filteredData = [...allData];
            
            // Set default visible columns
            visibleColumns = DEFAULT_VISIBLE_COLUMNS.filter(col => allColumns.includes(col));
            
            renderColumnCheckboxes();
            applyFiltersAndSort();
        } else {
            showError('Failed to load data: ' + result.error);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to connect to server. Please ensure the backend is running.');
    } finally {
        hideLoading();
    }
}

function renderColumnCheckboxes() {
    const container = document.getElementById('columnCheckboxes');
    container.innerHTML = allColumns.map(col => `
        <div class="column-checkbox">
            <input type="checkbox" id="col_${col.replace(/\s+/g, '_')}" 
                   value="${col}" ${visibleColumns.includes(col) ? 'checked' : ''}>
            <label for="col_${col.replace(/\s+/g, '_')}">${col}</label>
        </div>
    `).join('');
}

function applyColumnSelection() {
    const checkboxes = document.querySelectorAll('.column-checkbox input[type="checkbox"]');
    visibleColumns = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    if (visibleColumns.length === 0) {
        alert('Please select at least one column to display');
        return;
    }
    
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    // Start with all data
    let data = [...allData];
    
    // Apply column filters
    Object.keys(columnFilters).forEach(column => {
        const filterValue = columnFilters[column].toLowerCase();
        if (filterValue) {
            data = data.filter(row => {
                const cellValue = row[column];
                if (cellValue === null || cellValue === undefined) return false;
                return String(cellValue).toLowerCase().includes(filterValue);
            });
        }
    });
    
    // Apply sorting
    if (sortColumn) {
        data.sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];
            
            // Handle null/undefined
            if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
            if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;
            
            // Try numeric comparison first
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            // String comparison
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    filteredData = data;
    totalRecords = filteredData.length;
    totalPages = Math.ceil(totalRecords / perPage) || 1;
    currentPage = Math.min(currentPage, totalPages);
    
    renderTable();
    updatePagination();
}

function renderTable() {
    const headerRow = document.getElementById('headerRow');
    const filterRow = document.getElementById('filterRow');
    const tbody = document.getElementById('tableBody');
    
    // Render headers with sort capability and resize handles
    headerRow.innerHTML = visibleColumns.map((col, index) => {
        const isSorted = sortColumn === col;
        const sortClass = isSorted ? `sort-${sortDirection}` : '';
        const width = columnWidths[col] ? `style="width: ${columnWidths[col]}px; max-width: ${columnWidths[col]}px;"` : '';
        return `
            <th class="sortable ${sortClass}" ${width} data-column="${col}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span onclick="handleSort('${col}')" style="flex: 1; cursor: pointer;">
                        ${col}
                        <span class="sort-icon"></span>
                    </span>
                    <div class="resize-handle" data-column="${col}"></div>
                </div>
            </th>
        `;
    }).join('');
    
    // Add resize event listeners
    document.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', startResize);
    });
    
    // Render filter inputs
    filterRow.innerHTML = visibleColumns.map(col => {
        const width = columnWidths[col] ? `style="width: ${columnWidths[col]}px; max-width: ${columnWidths[col]}px;"` : '';
        return `
            <th ${width}>
                <input type="text" class="filter-input" 
                       placeholder="Filter..." 
                       value="${columnFilters[col] || ''}"
                       onkeyup="handleColumnFilter('${col}', this.value)">
            </th>
        `;
    }).join('');
    
    // Render data rows
    const start = (currentPage - 1) * perPage;
    const end = Math.min(start + perPage, totalRecords);
    const pageData = filteredData.slice(start, end);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${visibleColumns.length}" style="text-align: center; padding: 40px; color: #6b7280;">
                    No data found. Try adjusting your filters.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageData.map(row => {
        return `
            <tr>
                ${visibleColumns.map(col => {
                    const value = row[col];
                    const formattedValue = formatCellValue(col, value);
                    const cellClass = getCellClass(col, value);
                    const width = columnWidths[col] ? `style="width: ${columnWidths[col]}px; max-width: ${columnWidths[col]}px;"` : '';
                    return `<td class="${cellClass}" ${width}>${formattedValue}</td>`;
                }).join('')}
            </tr>
        `;
    }).join('');
}

function handleSort(column) {
    if (sortColumn === column) {
        // Toggle direction
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    applyFiltersAndSort();
}

function handleColumnFilter(column, value) {
    if (value.trim()) {
        columnFilters[column] = value.trim();
    } else {
        delete columnFilters[column];
    }
    currentPage = 1;
    applyFiltersAndSort();
}

function handleGlobalSearch(e) {
    const searchValue = e.target.value.toLowerCase().trim();
    
    if (searchValue === '') {
        filteredData = [...allData];
    } else {
        filteredData = allData.filter(row => {
            return visibleColumns.some(col => {
                const cellValue = row[col];
                if (cellValue === null || cellValue === undefined) return false;
                return String(cellValue).toLowerCase().includes(searchValue);
            });
        });
    }
    
    currentPage = 1;
    totalRecords = filteredData.length;
    totalPages = Math.ceil(totalRecords / perPage) || 1;
    renderTable();
    updatePagination();
}

function clearAllFilters() {
    // Clear column filters
    columnFilters = {};
    document.querySelectorAll('.filter-input').forEach(input => input.value = '');
    
    // Clear global search
    document.getElementById('globalSearch').value = '';
    
    // Reset sorting
    sortColumn = null;
    sortDirection = null;
    
    // Reset data
    filteredData = [...allData];
    currentPage = 1;
    applyFiltersAndSort();
}

function formatCellValue(column, value) {
    if (value === null || value === undefined || value === '') {
        return '<span style="color: #9ca3af;">-</span>';
    }
    
    const numericColumns = [
        'Aum', 'Returns 1 Yr', 'Returns 3 Yr', 'Returns 5 Yr', 'Returns 3 Months',
        'Sharpe Ratio 1 Yr', 'Sharpe Ratio 3 Yr', 'Sortino 1 Yr', 'Sortino 3 Yr',
        'Max Drawdown Perc 1yr', 'Max Drawdown Perc 3yr', 'Expense Ratio',
        'Pb Ratio', 'Pe Ratio', 'Returns Since Inception', 'Std 1 Yr', 'Std 3 Yr',
        'Treynor Ratio 1 Yr', 'Treynor Ratio 3 Yr', 'Alpha 1 Yr', 'Alpha 3 Yr',
        'Beta 1 Yr', 'Beta 3 Yr'
    ];
    
    if (numericColumns.includes(column)) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            return num.toFixed(2);
        }
    }
    
    return value;
}

function getCellClass(column, value) {
    let classes = [];
    
    if (column === 'Fund') {
        classes.push('fund-name');
        return classes.join(' ');
    }
    
    const numericColumns = [
        'Aum', 'Returns 1 Yr', 'Returns 3 Yr', 'Returns 5 Yr', 'Returns 3 Months',
        'Sharpe Ratio 1 Yr', 'Sharpe Ratio 3 Yr', 'Sortino 1 Yr', 'Sortino 3 Yr',
        'Max Drawdown Perc 1yr', 'Max Drawdown Perc 3yr', 'Expense Ratio',
        'Pb Ratio', 'Pe Ratio', 'Returns Since Inception', 'Std 1 Yr', 'Std 3 Yr',
        'Treynor Ratio 1 Yr', 'Treynor Ratio 3 Yr', 'Alpha 1 Yr', 'Alpha 3 Yr',
        'Beta 1 Yr', 'Beta 3 Yr'
    ];
    
    if (numericColumns.includes(column)) {
        classes.push('numeric');
        
        const num = parseFloat(value);
        if (!isNaN(num)) {
            if (column.includes('Returns') || column.includes('Alpha')) {
                if (num > 0) classes.push('positive');
                if (num < 0) classes.push('negative');
            }
        }
    }
    
    return classes.join(' ');
}

function updatePagination() {
    // Update button states
    document.getElementById('firstPage').disabled = currentPage === 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    document.getElementById('lastPage').disabled = currentPage === totalPages;
    
    // Update pagination text
    const start = totalRecords === 0 ? 0 : ((currentPage - 1) * perPage) + 1;
    const end = Math.min(currentPage * perPage, totalRecords);
    document.getElementById('paginationText').textContent = 
        `Showing ${start}-${end} of ${totalRecords}`;
    
    // Update records info
    document.getElementById('recordsInfo').textContent = `Total: ${totalRecords} funds`;
    
    // Render page numbers
    renderPageNumbers();
}

function renderPageNumbers() {
    const pageNumbers = document.getElementById('pageNumbers');
    const maxVisible = 5;
    let pages = [];
    
    if (totalPages <= maxVisible) {
        pages = Array.from({length: totalPages}, (_, i) => i + 1);
    } else {
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, 5];
        } else if (currentPage >= totalPages - 2) {
            pages = Array.from({length: 5}, (_, i) => totalPages - 4 + i);
        } else {
            pages = [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
        }
    }
    
    pageNumbers.innerHTML = pages.map(page => 
        `<button class="${page === currentPage ? 'active' : ''}" onclick="goToPage(${page})">${page}</button>`
    ).join('');
}

function goToPage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        renderTable();
        updatePagination();
    }
}

function handlePerPageChange(e) {
    perPage = parseInt(e.target.value);
    totalPages = Math.ceil(totalRecords / perPage) || 1;
    currentPage = 1;
    renderTable();
    updatePagination();
}

async function handleExport() {
    try {
        // Export the filtered data as CSV
        const headers = visibleColumns.join(',');
        const rows = filteredData.map(row => {
            return visibleColumns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) return '';
                // Escape commas and quotes
                const str = String(value);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',');
        }).join('\n');
        
        const csv = headers + '\n' + rows;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `funds_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data');
    }
}

function showLoading() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('dataTable').style.opacity = '0.3';
}

function hideLoading() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('dataTable').style.opacity = '1';
}

function showError(message) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="100" style="text-align: center; padding: 40px; color: #dc2626;">
                ❌ ${message}
            </td>
        </tr>
    `;
}

// Column Resize Functionality
function startResize(e) {
    e.stopPropagation();
    const column = e.target.dataset.column;
    const th = e.target.closest('th');
    
    isResizing = true;
    currentResizeColumn = column;
    startX = e.pageX;
    startWidth = th.offsetWidth;
    
    document.getElementById('dataTable').classList.add('resizing');
    th.classList.add('resizing');
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
}

function doResize(e) {
    if (!isResizing) return;
    
    const diff = e.pageX - startX;
    const newWidth = Math.max(80, Math.min(600, startWidth + diff));
    
    columnWidths[currentResizeColumn] = newWidth;
    
    // Update all cells in this column
    const columnIndex = visibleColumns.indexOf(currentResizeColumn);
    const table = document.getElementById('dataTable');
    
    // Update header
    const headers = table.querySelectorAll('thead tr:first-child th');
    if (headers[columnIndex]) {
        headers[columnIndex].style.width = newWidth + 'px';
        headers[columnIndex].style.maxWidth = newWidth + 'px';
    }
    
    // Update filter row
    const filterHeaders = table.querySelectorAll('thead tr:last-child th');
    if (filterHeaders[columnIndex]) {
        filterHeaders[columnIndex].style.width = newWidth + 'px';
        filterHeaders[columnIndex].style.maxWidth = newWidth + 'px';
    }
    
    // Update body cells
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells[columnIndex]) {
            cells[columnIndex].style.width = newWidth + 'px';
            cells[columnIndex].style.maxWidth = newWidth + 'px';
        }
    });
}

function stopResize(e) {
    if (!isResizing) return;
    
    isResizing = false;
    document.getElementById('dataTable').classList.remove('resizing');
    
    const th = document.querySelector(`th[data-column="${currentResizeColumn}"]`);
    if (th) {
        th.classList.remove('resizing');
    }
    
    currentResizeColumn = null;
    
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
}
