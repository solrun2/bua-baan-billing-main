import { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import { apiService } from '@/pages/services/apiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomerAutocompleteProps {
  onCustomerSelect: (customer: Customer) => void;
  initialData?: Partial<Customer>;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({ onCustomerSelect, initialData }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(
    initialData?.id?.toString()
  );

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await apiService.getCustomers();
        console.log('Fetched customers in frontend:', data); // Debugging line
        setCustomers(data);
      } catch (error) {
        console.error('Failed to fetch customers', error);
      }
    };
    fetchCustomers();
  }, []);



  const handleSelect = (value: string) => {
    const customerId = parseInt(value, 10);
    const selectedCustomer = customers.find(c => c.id === customerId);
    if (selectedCustomer) {
      setSelectedValue(value);
      onCustomerSelect(selectedCustomer);
    }
  };

  return (
    <Select onValueChange={handleSelect} value={selectedValue}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="เลือกลูกค้า" />
      </SelectTrigger>
      <SelectContent>
        {customers.map((customer) => (
          <SelectItem key={customer.id} value={customer.id.toString()}>
            {customer.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
