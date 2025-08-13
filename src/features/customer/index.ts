// 导出所有组件
export { default as CustomerPage } from './app/CustomerPage';
export { 
  CustomerList, 
  SupplierList, 
  ConsigneeList, 
  CustomerForm, 
  CustomerToolbar, 
  CustomerTabs, 
  CustomerModal 
} from './components';

// 导出所有Hooks
export { 
  useCustomerData, 
  useCustomerActions, 
  useCustomerForm 
} from './hooks';

// 导出所有服务
export { 
  customerService, 
  supplierService, 
  consigneeService 
} from './services';

// 导出所有类型
export type { 
  Customer, 
  Supplier, 
  Consignee, 
  CustomerFormData,
  TabType 
} from './types';
