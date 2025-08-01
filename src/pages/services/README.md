# Services Layer

This directory contains service modules that handle API communication and business logic for different entities.

## Structure

- `apiService.ts` - General API operations (documents, uploads, etc.)
- `customerService.ts` - Customer-specific operations
- `productService.ts` - Product-specific operations
- `documentService.ts` - Document-specific operations
- `invoiceService.ts` - Invoice-specific operations
- `quotationService.ts` - Quotation-specific operations

## Customer Service

The `customerService.ts` module handles all customer-related operations with the Ketshop OpenAPI.

### Features

- **Smart Query Validation**: Only sends API requests for valid search patterns (id, phone, email, name)
- **Error Handling**: Gracefully handles "Customer not found" responses as empty results
- **Type Safety**: Full TypeScript support with proper interfaces
- **Logging**: Comprehensive logging for debugging

### Usage

```typescript
import {
  searchCustomers,
  getCustomerById,
  getCustomerByPhone,
  getCustomerByEmail,
} from "./customerService";

// Search customers (automatically determines search type)
const customers = await searchCustomers("0812345678"); // Phone search
const customers = await searchCustomers("12345"); // ID search
const customers = await searchCustomers("user@example.com"); // Email search
const customers = await searchCustomers("John Doe"); // Name search

// Get specific customer
const customer = await getCustomerById("12345");
const customer = await getCustomerByPhone("0812345678");
const customer = await getCustomerByEmail("user@example.com");
```

### Search Types

The service supports four search types:

1. **ID Search**: Any numeric string (e.g., "12345")
2. **Phone Search**: 10-digit phone numbers (e.g., "0812345678")
3. **Email Search**: Strings containing "@" (e.g., "user@example.com")
4. **Name Search**: Any non-numeric string that doesn't contain "@" with minimum 1 character (e.g., "John Doe", "สมชาย")

**Note**: Name searches require at least 1 character to be considered valid.

### Error Handling

- Invalid queries return empty arrays (no API call made)
- "Customer not found" responses are treated as empty results
- Network errors throw descriptive error messages

### API Configuration

The service uses the Ketshop OpenAPI endpoint:

- Base URL: `https://openapi.ketshoptest.com`
- Endpoint: `/customer/search`
- Method: POST
- Authentication: Bearer token

### Response Mapping

The service automatically maps API responses to the local `Customer` interface:

```typescript
// API Response
{
  _id: "12345",
  name: "John",
  lastname: "Doe",
  tel: "0812345678",
  email: "john@example.com",
  address: "123 Main St"
}

// Mapped to Customer
{
  id: 12345,
  name: "John",
  lastname: "Doe",
  phone: "0812345678",
  email: "john@example.com",
  address: "123 Main St",
  tax_id: "",
  tel: "0812345678"
}
```
