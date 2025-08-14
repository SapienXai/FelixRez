import React from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  canGoNext: boolean
  canGoPrevious: boolean
  startIndex: number
  endIndex: number
  totalItems: number
  itemsPerPage?: number
  onItemsPerPageChange?: (itemsPerPage: number) => void
  showItemsPerPage?: boolean
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  canGoNext,
  canGoPrevious,
  startIndex,
  endIndex,
  totalItems,
  itemsPerPage = 10,
  onItemsPerPageChange,
  showItemsPerPage = true,
}: PaginationControlsProps) {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      if (currentPage > 3) {
        pages.push('ellipsis')
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (totalPages <= 1) {
    return (
      <div className="flex flex-col space-y-3 px-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="text-sm text-muted-foreground">
          <span className="hidden md:inline">
            Showing {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
          <span className="md:hidden">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        </div>
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center justify-center space-x-2 md:justify-start">
            <span className="text-sm text-muted-foreground hidden md:inline">Items per page:</span>
            <span className="text-sm text-muted-foreground md:hidden">Per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(parseInt(value))}>
              <SelectTrigger className="w-16 md:w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3 px-2 md:flex-row md:items-center md:justify-between md:space-y-0">
      {/* Mobile: Compact info */}
      <div className="text-sm text-muted-foreground md:block">
        <span className="hidden md:inline">
          Showing {startIndex + 1} to {endIndex} of {totalItems} items
        </span>
        <span className="md:hidden">
          {startIndex + 1}-{endIndex} of {totalItems}
        </span>
      </div>
      
      <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-x-6 md:space-y-0">
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center justify-center space-x-2 md:justify-start">
            <span className="text-sm text-muted-foreground hidden md:inline">Items per page:</span>
            <span className="text-sm text-muted-foreground md:hidden">Per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(parseInt(value))}>
              <SelectTrigger className="w-16 md:w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        <Pagination>
          <PaginationContent className="gap-1 md:gap-1">
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => canGoPrevious && onPageChange(currentPage - 1)}
                className={!canGoPrevious ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {/* Show fewer page numbers on mobile */}
            {getPageNumbers().map((page, index) => (
              <PaginationItem key={index} className="hidden sm:block">
                {page === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => onPageChange(page as number)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            {/* Mobile: Show current page info */}
            <PaginationItem className="sm:hidden">
              <span className="flex h-9 w-auto min-w-[3rem] items-center justify-center px-2 text-sm">
                {currentPage}/{totalPages}
              </span>
            </PaginationItem>
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => canGoNext && onPageChange(currentPage + 1)}
                className={!canGoNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}