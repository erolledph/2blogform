import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { debounce } from '@/utils/helpers';
import DynamicTransition from './DynamicTransition';

// Enhanced DataTable with virtual scrolling for large datasets
export default function VirtualizedDataTable({
  data = [],
  columns = [],
  searchable = false,
  filterable = false,
  filterOptions = {},
  sortable = false,
  pagination = false,
  pageSize = 50,
  selectable = false,
  selectedItems = [],
  onSelectAll = null,
  onSelectRow = null,
  onFiltersChange = null,
  className = '',
  loading = false,
  error = null,
  enableVirtualScrolling = true,
  itemHeight = 60,
  containerHeight = 600,
  overscan = 5
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    tag: '',
    dateRange: { start: '', end: '' }
  });
  const [showFilters, setShowFilters] = useState(false);
  const listRef = useRef(null);

  // Debounced search to improve performance
  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
      setCurrentPage(1);
    }, 300),
    []
  );

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(item =>
        Object.values(item).some(value =>
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filters
    if (filters.status) {
      result = result.filter(item => item.status === filters.status);
    }
    if (filters.category) {
      result = result.filter(item => 
        item.category === filters.category || 
        (item.categories && item.categories.includes(filters.category))
      );
    }
    if (filters.tag) {
      result = result.filter(item => 
        item.tags && item.tags.includes(filters.tag)
      );
    }
    if (filters.dateRange.start) {
      result = result.filter(item => {
        const itemDate = new Date(item.createdAt);
        const startDate = new Date(filters.dateRange.start);
        return itemDate >= startDate;
      });
    }
    if (filters.dateRange.end) {
      result = result.filter(item => {
        const itemDate = new Date(item.createdAt);
        const endDate = new Date(filters.dateRange.end);
        return itemDate <= endDate;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
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
    }

    return result;
  }, [data, searchTerm, sortConfig, filters]);

  // Pagination for virtual scrolling
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize, pagination]);

  const displayData = enableVirtualScrolling ? paginatedData : processedData;
  const totalPages = Math.ceil(processedData.length / pageSize);

  // Handle sorting
  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle filter changes
  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...filters, [filterKey]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      status: '',
      category: '',
      tag: '',
      dateRange: { start: '', end: '' }
    };
    setFilters(clearedFilters);
    setSearchTerm('');
    setCurrentPage(1);
    
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
  };

  // Get unique values for filter options
  const getUniqueValues = (key) => {
    const values = new Set();
    data.forEach(item => {
      if (key === 'categories' && item.categories) {
        item.categories.forEach(cat => values.add(cat));
      } else if (key === 'tags' && item.tags) {
        item.tags.forEach(tag => values.add(tag));
      } else if (item[key]) {
        values.add(item[key]);
      }
    });
    return Array.from(values).sort();
  };

  // Handle select all
  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    if (onSelectAll) {
      onSelectAll(isChecked);
    }
  };

  // Handle individual row selection
  const handleRowSelect = (itemId, isSelected) => {
    if (onSelectRow) {
      onSelectRow(itemId, isSelected);
    }
  };

  // Virtual list row renderer
  const Row = ({ index, style }) => {
    const item = displayData[index];
    if (!item) return null;

    return (
      <div style={style} className="flex items-center border-b border-border hover:bg-muted/30 transition-colors duration-200">
        {selectable && (
          <div className="px-4 py-3 flex-shrink-0">
            <input
              type="checkbox"
              checked={selectedItems.includes(item.id)}
              onChange={(e) => handleRowSelect(item.id, e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
            />
          </div>
        )}
        {columns.map((column, colIndex) => (
          <div 
            key={column.key} 
            className="px-4 py-3 flex-1 min-w-0"
            style={{ 
              flex: column.width || 1,
              minWidth: column.minWidth || 'auto',
              maxWidth: column.maxWidth || 'none'
            }}
          >
            {column.render ? column.render(item[column.key], item) : item[column.key]}
          </div>
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-destructive mb-4">Error loading data: {error}</div>
        <button onClick={() => window.location.reload()} className="btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <DynamicTransition loading={loading} className={className}>
      <div className="space-y-6">
        {/* Search and Filter Controls */}
        {(searchable || filterable) && (
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            {searchable && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            )}

            {/* Filter Toggle */}
            {filterable && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn-secondary btn-sm inline-flex items-center ${
                    showFilters ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {Object.values(filters).some(v => v && v !== '') && (
                    <span className="ml-2 w-2 h-2 bg-primary rounded-full"></span>
                  )}
                </button>
                
                {Object.values(filters).some(v => v && v !== '') && (
                  <button
                    onClick={clearFilters}
                    className="btn-ghost btn-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Advanced Filters Panel */}
        {filterable && showFilters && (
          <DynamicTransition show={showFilters} transitionType="slide-down">
            <div className="card border-blue-200 bg-blue-50">
              <div className="card-content p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  {filterOptions.statuses && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="input-field"
                      >
                        <option value="">All Statuses</option>
                        {filterOptions.statuses.map(status => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Category Filter */}
                  {filterOptions.categories && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="input-field"
                      >
                        <option value="">All Categories</option>
                        {getUniqueValues('category').map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Tag Filter */}
                  {filterOptions.tags && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tag
                      </label>
                      <select
                        value={filters.tag}
                        onChange={(e) => handleFilterChange('tag', e.target.value)}
                        className="input-field"
                      >
                        <option value="">All Tags</option>
                        {getUniqueValues('tags').map(tag => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Date Range Filter */}
                  {filterOptions.dateRange && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Date Range
                      </label>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={filters.dateRange.start}
                          onChange={(e) => handleFilterChange('dateRange', { 
                            ...filters.dateRange, 
                            start: e.target.value 
                          })}
                          className="input-field text-sm"
                          placeholder="Start date"
                        />
                        <input
                          type="date"
                          value={filters.dateRange.end}
                          onChange={(e) => handleFilterChange('dateRange', { 
                            ...filters.dateRange, 
                            end: e.target.value 
                          })}
                          className="input-field text-sm"
                          placeholder="End date"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DynamicTransition>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {displayData.length} of {processedData.length} items
            {data.length !== processedData.length && (
              <span> (filtered from {data.length} total)</span>
            )}
          </div>
          {selectable && selectedItems.length > 0 && (
            <div className="text-primary font-medium">
              {selectedItems.length} selected
            </div>
          )}
        </div>

        {/* Virtual Table */}
        <div className="card">
          <div className="card-content p-0">
            {/* Table Header */}
            <div className="bg-muted/50 border-b border-border">
              <div className="flex items-center">
                {selectable && (
                  <div className="px-4 py-3 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === data.length && data.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                    />
                  </div>
                )}
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`px-4 py-3 text-left text-sm font-medium text-foreground flex-1 min-w-0 ${
                      sortable && column.sortable !== false ? 'cursor-pointer hover:bg-muted/70' : ''
                    }`}
                    onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
                    style={{ 
                      flex: column.width || 1,
                      minWidth: column.minWidth || 'auto',
                      maxWidth: column.maxWidth || 'none'
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{column.title}</span>
                      {sortable && column.sortable !== false && sortConfig.key === column.key && (
                        <div className="transition-transform duration-200">
                          {sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Virtual List Body */}
            {enableVirtualScrolling && displayData.length > 20 ? (
              <List
                ref={listRef}
                height={containerHeight}
                itemCount={displayData.length}
                itemSize={itemHeight}
                overscanCount={overscan}
                className="virtual-list"
              >
                {Row}
              </List>
            ) : (
              <div className="divide-y divide-border">
                {displayData.map((item, index) => (
                  <div key={item.id || index} className="flex items-center border-b border-border hover:bg-muted/30 transition-colors duration-200">
                    {selectable && (
                      <div className="px-4 py-3 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                          className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                        />
                      </div>
                    )}
                    {columns.map((column) => (
                      <div 
                        key={column.key} 
                        className="px-4 py-3 flex-1 min-w-0"
                        style={{ 
                          flex: column.width || 1,
                          minWidth: column.minWidth || 'auto',
                          maxWidth: column.maxWidth || 'none'
                        }}
                      >
                        {column.render ? column.render(item[column.key], item) : item[column.key]}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {processedData.length === 0 && !loading && (
          <DynamicTransition transitionType="fade">
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchTerm || Object.values(filters).some(v => v && v !== '') 
                  ? 'No items match your search or filters' 
                  : 'No data available'
                }
              </div>
              {(searchTerm || Object.values(filters).some(v => v && v !== '')) && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary btn-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </DynamicTransition>
        )}

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-ghost btn-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded ${
                        currentPage === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn-ghost btn-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DynamicTransition>
  );
}