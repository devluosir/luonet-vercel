import { useState } from 'react';
import { Contact, CustomerFormData, Customer, Supplier, Consignee } from '../types';

const EMPTY_FORM_DATA: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  company: '',
  companyShortName: '',
  contact1ShortName: '',
  contacts: [],
};

function hasLegacyContact2(customer: Partial<Customer>): boolean {
  return Boolean(
    customer.contact2Name ||
      customer.contact2ShortName ||
      customer.contact2Phone ||
      customer.contact2Email
  );
}

function migrateContacts(item: Customer | Supplier | Consignee): Contact[] {
  const customerFields = item as Partial<Customer>;
  if (Array.isArray(customerFields.contacts)) {
    return customerFields.contacts;
  }
  if (!hasLegacyContact2(customerFields)) {
    return [];
  }
  return [{
    id: `legacy-contact2-${item.id}`,
    name: customerFields.contact2Name ?? '',
    shortName: customerFields.contact2ShortName ?? '',
    phone: customerFields.contact2Phone ?? '',
    email: customerFields.contact2Email ?? '',
  }];
}

export function useCustomerForm() {
  const [formData, setFormData] = useState<CustomerFormData>(EMPTY_FORM_DATA);

  // 重置表单
  const resetForm = () => {
    setFormData(EMPTY_FORM_DATA);
  };

  // 设置表单数据（用于编辑）
  const setFormDataForEdit = (item: Customer | Supplier | Consignee) => {
    const customerFields = item as Partial<Customer>;
    setFormData({
      name: item.name.split('\n')[0],
      email: item.email,
      phone: item.phone,
      address: item.address,
      company: item.company,
      companyShortName: customerFields.companyShortName ?? '',
      contact1ShortName: customerFields.contact1ShortName ?? '',
      contacts: migrateContacts(item),
    });
  };

  // 处理输入变化
  const handleInputChange = (
    field: keyof CustomerFormData,
    value: CustomerFormData[keyof CustomerFormData]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 验证表单
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      alert('请输入名称');
      return false;
    }
    return true;
  };

  return {
    formData,
    resetForm,
    setFormDataForEdit,
    handleInputChange,
    validateForm
  };
}
