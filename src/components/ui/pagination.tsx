import { Button } from "./button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // แสดงทุกหน้า
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // แสดงหน้าแบบฉลาด
      if (page <= 3) {
        // หน้าแรก
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        // หน้าสุดท้าย
        pages.push(1);
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // หน้ากลาง
        pages.push(1);
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        ก่อนหน้า
      </Button>
      
      {visiblePages.map((pageNum, index) => {
        const isCurrentPage = pageNum === page;
        const isEllipsis = index > 0 && pageNum - visiblePages[index - 1] > 1;
        
        return (
          <div key={pageNum} className="flex items-center gap-1">
            {isEllipsis && (
              <span className="px-2 text-muted-foreground">...</span>
            )}
            <Button
              variant={isCurrentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[40px] ${isCurrentPage ? "font-bold" : ""}`}
            >
              {pageNum}
            </Button>
          </div>
        );
      })}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex items-center gap-1"
      >
        ถัดไป
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
