import { useEffect, useState, memo } from "react";
import type { Product } from "@/types/product";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchAllProducts,
  searchProducts,
} from "@/pages/services/productService";
import { toast } from "sonner";

interface ProductAutocompleteProps {
  value?: Partial<Product> | null;
  onChange: (product: Product | null) => void;
  placeholder?: string;
  className?: string;
  onAddNew?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

// Add displayName for better debugging
const ProductAutocomplete = ({
  value,
  onChange,
  placeholder = "เลือกสินค้าหรือบริการ",
  className,
  onAddNew,
}: ProductAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 10; // ปรับจำนวนต่อ page ตามต้องการ

  // Reset products and page when searchQuery or open changes
  useEffect(() => {
    if (!open) return;
    setProducts([]);
    setPage(1);
    setHasMore(true);
  }, [searchQuery, open]);

  useEffect(() => {
    if (!open) return;
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const result = await searchProducts(searchQuery, page, limit);
        setProducts((prev) => (page === 1 ? result : [...prev, ...result]));
        setHasMore(result.length === limit);
      } catch (error) {
        setProducts([]);
        setHasMore(false);
      } finally {
        setInitialLoad(false);
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [page, searchQuery, open]);

  const handleLoadMore = () => {
    if (hasMore && !isLoading) setPage((p) => p + 1);
  };

  return (
    <div className={cn("flex flex-col w-full space-y-4", className)}>
      <div className="flex w-full space-x-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-14 text-base border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <div className="flex-1 flex items-center min-w-0">
                <div className="flex-1 flex items-center min-w-0">
                  <div
                    className="w-full bg-transparent border-none outline-none text-left block min-w-0"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={
                      value && value.id && (value.title || value.name)
                        ? `${value.title || value.name}`
                        : placeholder || "เลือกสินค้าหรือบริการ"
                    }
                  >
                    {value && value.id && (value.title || value.name)
                      ? `${value.title || value.name}`
                      : placeholder || "เลือกสินค้าหรือบริการ"}
                  </div>
                </div>
              </div>
              <ChevronsUpDown className="ml-4 h-5 w-5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="ค้นหาสินค้า..."
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-14 text-base px-6"
              />
              <CommandList className="max-h-[450px]">
                <CommandEmpty>
                  {searchQuery ? (
                    <div className="py-12 text-center text-sm text-gray-500">
                      ไม่พบสินค้าที่ค้นหา
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-gray-500">
                      เริ่มพิมพ์เพื่อค้นหาสินค้า
                    </div>
                  )}
                </CommandEmpty>
                {onAddNew && searchQuery && (
                  <CommandItem
                    value="create-new"
                    onSelect={() => {
                      if (onAddNew) {
                        setOpen(false);
                        onAddNew();
                      }
                    }}
                    className="text-blue-600 cursor-pointer px-8 py-6 border-b border-gray-100 hover:bg-blue-50"
                  >
                    <Plus className="mr-4 h-5 w-5" />
                    <span className="text-base">
                      สร้าง "{searchQuery}" ใหม่
                    </span>
                  </CommandItem>
                )}
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={`${product.title}_${product.id}`}
                      onSelect={() => {
                        onChange(product);
                        setOpen(false);
                      }}
                      className="flex items-start justify-between w-full px-8 py-6 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex flex-col flex-1 min-w-0 mr-6">
                        <span
                          className="text-gray-900 dark:text-white font-medium block text-base"
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "320px",
                          }}
                          title={product.title || product.name}
                        >
                          {product.title || product.name}
                        </span>
                        {(product.description || product.property_info) && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 mt-3">
                            {product.description && (
                              <div
                                className="truncate"
                                style={{
                                  maxWidth: "320px",
                                }}
                                title={product.description}
                              >
                                <span className="font-medium text-gray-700">
                                  รายละเอียด:
                                </span>{" "}
                                {product.description}
                              </div>
                            )}
                            {product.property_info && (
                              <div
                                className="truncate"
                                style={{
                                  maxWidth: "320px",
                                }}
                                title={product.property_info}
                              >
                                <span className="font-medium text-gray-700">
                                  ข้อมูล:
                                </span>{" "}
                                {product.property_info}
                              </div>
                            )}
                          </div>
                        )}
                        {(product.sku ||
                          products.some(
                            (p) =>
                              (p.title || p.name) ===
                                (product.title || product.name) &&
                              p.id !== product.id
                          )) && (
                          <span
                            className="text-sm text-gray-500 dark:text-gray-500 mt-3 truncate block"
                            style={{ maxWidth: "320px" }}
                          >
                            {product.sku
                              ? `SKU: ${product.sku}`
                              : `ID: ${product.id}`}
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 self-start">
                        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap border border-blue-200 dark:border-blue-800">
                          ฿{product.price?.toLocaleString() || "0"}/ชิ้น
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                  {hasMore && (
                    <div className="flex justify-center p-6 border-t border-gray-100">
                      <Button
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="px-8 py-3"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        ) : null}
                        โหลดเพิ่ม
                      </Button>
                    </div>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {onAddNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddNew}
            className="h-14 w-14"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* กรอบแสดง desc:info - ซ่อนไว้ */}
      {/* {value &&
        value.id &&
        (value.title || value.name) &&
        (value.description || value.property_info) && (
          <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-gray-50 to-slate-50">
            <div className="text-sm space-y-4">
              {value.description && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[100px]">
                    รายละเอียด:
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-400 flex-1">
                    {value.description}
                  </span>
                </div>
              )}
              {value.property_info && (
                <div className="flex items-start">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[100px]">
                    ข้อมูล:
                  </span>
                  <span className="ml-4 text-gray-600 dark:text-gray-400 flex-1">
                    {value.property_info}
                  </span>
                </div>
              )}
            </div>
          </div>
        )} */}
    </div>
  );
};

ProductAutocomplete.displayName = "ProductAutocomplete";

export default ProductAutocomplete;
