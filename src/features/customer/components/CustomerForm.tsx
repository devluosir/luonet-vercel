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
      {entityType === 'customers' && (
        <>
          <div>
            <label htmlFor="companyShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              公司简称
            </label>
            <input
              type="text"
              id="companyShortName"
              value={formData.companyShortName ?? ''}
              onChange={(e) => onInputChange('companyShortName', e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="如：LC"
            />
          </div>

          <div>
            <label htmlFor="contact1ShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              联系人1简称
              <span className="ml-1 text-xs text-gray-400 font-normal">（对应上方「名称」）</span>
            </label>
            <input
              type="text"
              id="contact1ShortName"
              value={formData.contact1ShortName ?? ''}
              onChange={(e) => onInputChange('contact1ShortName', e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="如：Roger"
            />
          </div>

          <fieldset className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-600">
            <legend className="px-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              联系人2（可选）
            </legend>
            <div>
              <label htmlFor="contact2Name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                姓名
              </label>
              <input
                type="text"
                id="contact2Name"
                value={formData.contact2Name ?? ''}
                onChange={(e) => onInputChange('contact2Name', e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="contact2ShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                简称
              </label>
              <input
                type="text"
                id="contact2ShortName"
                value={formData.contact2ShortName ?? ''}
                onChange={(e) => onInputChange('contact2ShortName', e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="如：Mary"
              />
            </div>
            <div>
              <label htmlFor="contact2Phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                电话
              </label>
              <input
                type="tel"
                id="contact2Phone"
                value={formData.contact2Phone ?? ''}
                onChange={(e) => onInputChange('contact2Phone', e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="contact2Email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                邮箱
              </label>
              <input
                type="email"
                id="contact2Email"
                value={formData.contact2Email ?? ''}
                onChange={(e) => onInputChange('contact2Email', e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </fieldset>
        </>
      )}
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
