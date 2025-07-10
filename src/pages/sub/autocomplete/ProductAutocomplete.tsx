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
    <div className={cn("flex flex-col w-full space-y-2", className)}>
      <div className="flex w-full space-x-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <div className="flex-1 flex items-center">
                <div className="flex-1 flex items-center">
                  <div
                    className={`w-full bg-transparent border-none outline-none text-left truncate`}
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {value && value.id && (value.title || value.name)
                      ? `${value.title || value.name}`
                      : placeholder || "เลือกสินค้าหรือบริการ"}
                  </div>
                </div>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="ค้นหาสินค้า..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {searchQuery ? (
                    <div className="py-6 text-center text-sm">
                      ไม่พบสินค้าที่ค้นหา
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm">
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
                    className="text-blue-600 cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    สร้าง "{searchQuery}" ใหม่
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
                      className="flex items-start justify-between w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <span
                          className="text-gray-900 dark:text-white font-medium truncate"
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {product.title || product.name}
                        </span>
                        {(product.description || product.property_info) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mt-1">
                            {product.description && (
                              <div className="truncate">
                                <span className="font-medium">Desc:</span>{" "}
                                {product.description}
                              </div>
                            )}
                            {product.property_info && (
                              <div className="truncate">
                                <span className="font-medium">Info:</span>{" "}
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
                          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {product.sku
                              ? `SKU: ${product.sku}`
                              : `ID: ${product.id}`}
                          </span>
                        )}
                      </div>
                      <div className="ml-3 flex-shrink-0 self-start">
                        <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          ฿{product.price?.toLocaleString() || "0"}/ชิ้น
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                  {hasMore && (
                    <div className="flex justify-center p-2">
                      <Button
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
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
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* กรอบแสดง desc:info */}
      {value &&
        value.id &&
        (value.title || value.name) &&
        (value.description || value.property_info) && (
          <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-900">
            <div className="text-sm space-y-1">
              {value.description && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Desc:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {value.description}
                  </span>
                </div>
              )}
              {value.property_info && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Info:
                  </span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {value.property_info}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

ProductAutocomplete.displayName = "ProductAutocomplete";

export default ProductAutocomplete;
