import { useEffect, useState } from "react";
import { Customer } from "@/types/customer";
import {
  searchCustomers,
  getAllCustomersInRange,
} from "@/pages/services/customerService";
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
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerAutocompleteProps {
  value?: Partial<Customer> | null;
  onCustomerSelect: (customer: Customer | null) => void;
  placeholder?: string;
  className?: string;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  value,
  onCustomerSelect,
  placeholder = "ค้นหาหรือเลือกลูกค้า",
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10; // ปรับจำนวนต่อ page ตามต้องการ

  useEffect(() => {
    if (!open) return;
    setCustomers([]);
    setPage(1);
    setHasMore(false); // Reset to false initially
  }, [searchQuery, open]);

  useEffect(() => {
    if (!open) return;
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const result = await searchCustomers(searchQuery, page, limit);

        // Deduplicate customers based on ID
        const newCustomers = page === 1 ? result : [...customers, ...result];
        const uniqueCustomers = newCustomers.filter(
          (customer, index, self) =>
            index === self.findIndex((c) => c.id === customer.id)
        );

        setCustomers(uniqueCustomers);

        // Only show "Load More" if we got full results AND there are new unique customers
        // Also check if we actually got new results (not just duplicates)
        const hasNewResults = result.length > 0;
        const hasFullResults = result.length === limit;
        const hasNewUniqueCustomers = uniqueCustomers.length > customers.length;

        const hasMoreData =
          hasFullResults && hasNewUniqueCustomers && hasNewResults;
        setHasMore(hasMoreData);
      } catch (error) {
        setCustomers([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, [page, searchQuery, open]);

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  };

  return (
    <div className={cn("flex w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex-1 flex items-center truncate">
              {value && value.id && value.name ? (
                value.name
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="ค้นหาลูกค้า..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="p-4 flex justify-center items-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm">
                    ไม่พบลูกค้าที่ค้นหา
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup
                key={`customer-list-${hasMore}-${customers.length}`}
              >
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.name}_${customer.id}`}
                    onSelect={() => {
                      onCustomerSelect(customer);
                      setOpen(false);
                    }}
                  >
                    {`${customer.name || ""}${customer.lastname ? " " + customer.lastname : ""}${customer.tel ? " (" + customer.tel + ")" : ""}`}
                  </CommandItem>
                ))}
                {hasMore && (
                  <div
                    className="flex justify-center p-2"
                    key={`load-more-${hasMore}`}
                  >
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
    </div>
  );
};
