import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { formatJalaliDateTime } from '@/modules/dashboard/zone-manager/utils/formatters';
import { formatCurrency } from '@/modules/finance/utils/persianUtils';

export function OrderDetail() {
  const { orders, updateOrderStatus, convertOrderToInvoice } = useCommercialStore();
  const [selectedOrderId] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  const filteredOrders = orders.filter((order) => order.id === selectedOrderId);

  const handleCloseDetail = () => {
    setShowDetail(false);
  };

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" style={{ display: showDetail ? 'block' : 'none' }}>
      <div className="flex justify-between mb-4">
        <div className="w-1/3">
          <div className="text-sm text-muted-foreground">سفارش:</div>
          <span className="text-lg font-bold">
            {selectedOrder?.orderNumber || '—'}
          </span>
        </div>
        <button
          onClick={handleCloseDetail}
          className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          بازگشت
        </button>
      </div>

      {showDetail && selectedOrder && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">اطلاعات کلی</div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <div className="flex justify-between">
              <span>تاریخ:</span>
              <div>{formatJalaliDateTime(selectedOrder.updatedAt)}</div>
            </div>
            <div className="flex justify-between">
              <span>طرف:</span>
              <div>{selectedOrder.partyName || '—'}</div>
            </div>
            <div className="flex justify-between">
              <span>وضعیت:</span>
              <span className="text-lg font-medium text-emerald-600">
                {selectedOrder.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>تاریخ تحویل:</span>
              <div>{formatJalaliDateTime(selectedOrder.deliveryDate)}</div>
            </div>
            <div className="flex justify-between">
              <span>تعداد آیتم:</span>
              <div className="text-lg font-bold">
                {selectedOrder.lines.length}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">آیتم‌های سفارش</div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <table className="w-full">
              <thead className="bg-secondary text-right">
                <tr>
                  <th className="p-2">کد آیتم</th>
                  <th className="p-2">نام آیتم</th>
                  <th className="p-2">تعداد</th>
                  <th className="p-2">قیمت واحد</th>
                  <th className="p-2">جمع</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.lines.map((line) => (
                  <tr key={line.id} className="border-b border-gray-200">
                    <td className="p-2">{line.itemCode}</td>
                    <td className="p-2">{line.itemName}</td>
                    <td className="p-2">{line.quantity}</td>
                    <td className="p-2">
                      {formatCurrency(line.unitPrice, selectedOrder.currencyCode)}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(line.lineTotal, selectedOrder.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <div className="text-sm text-muted-foreground">تیمات:</div>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              {selectedOrder.milestones?.map((milestone) => (
                <div key={milestone.id} className="p-2 border-b border-gray-200">
                  <span className="text-sm font-medium">{milestone.label}</span>
                  <span className="ml-2 text-xs">
                    {formatJalaliDateTime(milestone.dueDate)}
                  </span>
                  <span className="ml-2 text-xs">
                    {milestone.status === 'completed' ? '✓ تکمیل شده' : '△ در حال تولید'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-muted-foreground">اقدامات:</div>
            <div className="flex justify-between">
              <button
                onClick={() => updateOrderStatus(selectedOrderId, 'ready_to_ship')}
                className="rounded border border-green-300 px-3 py-2 text-xs hover:bg-green-500 transition-colors"
                disabled={selectedOrder.status !== 'confirmed'}
              >
                ثبت به عنوان در حال تولید
              </button>
              <button
                onClick={() => updateOrderStatus(selectedOrderId, 'ready_to_ship')}
                className="rounded border border-green-300 px-3 py-2 text-xs hover:bg-green-500 transition-colors"
                disabled={selectedOrder.status === 'ready_to_ship'}
              >
                ثبت به عنوان آماده برای ارسال
              </button>
              <button
                onClick={() => convertOrderToInvoice(selectedOrderId)}
                className="rounded border border-emerald-300 px-3 py-2 text-xs hover:bg-emerald-500 transition-colors"
                disabled={selectedOrder.status !== 'fully_received'}
              >
                صدور فاکتور
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderDetail;