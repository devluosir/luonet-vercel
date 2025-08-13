import { CustomerFormData } from '../types';

interface CustomerFormProps {
  formData: CustomerFormData;
  onInputChange: (field: keyof CustomerFormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  entityType: 'customers' | 'suppliers' | 'consignees';
}

export function CustomerForm({ 
  formData, 
  onInputChange, 
  onSubmit, 
  onCancel, 
  isEditing, 
  entityType 
}: CustomerFormProps) {
  const getEntityLabel = () => {
    switch (entityType) {
      case 'customers': return '客户';
      case 'suppliers': return '供应商';
      case 'consignees': return '收货人';
      default: return '';
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          名称
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
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
          onChange={(e) => onInputChange('email', e.target.value)}
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
          onChange={(e) => onInputChange('phone', e.target.value)}
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
          onChange={(e) => onInputChange('address', e.target.value)}
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
          onChange={(e) => onInputChange('company', e.target.value)}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-md"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md transition-colors"
        >
          {isEditing ? '更新' : '保存'}
        </button>
      </div>
    </form>
  );
}
