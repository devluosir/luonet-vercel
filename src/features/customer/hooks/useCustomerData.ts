import { useState, useEffect, useCallback } from 'react';
import type { Customer, Supplier, Consignee } from '../types';
import { customerService } from '../services/customerService';
import type { CustomerProfileType } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { consigneeService } from '../services/consigneeService';

const INITIAL_LOADING_BY_TYPE: Record<CustomerProfileType, boolean> = {
  customer: true,
  supplier: true,
  consignee: true,
};

export function useCustomerData(priorityType: CustomerProfileType = 'customer') {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [loadingByType, setLoadingByType] = useState<Record<CustomerProfileType, boolean>>(INITIAL_LOADING_BY_TYPE);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !isClient) return;
      const result = await customerService.fetchAllCustomers('customer');
      setCustomers(result.items);
      setIsStale((current) => current || result.isStale);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Failed to load customers.');
    } finally {
      setLoadingByType((current) => ({ ...current, customer: false }));
    }
  }, [isClient]);

  const loadSuppliers = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !isClient) return;
      const allSuppliers = await supplierService.getAllSuppliers();
      setSuppliers(allSuppliers);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError('Failed to load suppliers.');
    } finally {
      setLoadingByType((current) => ({ ...current, supplier: false }));
    }
  }, [isClient]);

  const loadConsignees = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !isClient) return;
      const allConsignees = await consigneeService.getAllConsignees();
      setConsignees(allConsignees);
    } catch (err) {
      console.error('Failed to load consignees:', err);
      setError('Failed to load consignees.');
    } finally {
      setLoadingByType((current) => ({ ...current, consignee: false }));
    }
  }, [isClient]);

  // 加载所有数据
  const loadAllData = useCallback(() => {
    if (typeof window === 'undefined' || !isClient) return;

    setLoadingByType(INITIAL_LOADING_BY_TYPE);
    setError(null);
    setIsStale(false);
    void loadCustomers();
    void loadSuppliers();
    void loadConsignees();
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

  const isLoading = loadingByType[priorityType];

  return { customers, suppliers, consignees, isLoading, loadingByType, error, isStale, refreshData, isClient };
}
