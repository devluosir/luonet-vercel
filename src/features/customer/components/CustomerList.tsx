import { Edit, Trash2, Users, Eye, Calendar, Clock, MapPin, Phone, Mail } from 'lucide-react';
import { Customer } from '../types';
import { TimelineService } from '../services/timelineService';
import { FollowUpService } from '../services/timelineService';

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onViewDetail?: (customer: Customer) => void;
}

export function CustomerList({ customers, onEdit, onDelete, onViewDetail }: CustomerListProps) {
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
            <li>• 点击"添加新客户"按钮手动添加客户信息</li>
            <li>• 使用"导入"功能批量导入客户数据</li>
          </ul>
        </div>
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
            共 {customers.length} 个客户
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>时间轴</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>跟进</span>
          </div>
        </div>
      </div>

      {/* 客户卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => {
          const { title, content, contactInfo } = getCustomerInfo(customer);
          const timelineCount = getTimelineCount(customer.name);
          const followUpCount = getFollowUpCount(customer.name);
          
          return (
            <div key={customer.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 overflow-hidden group">
              {/* 卡片头部 */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer" onClick={() => onViewDetail?.(customer)}>
                      {title}
                    </h3>
                    {contactInfo.phone && (
                      <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4 mr-2" />
                        <span className="truncate">{contactInfo.phone}</span>
                      </div>
                    )}
                    {contactInfo.email && (
                      <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="truncate">{contactInfo.email}</span>
                      </div>
                    )}
                    {contactInfo.address && (
                      <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="truncate">{contactInfo.address}</span>
                      </div>
                    )}
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
    </div>
  );
}
