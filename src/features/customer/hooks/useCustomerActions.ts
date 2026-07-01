import { Customer, Supplier, Consignee, CustomerFormData } from '../types';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { consigneeService } from '../services/consigneeService';

type ShowConfirm = (opts: {
  title: string;
  description: string;
  variant?: 'danger' | 'default';
}) => Promise<boolean>;

function normalizeContacts(customerData: CustomerFormData) {
  const contacts = customerData.contacts
    .map((contact) => ({
      ...contact,
      name: contact.name.trim(),
      shortName: contact.shortName?.trim() || undefined,
      email: contact.email?.trim() || undefined,
      phone: contact.phone?.trim() || undefined,
    }))
    .filter((contact) => contact.name);

  if (contacts.length === 0) return [];

  const primaryIndex = contacts.findIndex((contact) => contact.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
  return contacts.map((contact, index) => ({
    ...contact,
    isPrimary: index === resolvedPrimaryIndex,
  }));
}

export function useCustomerActions(showConfirm: ShowConfirm) {
  // 保存客户
  const saveCustomer = async (customerData: CustomerFormData, editingCustomer: Customer | null) => {
    try {
      const newCustomer: Customer = {
        id: editingCustomer ? editingCustomer.id : `customer_${Date.now()}`,
        type: 'customer',
        name: customerData.name.trim(),
        shortName: customerData.shortName?.trim() || undefined,
        code: customerData.code?.trim() || undefined,
        address: customerData.address,
        contacts: normalizeContacts(customerData),
        createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 检查是否会影响历史记录
      const editingCustomerName = editingCustomer?.name.split('\n')[0] ?? '';
      if (editingCustomer && editingCustomerName !== customerData.name) {
        const usageCount = customerService.checkCustomerUsage(editingCustomerName);
        
        if (usageCount > 0) {
          const confirmSave = await showConfirm({
            title: '确认修改客户名称',
            description:
              `注意：客户名称从 "${editingCustomerName}" 更改为 "${customerData.name}"\n\n` +
              `该客户在 ${usageCount} 个历史记录中被引用。\n` +
              `历史记录中的客户名称将保持不变，只有新创建的记录会使用新的客户信息。\n\n` +
              `是否继续保存？`,
          });
          
          if (!confirmSave) {
            return false;
          }
        }
      }

      await customerService.saveCustomer(newCustomer, !editingCustomer);
      return true;
    } catch (error) {
      console.error('保存客户失败:', error);
      return false;
    }
  };

  // 保存供应商
  const saveSupplier = async (supplierData: CustomerFormData, editingSupplier: Supplier | null) => {
    try {
      const newSupplier: Supplier = {
        id: editingSupplier ? editingSupplier.id : `supplier_${Date.now()}`,
        type: 'supplier',
        name: supplierData.name.trim(),
        shortName: supplierData.shortName?.trim() || undefined,
        code: supplierData.code?.trim() || undefined,
        address: supplierData.address,
        contacts: normalizeContacts(supplierData),
        createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 检查是否会影响历史记录
      if (editingSupplier && editingSupplier.name !== supplierData.name) {
        const usageCount = supplierService.checkSupplierUsage(editingSupplier.name);
        
        if (usageCount > 0) {
          const confirmSave = await showConfirm({
            title: '确认修改供应商名称',
            description:
              `注意：供应商名称从 "${editingSupplier.name}" 更改为 "${supplierData.name}"\n\n` +
              `该供应商在 ${usageCount} 个历史记录中被引用。\n` +
              `历史记录中的供应商名称将保持不变，只有新创建的记录会使用新的供应商信息。\n\n` +
              `是否继续保存？`,
          });
          
          if (!confirmSave) {
            return false;
          }
        }
      }

      await supplierService.saveSupplier(newSupplier, !editingSupplier);
      return true;
    } catch (error) {
      console.error('保存供应商失败:', error);
      return false;
    }
  };

  // 保存收货人
  const saveConsignee = async (consigneeData: CustomerFormData, editingConsignee: Consignee | null) => {
    try {
      const newConsignee: Consignee = {
        id: editingConsignee ? editingConsignee.id : `consignee_${Date.now()}`,
        type: 'consignee',
        name: consigneeData.name.trim(),
        shortName: consigneeData.shortName?.trim() || undefined,
        code: consigneeData.code?.trim() || undefined,
        address: consigneeData.address,
        contacts: normalizeContacts(consigneeData),
        createdAt: editingConsignee ? editingConsignee.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 检查是否会影响历史记录
      if (editingConsignee && editingConsignee.name !== consigneeData.name) {
        const usageCount = consigneeService.checkConsigneeUsage(editingConsignee.name);
        
        if (usageCount > 0) {
          const confirmSave = await showConfirm({
            title: '确认修改收货人名称',
            description:
              `注意：收货人名称从 "${editingConsignee.name}" 更改为 "${consigneeData.name}"\n\n` +
              `该收货人在 ${usageCount} 个历史记录中被引用。\n` +
              `历史记录中的收货人名称将保持不变，只有新创建的记录会使用新的收货人信息。\n\n` +
              `是否继续保存？`,
          });
          
          if (!confirmSave) {
            return false;
          }
        }
      }

      await consigneeService.saveConsignee(newConsignee, !editingConsignee);
      return true;
    } catch (error) {
      console.error('保存收货人失败:', error);
      return false;
    }
  };

  // 删除客户
  const deleteCustomer = async (customer: Customer) => {
    const usageCount = customerService.checkCustomerUsage(customer.name);
    
    if (usageCount > 0) {
      const confirmDelete = await showConfirm({
        title: '确认删除客户',
        description:
          `警告：该客户 "${customer.name}" 在 ${usageCount} 个历史记录中被引用。\n\n` +
          `删除客户信息将：\n` +
          `• 从客户管理列表中移除\n` +
          `• 不会影响历史记录中的客户信息\n` +
          `• 历史记录仍然可以正常查看\n\n` +
          `确定要删除这个客户吗？`,
        variant: 'danger',
      });
      
      if (!confirmDelete) {
        return false;
      }
    } else {
      const confirmDelete = await showConfirm({
        title: '确认删除客户',
        description: `确定要删除客户 "${customer.name}" 吗？`,
        variant: 'danger',
      });
      if (!confirmDelete) {
        return false;
      }
    }

    try {
      await customerService.deleteCustomer(customer.id);
      return true;
    } catch (error) {
      console.error('删除客户失败:', error);
      return false;
    }
  };

  // 删除供应商
  const deleteSupplier = async (supplier: Supplier) => {
    const usageCount = supplierService.checkSupplierUsage(supplier.name);
    
    if (usageCount > 0) {
      const confirmDelete = await showConfirm({
        title: '确认删除供应商',
        description:
          `警告：该供应商 "${supplier.name}" 在 ${usageCount} 个历史记录中被引用。\n\n` +
          `删除供应商信息将：\n` +
          `• 从供应商管理列表中移除\n` +
          `• 不会影响历史记录中的供应商信息\n` +
          `• 历史记录仍然可以正常查看\n\n` +
          `确定要删除这个供应商吗？`,
        variant: 'danger',
      });
      
      if (!confirmDelete) {
        return false;
      }
    } else {
      const confirmDelete = await showConfirm({
        title: '确认删除供应商',
        description: `确定要删除供应商 "${supplier.name}" 吗？`,
        variant: 'danger',
      });
      if (!confirmDelete) {
        return false;
      }
    }

    try {
      await supplierService.deleteSupplier(supplier.id);
      return true;
    } catch (error) {
      console.error('删除供应商失败:', error);
      return false;
    }
  };

  // 删除收货人
  const deleteConsignee = async (consignee: Consignee) => {
    const usageCount = consigneeService.checkConsigneeUsage(consignee.name);
    
    if (usageCount > 0) {
      const confirmDelete = await showConfirm({
        title: '确认删除收货人',
        description:
          `警告：该收货人 "${consignee.name}" 在 ${usageCount} 个历史记录中被引用。\n\n` +
          `删除收货人信息将：\n` +
          `• 从收货人管理列表中移除\n` +
          `• 不会影响历史记录中的收货人信息\n` +
          `• 历史记录仍然可以正常查看\n\n` +
          `确定要删除这个收货人吗？`,
        variant: 'danger',
      });
      
      if (!confirmDelete) {
        return false;
      }
    } else {
      const confirmDelete = await showConfirm({
        title: '确认删除收货人',
        description: `确定要删除收货人 "${consignee.name}" 吗？`,
        variant: 'danger',
      });
      if (!confirmDelete) {
        return false;
      }
    }

    try {
      await consigneeService.deleteConsignee(consignee.id);
      return true;
    } catch (error) {
      console.error('删除收货人失败:', error);
      return false;
    }
  };

  return {
    saveCustomer,
    saveSupplier,
    saveConsignee,
    deleteCustomer,
    deleteSupplier,
    deleteConsignee
  };
}
