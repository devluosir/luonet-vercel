'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreHorizontal,
  ArrowLeft,
  RefreshCw,
  Users,
  Building
} from 'lucide-react';
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { useRouter } from 'next/navigation';
import { getAllCustomers } from '@/utils/customerDataService';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

interface Consignee {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
}

type TabType = 'customers' | 'suppliers' | 'consignees';

// 从localStorage中提取供应商数据
function extractSuppliersFromHistory(): Supplier[] {
  try {
    if (typeof window === 'undefined') return [];

    const purchaseHistory = getLocalStorageJSON('purchase_history', []);
    
    // 提取供应商信息
    const supplierMap = new Map<string, Supplier>();
    
    purchaseHistory.forEach((doc: any, index: number) => {
      if (!doc) return;
      
      let supplierName = '';
      let supplierAddress = '';
      
      // 从采购单中提取供应商信息
      supplierName = doc.supplierName || doc.data?.attn || '';
      supplierAddress = doc.data?.attn || doc.to || '';
      
      // 如果供应商名称存在，则创建供应商记录
      if (supplierName) {
        const normalizedName = supplierName.trim();
        const supplierId = `supplier_${Date.now()}_${index}`;
        
        if (!supplierMap.has(normalizedName)) {
          supplierMap.set(normalizedName, {
            id: supplierId,
            name: normalizedName,
            email: doc.supplierEmail || doc.data?.supplierEmail || '',
            phone: doc.supplierPhone || doc.data?.supplierPhone || '',
            address: supplierAddress,
            company: doc.supplierCompany || doc.data?.supplierCompany || '',
            createdAt: doc.createdAt || doc.date || new Date().toISOString(),
            updatedAt: doc.updatedAt || doc.date || new Date().toISOString()
          });
        }
      }
    });
    
    // 添加调试信息
    console.log('供应商数据提取结果:', {
      purchaseHistory: purchaseHistory.length,
      extractedSuppliers: Array.from(supplierMap.values())
    });
    
    return Array.from(supplierMap.values());
  } catch (error) {
    console.error('提取供应商数据失败:', error);
    return [];
  }
}

// 从localStorage中提取收货人数据
function extractConsigneesFromHistory(): Consignee[] {
  try {
    if (typeof window === 'undefined') return [];

    const packingHistory = getLocalStorageJSON('packing_history', []);
    
    // 提取收货人信息
    const consigneeMap = new Map<string, Consignee>();
    
    packingHistory.forEach((doc: any, index: number) => {
      if (!doc) return;
      
      let consigneeName = '';
      let consigneeAddress = '';
      
      // 从装箱单中提取收货人信息
      consigneeName = doc.consigneeName || doc.data?.consignee?.name || '';
      consigneeAddress = doc.consigneeName || doc.data?.consignee?.name || '';
      
      // 如果收货人名称存在，则创建收货人记录
      if (consigneeName) {
        const normalizedName = consigneeName.trim();
        const consigneeId = `consignee_${Date.now()}_${index}`;
        
        if (!consigneeMap.has(normalizedName)) {
          consigneeMap.set(normalizedName, {
            id: consigneeId,
            name: normalizedName,
            email: doc.consigneeEmail || doc.data?.consigneeEmail || '',
            phone: doc.consigneePhone || doc.data?.consigneePhone || '',
            address: consigneeAddress,
            company: doc.consigneeCompany || doc.data?.consigneeCompany || '',
            createdAt: doc.createdAt || doc.date || new Date().toISOString(),
            updatedAt: doc.updatedAt || doc.date || new Date().toISOString()
          });
        }
      }
    });
    
    // 添加调试信息
    console.log('收货人数据提取结果:', {
      packingHistory: packingHistory.length,
      extractedConsignees: Array.from(consigneeMap.values())
    });
    
    return Array.from(consigneeMap.values());
  } catch (error) {
    console.error('提取收货人数据失败:', error);
    return [];
  }
}

