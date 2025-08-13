import { CustomerForm } from './CustomerForm';
import { CustomerFormData, TabType } from '../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CustomerFormData;
  onInputChange: (field: keyof CustomerFormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
  activeTab: TabType;
}

export function CustomerModal({ 
  isOpen, 
  onClose, 
  formData, 
  onInputChange, 
  onSubmit, 
  isEditing, 
  activeTab 
}: CustomerModalProps) {
  if (!isOpen) return null;

  const getEntityLabel = () => {
    switch (activeTab) {
      case 'customers': return '客户';
      case 'suppliers': return '供应商';
      case 'consignees': return '收货人';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {isEditing ? `编辑${getEntityLabel()}` : `添加${getEntityLabel()}`}
        </h2>
        <CustomerForm
          formData={formData}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
          onCancel={onClose}
          isEditing={isEditing}
          entityType={activeTab}
        />
      </div>
    </div>
  );
}
