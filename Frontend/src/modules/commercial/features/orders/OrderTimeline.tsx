import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { formatJalaliDateTime } from '@/modules/dashboard/zone-manager/utils/formatters';

export function OrderTimeline() {
  const { orders } = useCommercialStore();
  const [selectedOrderId] = useState('');
  const [, setSelectedMilestoneId] = useState('');

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-medium mb-3">تیمات سفارشات</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          هیچ سفارشی ثبت نشده است
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="p-4 border-b border-gray-200">
              <div className="flex justify-between">
                <div>
                  <span className="text-lg font-medium">{order.orderNumber}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {order.direction === 'sales' ? 'فروش' : 'خرید'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">
                    {formatJalaliDateTime(order.createdAt)}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {selectedOrderId === order.id ? 'انتخاب شده' : 'انتخاب کنید'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mt-2">
                {selectedOrder?.milestones?.map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-2">
                    <span className="w-8 h-1 rounded" 
                          style={{ backgroundColor: milestone.status === 'completed' ? '#4caf50' : milestone.status === 'pending' ? '#f44336' : 'orange' }}>
                    </span>
                    <span className="ml-2 text-sm">{milestone.label}</span>
                    <span className="ml-2 text-xs">
                      {formatJalaliDateTime(milestone.dueDate)}
                    </span>
                  </div>
                ))}
              </div>
              
              {selectedOrderId === order.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-2">تیمات سفارش</h3>
                  {selectedOrder?.milestones?.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-2 p-2 border border-gray-200">
                      <span className="w-6 h-1 rounded mr-2">
                        {milestone.status === 'completed' ? '🟢' : milestone.status === 'pending' ? '🔴' : '🟡'}
                      </span>
                      <span className="ml-2 text-sm">{milestone.label}</span>
                      <span className="ml-2 text-xs">
                        {formatJalaliDateTime(milestone.dueDate)}
                      </span>
                      <button
                        onClick={() => setSelectedMilestoneId(milestone.id)}
                        className="ml-2 rounded border border-green-300 px-2 py-1 text-xs hover:bg-green-500 transition-colors"
                        disabled={milestone.status === 'completed'}
                      >
                        تکمیل
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}