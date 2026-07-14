import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  deletePurchaseSupplierPermanently,
  fetchPurchaseSupplierById,
} from '../../services/purchaseSupplierService';
import type { PurchaseSupplier } from '../../types';
import { PurchaseSupplierDetailPage } from '../PurchaseSupplierDetailPage';

const mockAccess = jest.fn();
const mockInit = jest.fn();
const mockShowToast = jest.fn();
const mockConfirm = jest.fn();
const mockPush = jest.fn();
let mockActivities: Array<{ id: string }> = [];

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../hooks/usePurchaseSupplierAccess', () => ({
  usePurchaseSupplierAccess: () => mockAccess(),
}));

jest.mock('../../services/purchaseSupplierService', () => ({
  fetchPurchaseSupplierById: jest.fn(),
  savePurchaseSupplier: jest.fn(),
  archivePurchaseSupplier: jest.fn(),
  deletePurchaseSupplierPermanently: jest.fn(),
}));

jest.mock('@/features/inquiry/state/inquiry.store', () => ({
  useInquiryStore: Object.assign(
    (selector: (state: { records: [] }) => unknown) => selector({ records: [] }),
    { getState: () => ({ init: mockInit }) }
  ),
}));

jest.mock('../../services/purchaseSupplierActivity', () => ({
  derivePurchaseSupplierActivities: () => mockActivities,
}));

jest.mock('@/hooks/useAppUser', () => ({
  useAppUser: () => ({ user: { name: '测试用户' }, handleLogout: jest.fn() }),
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/components/ui/ConfirmDialog', () => ({
  useConfirm: () => mockConfirm,
}));

jest.mock('@/components/layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/layout/FullScreenSpinner', () => ({
  FullScreenSpinner: () => <div>权限加载中</div>,
}));

jest.mock('@/components/PermissionDenied', () => ({
  PermissionDenied: ({ message }: { message: string }) => <div>权限不足：{message}</div>,
}));

jest.mock('../../components/PurchaseSupplierInfoCard', () => ({
  PurchaseSupplierInfoCard: ({
    supplier,
    canWrite,
    onArchive,
    onDelete,
  }: {
    supplier: PurchaseSupplier;
    canWrite: boolean;
    onArchive: () => void;
    onDelete: () => void;
  }) => (
    <div>
      <span>{supplier.name}</span>
      <span>{canWrite ? '可写详情' : '只读详情'}</span>
      {canWrite && <button type="button">编辑资料</button>}
      {canWrite && <button type="button" onClick={onArchive}>归档供应商</button>}
      {canWrite && <button type="button" onClick={onDelete}>永久删除供应商</button>}
    </div>
  ),
}));

jest.mock('../../components/PurchaseSupplierActivityFeed', () => ({
  PurchaseSupplierActivityFeed: () => <div>采购活动</div>,
}));

const supplier: PurchaseSupplier = {
  id: 'supplier-1',
  name: '采购供应商一',
  shortName: '供应商一',
  address: '',
  contacts: [],
  data: {},
  status: 'archived',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('PurchaseSupplierDetailPage 权限门', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActivities = [];
    mockConfirm.mockResolvedValue(false);
    jest.mocked(fetchPurchaseSupplierById).mockResolvedValue(supplier);
    jest.mocked(deletePurchaseSupplierPermanently).mockResolvedValue(undefined);
  });

  it('无读权限时显示 PermissionDenied 且不请求详情', () => {
    mockAccess.mockReturnValue({ ready: true, canRead: false, canWrite: false, userId: 'user-1' });
    render(<PurchaseSupplierDetailPage supplierId="supplier-1" />);
    expect(screen.getByText(/权限不足：您没有采购供应商读取权限/)).toBeInTheDocument();
    expect(fetchPurchaseSupplierById).not.toHaveBeenCalled();
  });

  it('只有读权限时显示归档详情和活动，但不显示编辑控件', async () => {
    mockAccess.mockReturnValue({ ready: true, canRead: true, canWrite: false, userId: 'user-1' });
    render(<PurchaseSupplierDetailPage supplierId="supplier-1" />);

    await waitFor(() => expect(screen.getByText('采购供应商一')).toBeInTheDocument());
    expect(screen.getByText('只读详情')).toBeInTheDocument();
    expect(screen.getByText('采购活动')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑资料' })).not.toBeInTheDocument();
  });

  it('写权限账号显示编辑控件', async () => {
    mockAccess.mockReturnValue({ ready: true, canRead: true, canWrite: true, userId: 'user-1' });
    render(<PurchaseSupplierDetailPage supplierId="supplier-1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: '编辑资料' })).toBeInTheDocument());
    expect(screen.getByText('可写详情')).toBeInTheDocument();
  });

  it('缺少供应商 ID 时显示明确未找到提示且不发请求', async () => {
    mockAccess.mockReturnValue({ ready: true, canRead: true, canWrite: true, userId: 'user-1' });
    render(<PurchaseSupplierDetailPage supplierId={null} />);

    await waitFor(() => expect(screen.getByRole('heading', { name: '未找到采购供应商' })).toBeInTheDocument());
    expect(screen.getByText(/缺少供应商 ID/)).toBeInTheDocument();
    expect(fetchPurchaseSupplierById).not.toHaveBeenCalled();
  });

  it('永久删除确认明确说明不可撤销、统计盲区，零关联时不显示关联数量', async () => {
    mockAccess.mockReturnValue({ ready: true, canRead: true, canWrite: true, userId: 'user-1' });
    render(<PurchaseSupplierDetailPage supplierId="supplier-1" />);

    fireEvent.click(await screen.findByRole('button', { name: '永久删除供应商' }));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    const options = mockConfirm.mock.calls[0][0];
    expect(options.description).toContain('此操作不可撤销');
    expect(options.description).toContain('永久移除');
    expect(options.description).toContain('仅覆盖询价登记，不覆盖正式采购单历史');
    expect(options.description).not.toContain('仍关联');
    expect(deletePurchaseSupplierPermanently).not.toHaveBeenCalled();
  });

  it('有关联活动时在确认中显示数量，确认后永久删除并返回列表', async () => {
    mockActivities = [{ id: 'activity-1' }, { id: 'activity-2' }];
    mockConfirm.mockResolvedValue(true);
    mockAccess.mockReturnValue({ ready: true, canRead: true, canWrite: true, userId: 'user-1' });
    render(<PurchaseSupplierDetailPage supplierId="supplier-1" />);

    fireEvent.click(await screen.findByRole('button', { name: '永久删除供应商' }));

    await waitFor(() => expect(deletePurchaseSupplierPermanently).toHaveBeenCalledWith('supplier-1'));
    expect(mockConfirm.mock.calls[0][0].description).toContain('仍关联 2 条采购登记记录');
    expect(mockConfirm.mock.calls[0][0].description).toContain('供应商 ID 关联会失效');
    expect(mockShowToast).toHaveBeenCalledWith('已删除', 'success');
    expect(mockPush).toHaveBeenCalledWith('/purchase-supplier');
  });
});