// 保存客户数据到localStorage
function saveCustomerToHistory(customer: Customer) {
  try {
    if (typeof window === 'undefined') return;

    // 从专门的客户存储中读取现有数据
    const existingCustomers = getLocalStorageJSON('customer_management', []);
    
    // 检查是否已存在同名客户，如果存在则更新
    const existingIndex = existingCustomers.findIndex((c: Customer) => c.name === customer.name);
    
    let updatedCustomers;
    if (existingIndex >= 0) {
      // 更新现有客户
      updatedCustomers = [...existingCustomers];
      updatedCustomers[existingIndex] = customer;
    } else {
      // 添加新客户
      updatedCustomers = [...existingCustomers, customer];
    }
    
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    console.log('客户数据保存成功:', customer);
  } catch (error) {
    console.error('保存客户数据失败:', error);
  }
}

// 保存供应商数据到localStorage
function saveSupplierToHistory(supplier: Supplier) {
  try {
    if (typeof window === 'undefined') return;

    // 从专门的供应商存储中读取现有数据
    const existingSuppliers = getLocalStorageJSON('supplier_management', []);
    
    // 检查是否已存在同名供应商，如果存在则更新
    const existingIndex = existingSuppliers.findIndex((s: Supplier) => s.name === supplier.name);
    
    let updatedSuppliers;
    if (existingIndex >= 0) {
      // 更新现有供应商
      updatedSuppliers = [...existingSuppliers];
      updatedSuppliers[existingIndex] = supplier;
    } else {
      // 添加新供应商
      updatedSuppliers = [...existingSuppliers, supplier];
    }
    
    localStorage.setItem('supplier_management', JSON.stringify(updatedSuppliers));
    console.log('供应商数据保存成功:', supplier);
  } catch (error) {
    console.error('保存供应商数据失败:', error);
  }
}

// 从localStorage读取保存的供应商数据
function loadSavedSuppliers(): Supplier[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const savedSuppliers = getLocalStorageJSON('supplier_management', []);
    console.log('从localStorage读取的供应商数据:', savedSuppliers);
    return savedSuppliers;
  } catch (error) {
    console.error('读取保存的供应商数据失败:', error);
    return [];
  }
}

// 保存收货人数据到localStorage
function saveConsigneeToHistory(consignee: Consignee) {
  try {
    if (typeof window === 'undefined') return;

    // 从专门的收货人存储中读取现有数据
    const existingConsignees = getLocalStorageJSON('consignee_management', []);
    
    // 检查是否已存在同名收货人，如果存在则更新
    const existingIndex = existingConsignees.findIndex((c: Consignee) => c.name === consignee.name);
    
    let updatedConsignees;
    if (existingIndex >= 0) {
      // 更新现有收货人
      updatedConsignees = [...existingConsignees];
      updatedConsignees[existingIndex] = consignee;
    } else {
      // 添加新收货人
      updatedConsignees = [...existingConsignees, consignee];
    }
    
    localStorage.setItem('consignee_management', JSON.stringify(updatedConsignees));
    console.log('收货人数据保存成功:', consignee);
  } catch (error) {
    console.error('保存收货人数据失败:', error);
  }
}

// 从localStorage读取保存的收货人数据
function loadSavedConsignees(): Consignee[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const savedConsignees = getLocalStorageJSON('consignee_management', []);
    console.log('从localStorage读取的收货人数据:', savedConsignees);
    return savedConsignees;
  } catch (error) {
    console.error('读取保存的收货人数据失败:', error);
    return [];
  }
}

