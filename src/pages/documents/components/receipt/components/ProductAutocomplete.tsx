import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import debounce from "lodash/debounce";
import { getToken } from "@/pages/services/auth";

interface ProductAutocompleteProps {
  value: string;
  onChange: (name: string, price: number) => void;
}

export default function ProductAutocomplete({ value, onChange }: ProductAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchAllProducts = useCallback(async (search = "") => {
    try {
      setIsSearching(true);
      const token = await getToken();
      const response = await fetch("https://openapi.ketshoptest.com/product/list_all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          search,
          page: 1,
          limit: 20,
        }),
      });
      const data = await response.json();
      setResults(data.data || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((q: string) => {
      fetchAllProducts(q);
    }, 400),
    [fetchAllProducts]
  );

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={e => {
          setQuery(e.target.value);
          debouncedSearch(e.target.value);
          onChange(e.target.value, 0); // reset price if typing
        }}
        onFocus={() => {
          setIsDropdownOpen(true);
          if (!query) debouncedSearch("");
        }}
        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
        placeholder="เลือกสินค้า/บริการ (ชื่อ, SKU)"
      />
      {isSearching && (
        <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin" />
      )}
      {isDropdownOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-auto">
          <div
            className="p-2 bg-teal-100 hover:bg-teal-200 cursor-pointer font-medium border-b"
            onMouseDown={() => {
              alert("เพิ่มสินค้าใหม่");
            }}
          >
            + เพิ่มสินค้าใหม่
          </div>
          {results.length === 0 && (
            <div className="p-2 text-gray-400 text-center">ไม่พบสินค้า</div>
          )}
          {results.map(product => (
            <div
              key={product.id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => {
                onChange(product.title, product.price);
                setQuery(product.title);
                setIsDropdownOpen(false);
              }}
            >
              <div className="font-medium">{product.title}</div>
              <div className="text-xs text-gray-500 flex gap-2">
                <span>{product.sku}</span>
                <span>{product.price} บาท</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
