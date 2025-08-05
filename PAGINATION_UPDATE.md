# การอัปเดตระบบ Pagination เป็น Server-side

## การเปลี่ยนแปลง

### 1. Backend API (`backend/server.ts`)

- เพิ่ม query parameters: `page`, `limit`, `document_type`, `status`, `search`
- ใช้ `LIMIT` และ `OFFSET` ใน SQL query
- คืนค่า pagination metadata พร้อมข้อมูล

### 2. Frontend API Service (`src/pages/services/apiService.ts`)

- อัปเดต `getDocuments()` ให้รับ parameters สำหรับ pagination
- เพิ่ม interfaces `PaginationParams` และ `PaginationResponse`

### 3. Custom Hook (`src/hooks/usePagination.ts`)

- สร้าง hook สำหรับจัดการ server-side pagination
- รองรับ filtering และ searching
- Auto-reset ไปหน้า 1 เมื่อเปลี่ยน filter หรือ search

### 4. Pagination Component (`src/components/ui/pagination.tsx`)

- สร้าง reusable pagination component
- แสดงหมายเลขหน้าแบบฉลาด (smart pagination)
- รองรับ ellipsis (...) สำหรับหน้าจำนวนมาก

### 5. หน้า Billing (`src/pages/documents/Billing.tsx`)

- ใช้ `usePagination` hook แทน client-side pagination
- ใช้ `Pagination` component แทน pagination แบบเดิม
- ลบ client-side filtering และ sorting (ย้ายไป backend)

## ประโยชน์

### 1. ประสิทธิภาพ

- โหลดเฉพาะข้อมูลที่จำเป็น (limit/offset)
- ลดการใช้ memory ใน browser
- เร็วขึ้นเมื่อมีข้อมูลจำนวนมาก

### 2. Scalability

- รองรับข้อมูลจำนวนมากได้
- ลด network traffic
- ลด server load

### 3. User Experience

- โหลดหน้าเร็วขึ้น
- ใช้ memory น้อยลง
- รองรับการ search และ filter ที่มีประสิทธิภาพ

## การใช้งาน

### 1. ใช้ usePagination Hook

```typescript
const { data, loading, error, page, totalPages, totalCount, setPage, refresh } =
  usePagination("BILLING", filters, searchText);
```

### 2. ใช้ Pagination Component

```typescript
<Pagination
  page={page}
  totalPages={totalPages}
  onPageChange={setPage}
  className="mt-4"
/>
```

## การนำไปใช้กับหน้าอื่นๆ

สามารถใช้ pattern เดียวกันกับหน้าอื่นๆ:

1. **Invoice**: เปลี่ยน `documentType` เป็น `"INVOICE"`
2. **Quotation**: เปลี่ยน `documentType` เป็น `"QUOTATION"`
3. **Receipt**: เปลี่ยน `documentType` เป็น `"RECEIPT"`
4. **PurchaseOrder**: เปลี่ยน `documentType` เป็น `"PURCHASE_ORDER"`
5. **CreditNote**: เปลี่ยน `documentType` เป็น `"CREDIT_NOTE"`
6. **TaxInvoice**: เปลี่ยน `documentType` เป็น `"TAX_INVOICE"`

## API Endpoint

```
GET /api/documents?page=1&limit=10&document_type=BILLING&status=all&search=keyword
```

### Response Format

```json
{
  "documents": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## การตั้งค่า

- จำนวนรายการต่อหน้า: `DOCUMENT_PAGE_SIZE = 7` (ใน `src/constants/documentPageSize.ts`)
- สามารถปรับเปลี่ยนได้ตามความเหมาะสม
