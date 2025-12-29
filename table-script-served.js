// Get the base URL - works for both root and subpath deployments
const API_BASE_URL = window.location.pathname.includes('/fundscreener')
    ? window.location.origin + '/fundscreener'
    : window.location.origin;

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
let filterTimeout = null;
let headerRenderedKey = '';

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
    await loadAllData();
}

async function loadAllData() {
    showLoading();
    try {
        const url = `${API_BASE_URL}/api/funds?page=1&per_page=10000`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            allColumns = result.columns;
            allData = result.data;
            filteredData = [...allData];

            visibleColumns = DEFAULT_VISIBLE_COLUMNS.filter(col => allColumns.includes(col));

            renderColumnCheckboxes();
            // Render header and filters once for the current visibleColumns
            renderTableHeaderAndFilters();
            applyFiltersAndSort();
        } else {
            showError('Failed to load data: ' + result.error);
        }
    } catch (error) {
        showError('Failed to connect to server.');
    } finally {
        hideLoading();
    }
}

function renderColumnCheckboxes() {
    const container = document.getElementById('columnCheckboxes');
    container.innerHTML = '';

    const sortedFunds = allColumns.slice();
    sortedFunds.sort();

    container.innerHTML = sortedFunds.map(col =>
        `<div class="column-checkbox">
            <input type="checkbox" value="${col}" ${visibleColumns.includes(col) ? 'checked' : ''}>
            <label>${col}</label>
        </div>`
    ).join('');
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

    // Re-render headers/filters for new column set, then update table body
    renderTableHeaderAndFilters();
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    let data = [...allData];

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

    if (sortColumn) {
        data.sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }

            return sortDirection === 'asc'
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });
    }

    filteredData = data;
    totalRecords = data.length;
    totalPages = Math.ceil(totalRecords / perPage) || 1;
    currentPage = Math.min(currentPage, totalPages);

    updateRecordsInfo();
    renderTable();
    updatePagination();
}

// Render headers and filter inputs only when visibleColumns change
function renderTableHeaderAndFilters() {
    const key = visibleColumns.join('|');
    if (headerRenderedKey === key) return;

    const headerRow = document.getElementById('headerRow');
    const filterRow = document.getElementById('filterRow');

    headerRow.innerHTML = visibleColumns.map(col =>
        `<th class="sortable" data-column="${col}">${col}<span class="sort-icon"></span></th>`
    ).join('');

    // Attach sort handlers
    headerRow.querySelectorAll('th[data-column]').forEach(th => {
        const col = th.getAttribute('data-column');
        th.onclick = () => handleSort(col);
    });

    // Add resize handles
    headerRow.querySelectorAll('th').forEach(th => {
        const col = th.getAttribute('data-column');
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.setAttribute('data-column', col);
        th.appendChild(handle);
        handle.addEventListener('mousedown', startResize);
    });

    filterRow.innerHTML = visibleColumns.map(col =>
        `<th><input type="text" class="filter-input" data-column="${col}" placeholder="Filter..." value="${columnFilters[col] || ''}"></th>`
    ).join('');

    // Attach filter listeners once (preserve inputs between tbody renders)
    filterRow.querySelectorAll('.filter-input').forEach(input => {
        const col = input.getAttribute('data-column');
        input.value = columnFilters[col] || '';
        input.addEventListener('input', (e) => {
            clearTimeout(filterTimeout);
            const val = e.target.value;
            filterTimeout = setTimeout(() => {
                if (val.trim()) columnFilters[col] = val.trim(); else delete columnFilters[col];
                currentPage = 1;
                applyFiltersAndSort();
            }, 250);
        });
    });

    headerRenderedKey = key;
}

function renderTableBody() {
    const tbody = document.getElementById('tableBody');
    const start = (currentPage - 1) * perPage;
    const end = Math.min(start + perPage, totalRecords);
    const pageData = filteredData.slice(start, end);
    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${visibleColumns.length}" style="text-align:center">No data</td></tr>`;
        return;
    }
    tbody.innerHTML = pageData.map(row =>
        `<tr>
            ${visibleColumns.map(col => `<td>${row[col] ?? '-'}</td>`).join('')}
        </tr>`
    ).join('');
}

function renderTable() {
    // Ensure header/filters exist for current visibleColumns
    renderTableHeaderAndFilters();
    renderTableBody();
}

function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    applyFiltersAndSort();
}

