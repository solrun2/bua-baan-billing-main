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
import { apiService } from "@/pages/services/apiService";
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
  // Log when value changes
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("ProductAutocomplete value changed:", value);
    }
  }, [value]);

  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);

  // Load products on mount and when search query changes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const products = await apiService.getProducts(searchQuery);
        console.log("Fetched products:", products);
        setProducts(products);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("ไม่สามารถโหลดรายการสินค้าได้");
        setProducts([]);
      } finally {
        setInitialLoad(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, open]);

  useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <div className={cn("flex w-full space-x-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex-1 flex items-center">
              {initialLoad ? (
                <span className="text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  กำลังโหลด...
                </span>
              ) : (
                <div className="flex-1 flex items-center">
                  <div
                    className={`w-full bg-transparent border-none outline-none text-left ${
                      !value ? "text-muted-foreground" : ""
                    }`}
                  >
                    {value && value.id && value.title
                      ? `${value.title}`
                      : placeholder || "เลือกสินค้าหรือบริการ"}
                  </div>
                </div>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
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
                    className="flex items-center justify-between w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-white">
                        {product.title}
                      </span>
                      {(product.sku ||
                        products.some(
                          (p) =>
                            p.title === product.title && p.id !== product.id
                        )) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {product.sku
                            ? `SKU: ${product.sku}`
                            : `ID: ${product.id}`}
                        </span>
                      )}
                    </div>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      ฿{product.price?.toLocaleString() || "0"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {onAddNew && (
        <Button type="button" variant="outline" size="icon" onClick={onAddNew}>
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

ProductAutocomplete.displayName = "ProductAutocomplete";

export default ProductAutocomplete;
