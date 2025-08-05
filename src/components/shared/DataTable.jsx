import React, { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, Check, Grid, List, Calendar, Tag, X } from 'lucide-react';

export default function DataTable({
  data = [],
  columns = [],
  searchable = true,
  filterable = false,
  filterOptions = {},
  sortable = true,
  pagination = true,
  pageSize = 10,
  className = '',
  selectable = false,
  selectedItems = [],
  onSelectAll = null,
  onSelectRow = null,
  onFiltersChange = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: 'all',
    category: 'all',
    tags: [],
    dateRange: { start: '', end: '' }
  });

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchTerm && searchable) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply advanced filters
    if (filterable && onFiltersChange) {
      // Status filter
      if (activeFilters.status !== 'all') {
        filtered = filtered.filter(item => item.status === activeFilters.status);
      }

      // Category filter
      if (activeFilters.category !== 'all') {
        filtered = filtered.filter(item => {
          if (Array.isArray(item.categories)) {
            return item.categories.includes(activeFilters.category);
          }
          return item.category === activeFilters.category;
        });
      }

      // Tags filter
      if (activeFilters.tags.length > 0) {
        filtered = filtered.filter(item => {
          if (Array.isArray(item.tags)) {
            return activeFilters.tags.some(tag => item.tags.includes(tag));
          }
          return false;
        });
      }

      // Date range filter
      if (activeFilters.dateRange.start || activeFilters.dateRange.end) {
        filtered = filtered.filter(item => {
          if (!item.createdAt) return false;
          
          const itemDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
          
          if (activeFilters.dateRange.start) {
            const startDate = new Date(activeFilters.dateRange.start);
            if (itemDate < startDate) return false;
          }
          
          if (activeFilters.dateRange.end) {
            const endDate = new Date(activeFilters.dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            if (itemDate > endDate) return false;
          }
          
          return true;
        });
      }
    }

    return filtered;
  }, [data, searchTerm, searchable, activeFilters, filterable, onFiltersChange]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortable) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig, sortable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (columnKey) => {
    if (!sortable || sortConfig.key !== columnKey) return null;
    
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const isAllSelected = data.length > 0 && selectedItems.length === data.length;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < data.length;

  // Get unique values for filter options
  const getUniqueValues = (key) => {
    const values = new Set();
    data.forEach(item => {
      if (Array.isArray(item[key])) {
        item[key].forEach(val => values.add(val));
      } else if (item[key]) {
        values.add(item[key]);
      }
    });
    return Array.from(values).sort();
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...activeFilters };
    
    if (filterType === 'tags') {
      if (newFilters.tags.includes(value)) {
        newFilters.tags = newFilters.tags.filter(tag => tag !== value);
      } else {
        newFilters.tags = [...newFilters.tags, value];
      }
    } else if (filterType === 'dateRange') {
      newFilters.dateRange = { ...newFilters.dateRange, ...value };
    } else {
      newFilters[filterType] = value;
    }
    
    setActiveFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters = {
      status: 'all',
      category: 'all',
      tags: [],
      dateRange: { start: '', end: '' }
    };
    setActiveFilters(clearedFilters);
    setCurrentPage(1);
    
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
  };

  const hasActiveFilters = activeFilters.status !== 'all' || 
                          activeFilters.category !== 'all' || 
                          activeFilters.tags.length > 0 || 
                          activeFilters.dateRange.start || 
                          activeFilters.dateRange.end;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!isAllSelected);
    }
  };

  const handleRowSelect = (itemId) => {
    if (onSelectRow) {
      const isSelected = selectedItems.includes(itemId);
      onSelectRow(itemId, !isSelected);
    }
  };
  // Render cards view for mobile
  const renderCardsView = () => {
    return (
      <div className="grid grid-cols-1 gap-4">
        {paginatedData.map((row, index) => (
          <div key={row.id || index} className="card border border-border rounded-lg p-4 space-y-3">
            {selectable && (
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm font-medium text-foreground">Select Item</span>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(row.id)}
                  onChange={() => handleRowSelect(row.id)}
                  className="w-4 h-4 text-primary rounded border-border focus:ring-primary focus:ring-2"
                />
              </div>
            )}
            {columns.map((column) => (
              <div key={column.key} className="flex flex-col space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {column.title}
                </span>
                <div className="text-sm text-foreground">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Render table view
  const renderTableView = () => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {selectable && (
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary focus:ring-2"
                    />
                  </div>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider ${
                    sortable && column.sortable !== false ? 'cursor-pointer hover:bg-muted/70' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.title}</span>
                    {getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {paginatedData.map((row, index) => (
              <tr key={row.id || index} className="hover:bg-muted/30 transition-colors duration-200">
                {selectable && (
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(row.id)}
                      onChange={() => handleRowSelect(row.id)}
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary focus:ring-2"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      {(searchable || filterable || selectable) && (
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {searchable && (
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="input-field pl-12"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Filter Controls */}
            <div className="flex items-center space-x-3">
              {filterable && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn-secondary btn-sm inline-flex items-center ${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-2 w-2 h-2 bg-primary rounded-full"></span>
                  )}
                </button>
              )}
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-ghost btn-sm text-muted-foreground hover:text-foreground"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* View Mode Toggle for Mobile */}
            {isMobile && (
              <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-colors text-sm font-medium ${
                    viewMode === 'table' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-md transition-colors text-sm font-medium ${
                    viewMode === 'cards' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {filterable && showFilters && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                {filterOptions.statuses && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                    <select
                      value={activeFilters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="all">All Statuses</option>
                      {filterOptions.statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category Filter */}
                {filterOptions.categories && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                    <select
                      value={activeFilters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="all">All Categories</option>
                      {getUniqueValues('categories').concat(getUniqueValues('category')).filter((v, i, arr) => arr.indexOf(v) === i).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
                  <input
                    type="date"
                    value={activeFilters.dateRange.start}
                    onChange={(e) => handleFilterChange('dateRange', { start: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
                  <input
                    type="date"
                    value={activeFilters.dateRange.end}
                    onChange={(e) => handleFilterChange('dateRange', { end: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              {/* Tags Filter */}
              {getUniqueValues('tags').length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {getUniqueValues('tags').map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleFilterChange('tags', tag)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors ${
                          activeFilters.tags.includes(tag)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/70'
                        }`}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                        {activeFilters.tags.includes(tag) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data Display - Table or Cards based on view mode and screen size */}
      {isMobile && viewMode === 'cards' ? renderCardsView() : renderTableView()}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-4 sm:px-6 py-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
              {data.length !== sortedData.length && (
                <span className="text-primary font-medium ml-2">
                  (filtered from {data.length} total)
                </span>
              )}
              {selectable && selectedItems.length > 0 && (
                <span className="ml-4 text-primary font-medium">
                  {selectedItems.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {paginatedData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-base">No data available</p>
          {searchTerm && (
            <p className="text-sm mt-2">Try adjusting your search criteria</p>
          )}
        </div>
      )}
    </div>
  );
}