export default function CustomerPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingConsignee, setEditingConsignee] = useState<Consignee | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  });

  // 加载客户数据
  const loadCustomers = async () => {
    try {
      // 使用统一的客户数据服务
      const allCustomers = getAllCustomers();
      
      console.log('客户管理页面加载的客户数据:', {
        totalCustomers: allCustomers.length,
        customers: allCustomers
      });
      
      setCustomers(allCustomers);
    } catch (error) {
      console.error('加载客户数据失败:', error);
    }
  };

  // 加载供应商数据
  const loadSuppliers = async () => {
    try {
      // 从历史记录中提取供应商数据
      const extractedSuppliers = extractSuppliersFromHistory();
      
      // 从localStorage读取保存的供应商数据
      const savedSuppliers = loadSavedSuppliers();
      
      // 合并数据，避免重复
      const allSuppliers = [...extractedSuppliers];
      
      savedSuppliers.forEach(savedSupplier => {
        const exists = allSuppliers.some(s => s.name === savedSupplier.name);
        if (!exists) {
          allSuppliers.push(savedSupplier);
        }
      });
      
      console.log('合并后的供应商数据:', {
        extracted: extractedSuppliers.length,
        saved: savedSuppliers.length,
        total: allSuppliers.length
      });
      
      setSuppliers(allSuppliers);
    } catch (error) {
      console.error('加载供应商数据失败:', error);
    }
  };

  // 加载收货人数据
  const loadConsignees = async () => {
    try {
      // 从历史记录中提取收货人数据
      const extractedConsignees = extractConsigneesFromHistory();
      
      // 从localStorage读取保存的收货人数据
      const savedConsignees = loadSavedConsignees();
      
      // 合并数据，避免重复
      const allConsignees = [...extractedConsignees];
      
      savedConsignees.forEach(savedConsignee => {
        const exists = allConsignees.some(c => c.name === savedConsignee.name);
        if (!exists) {
          allConsignees.push(savedConsignee);
        }
      });
      
      console.log('合并后的收货人数据:', {
        extracted: extractedConsignees.length,
        saved: savedConsignees.length,
        total: allConsignees.length
      });
      
      setConsignees(allConsignees);
    } catch (error) {
      console.error('加载收货人数据失败:', error);
    }
  };

  // 加载所有数据
  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([loadCustomers(), loadSuppliers(), loadConsignees()]);
    setIsLoading(false);
  };

  // 保存客户数据
  const saveCustomer = async (customerData: CustomerFormData) => {
    try {
      // 构建完整的客户信息（标题+内容）
      let fullCustomerName = customerData.name;
      
      // 如果有地址信息，将其添加到客户信息中
      if (customerData.address && customerData.address.trim()) {
        fullCustomerName = `${customerData.name}\n${customerData.address.trim()}`;
      }
      
      const newCustomer: Customer = {
        id: editingCustomer ? editingCustomer.id : `customer_${Date.now()}`,
        name: fullCustomerName, // 使用完整的客户信息
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        company: customerData.company,
        createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 如果是编辑操作，检查是否会影响历史记录
      if (editingCustomer && editingCustomer.name !== customerData.name) {
        const quotationHistory = getLocalStorageJSON('quotation_history', []);
        const packingHistory = getLocalStorageJSON('packing_history', []);
        const invoiceHistory = getLocalStorageJSON('invoice_history', []);
        
        const allHistory = [...quotationHistory, ...packingHistory, ...invoiceHistory];
        const relatedRecords = allHistory.filter((doc: any) => {
          if (!doc) return false;
          
          let customerName = '';
          if (doc.type === 'packing') {
            customerName = doc.consigneeName || doc.customerName || '';
          } else {
            customerName = doc.customerName || '';
          }
          
          return customerName.trim() === editingCustomer.name;
        });
        
        if (relatedRecords.length > 0) {
          const confirmSave = confirm(
            `注意：客户名称从 "${editingCustomer.name}" 更改为 "${customerData.name}"\n\n` +
            `该客户在 ${relatedRecords.length} 个历史记录中被引用。\n` +
            `历史记录中的客户名称将保持不变，只有新创建的记录会使用新的客户信息。\n\n` +
            `是否继续保存？`
          );
          
          if (!confirmSave) {
            return;
          }
        }
      }

      saveCustomerToHistory(newCustomer);
      await loadCustomers();
      setShowModal(false);
      setEditingCustomer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: ''
      });
    } catch (error) {
      console.error('保存客户失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 保存供应商数据
  const saveSupplier = async (supplierData: CustomerFormData) => {
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

      // 如果是编辑操作，检查是否会影响历史记录
      if (editingSupplier && editingSupplier.name !== supplierData.name) {
        const purchaseHistory = getLocalStorageJSON('purchase_history', []);
        
        const relatedRecords = purchaseHistory.filter((doc: any) => {
          if (!doc) return false;
          
          const supplierName = doc.supplierName || doc.data?.attn || '';
          return supplierName.trim() === editingSupplier.name;
        });
        
        if (relatedRecords.length > 0) {
          const confirmSave = confirm(
            `注意：供应商名称从 "${editingSupplier.name}" 更改为 "${supplierData.name}"\n\n` +
            `该供应商在 ${relatedRecords.length} 个历史记录中被引用。\n` +
            `历史记录中的供应商名称将保持不变，只有新创建的记录会使用新的供应商信息。\n\n` +
            `是否继续保存？`
          );
          
          if (!confirmSave) {
            return;
          }
        }
      }

      saveSupplierToHistory(newSupplier);
      await loadSuppliers();
      setShowModal(false);
      setEditingSupplier(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: ''
      });
    } catch (error) {
      console.error('保存供应商失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 保存收货人数据
  const saveConsignee = async (consigneeData: CustomerFormData) => {
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

      // 如果是编辑操作，检查是否会影响历史记录
      if (editingConsignee && editingConsignee.name !== consigneeData.name) {
        const packingHistory = getLocalStorageJSON('packing_history', []);
        
        const relatedRecords = packingHistory.filter((doc: any) => {
          if (!doc) return false;
          
          const consigneeName = doc.consigneeName || doc.data?.consignee?.name || '';
          return consigneeName.trim() === editingConsignee.name;
        });
        
        if (relatedRecords.length > 0) {
          const confirmSave = confirm(
            `注意：收货人名称从 "${editingConsignee.name}" 更改为 "${consigneeData.name}"\n\n` +
            `该收货人在 ${relatedRecords.length} 个历史记录中被引用。\n` +
            `历史记录中的收货人名称将保持不变，只有新创建的记录会使用新的收货人信息。\n\n` +
            `是否继续保存？`
          );
          
          if (!confirmSave) {
            return;
          }
        }
      }

      saveConsigneeToHistory(newConsignee);
      await loadConsignees();
      setShowModal(false);
      setEditingConsignee(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: ''
      });
    } catch (error) {
      console.error('保存收货人失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 编辑客户
  const editCustomer = (customer: Customer) => {
    // 检查该客户是否被多个历史记录引用
    const quotationHistory = getLocalStorageJSON('quotation_history', []);
    const packingHistory = getLocalStorageJSON('packing_history', []);
    const invoiceHistory = getLocalStorageJSON('invoice_history', []);
    
    const allHistory = [...quotationHistory, ...packingHistory, ...invoiceHistory];
    const relatedRecords = allHistory.filter((doc: any) => {
      if (!doc) return false;
      
      let customerName = '';
      if (doc.type === 'packing') {
        customerName = doc.consigneeName || doc.customerName || '';
      } else {
        customerName = doc.customerName || '';
      }
      
      return customerName.trim() === customer.name;
    });
    
    if (relatedRecords.length > 1) {
      const confirmEdit = confirm(
        `该客户 "${customer.name}" 在 ${relatedRecords.length} 个历史记录中被引用。\n\n` +
        `编辑客户信息将只影响新创建的记录，不会修改历史记录中的客户信息。\n\n` +
        `是否继续编辑？`
      );
      
      if (!confirmEdit) {
        return;
      }
    }
    
    setEditingCustomer(customer);
    setEditingSupplier(null);
    setEditingConsignee(null);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      company: customer.company
    });
    setShowModal(true);
  };

  // 编辑供应商
  const editSupplier = (supplier: Supplier) => {
    // 检查该供应商是否被多个历史记录引用
    const purchaseHistory = getLocalStorageJSON('purchase_history', []);
    
    const relatedRecords = purchaseHistory.filter((doc: any) => {
      if (!doc) return false;
      
      const supplierName = doc.supplierName || doc.data?.attn || '';
      return supplierName.trim() === supplier.name;
    });
    
    if (relatedRecords.length > 1) {
      const confirmEdit = confirm(
        `该供应商 "${supplier.name}" 在 ${relatedRecords.length} 个历史记录中被引用。\n\n` +
        `编辑供应商信息将只影响新创建的记录，不会修改历史记录中的供应商信息。\n\n` +
        `是否继续编辑？`
      );
      
      if (!confirmEdit) {
        return;
      }
    }
    
    setEditingSupplier(supplier);
    setEditingCustomer(null);
    setEditingConsignee(null);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      company: supplier.company
    });
    setShowModal(true);
  };

  // 编辑收货人
  const editConsignee = (consignee: Consignee) => {
    // 检查该收货人是否被多个历史记录引用
    const packingHistory = getLocalStorageJSON('packing_history', []);
    
    const relatedRecords = packingHistory.filter((doc: any) => {
      if (!doc) return false;
      
      const consigneeName = doc.consigneeName || doc.data?.consignee?.name || '';
      return consigneeName.trim() === consignee.name;
    });
    
    if (relatedRecords.length > 1) {
      const confirmEdit = confirm(
        `该收货人 "${consignee.name}" 在 ${relatedRecords.length} 个历史记录中被引用。\n\n` +
        `编辑收货人信息将只影响新创建的记录，不会修改历史记录中的收货人信息。\n\n` +
        `是否继续编辑？`
      );
      
      if (!confirmEdit) {
        return;
      }
    }
    
    setEditingConsignee(consignee);
    setEditingCustomer(null);
    setEditingSupplier(null);
    setFormData({
      name: consignee.name,
      email: consignee.email,
      phone: consignee.phone,
      address: consignee.address,
      company: consignee.company
    });
    setShowModal(true);
  };

  // 删除客户
  const deleteCustomer = async (customerId: string) => {
    // 找到要删除的客户
    const customerToDelete = customers.find(c => c.id === customerId);
    if (!customerToDelete) return;
    
    // 检查该客户是否被历史记录引用
    const quotationHistory = getLocalStorageJSON('quotation_history', []);
    const packingHistory = getLocalStorageJSON('packing_history', []);
    const invoiceHistory = getLocalStorageJSON('invoice_history', []);
    
    const allHistory = [...quotationHistory, ...packingHistory, ...invoiceHistory];
    const relatedRecords = allHistory.filter((doc: any) => {
      if (!doc) return false;
      
      let customerName = '';
      if (doc.type === 'packing') {
        customerName = doc.consigneeName || doc.customerName || '';
      } else {
        customerName = doc.customerName || '';
      }
      
      return customerName.trim() === customerToDelete.name;
    });
    
    if (relatedRecords.length > 0) {
      const confirmDelete = confirm(
        `警告：该客户 "${customerToDelete.name}" 在 ${relatedRecords.length} 个历史记录中被引用。\n\n` +
        `删除客户信息将：\n` +
        `• 从客户管理列表中移除\n` +
        `• 不会影响历史记录中的客户信息\n` +
        `• 历史记录仍然可以正常查看\n\n` +
        `确定要删除这个客户吗？`
      );
      
      if (!confirmDelete) {
        return;
      }
    } else {
      if (!confirm(`确定要删除客户 "${customerToDelete.name}" 吗？`)) {
        return;
      }
    }

    try {
      // 从localStorage中删除客户
      const existingCustomers = getLocalStorageJSON('customer_management', []);
      const updatedCustomers = existingCustomers.filter((c: Customer) => c.id !== customerId);
      localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
      
      console.log('客户删除成功:', customerToDelete.name);
      await loadCustomers();
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 删除供应商
  const deleteSupplier = async (supplierId: string) => {
    // 找到要删除的供应商
    const supplierToDelete = suppliers.find(s => s.id === supplierId);
    if (!supplierToDelete) return;
    
    // 检查该供应商是否被历史记录引用
    const purchaseHistory = getLocalStorageJSON('purchase_history', []);
    
    const relatedRecords = purchaseHistory.filter((doc: any) => {
      if (!doc) return false;
      
      const supplierName = doc.supplierName || doc.data?.attn || '';
      return supplierName.trim() === supplierToDelete.name;
    });
    
    if (relatedRecords.length > 0) {
      const confirmDelete = confirm(
        `警告：该供应商 "${supplierToDelete.name}" 在 ${relatedRecords.length} 个历史记录中被引用。\n\n` +
        `删除供应商信息将：\n` +
        `• 从供应商管理列表中移除\n` +
        `• 不会影响历史记录中的供应商信息\n` +
        `• 历史记录仍然可以正常查看\n\n` +
        `确定要删除这个供应商吗？`
      );
      
      if (!confirmDelete) {
        return;
      }
    } else {
      if (!confirm(`确定要删除供应商 "${supplierToDelete.name}" 吗？`)) {
        return;
      }
    }

    try {
      // 从localStorage中删除供应商
      const existingSuppliers = getLocalStorageJSON('supplier_management', []);
      const updatedSuppliers = existingSuppliers.filter((s: Supplier) => s.id !== supplierId);
      localStorage.setItem('supplier_management', JSON.stringify(updatedSuppliers));
      
      console.log('供应商删除成功:', supplierToDelete.name);
      await loadSuppliers();
    } catch (error) {
      console.error('删除供应商失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 删除收货人
  const deleteConsignee = async (consigneeId: string) => {
    // 找到要删除的收货人
    const consigneeToDelete = consignees.find(c => c.id === consigneeId);
    if (!consigneeToDelete) return;
    
    // 检查该收货人是否被历史记录引用
    const packingHistory = getLocalStorageJSON('packing_history', []);
    
    const relatedRecords = packingHistory.filter((doc: any) => {
      if (!doc) return false;
      
      const consigneeName = doc.consigneeName || doc.data?.consignee?.name || '';
      return consigneeName.trim() === consigneeToDelete.name;
    });
    
    if (relatedRecords.length > 0) {
      const confirmDelete = confirm(
        `警告：该收货人 "${consigneeToDelete.name}" 在 ${relatedRecords.length} 个历史记录中被引用。\n\n` +
        `删除收货人信息将：\n` +
        `• 从收货人管理列表中移除\n` +
        `• 不会影响历史记录中的收货人信息\n` +
        `• 历史记录仍然可以正常查看\n\n` +
        `确定要删除这个收货人吗？`
      );
      
      if (!confirmDelete) {
        return;
      }
    } else {
      if (!confirm(`确定要删除收货人 "${consigneeToDelete.name}" 吗？`)) {
        return;
      }
    }

    try {
      // 从localStorage中删除收货人
      const existingConsignees = getLocalStorageJSON('consignee_management', []);
      const updatedConsignees = existingConsignees.filter((c: Consignee) => c.id !== consigneeId);
      localStorage.setItem('consignee_management', JSON.stringify(updatedConsignees));
      
      console.log('收货人删除成功:', consigneeToDelete.name);
      await loadConsignees();
    } catch (error) {
      console.error('删除收货人失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'customers') {
      saveCustomer(formData);
    } else if (activeTab === 'suppliers') {
      saveSupplier(formData);
    } else { // activeTab === 'consignees'
      saveConsignee(formData);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 初始化加载
  useEffect(() => {
    if (session) {
      loadAllData();
    }
  }, [session]);

  // 添加调试信息
  useEffect(() => {
    console.log('当前状态:', {
      activeTab,
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      consigneesCount: consignees.length,
      isLoading
    });
  }, [activeTab, customers, suppliers, consignees, isLoading]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            请先登录
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            您需要登录才能访问客户管理功能
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和返回按钮 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            客户与供应商管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            管理您的客户和供应商信息
          </p>
        </div>

        {/* Tab切换 */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'customers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                客户管理
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'suppliers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Building className="w-4 h-4" />
                供应商管理
              </button>
              <button
                onClick={() => setActiveTab('consignees')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'consignees'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                收货人管理
              </button>
            </nav>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`搜索${activeTab === 'customers' ? '客户' : activeTab === 'suppliers' ? '供应商' : '收货人'}...`}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Filter className="w-4 h-4" />
                筛选
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={loadAllData}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Download className="w-4 h-4" />
                导出
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Upload className="w-4 h-4" />
                导入
              </button>
            </div>
          </div>
        </div>

        {/* 数据列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">加载中...</p>
            </div>
          ) : activeTab === 'customers' ? (
            // 客户列表
            customers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无客户数据
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  开始添加您的第一个客户，或者从历史记录中导入客户信息
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  提示：客户数据会从您的报价单、发票和装箱单历史记录中自动提取
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div>调试信息：</div>
                  <div>• 报价单历史：{getLocalStorageJSON('quotation_history', []).length} 条</div>
                  <div>• 装箱单历史：{getLocalStorageJSON('packing_history', []).length} 条</div>
                  <div>• 发票历史：{getLocalStorageJSON('invoice_history', []).length} 条</div>
                  <div>• 提取的客户：{getAllCustomers().length} 个</div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                        客户信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                        创建时间
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => {
                      const lines = customer.name.split('\n');
                      const title = lines[0] || customer.name;
                      const content = customer.name;
                      
                      return (
                        <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {title}
                            </div>
                            {lines.length > 1 && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {content}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : activeTab === 'suppliers' ? (
            // 供应商列表
            suppliers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Building className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无供应商数据
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  开始添加您的第一个供应商，或者从历史记录中导入供应商信息
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  提示：供应商数据会从您的采购单历史记录中自动提取
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div>调试信息：</div>
                  <div>• 采购单历史：{getLocalStorageJSON('purchase_history', []).length} 条</div>
                  <div>• 提取的供应商：{extractSuppliersFromHistory().length} 个</div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                        供应商信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                        创建时间
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => {
                      const lines = supplier.name.split('\n');
                      const title = lines[0] || supplier.name;
                      const content = supplier.name;
                      
                      return (
                        <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {title}
                            </div>
                            {lines.length > 1 && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {content}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // 收货人列表
            consignees.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无收货人数据
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  开始添加您的第一个收货人，或者从历史记录中导入收货人信息
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  提示：收货人数据会从您的装箱单历史记录中自动提取
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div>调试信息：</div>
                  <div>• 装箱单历史：{getLocalStorageJSON('packing_history', []).length} 条</div>
                  <div>• 提取的收货人：{extractConsigneesFromHistory().length} 个</div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                        收货人信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                        创建时间
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {consignees.map((consignee) => {
                      const lines = consignee.name.split('\n');
                      const title = lines[0] || consignee.name;
                      const content = consignee.name;
                      
                      return (
                        <tr key={consignee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {title}
                            </div>
                            {lines.length > 1 && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {content}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {consignee.createdAt ? new Date(consignee.createdAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* 模态框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {editingCustomer || editingSupplier || editingConsignee 
                  ? `编辑${activeTab === 'customers' ? '客户' : activeTab === 'suppliers' ? '供应商' : '收货人'}`
                  : `添加${activeTab === 'customers' ? '客户' : activeTab === 'suppliers' ? '供应商' : '收货人'}`
                }
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    名称
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    邮箱
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    电话
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    地址
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    公司
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-md"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md transition-colors"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
