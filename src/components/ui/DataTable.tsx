import React, { useMemo, useState, memo, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Trash2,
  CheckSquare,
  ArrowUp,
  ArrowDown } from
'lucide-react';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
export interface Column<T> {
  header: string;
  accessorKey: keyof T | ((item: T) => React.ReactNode);
  cell?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}
interface DataTableProps<T, K extends keyof T> {
  data: T[];
  columns: Column<T>[];
  keyField: K;
  onRowClick?: (item: T) => void;
  pagination?: boolean;
  pageSize?: number;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: T[K][]) => void;
  onBulkAction?: (action: string, selectedIds: T[K][]) => void;
}
function DataTableComponent<T, K extends keyof T>({
  data,
  columns,
  keyField,
  onRowClick,
  pagination = true,
  pageSize = 10,
  selectable = false,
  onSelectionChange,
  onBulkAction
}: DataTableProps<T, K>) {
  const [selectedIds, setSelectedIds] = useState<T[K][]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });
  const selectAllRef = useRef<HTMLInputElement>(null);
  // Sorting Logic
  const sortedData = useMemo(() => {
    const key = sortConfig.key;
    if (!key) return data;
    return [...data].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);
  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);
  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({
      key,
      direction
    });
  };
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = paginatedData.map((item) => item[keyField]);
      setSelectedIds(allIds);
      if (onSelectionChange) onSelectionChange(allIds);
    } else {
      setSelectedIds([]);
      if (onSelectionChange) onSelectionChange([]);
    }
  };
  const handleSelectRow = (
    id: T[K],
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    e.stopPropagation();
    let newSelected: T[K][];
    if (e.target.checked) {
      newSelected = [...selectedIds, id];
    } else {
      newSelected = selectedIds.filter((selectedId) => selectedId !== id);
    }
    setSelectedIds(newSelected);
    if (onSelectionChange) onSelectionChange(newSelected);
  };
  const isAllSelected =
  paginatedData.length > 0 &&
  paginatedData.every((item) => selectedIds.includes(item[keyField]));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <div className="space-y-2">
      {selectable && selectedIds.length > 0 &&
      <div className="bg-blue-50 px-4 py-2 rounded-lg flex items-center justify-between border border-blue-100">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''}{' '}
            selected
          </span>
          <div className="flex space-x-2">
            <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() =>
            onBulkAction && onBulkAction('delete', selectedIds)
            }>
            
              Delete Selected
            </Button>
            <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckSquare className="h-4 w-4" />}
            onClick={() =>
            onBulkAction && onBulkAction('approve', selectedIds)
            }>
            
              Approve Selected
            </Button>
          </div>
        </div>
      }

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {selectable &&
                <th scope="col" className="px-6 py-3 w-12">
                    <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded cursor-pointer transition-colors" />
                  
                  </th>
                }
                {columns.map((col, idx) =>
                <th
                  key={idx}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''} ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                  onClick={() =>
                  col.sortable !== false &&
                  typeof col.accessorKey === 'string' &&
                  handleSort(col.accessorKey as keyof T)
                  }>
                  
                    <div className="flex items-center space-x-1">
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                    sortConfig.key === col.accessorKey ?
                    sortConfig.direction === 'asc' ?
                    <ArrowUp className="h-3 w-3" /> :

                    <ArrowDown className="h-3 w-3" /> :


                    <ArrowUpDown className="h-3 w-3 text-gray-300" />)
                    }
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row) => {
                const id = row[keyField];
                const isSelected = selectedIds.includes(id);
                return (
                  <tr
                    key={String(id)}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`
                      ${onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
                      ${isSelected ? 'bg-blue-50/50' : ''}
                    `}>
                    
                    {selectable &&
                    <td
                      className="px-6 py-4 whitespace-nowrap w-12"
                      onClick={(e) => e.stopPropagation()}>
                      
                        <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(id, e)} />
                      
                      </td>
                    }
                    {columns.map((col, idx) =>
                    <td
                      key={idx}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      
                        {col.cell ?
                      col.cell(row) :
                      typeof col.accessorKey === 'function' ?
                      col.accessorKey(row) :
                      row[col.accessorKey] as React.ReactNode}
                      </td>
                    )}
                  </tr>);

              })}
              {paginatedData.length === 0 &&
              <tr>
                  <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500">
                  
                    No data available
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        {pagination && sortedData.length > 0 &&
        <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {Math.min(
                    (currentPage - 1) * pageSize + 1,
                    sortedData.length
                  )}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, sortedData.length)}
                  </span>{' '}
                  of <span className="font-medium">{sortedData.length}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination">
                
                  <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous page"
                  className="rounded-l-md rounded-r-none border-r-0"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from(
                  {
                    length: totalPages
                  },
                  (_, i) => i + 1
                ).map((page) =>
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page ? 'z-10 bg-brand-navy border-brand-navy text-white' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                  
                      {page}
                    </button>
                )}
                  <Button
                  variant="outline"
                  size="sm"
                  aria-label="Next page"
                  className="rounded-r-md rounded-l-none"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }>
                  
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        }
      </div>
    </div>);

}
export const DataTable = memo(DataTableComponent) as unknown as typeof DataTableComponent;
