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
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  setMonth,
  setYear,
  getYear,
  getMonth,
  lastDayOfMonth,
} from "date-fns";

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

  // เพิ่ม state สำหรับ Month Range Picker
  const [isMonthRangeOpen, setIsMonthRangeOpen] = useState(false);
  // State สำหรับ Month Range Picker ข้ามปี
  const [monthRangeStart, setMonthRangeStart] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const [monthRangeEnd, setMonthRangeEnd] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const [monthRangeYear, setMonthRangeYear] = useState(
    new Date().getFullYear()
  );

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

  const handleQuickRange = (type: string) => {
    const today = new Date();
    if (type === "thisMonth") {
      setTempDateFrom(startOfMonth(today));
      setTempDateTo(endOfMonth(today));
    } else if (type === "lastMonth") {
      const lastMonth = subMonths(today, 1);
      setTempDateFrom(startOfMonth(lastMonth));
      setTempDateTo(endOfMonth(lastMonth));
    } else if (type === "thisYear") {
      setTempDateFrom(startOfYear(today));
      setTempDateTo(endOfYear(today));
    } else if (type === "lastYear") {
      const lastYear = subYears(today, 1);
      setTempDateFrom(startOfYear(lastYear));
      setTempDateTo(endOfYear(lastYear));
    }
  };

  // ปรับปีเริ่มต้นของ Month Range Picker
  const handleOpenMonthRange = () => {
    let baseYear = new Date().getFullYear();
    if (tempDateFrom) {
      baseYear = tempDateFrom.getFullYear();
    } else if (monthRangeStart) {
      baseYear = monthRangeStart.year;
    }
    setIsMonthRangeOpen(true);
    setMonthRangeYear(baseYear);
    setMonthRangeStart(null);
    setMonthRangeEnd(null);
  };

  const isMonthInRange = (year: number, month: number) => {
    if (!monthRangeStart || !monthRangeEnd) return false;
    const start = monthRangeStart.year * 12 + monthRangeStart.month;
    const end = monthRangeEnd.year * 12 + monthRangeEnd.month;
    const current = year * 12 + month;
    return current >= start && current <= end;
  };

  const handleSelectMonth = (monthIdx: number) => {
    if (
      !monthRangeStart ||
      (monthRangeEnd &&
        (monthRangeYear < monthRangeStart.year ||
          (monthRangeYear === monthRangeStart.year &&
            monthIdx < monthRangeStart.month)))
    ) {
      setMonthRangeStart({ year: monthRangeYear, month: monthIdx });
      setMonthRangeEnd(null);
    } else if (
      monthRangeStart &&
      !monthRangeEnd &&
      (monthRangeYear > monthRangeStart.year ||
        (monthRangeYear === monthRangeStart.year &&
          monthIdx >= monthRangeStart.month))
    ) {
      setMonthRangeEnd({ year: monthRangeYear, month: monthIdx });
      // set date range
      const from = startOfMonth(
        setMonth(
          setYear(new Date(), monthRangeStart.year),
          monthRangeStart.month
        )
      );
      const to = endOfMonth(
        setMonth(setYear(new Date(), monthRangeYear), monthIdx)
      );
      setTempDateFrom(from);
      setTempDateTo(to);
      setIsMonthRangeOpen(false);
    } else {
      setMonthRangeStart({ year: monthRangeYear, month: monthIdx });
      setMonthRangeEnd(null);
    }
  };

  const handleApplyMonthRange = () => {
    if (monthRangeStart !== null && monthRangeEnd !== null) {
      const from = startOfMonth(
        setMonth(setYear(new Date(), monthRangeYear), monthRangeStart)
      );
      const to = endOfMonth(
        setMonth(setYear(new Date(), monthRangeYear), monthRangeEnd)
      );
      setTempDateFrom(from);
      setTempDateTo(to);
      setIsMonthRangeOpen(false);
    }
  };

  const handleCancelMonthRange = () => {
    setIsMonthRangeOpen(false);
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
        <div className="flex gap-2 flex-wrap mb-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleQuickRange("thisMonth")}
          >
            เดือนนี้
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleQuickRange("lastMonth")}
          >
            เดือนที่แล้ว
          </Button>
          <Button size="sm" variant="ghost" onClick={handleOpenMonthRange}>
            เลือกช่วงเดือน
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleQuickRange("thisYear")}
          >
            ปีนี้
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleQuickRange("lastYear")}
          >
            ปีที่แล้ว
          </Button>
        </div>
        {/* Month Range Picker Popup */}
        {isMonthRangeOpen && (
          <div
            className="absolute z-50 bg-white border rounded-lg shadow-lg p-4 mt-2"
            style={{ minWidth: 260 }}
          >
            <div className="flex items-center justify-between mb-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setMonthRangeYear((y) => y - 1)}
              >
                &lt;
              </Button>
              <span className="font-semibold">{monthRangeYear}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setMonthRangeYear((y) => y + 1)}
              >
                &gt;
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                "ม.ค.",
                "ก.พ.",
                "มี.ค.",
                "เม.ย.",
                "พ.ค.",
                "มิ.ย.",
                "ก.ค.",
                "ส.ค.",
                "ก.ย.",
                "ต.ค.",
                "พ.ย.",
                "ธ.ค.",
              ].map((m, idx) => {
                const isSelected =
                  (monthRangeStart &&
                    !monthRangeEnd &&
                    monthRangeYear === monthRangeStart.year &&
                    idx === monthRangeStart.month) ||
                  (monthRangeStart &&
                    monthRangeEnd &&
                    isMonthInRange(monthRangeYear, idx));
                return (
                  <Button
                    key={m}
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    className={isSelected ? "font-bold" : ""}
                    onClick={() => handleSelectMonth(idx)}
                  >
                    {m}
                  </Button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelMonthRange}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        )}
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
                  month={tempDateFrom || undefined}
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
                  month={tempDateTo || undefined}
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
