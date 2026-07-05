import { useState } from 'react';
import { Contact, CustomerFormData, Customer, Supplier, Consignee, TabType } from '../types';
import { useToast } from '@/components/ui/Toast';

function createEmptyFormData(): CustomerFormData {
  return {
    name: '',
    shortName: '',
    code: '',
    address: '',
    contacts: [{ id: `primary-contact-${Date.now()}`, name: '', isPrimary: true }],
    category: 'New',
    categoryNote: '',
  };
}

function normalizeContacts(contacts: Contact[]): Contact[] {
  if (contacts.length === 0) {
    return [{ id: 'primary-contact-draft', name: '', isPrimary: true }];
  }
  const primaryIndex = contacts.findIndex((contact) => contact.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
  return contacts.map((contact, index) => ({
    ...contact,
    isPrimary: index === resolvedPrimaryIndex,
  }));
}

export function useCustomerForm() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<CustomerFormData>(createEmptyFormData);

  // 重置表单
  const resetForm = () => {
    setFormData(createEmptyFormData());
  };

  // 设置表单数据（用于编辑）
  const setFormDataForEdit = (item: Customer | Supplier | Consignee) => {
    setFormData({
      name: item.name,
      shortName: item.shortName ?? '',
      code: item.code ?? '',
      address: item.address,
      contacts: normalizeContacts(item.contacts),
      category: item.category,
      categoryNote: item.categoryNote ?? '',
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
  const validateForm = (entityType: TabType = 'customers'): boolean => {
    if (!formData.name.trim()) {
      showToast('请输入名称', 'warning');
      return false;
    }
    if (entityType === 'customers' && !formData.contacts.some((contact) => contact.name.trim())) {
      showToast('请至少填写一个联络人', 'warning');
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
