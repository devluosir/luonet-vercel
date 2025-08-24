import { Edit, Trash2, Users, Eye, Calendar, Clock, MapPin, Phone, Mail, Star, AlertCircle, Search } from 'lucide-react';
import { Customer } from '../types';
import { TimelineService } from '../services/timelineService';
import { FollowUpService } from '../services/timelineService';

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onViewDetail?: (customer: Customer) => void;
  searchQuery?: string;
}

export function CustomerList({ customers, onEdit, onDelete, onViewDetail, searchQuery = '' }: CustomerListProps) {
  // 获取客户的时间轴事件数量
  const getTimelineCount = (customerName: string) => {
    try {
      const events = TimelineService.getEventsByCustomer(customerName);
      return events.length;
    } catch (error) {
      return 0;
    }
  };

  // 获取客户的跟进记录数量
  const getFollowUpCount = (customerName: string) => {
    try {
      const followUps = FollowUpService.getFollowUpsByCustomer(customerName);
      return followUps.length;
    } catch (error) {
      return 0;
    }
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取客户信息
  const getCustomerInfo = (customer: Customer) => {
    const lines = customer.name.split('\n');
    const title = lines[0] || customer.name;
    
    // 提取联系信息
    const contactInfo = {
      phone: '',
      email: ''
    };
    
    lines.forEach(line => {
      if (line.includes('@')) {
        contactInfo.email = line.trim();
      } else if (line.includes('+') || line.match(/\d{3,}/)) {
        contactInfo.phone = line.trim();
      }
    });
    
    return { title, contactInfo };
  };

  // 过滤客户
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    
    const { title, contactInfo } = getCustomerInfo(customer);
    const searchLower = searchQuery.toLowerCase();
    
    return (
      title.toLowerCase().includes(searchLower) ||
      contactInfo.phone.toLowerCase().includes(searchLower) ||
      contactInfo.email.toLowerCase().includes(searchLower)
    );
  });

  // 计算客户活跃度
  const getCustomerActivity = (customer: Customer) => {
    const timelineCount = getTimelineCount(customer.name);
    const followUpCount = getFollowUpCount(customer.name);
    const totalActivity = timelineCount + followUpCount;
    
    if (totalActivity >= 10) return { level: 'high', label: '高活跃', color: 'text-green-600 bg-green-50' };
    if (totalActivity >= 5) return { level: 'medium', label: '中活跃', color: 'text-yellow-600 bg-yellow-50' };
    return { level: 'low', label: '低活跃', color: 'text-gray-600 bg-gray-50' };
  };

  // 检查是否需要跟进
  const needsFollowUp = (customer: Customer) => {
    const followUpCount = getFollowUpCount(customer.name);
    const timelineCount = getTimelineCount(customer.name);
    
    // 新客户且没有跟进记录
    if (timelineCount > 0 && followUpCount === 0) return true;
    
    return false;
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          暂无客户数据
        </h3>
        <p className="text-gray-600 text-sm">
          开始添加您的第一个客户
        </p>
      </div>
    );
  }

  if (filteredCustomers.length === 0 && searchQuery) {
    return (
      <div className="text-center py-8">
        <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-600 text-sm">
          未找到匹配的客户
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 列表头部 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            客户列表
          </h2>
          <p className="text-sm text-gray-600">
            共 {filteredCustomers.length} 个客户
            {searchQuery && ` (搜索: "${searchQuery}")`}
          </p>
        </div>
      </div>

      {/* 客户卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCustomers.map((customer) => {
          const { title, contactInfo } = getCustomerInfo(customer);
          const timelineCount = getTimelineCount(customer.name);
          const followUpCount = getFollowUpCount(customer.name);
          const activity = getCustomerActivity(customer);
          const needsFollowUpFlag = needsFollowUp(customer);
          
          return (
            <div key={customer.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group relative">
              {/* 需要跟进标识 */}
              {needsFollowUpFlag && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* 卡片内容 */}
              <div className="p-4">
                {/* 客户名称和操作 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => onViewDetail?.(customer)}>
                      {title}
                    </h3>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onViewDetail && (
                      <button
                        onClick={() => onViewDetail(customer)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(customer)}
                      className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(customer)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 联系信息 */}
                <div className="space-y-1 mb-3">
                  {contactInfo.phone && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{contactInfo.phone}</span>
                    </div>
                  )}
                  {contactInfo.email && (
                    <div className="flex items-center text-xs text-gray-600">
                      <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{contactInfo.email}</span>
                    </div>
                  )}
                </div>

                {/* 统计信息和活跃度 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{timelineCount}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{followUpCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${activity.color}`}>
                      {activity.label}
                    </span>
                    {needsFollowUpFlag && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>

                {/* 创建时间 */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    创建于 {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 搜索结果提示 */}
      {searchQuery && filteredCustomers.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            显示 {filteredCustomers.length} 个匹配"<strong>{searchQuery}</strong>"的客户
          </p>
        </div>
      )}
    </div>
  );
}
