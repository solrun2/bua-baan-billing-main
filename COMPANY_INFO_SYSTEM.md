# ระบบข้อมูลบริษัท (Company Information System)

## ภาพรวม

ระบบข้อมูลบริษัทถูกออกแบบมาเพื่อเก็บและจัดการข้อมูลบริษัทที่ใช้แสดงในเอกสารต่างๆ เช่น ใบเสนอราคา ใบแจ้งหนี้ และใบเสร็จรับเงิน

## คุณสมบัติ

### 1. การจัดการข้อมูลบริษัท

- **ข้อมูลทั่วไป**: ชื่อบริษัท (ไทย/อังกฤษ), เลขประจำตัวผู้เสียภาษี, ประเภทธุรกิจ
- **ข้อมูลติดต่อ**: ที่อยู่, เบอร์โทรศัพท์, อีเมล, เว็บไซต์
- **ข้อมูลธนาคาร**: ชื่อธนาคาร, สาขา, เลขที่บัญชี, ชื่อบัญชี
- **ไฟล์แนบ**: โลโก้บริษัท, ลายเซ็นดิจิทัล

### 2. การแสดงผลในเอกสาร

- **Modal**: แสดงข้อมูลบริษัทในส่วนหัวของเอกสาร
- **การปริ้น**: รวมข้อมูลบริษัทในเอกสารที่พิมพ์
- **โลโก้**: แสดงโลโก้บริษัทในเอกสาร

## โครงสร้างฐานข้อมูล

### ตาราง `company_info`

```sql
CREATE TABLE `company_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name_th` varchar(255) NOT NULL,
  `company_name_en` varchar(255) DEFAULT NULL,
  `tax_id` varchar(20) DEFAULT NULL,
  `business_type` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `bank_branch` varchar(255) DEFAULT NULL,
  `bank_account_number` varchar(50) DEFAULT NULL,
  `bank_account_name` varchar(255) DEFAULT NULL,
  `digital_signature` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
);
```

## API Endpoints

### 1. GET `/api/company-info`

- **วัตถุประสงค์**: ดึงข้อมูลบริษัท
- **Response**: ข้อมูลบริษัทหรือ `null` ถ้าไม่มีข้อมูล

### 2. POST `/api/company-info`

- **วัตถุประสงค์**: สร้างข้อมูลบริษัทใหม่
- **Body**: ข้อมูลบริษัท
- **Response**: `{ success: true, id: number }`

### 3. PUT `/api/company-info/:id`

- **วัตถุประสงค์**: อัปเดตข้อมูลบริษัท
- **Body**: ข้อมูลบริษัทที่อัปเดต
- **Response**: `{ success: true }`

## การใช้งาน

### 1. การตั้งค่าข้อมูลบริษัท

1. ไปที่หน้า **Settings > Company Info**
2. คลิกปุ่ม **"แก้ไขข้อมูล"**
3. กรอกข้อมูลบริษัท
4. คลิกปุ่ม **"บันทึก"**

### 2. การแสดงผลในเอกสาร

- ข้อมูลบริษัทจะแสดงอัตโนมัติในส่วนหัวของเอกสาร
- โลโก้บริษัทจะแสดงในเอกสารถ้ามีการอัปโหลด
- ข้อมูลจะใช้ในการปริ้นเอกสาร

## ไฟล์ที่เกี่ยวข้อง

### Backend

- `backend/schema.sql` - โครงสร้างฐานข้อมูล
- `backend/server.ts` - API endpoints
- `backend/add_company_info_table.sql` - สคริปต์เพิ่มตาราง

### Frontend

- `src/pages/settings/CompanyInfo.tsx` - หน้าจัดการข้อมูลบริษัท
- `src/services/companyInfoService.ts` - Service สำหรับจัดการข้อมูลบริษัท
- `src/pages/sub/DocumentModal.tsx` - Modal แสดงเอกสาร

## การติดตั้ง

### 1. เพิ่มตารางในฐานข้อมูล

```bash
# รันสคริปต์ SQL
mysql -u username -p database_name < backend/add_company_info_table.sql
```

### 2. รีสตาร์ทเซิร์ฟเวอร์

```bash
cd backend
npm run dev
```

## การทดสอบ

### 1. ทดสอบการบันทึกข้อมูล

1. เปิดหน้า Company Info
2. แก้ไขข้อมูลบริษัท
3. บันทึกข้อมูล
4. ตรวจสอบว่าข้อมูลถูกบันทึก

### 2. ทดสอบการแสดงผลในเอกสาร

1. เปิดเอกสารใดๆ (ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จ)
2. ตรวจสอบว่าข้อมูลบริษัทแสดงในส่วนหัว
3. ทดสอบการปริ้นเอกสาร

## หมายเหตุ

- ระบบจะใช้ข้อมูลบริษัทล่าสุดที่บันทึก
- โลโก้และลายเซ็นจะแสดงในเอกสารถ้ามีการอัปโหลด
- ข้อมูลบริษัทจะถูกใช้ในทุกเอกสารในระบบ
