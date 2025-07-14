import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";

// --- Interfaces ---
interface FilterProps {
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

interface DocumentFilterProps {
  onFilterChange: (filters: FilterProps) => void;
  initialFilters: FilterProps;
  statusOptions?: { value: string; label: string }[];
}

const DocumentFilter: React.FC<DocumentFilterProps> = ({
  onFilterChange,
  initialFilters,
  statusOptions = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState(initialFilters?.status || "all");
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);

  // ✨ State ควบคุมการเปิด-ปิดของแต่ละ Popover Calendar
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempStatus(initialFilters.status || "all");
      setTempDateFrom(
        initialFilters.dateFrom
          ? new Date(initialFilters.dateFrom + "T12:00:00Z")
          : null
      );
      setTempDateTo(
        initialFilters.dateTo
          ? new Date(initialFilters.dateTo + "T12:00:00Z")
          : null
      );
    }
  }, [isOpen, initialFilters]);

  const handleApply = () => {
    onFilterChange({
      status: tempStatus,
      dateFrom: tempDateFrom ? format(tempDateFrom, "yyyy-MM-dd") : null,
      dateTo: tempDateTo ? format(tempDateTo, "yyyy-MM-dd") : null,
    });
    setIsOpen(false);
  };

  const handleClearInPopover = () => {
    setTempStatus("all");
    setTempDateFrom(null);
    setTempDateTo(null);
  };

  const hasActiveFilters =
    initialFilters.status !== "all" ||
    initialFilters.dateFrom ||
    initialFilters.dateTo;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          className="w-full md:w-auto"
        >
          <Filter className="mr-2 h-4 w-4" />
          ตัวกรอง{" "}
          {hasActiveFilters && (
            <span className="ml-2 h-2 w-2 rounded-full bg-white animate-pulse"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 space-y-4" align="end">
        <h4 className="font-medium leading-none">ตัวกรองเอกสาร</h4>
        <div className="grid gap-4">
          {statusOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">สถานะ</label>
              <Select value={tempStatus} onValueChange={setTempStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">วันที่เริ่มต้น</label>
            <Popover
              open={isFromCalendarOpen}
              onOpenChange={setIsFromCalendarOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !tempDateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {tempDateFrom ? (
                    format(tempDateFrom, "PPP", { locale: th })
                  ) : (
                    <span>เลือกวันที่</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  locale={th}
                  mode="single"
                  selected={tempDateFrom || undefined}
                  onSelect={(day) => {
                    setTempDateFrom(day || null);
                    setIsFromCalendarOpen(false); // ✨ ปิด Popover เมื่อเลือก
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">วันที่สิ้นสุด</label>
            <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !tempDateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {tempDateTo ? (
                    format(tempDateTo, "PPP", { locale: th })
                  ) : (
                    <span>เลือกวันที่</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  locale={th}
                  mode="single"
                  selected={tempDateTo || undefined}
                  onSelect={(day) => {
                    setTempDateTo(day || null);
                    setIsToCalendarOpen(false); // ✨ ปิด Popover เมื่อเลือก
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={handleClearInPopover}>
            ล้างค่า
          </Button>
          <Button onClick={handleApply}>ใช้ตัวกรอง</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DocumentFilter;
