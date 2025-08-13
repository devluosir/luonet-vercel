import { useState, useEffect } from 'react';
import { Customer, Supplier, Consignee } from '../types';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { consigneeService } from '../services/consigneeService';

export function useCustomerData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载客户数据
  const loadCustomers = async () => {
    try {
      const allCustomers = customerService.getAllCustomers();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('加载客户数据失败:', error);
    }
  };

  // 加载供应商数据
  const loadSuppliers = async () => {
    try {
      const allSuppliers = supplierService.getAllSuppliers();
      setSuppliers(allSuppliers);
    } catch (error) {
      console.error('加载供应商数据失败:', error);
    }
  };

  // 加载收货人数据
  const loadConsignees = async () => {
    try {
      const allConsignees = consigneeService.getAllConsignees();
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

  // 刷新数据
  const refreshData = () => {
    loadAllData();
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return {
    customers,
    suppliers,
    consignees,
    isLoading,
    loadCustomers,
    loadSuppliers,
    loadConsignees,
    loadAllData,
    refreshData
  };
}
