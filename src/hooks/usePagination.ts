import { useState, useCallback, useEffect } from "react";
import { apiService } from "@/pages/services/apiService";
import { DOCUMENT_PAGE_SIZE } from "@/constants/documentPageSize";

interface PaginationParams {
  page?: number;
  limit?: number;
  document_type?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UsePaginationReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
  setPage: (page: number) => void;
  refresh: () => void;
}

export function usePagination<T>(
  documentType: string,
  filters: {
    status?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  },
  searchText: string,
  pageSize: number = DOCUMENT_PAGE_SIZE
): UsePaginationReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: PaginationParams = {
        page,
        limit: pageSize,
        document_type: documentType,
      };

      // Add filters
      if (filters.status && filters.status !== "all") {
        params.status = filters.status;
      }

      // Add date filters
      if (filters.dateFrom) {
        params.dateFrom = filters.dateFrom;
      }

      if (filters.dateTo) {
        params.dateTo = filters.dateTo;
      }

      if (searchText) {
        params.search = searchText;
      }

      const response = await apiService.getDocuments(params);

      setData(response.documents);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [page, filters, searchText, pageSize, documentType]);

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [filters, searchText]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    setPage,
    refresh,
  };
}
