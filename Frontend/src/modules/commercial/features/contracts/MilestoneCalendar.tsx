import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { formatJalaliDateTime } from '@/modules/dashboard/zone-manager/utils/formatters';

export function MilestoneCalendar() {
  const { contracts } = useCommercialStore();
  const [selectedContractId] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  
  const filteredContracts = contracts.filter(c => 
    selectedContractId ? c.id === selectedContractId : true
  );

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-medium mb-3">تقویم تعهدات و انقضا</h2>
      
      <div className="flex justify-between mb-4">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-600 transition-colors"
        >
          {showCalendar ? 'بازگشت' : 'نمایش تقویم'}
        </button>
      </div>
      
      {showCalendar && (
        <div className="grid grid-cols-12 gap-1">
          <div className="bg-gray-200 p-2 font-medium text-center">شنبه</div>
          <div className="bg-gray-200 p-2 font-medium text-center">دوشنبه</div>
          <div className="bg-gray-200 p-2 font-medium text-center">سه شنبه</div>
          <div className="bg-gray-200 p-2 font-medium text-center">چهارشنبه</div>
          <div className="bg-gray-200 p-2 font-medium text-center">پنجشنبه</div>
          <div className="bg-gray-200 p-2 font-medium text-center">جمعه</div>
          <div className="bg-gray-200 p-2 font-medium text-center">شنبه</div>
          
          {selectedContractId && (
            <div className="p-4 bg-blue-50 rounded">
              <h3 className="text-sm font-medium mb-2">{filteredContracts.find(c => c.id === selectedContractId)?.title || 'قرارداد'}</h3>
              <div className="flex justify-between">
                <div>تاریخ شروع: {selectedContract && formatJalaliDateTime(selectedContract.startDate)}</div>
                <div>تاریخ پایان: {selectedContract && formatJalaliDateTime(selectedContract.endDate)}</div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">
                  {selectedContract?.endDate === '' || !selectedContract ? 'تاریخ پایان مشخص نشده است' : 
                   'منقضی در ' + 
                   Math.ceil((new Date(selectedContract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + ' روز'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MilestoneCalendar;