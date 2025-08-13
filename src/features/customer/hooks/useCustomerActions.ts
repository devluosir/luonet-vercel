import { Customer, Supplier, Consignee, CustomerFormData } from '../types';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { consigneeService } from '../services/consigneeService';

export function useCustomerActions() {
  // 保存客户
  const saveCustomer = async (customerData: CustomerFormData, editingCustomer: Customer | null) => {
    try {
      // 构建完整的客户信息
      let fullCustomerName = customerData.name;
      
      if (customerData.address && customerData.address.trim()) {
        fullCustomerName = `${customerData.name}\n${customerData.address.trim()}`;
      }
      
      const newCustomer: Customer = {
        id: editingCustomer ? editingCustomer.id : `customer_${Date.now()}`,
        name: fullCustomerName,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        company: customerData.company,
        createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 检查是否会影响历史记录
      if (editingCustomer && editingCustomer.name !== customerData.name) {
        const usageCount = customerService.checkCustomerUsage(editingCustomer.name);
        
        if (usageCount > 0) {
          const confirmSave = confirm(
            `注意：客户名称从 "${editingCustomer.name}" 更改为 "${customerData.name}"\n\n` +
            `该客户在 ${usageCount} 个历史记录中被引用。\n` +
            `历史记录中的客户名称将保持不变，只有新创建的记录会使用新的客户信息。\n\n` +
            `是否继续保存？`
          );
          
          if (!confirmSave) {
            return false;
          }
        }
      }

      customerService.saveCustomer(newCustomer);
      return true;
    } catch (error) {
      console.error('保存客户失败:', error);
      alert('保存失败，请重试');
      return false;
    }
  };

  // 保存供应商
  const saveSupplier = async (supplierData: CustomerFormData, editingSupplier: Supplier | null) => {
    try {
      const newSupplier: Supplier = {
        id: editingSupplier ? editingSupplier.id : `supplier_${Date.now()}`,
        name: supplierData.name,
        email: supplierData.email,
        phone: supplierData.phone,
        address: supplierData.address,
        company: supplierData.company,
        createdAt: editingSupplier ? editingSupplier.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 检查是否会影响历史记录
      if (editingSupplier && editingSupplier.name !== supplierData.name) {
        const usageCount = supplierService.checkSupplierUsage(editingSupplier.name);
        
        if (usageCount > 0) {
          const confirmSave = confirm(
            `注意：供应商名称从 "${editingSupplier.name}" 更改为 "${supplierData.name}"\n\n` +
            `该供应商在 ${usageCount} 个历史记录中被引用。\n` +
            `历史记录中的供应商名称将保持不变，只有新创建的记录会使用新的供应商信息。\n\n` +
            `是否继续保存？`
          );
          
          if (!confirmSave) {
            return false;
          }
        }
      }

      supplierService.saveSupplier(newSupplier);
      return true;
    } catch (error) {
      console.error('保存供应商失败:', error);
      alert('保存失败，请重试');
      return false;
    }
  };

  // 保存收货人
  const saveConsignee = async (consigneeData: CustomerFormData, editingConsignee: Consignee | null) => {
    try {
      const newConsignee: Consignee = {
        id: editingConsignee ? editingConsignee.id : `consignee_${Date.now()}`,
        name: consigneeData.name,
        email: consigneeData.email,
        phone: consigneeData.phone,
        address: consigneeData.address,
        company: consigneeData.company,
        createdAt: editingConsignee ? editingConsignee.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 检查是否会影响历史记录
      if (editingConsignee && editingConsignee.name !== consigneeData.name) {
        const usageCount = consigneeService.checkConsigneeUsage(editingConsignee.name);
        
        if (usageCount > 0) {
          const confirmSave = confirm(
            `注意：收货人名称从 "${editingConsignee.name}" 更改为 "${consigneeData.name}"\n\n` +
            `该收货人在 ${usageCount} 个历史记录中被引用。\n` +
            `历史记录中的收货人名称将保持不变，只有新创建的记录会使用新的收货人信息。\n\n` +
            `是否继续保存？`
          );
          
          if (!confirmSave) {
            return false;
          }
        }
      }

      consigneeService.saveConsignee(newConsignee);
      return true;
    } catch (error) {
      console.error('保存收货人失败:', error);
      alert('保存失败，请重试');
      return false;
    }
  };

  // 删除客户
  const deleteCustomer = async (customer: Customer) => {
    const usageCount = customerService.checkCustomerUsage(customer.name);
    
    if (usageCount > 0) {
      const confirmDelete = confirm(
        `警告：该客户 "${customer.name}" 在 ${usageCount} 个历史记录中被引用。\n\n` +
        `删除客户信息将：\n` +
        `• 从客户管理列表中移除\n` +
        `• 不会影响历史记录中的客户信息\n` +
        `• 历史记录仍然可以正常查看\n\n` +
        `确定要删除这个客户吗？`
      );
      
      if (!confirmDelete) {
        return false;
      }
    } else {
      if (!confirm(`确定要删除客户 "${customer.name}" 吗？`)) {
        return false;
      }
    }

    try {
      customerService.deleteCustomer(customer.id);
      return true;
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除失败，请重试');
      return false;
    }
  };

  // 删除供应商
  const deleteSupplier = async (supplier: Supplier) => {
    const usageCount = supplierService.checkSupplierUsage(supplier.name);
    
    if (usageCount > 0) {
      const confirmDelete = confirm(
        `警告：该供应商 "${supplier.name}" 在 ${usageCount} 个历史记录中被引用。\n\n` +
        `删除供应商信息将：\n` +
        `• 从供应商管理列表中移除\n` +
        `• 不会影响历史记录中的供应商信息\n` +
        `• 历史记录仍然可以正常查看\n\n` +
        `确定要删除这个供应商吗？`
      );
      
      if (!confirmDelete) {
        return false;
      }
    } else {
      if (!confirm(`确定要删除供应商 "${supplier.name}" 吗？`)) {
        return false;
      }
    }

    try {
      supplierService.deleteSupplier(supplier.id);
      return true;
    } catch (error) {
      console.error('删除供应商失败:', error);
      alert('删除失败，请重试');
      return false;
    }
  };

  // 删除收货人
  const deleteConsignee = async (consignee: Consignee) => {
    const usageCount = consigneeService.checkConsigneeUsage(consignee.name);
    
    if (usageCount > 0) {
      const confirmDelete = confirm(
        `警告：该收货人 "${consignee.name}" 在 ${usageCount} 个历史记录中被引用。\n\n` +
        `删除收货人信息将：\n` +
        `• 从收货人管理列表中移除\n` +
        `• 不会影响历史记录中的收货人信息\n` +
        `• 历史记录仍然可以正常查看\n\n` +
        `确定要删除这个收货人吗？`
      );
      
      if (!confirmDelete) {
        return false;
      }
    } else {
      if (!confirm(`确定要删除收货人 "${consignee.name}" 吗？`)) {
        return false;
      }
    }

    try {
      consigneeService.deleteConsignee(consignee.id);
      return true;
    } catch (error) {
      console.error('删除收货人失败:', error);
      alert('删除失败，请重试');
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