function handleGlobalSearch(e) {
    const searchValue = e.target.value.toLowerCase().trim();
    filteredData = allData.filter(row =>
        visibleColumns.some(col =>
            String(row[col] ?? '').toLowerCase().includes(searchValue)
        )
    );
    currentPage = 1;
    renderTable();
    updatePagination();
}

function clearAllFilters() {
    columnFilters = {};
    document.querySelectorAll('.filter-input').forEach(input => input.value = '');
    document.getElementById('globalSearch').value = '';
    filteredData = [...allData];
    applyFiltersAndSort();
}

function updatePagination() {
    document.getElementById('paginationText').textContent =
        `Showing ${(currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, totalRecords)} of ${totalRecords}`;

    document.getElementById('firstPage').disabled = currentPage === 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    document.getElementById('lastPage').disabled = currentPage === totalPages;

    // Update records info
    const info = document.getElementById('recordsInfo');
    if (info) info.textContent = `Total: ${totalRecords} funds`;

    // Render page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    const maxVisible = 5;
    let pages = [];
    if (totalPages <= maxVisible) {
        pages = Array.from({length: totalPages}, (_, i) => i + 1);
    } else {
        if (currentPage <= 3) pages = [1,2,3,4,5];
        else if (currentPage >= totalPages - 2) pages = Array.from({length:5}, (_,i) => totalPages - 4 + i);
        else pages = [currentPage-2, currentPage-1, currentPage, currentPage+1, currentPage+2];
    }
    pageNumbers.innerHTML = pages.map(p => `<button class="${p===currentPage?'active':''}" onclick="goToPage(${p})">${p}</button>`).join('');
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
    currentPage = 1;
    renderTable();
    updatePagination();
}

async function handleExport() {
    try {
        const headers = visibleColumns.join(',');
        const rows = filteredData.map(row => {
            return visibleColumns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) return '';
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
    const loading = document.getElementById('loadingState');
    const table = document.getElementById('dataTable');
    if (loading) loading.style.display = 'block';
    if (table) table.style.visibility = 'hidden';
}

function hideLoading() {
    const loading = document.getElementById('loadingState');
    const table = document.getElementById('dataTable');
    if (loading) loading.style.display = 'none';
    if (table) table.style.visibility = 'visible';
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

// Column resizing
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

    const columnIndex = visibleColumns.indexOf(currentResizeColumn);
    const table = document.getElementById('dataTable');

    const headers = table.querySelectorAll('thead tr:first-child th');
    if (headers[columnIndex]) {
        headers[columnIndex].style.width = newWidth + 'px';
        headers[columnIndex].style.maxWidth = newWidth + 'px';
    }

    const filterHeaders = table.querySelectorAll('thead tr:last-child th');
    if (filterHeaders[columnIndex]) {
        filterHeaders[columnIndex].style.width = newWidth + 'px';
        filterHeaders[columnIndex].style.maxWidth = newWidth + 'px';
    }

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
    if (th) th.classList.remove('resizing');

    currentResizeColumn = null;

    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
}

function formatCellValue(column, value) {
    if (value === null || value === undefined || value === '') return '<span style="color: #9ca3af;">-</span>';

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
        if (!isNaN(num)) return num.toFixed(2);
    }
    return value;
}

function getCellClass(column, value) {
    let classes = [];
    if (column === 'Fund') { classes.push('fund-name'); return classes.join(' '); }

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

// Export the module's UI-ready functions (none) - file ends here
        return;

// Render headers and filter row only when visibleColumns change
function renderTableHeaderAndFilters() {
    const key = visibleColumns.join('|');
    if (headerRenderedKey === key) return;

    const headerRow = document.getElementById('headerRow');
    const filterRow = document.getElementById('filterRow');

    headerRow.innerHTML = visibleColumns.map((col) => {
        const isSorted = sortColumn === col;
        const sortClass = isSorted ? `sort-${sortDirection}` : '';
        const width = columnWidths[col] ? `style="width: ${columnWidths[col]}px; max-width: ${columnWidths[col]}px;"` : '';
        return `
            <th class="sortable ${sortClass}" ${width} data-column="${col}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="flex: 1; cursor: pointer;" data-sortable="${col}">${col}<span class="sort-icon"></span></span>
                    <div class="resize-handle" data-column="${col}"></div>
                </div>
            </th>
        `;
    }).join('');

    // Attach sort handlers
    headerRow.querySelectorAll('[data-sortable]').forEach(el => {
        el.addEventListener('click', (e) => {
            const col = e.currentTarget.getAttribute('data-sortable');
            handleSort(col);
        });
    });

    // Add resize event listeners
    headerRow.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', startResize);
    });

    // Render filter inputs once and attach listeners
    filterRow.innerHTML = visibleColumns.map(col => {
        return `
            <th>
                <input type="text" class="filter-input" placeholder="Filter..." data-column="${col}" value="${columnFilters[col] || ''}">
            </th>
        `;
    }).join('');

    // Attach filter listeners (do not recreate on subsequent renders)
    filterRow.querySelectorAll('.filter-input').forEach(input => {
        const col = input.getAttribute('data-column');
        input.value = columnFilters[col] || '';
        input.addEventListener('input', (e) => {
            // Debounce per-input to avoid excessive updates
            clearTimeout(filterTimeout);
            const val = e.target.value;
            filterTimeout = setTimeout(() => {
                handleColumnFilter(col, val);
            }, 200);
        });
    });

    headerRenderedKey = key;
}


