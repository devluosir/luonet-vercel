import { useState } from 'react';
import { CustomerFormData, Customer, Supplier, Consignee } from '../types';

export function useCustomerForm() {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  });

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: ''
    });
  };

  // 设置表单数据（用于编辑）
  const setFormDataForEdit = (item: Customer | Supplier | Consignee) => {
    setFormData({
      name: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      company: item.company
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
