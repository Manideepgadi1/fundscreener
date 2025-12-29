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
    const el = id => document.getElementById(id); // Corrected the parameter name
    el('applySelection')?.addEventListener('click', applyColumnSelection);
    el('exportBtn')?.addEventListener('click', handleExport);
    el('perPageSelect')?.addEventListener('change', handlePerPageChange);
    el('globalSearch')?.addEventListener('input', handleGlobalSearch);
    el('clearFilters')?.addEventListener('click', clearAllFilters);

    el('firstPage')?.addEventListener('click', () => goToPage(1));
    el('prevPage')?.addEventListener('click', () => goToPage(currentPage - 1));
    el('nextPage')?.addEventListener('click', () => goToPage(currentPage + 1));
    el('lastPage')?.addEventListener('click', () => goToPage(totalPages));
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
    container.innerHTML = allColumns.slice().sort().map(col =>
        `<div class="column-checkbox">
            <input type="checkbox" value="${col}" ${visibleColumns.includes(col) ? 'checked' : ''}>
            <label>${col}</label>
        </div>`
    ).join('');
}

function applyColumnSelection() {
    const checkboxes = document.querySelectorAll('.column-checkbox input[type="checkbox"]');
    visibleColumns = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    if (visibleColumns.length === 0) {
        alert('Please select at least one column');
        return;
    }
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

function renderTableHeaderAndFilters() {
    const headerRow = document.getElementById('headerRow');
    const filterRow = document.getElementById('filterRow');

    headerRow.innerHTML = visibleColumns.map(col =>
        `<th class="sortable" data-col="${col}">${col}</th>`
    ).join('');

    headerRow.querySelectorAll('th[data-col]').forEach(th => {
        const col = th.getAttribute('data-col');
        th.onclick = () => handleSort(col);
    });

    filterRow.innerHTML = visibleColumns.map(col =>
        `<th><input type="text" class="filter-input" placeholder="Filter..." data-column="${col}" value="${columnFilters[col] || ''}"></th>`
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
        `<tr>${visibleColumns.map(col => `<td>${row[col] ?? '-'}</td>`).join('')}</tr>`
    ).join('');
}

function renderTable() {
    // header/filters are rendered separately; body only here
    renderTableBody();
}

function attachFilterListeners() {
    document.querySelectorAll('.filter-input').forEach(input => {
        input.oninput = function () {
            const column = this.dataset.column;
            const value = this.value;

            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                if (value.trim()) columnFilters[column] = value.trim(); else delete columnFilters[column];
                currentPage = 1;
                applyFiltersAndSort();
            }, 300);
        };
    });
}

function handleSort(column) {
    if (sortColumn === column) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    else { sortColumn = column; sortDirection = 'asc'; }
    applyFiltersAndSort();
}

function handleGlobalSearch(e) {
    const searchValue = e.target.value.toLowerCase().trim();
    filteredData = allData.filter(row =>
        visibleColumns.some(col => String(row[col] ?? '').toLowerCase().includes(searchValue))
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
    const text = document.getElementById('paginationText');
    if (text) text.textContent = `Showing ${(currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, totalRecords)} of ${totalRecords}`;
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

function handleExport() {
    // unchanged
}

function updateRecordsInfo() {
    const info = document.getElementById('recordsInfo');
    if (info) info.textContent = `Total: ${totalRecords} funds`;
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
