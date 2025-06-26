'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Footer } from '@/components/Footer';

interface PackingData {
  packingNo: string;
  date: string;
  shipper: string;
  consignee: string;
  items: Array<{
    lineNo: number;
    mark: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    netWeight: number;
    grossWeight: number;
    packageCount: number;
    dimensions: string;
  }>;
  remarks: string;
}

export default function PackingPage() {
  const router = useRouter();
  
  const [packingData, setPackingData] = useState<PackingData>({
    packingNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    shipper: '',
    consignee: '',
    items: [{
      lineNo: 1,
      mark: '',
      description: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      netWeight: 0,
      grossWeight: 0,
      packageCount: 0,
      dimensions: ''
    }],
    remarks: ''
  });

  useEffect(() => {
    // 可以在这里添加初始化逻辑
  }, []);

  const handleAddLine = () => {
    setPackingData(prev => ({
      ...prev,
      items: [...prev.items, {
        lineNo: prev.items.length + 1,
        mark: '',
        description: '',
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        netWeight: 0,
        grossWeight: 0,
        packageCount: 0,
        dimensions: ''
      }]
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-black">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-4">箱单发票</h1>
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-lg p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">发货人</label>
              <input
                type="text"
                value={packingData.shipper}
                onChange={(e) => setPackingData({ ...packingData, shipper: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">收货人</label>
              <input
                type="text"
                value={packingData.consignee}
                onChange={(e) => setPackingData({ ...packingData, consignee: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">发票号</label>
              <input
                type="text"
                value={packingData.packingNo}
                onChange={(e) => setPackingData({ ...packingData, packingNo: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">日期</label>
              <input
                type="date"
                value={packingData.date}
                onChange={(e) => setPackingData({ ...packingData, date: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">唛头</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">序号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">描述</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">数量</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">单价</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">总价</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">净重</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">毛重</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">包裹数量</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">尺寸</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                  {packingData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="text"
                          value={item.mark}
                          onChange={(e) => {
                            const newItems = [...packingData.items];
                            newItems[index].mark = e.target.value;
                            setPackingData({ ...packingData, items: newItems });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{item.lineNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...packingData.items];
                            newItems[index].description = e.target.value;
                            setPackingData({ ...packingData, items: newItems });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...packingData.items];
                            newItems[index].quantity = parseFloat(e.target.value);
                            setPackingData({ ...packingData, items: newItems });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newItems = [...packingData.items];
                            newItems[index].unitPrice = parseFloat(e.target.value);
                            setPackingData({ ...packingData, items: newItems });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {item.quantity * item.unitPrice}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="number"
                          value={item.netWeight}
                          onChange={(e) => {
                            const newItems = [...packingData.items];
                            newItems[index].netWeight = parseFloat(e.target.value);
                            setPackingData({ ...packingData, items: newItems });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="number"
                          value={item.grossWeight}
                          onChange={(e) => {
                            const newItems = [...packingData.items];
                            newItems[index].grossWeight = parseFloat(e.target.value);
                            setPackingData({ ...packingData, items: newItems });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="number"
                          value={item.packageCount}
                          onChange={(e) => {
                            const newItems = [...packingData.items];
                            newItems[index].packageCount = parseFloat(e.target.value);
                            setPackingData({ ...packingData, items: newItems });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <input
                          type="text"
                          value={item.dimensions}
                          onChange={(e) => {
                            const newItems = [...packingData.items];
                            newItems[index].dimensions = e.target.value;
                            setPackingData({ ...packingData, items: newItems });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleAddLine} className="mt-4 bg-blue-500 text-white py-2 px-4 rounded">
              添加行
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
