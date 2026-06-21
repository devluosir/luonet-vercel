import { useState } from 'react';
import { CustomerFormData, Customer, Supplier, Consignee } from '../types';

const EMPTY_FORM_DATA: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  company: '',
  companyShortName: '',
  contact1ShortName: '',
  contact2Name: '',
  contact2ShortName: '',
  contact2Phone: '',
  contact2Email: '',
};

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
      name: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      company: item.company,
      companyShortName: customerFields.companyShortName ?? '',
      contact1ShortName: customerFields.contact1ShortName ?? '',
      contact2Name: customerFields.contact2Name ?? '',
      contact2ShortName: customerFields.contact2ShortName ?? '',
      contact2Phone: customerFields.contact2Phone ?? '',
      contact2Email: customerFields.contact2Email ?? '',
    });
  };

  // 处理输入变化
  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
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
