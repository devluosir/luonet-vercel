import React from 'react';
import { RecentDocumentsList } from '@/components/dashboard/RecentDocumentsList';
import { DocumentWithType } from '@/utils/dashboardUtils';

interface PermissionMap {
  documentTypePermissions: {
    quotation: boolean;
    confirmation: boolean;
    packing: boolean;
    invoice: boolean;
    purchase: boolean;
  };
  accessibleDocumentTypes: string[];
}

interface DashboardDocumentsProps {
  documents: DocumentWithType[];
  timeFilter: 'today' | '3days' | 'week' | 'month';
  typeFilter: 'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase';
  showAllFilters: boolean;
  onTimeFilterChange: (filter: 'today' | '3days' | 'week' | 'month') => void;
  onTypeFilterChange: (filter: 'all' | 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'purchase') => void;
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
