// Table Pagination and Search Utility
class TableManager {
    constructor(tableId, options = {}) {
        this.table = document.getElementById(tableId);
        if (!this.table) return;
        
        this.options = {
            itemsPerPage: options.itemsPerPage || 10,
            searchable: options.searchable !== false,
            searchPlaceholder: options.searchPlaceholder || 'Search...',
            searchColumns: options.searchColumns || [],
            ...options
        };
        
        this.currentPage = 1;
        this.filteredData = [];
        this.allRows = Array.from(this.table.querySelectorAll('tbody tr'));
        this.init();
    }
    
    init() {
        this.createControls();
        this.attachEventListeners();
        this.updateDisplay();
    }
    
    createControls() {
        const tbody = this.table.querySelector('tbody');
        if (!tbody) return;
        
        // Create wrapper for controls
        const wrapper = document.createElement('div');
        wrapper.className = 'table-controls';
        wrapper.style.cssText = 'margin-bottom: var(--space-20); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-16);';
        
        // Search input
        if (this.options.searchable) {
            const searchWrapper = document.createElement('div');
            searchWrapper.style.cssText = 'flex: 1; min-width: 250px; max-width: 400px;';
            
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'form-control';
            searchInput.id = `search-${this.table.id}`;
            searchInput.placeholder = this.options.searchPlaceholder;
            searchInput.style.cssText = 'margin: 0;';
            searchInput.setAttribute('autocomplete', 'off');
            
            searchWrapper.appendChild(searchInput);
            wrapper.appendChild(searchWrapper);
        }
        
        // Pagination info and controls
        const paginationWrapper = document.createElement('div');
        paginationWrapper.style.cssText = 'display: flex; align-items: center; gap: var(--space-16);';
        
        const info = document.createElement('span');
        info.id = `pagination-info-${this.table.id}`;
        info.style.cssText = 'color: var(--color-text-secondary); font-size: var(--font-size-sm);';
        
        const pageControls = document.createElement('div');
        pageControls.id = `pagination-controls-${this.table.id}`;
        pageControls.style.cssText = 'display: flex; gap: var(--space-8); align-items: center;';
        
        paginationWrapper.appendChild(info);
        paginationWrapper.appendChild(pageControls);
        wrapper.appendChild(paginationWrapper);
        
        // Insert before table
        this.table.parentNode.insertBefore(wrapper, this.table);
        
        this.searchInput = this.options.searchable ? document.getElementById(`search-${this.table.id}`) : null;
        this.paginationInfo = info;
        this.paginationControls = pageControls;
    }
    
    attachEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.currentPage = 1;
                this.filterData(e.target.value);
                this.updateDisplay();
            });
        }
    }
    
    filterData(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.filteredData = this.allRows;
            return;
        }
        
        this.filteredData = this.allRows.filter(row => {
            const cells = row.querySelectorAll('td');
            for (let cell of cells) {
                const text = cell.textContent.toLowerCase();
                if (text.includes(term)) {
                    return true;
                }
            }
            return false;
        });
    }
    
    updateDisplay() {
        const tbody = this.table.querySelector('tbody');
        if (!tbody) return;
        
        // Get data to display
        const data = this.filteredData.length > 0 ? this.filteredData : this.allRows;
        const totalItems = data.length;
        const totalPages = Math.ceil(totalItems / this.options.itemsPerPage);
        
        // Update current page if needed
        if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = totalPages;
        }
        
        // Calculate pagination
        const start = (this.currentPage - 1) * this.options.itemsPerPage;
        const end = start + this.options.itemsPerPage;
        const pageData = data.slice(start, end);
        
        // Hide all rows
        this.allRows.forEach(row => {
            row.style.display = 'none';
        });
        
        // Show only current page rows
        pageData.forEach(row => {
            row.style.display = '';
        });
        
        // Update pagination info
        if (totalItems > 0) {
            const startItem = start + 1;
            const endItem = Math.min(end, totalItems);
            this.paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems}`;
        } else {
            this.paginationInfo.textContent = 'No results found';
        }
        
        // Update pagination controls
        this.updatePaginationControls(totalPages);
    }
    
    updatePaginationControls(totalPages) {
        this.paginationControls.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn--sm btn--outline';
        prevBtn.textContent = 'Previous';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateDisplay();
            }
        };
        this.paginationControls.appendChild(prevBtn);
        
        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.className = 'btn btn--sm btn--outline';
            firstBtn.textContent = '1';
            firstBtn.onclick = () => {
                this.currentPage = 1;
                this.updateDisplay();
            };
            this.paginationControls.appendChild(firstBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = 'padding: 0 var(--space-8); color: var(--color-text-secondary);';
                this.paginationControls.appendChild(ellipsis);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `btn btn--sm ${i === this.currentPage ? 'btn--primary' : 'btn--outline'}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                this.currentPage = i;
                this.updateDisplay();
            };
            this.paginationControls.appendChild(pageBtn);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.cssText = 'padding: 0 var(--space-8); color: var(--color-text-secondary);';
                this.paginationControls.appendChild(ellipsis);
            }
            
            const lastBtn = document.createElement('button');
            lastBtn.className = 'btn btn--sm btn--outline';
            lastBtn.textContent = totalPages;
            lastBtn.onclick = () => {
                this.currentPage = totalPages;
                this.updateDisplay();
            };
            this.paginationControls.appendChild(lastBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn--sm btn--outline';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.updateDisplay();
            }
        };
        this.paginationControls.appendChild(nextBtn);
    }
}

// Initialize table managers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Auto-initialize tables with data-table attribute
    document.querySelectorAll('table[data-table]').forEach(table => {
        const tableId = table.id || `table-${Math.random().toString(36).substr(2, 9)}`;
        if (!table.id) table.id = tableId;
        
        const itemsPerPage = parseInt(table.getAttribute('data-items-per-page')) || 10;
        const searchable = table.getAttribute('data-searchable') !== 'false';
        const searchPlaceholder = table.getAttribute('data-search-placeholder') || 'Search...';
        
        new TableManager(tableId, {
            itemsPerPage,
            searchable,
            searchPlaceholder
        });
    });
});

