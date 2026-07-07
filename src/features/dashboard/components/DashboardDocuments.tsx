import React from 'react';
import { RecentDocumentsList } from '@/components/dashboard/RecentDocumentsList';
import { DocumentWithType, DocumentType } from '@/utils/dashboardUtils';

interface PermissionMap {
  documentTypePermissions: {
    quotation: boolean;
    confirmation: boolean;
    'domestic-quotation': boolean;
    'domestic-contract': boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
  };
  accessibleDocumentTypes: DocumentType[];
}

interface DashboardDocumentsProps {
  documents: DocumentWithType[];
  timeFilter: 'today' | '3days' | 'week' | 'month';
  typeFilter: 'all' | DocumentType;
  showAllFilters: boolean;
  onTimeFilterChange: (filter: 'today' | '3days' | 'week' | 'month') => void;
  onTypeFilterChange: (filter: 'all' | DocumentType) => void;
  onShowAllFiltersChange: (show: boolean) => void;
  permissionMap: PermissionMap;
}

export const DashboardDocuments: React.FC<DashboardDocumentsProps> = ({
  documents,
  timeFilter,
  typeFilter,
  showAllFilters,
  onTimeFilterChange,
  onTypeFilterChange,
  onShowAllFiltersChange,
  permissionMap
}) => {
  return (
    <RecentDocumentsList
      documents={documents}
      timeFilter={timeFilter}
      typeFilter={typeFilter}
      onTimeFilterChange={onTimeFilterChange}
      onTypeFilterChange={onTypeFilterChange}
      showAllFilters={showAllFilters}
      onShowAllFiltersChange={onShowAllFiltersChange}
      permissionMap={permissionMap}
    />
  );
};
