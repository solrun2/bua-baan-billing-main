import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface StatusOption {
  value: string;
  label: string;
}

interface DocumentFilterProps {
  onFilterChange: (filters: {
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
  }) => void;
  initialFilters?: { dateFrom?: Date; dateTo?: Date; status?: string };
  statusOptions?: StatusOption[];
}

const DEFAULT_STATUS_OPTIONS = [{ value: "all", label: "ทั้งหมด" }];

export const DocumentFilter: React.FC<DocumentFilterProps> = ({
  onFilterChange,
  initialFilters,
  statusOptions,
}) => {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    initialFilters?.dateFrom
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    initialFilters?.dateTo
  );
  const [status, setStatus] = useState<string>(initialFilters?.status || "all");

  const options =
    statusOptions && statusOptions.length > 0
      ? statusOptions
      : DEFAULT_STATUS_OPTIONS;

  const handleApply = () => {
    console.log("[DocumentFilter] ใช้ filter:", { dateFrom, dateTo, status });
    onFilterChange({
      dateFrom,
      dateTo,
      status: status === "all" ? undefined : status,
    });
    setOpen(false);
  };

  const handleClear = () => {
    console.log("[DocumentFilter] ล้าง filter");
    setDateFrom(undefined);
    setDateTo(undefined);
    setStatus("all");
    onFilterChange({
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
    });
  };

  // Helper สำหรับแปลง Date เป็น yyyy-mm-dd
  const toDateInputValue = (date?: Date) =>
    date ? date.toISOString().slice(0, 10) : "";

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <span style={{ marginRight: 6 }}>
          {" "}
          {/* ไอคอนกรอง */}
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="#0B3A5B"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.382a1 1 0 0 1-.293.707l-6.414 6.414A1 1 0 0 0 13 14.414V19a1 1 0 0 1-1.447.894l-2-1A1 1 0 0 1 9 18v-3.586a1 1 0 0 0-.293-.707L2.293 7.09A1 1 0 0 1 2 6.382V4z" />
          </svg>
        </span>
        กรองข้อมูล
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          style={{ maxWidth: 480, width: "100%", overflowX: "auto" }}
        >
          <DialogHeader>
            <DialogTitle>กรองเอกสาร</DialogTitle>
            <DialogDescription>
              เลือกช่วงวันที่และสถานะที่ต้องการกรอง
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 180,
                  }}
                >
                  <label style={{ fontWeight: 500 }}>วันที่เริ่มต้น</label>
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <input
                      type="date"
                      value={toDateInputValue(dateFrom)}
                      onChange={(e) => {
                        const val = e.target.value
                          ? e.target.value.split("-")
                          : undefined;
                        if (val) {
                          // val = [yyyy, mm, dd]
                          const date = new Date(
                            Date.UTC(
                              Number(val[0]),
                              Number(val[1]) - 1,
                              Number(val[2])
                            )
                          );
                          console.log(
                            "[DocumentFilter] ตั้งค่าวันที่เริ่มต้น:",
                            date
                          );
                          setDateFrom(date);
                        } else {
                          setDateFrom(undefined);
                        }
                      }}
                      style={{
                        border: "1px solid #ffe600",
                        borderRadius: 8,
                        padding: 8,
                        width: 180,
                      }}
                    />
                    {dateFrom && (
                      <span
                        onClick={() => setDateFrom(undefined)}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          cursor: "pointer",
                          color: "#ff4d4f",
                          fontWeight: "bold",
                          fontSize: 18,
                          background: "#fff",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="ล้างวันที่"
                      >
                        ×
                      </span>
                    )}
                  </div>
                </div>
                <span>ถึง</span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 180,
                  }}
                >
                  <label style={{ fontWeight: 500 }}>วันที่สิ้นสุด</label>
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <input
                      type="date"
                      value={toDateInputValue(dateTo)}
                      onChange={(e) => {
                        const val = e.target.value
                          ? e.target.value.split("-")
                          : undefined;
                        if (val) {
                          // val = [yyyy, mm, dd]
                          const date = new Date(
                            Date.UTC(
                              Number(val[0]),
                              Number(val[1]) - 1,
                              Number(val[2])
                            )
                          );
                          console.log(
                            "[DocumentFilter] ตั้งค่าวันที่สิ้นสุด:",
                            date
                          );
                          setDateTo(date);
                        } else {
                          setDateTo(undefined);
                        }
                      }}
                      style={{
                        border: "1px solid #ffe600",
                        borderRadius: 8,
                        padding: 8,
                        width: 180,
                      }}
                      min={dateFrom ? toDateInputValue(dateFrom) : undefined}
                    />
                    {dateTo && (
                      <span
                        onClick={() => setDateTo(undefined)}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          cursor: "pointer",
                          color: "#ff4d4f",
                          fontWeight: "bold",
                          fontSize: 18,
                          background: "#fff",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="ล้างวันที่"
                      >
                        ×
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label style={{ fontWeight: 500 }}>สถานะ</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              style={{ borderColor: "#ff4d4f", color: "#ff4d4f" }}
              onClick={handleClear}
              type="button"
            >
              ล้างค่า
            </Button>
            <Button onClick={handleApply} type="button">
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentFilter;
