'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AdminPagination({ page, pageCount, total, pageSize = 10, onPageChange }: { page: number; pageCount: number; total: number; pageSize?: number; onPageChange: (page: number) => void }) {
  if (total <= pageSize) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="admin-pagination" aria-label="Pagination">
      <span className="small muted">Showing {start}-{end} of {total}</span>
      <div className="admin-pagination-actions">
        <button type="button" className="icon-btn" aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={15} /></button>
        <span className="small">Page {page} of {pageCount}</span>
        <button type="button" className="icon-btn" aria-label="Next page" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

export function paginate<T>(items: T[], page: number, pageSize = 10) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}