function applyFiltersAndSort() {
    let data = [...allData];

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

    if (sortColumn) {
        data.sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }

            return sortDirection === 'asc'
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });
    }

    filteredData = data;
    totalRecords = data.length;
    totalPages = Math.ceil(totalRecords / perPage) || 1;
    currentPage = Math.min(currentPage, totalPages);

    updateRecordsInfo();
    renderTable();
    updatePagination();
}

function renderTableHeaderAndFilters() {
    const headerRow = document.getElementById('headerRow');
    const filterRow = document.getElementById('filterRow');
    headerRow.innerHTML = visibleColumns.map(col =>
        `<th class="sortable" onclick="handleSort('${col}')">${col}</th>`
    ).join('');
    filterRow.innerHTML = visibleColumns.map(col =>
        `<th>
            <input type="text"
                   class="filter-input"
                   placeholder="Filter..."
                   data-column="${col}"
                   value="${columnFilters[col] || ''}">
        </th>`
    ).join('');
    attachFilterListeners();
}

function renderTableBody() {
    const tbody = document.getElementById('tableBody');
    const start = (currentPage - 1) * perPage;
    const end = Math.min(start + perPage, totalRecords);
    const pageData = filteredData.slice(start, end);
    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${visibleColumns.length}" style="text-align:center">No data</td></tr>`;
        return;
    }
    tbody.innerHTML = pageData.map(row =>
        `<tr>
            ${visibleColumns.map(col => `<td>${row[col] ?? '-'}</td>`).join('')}
        </tr>`
    ).join('');
}

function renderTable() {
    renderTableBody();
}

function attachFilterListeners() {
    document.querySelectorAll('.filter-input').forEach(input => {
        // replace any existing handler to avoid duplicates and preserve focus
        input.oninput = function () {
            const column = this.dataset.column;
            const value = this.value;

            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                if (value.trim()) {
                    columnFilters[column] = value.trim();
                } else {
                    delete columnFilters[column];
                }
                currentPage = 1;
                applyFiltersAndSort();
            }, 300);
        };
    });
}

function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    applyFiltersAndSort();
}

function handleGlobalSearch(e) {
    const searchValue = e.target.value.toLowerCase().trim();
    filteredData = allData.filter(row =>
        visibleColumns.some(col =>
            String(row[col] ?? '').toLowerCase().includes(searchValue)
        )
    );
    currentPage = 1;
    renderTable();
    updatePagination();
}

function clearAllFilters() {
    columnFilters = {};
    document.querySelectorAll('.filter-input').forEach(input => input.value = '');
    document.getElementById('globalSearch').value = '';
    filteredData = [...allData];
    applyFiltersAndSort();
}

function updatePagination() {
    document.getElementById('paginationText').textContent =
        `Showing ${(currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, totalRecords)} of ${totalRecords}`;
}

function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
        updatePagination();
    }
}

function handlePerPageChange(e) {
    perPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
    updatePagination();
}

function handleExport() {
    // unchanged
}

function updateRecordsInfo() {
    const info = document.getElementById('recordsInfo');
    if (info) {
        info.textContent = `Total: ${totalRecords} funds`;
    }
}

function showLoading() {
    const loading = document.getElementById('loadingState');
    const table = document.getElementById('dataTable');
    if (loading) loading.style.display = 'block';
    if (table) table.style.visibility = 'hidden';
}

function hideLoading() {
    const loading = document.getElementById('loadingState');
    const table = document.getElementById('dataTable');
    if (loading) loading.style.display = 'none';
    if (table) table.style.visibility = 'visible';
}

function showError(msg) { alert(msg); }
