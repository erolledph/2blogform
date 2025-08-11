import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import DynamicTransition from './DynamicTransition';

export default function DataTable({ 
  data = [], 
  columns = [], 
  searchable = true,
  sortable = true,
  paginated = true,
  pageSize = 10,
  className = '',
  onRowClick,
  loading = false,
  selectable = false,
  selectedItems = [],
  onSelectAll = null,
  onSelectRow = null,
  enableAnimations = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchable) return data;
    
    return data.filter(item =>
      columns.some(column => {
        const value = item[column.key];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns, searchable]);

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
    if (!paginated) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, paginated]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (columnKey) => {
    if (!sortable || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    if (onSelectAll) {
      onSelectAll(isChecked);
    }
  };

  const handleRowSelect = (itemId, isSelected) => {
    if (onSelectRow) {
      onSelectRow(itemId, isSelected);
    }
  };
  if (loading) {
    return (
      <div className={`bg-card rounded-lg border border-border ${className}`}>
        <div className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DynamicTransition 
      loading={loading} 
      transitionType={enableAnimations ? "fade" : "none"}
      className={`bg-card rounded-xl border border-border shadow-sm ${className}`}
    >
      {/* Search */}
      {searchable && (
        <div className="p-6 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {selectable && (
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-sm font-medium text-muted-foreground ${
                    sortable ? 'cursor-pointer hover:text-foreground' : ''
                  }`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.label}</span>
                    {sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground">
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={`border-b border-border min-h-[60px] transition-colors duration-200 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${enableAnimations ? 'hover:bg-muted/30' : ''}`}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelect(item.id, e.target.checked);
                        }}
                        className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-foreground">
                      {column.render ? column.render(item[column.key], item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-3 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </DynamicTransition>
  );
}