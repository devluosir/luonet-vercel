import { useState, useEffect, useCallback } from 'react';
import { Customer, Supplier, Consignee } from '../types';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { consigneeService } from '../services/consigneeService';

export function useCustomerData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !isClient) return;
      const allCustomers = customerService.getAllCustomers();
      setCustomers(allCustomers);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Failed to load customers.');
    }
  }, [isClient]);

  const loadSuppliers = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !isClient) return;
      const allSuppliers = supplierService.getAllSuppliers();
      setSuppliers(allSuppliers);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError('Failed to load suppliers.');
    }
  }, [isClient]);

  const loadConsignees = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !isClient) return;
      const allConsignees = consigneeService.getAllConsignees();
      setConsignees(allConsignees);
    } catch (err) {
      console.error('Failed to load consignees:', err);
      setError('Failed to load consignees.');
    }
  }, [isClient]);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    if (typeof window === 'undefined' || !isClient) return;

    setIsLoading(true);
    setError(null);
    await Promise.all([loadCustomers(), loadSuppliers(), loadConsignees()]);
    setIsLoading(false);
  }, [loadCustomers, loadSuppliers, loadConsignees, isClient]);

  useEffect(() => {
    if (isClient) {
      loadAllData();
    }
  }, [loadAllData, isClient]);

  const refreshData = useCallback(() => {
    if (isClient) {
      loadAllData();
    }
  }, [loadAllData, isClient]);

  return { customers, suppliers, consignees, isLoading, error, refreshData, isClient };
}
