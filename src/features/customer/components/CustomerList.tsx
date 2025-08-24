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
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取客户信息
  const getCustomerInfo = (customer: Customer) => {
    const lines = customer.name.split('\n');
    const title = lines[0] || customer.name;
    const content = customer.name;
    
    // 提取联系信息
    const contactInfo = {
      phone: '',
      email: '',
      address: ''
    };
    
    lines.forEach(line => {
      if (line.includes('@')) {
        contactInfo.email = line.trim();
      } else if (line.includes('+') || line.match(/\d{3,}/)) {
        contactInfo.phone = line.trim();
      } else if (line.includes('省') || line.includes('市') || line.includes('区') || line.includes('路')) {
        contactInfo.address = line.trim();
      }
    });
    
    return { title, content, contactInfo };
  };

  // 过滤客户
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    
    const { title, contactInfo } = getCustomerInfo(customer);
    const searchLower = searchQuery.toLowerCase();
    
    return (
      title.toLowerCase().includes(searchLower) ||
      contactInfo.phone.toLowerCase().includes(searchLower) ||
      contactInfo.email.toLowerCase().includes(searchLower) ||
      contactInfo.address.toLowerCase().includes(searchLower)
    );
  });

  // 计算客户活跃度
  const getCustomerActivity = (customer: Customer) => {
    const timelineCount = getTimelineCount(customer.name);
    const followUpCount = getFollowUpCount(customer.name);
    const totalActivity = timelineCount + followUpCount;
    
    if (totalActivity >= 10) return { level: 'high', label: '高活跃', color: 'text-green-600 bg-green-100' };
    if (totalActivity >= 5) return { level: 'medium', label: '中活跃', color: 'text-yellow-600 bg-yellow-100' };
    return { level: 'low', label: '低活跃', color: 'text-gray-600 bg-gray-100' };
  };

  // 检查是否需要跟进
  const needsFollowUp = (customer: Customer) => {
    const followUpCount = getFollowUpCount(customer.name);
    const timelineCount = getTimelineCount(customer.name);
    
    // 新客户且没有跟进记录
    if (timelineCount > 0 && followUpCount === 0) return true;
    
    // 有跟进记录但最近没有活动
    if (followUpCount > 0) {
      // 这里可以添加更复杂的逻辑来判断是否需要跟进
      return false;
    }
    
    return false;
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Users className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          暂无客户数据
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
          开始添加您的第一个客户，或者从历史记录中导入客户信息
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="font-medium mb-2">💡 提示：</p>
          <ul className="text-left space-y-1">
            <li>• 客户数据会从您的报价单、发票和装箱单历史记录中自动提取</li>
            <li>• 点击"添加客户"按钮手动添加客户信息</li>
            <li>• 使用"导入"功能批量导入客户数据</li>
          </ul>
        </div>
      </div>
    );
  }

  if (filteredCustomers.length === 0 && searchQuery) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Search className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          未找到匹配的客户
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          尝试使用不同的搜索关键词
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 列表头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            客户列表
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            共 {filteredCustomers.length} 个客户
            {searchQuery && ` (搜索: "${searchQuery}")`}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>时间轴</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>跟进</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4" />
            <span>活跃度</span>
          </div>
        </div>
      </div>

      {/* 客户卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => {
          const { title, content, contactInfo } = getCustomerInfo(customer);
          const timelineCount = getTimelineCount(customer.name);
          const followUpCount = getFollowUpCount(customer.name);
          const activity = getCustomerActivity(customer);
          const needsFollowUpFlag = needsFollowUp(customer);
          
          return (
            <div key={customer.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden group relative">
              {/* 需要跟进标识 */}
              {needsFollowUpFlag && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* 卡片头部 */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer" onClick={() => onViewDetail?.(customer)}>
                        {title}
                      </h3>
                      {needsFollowUpFlag && (
                        <AlertCircle className="w-4 h-4 text-red-500" title="需要跟进" />
                      )}
                    </div>
                    
                    {/* 联系信息 */}
                    <div className="space-y-1">
                      {contactInfo.phone && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{contactInfo.phone}</span>
                        </div>
                      )}
                      {contactInfo.email && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{contactInfo.email}</span>
                        </div>
                      )}
                      {contactInfo.address && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{contactInfo.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onViewDetail && (
                      <button
                        onClick={() => onViewDetail(customer)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(customer)}
                      className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(customer)}
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 活跃度标签 */}
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded-full ${activity.color} dark:bg-opacity-20`}>
                    {activity.label}
                  </span>
                  {needsFollowUpFlag && (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      需要跟进
                    </span>
                  )}
                </div>
              </div>

              {/* 卡片内容 */}
              <div className="p-6">
                {/* 统计信息 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-1" />
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">时间轴</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{timelineCount}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">跟进</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{followUpCount}</p>
                  </div>
                </div>

                {/* 创建时间 */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">创建时间</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>

              {/* 卡片底部 */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => onViewDetail?.(customer)}
                  className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  查看详情 →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 搜索结果提示 */}
      {searchQuery && filteredCustomers.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            显示 {filteredCustomers.length} 个匹配"<strong>{searchQuery}</strong>"的客户
          </p>
        </div>
      )}
    </div>
  );
}
