import { useState } from "react";
import IranianPlateDisplay from "./IranianPlateDisplay";
import IranianPlateInput from "./IranianPlateInput";

export default function PlateIntegrationTest() {
  const [displayPlate, setDisplayPlate] = useState({
    province: "21",
    letter: "ب",
    mainNumber: "۳۴۵",
    serial: "۶۷",
  });

  const handleInputChange = (data: any) => {
    setDisplayPlate({
      province: data.province,
      letter: data.letter,
      mainNumber: data.mainNumber,
      serial: data.serial,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">تست یکپارچه‌سازی</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">ویرایش پلاک (IranianPlateInput)</h3>
            <IranianPlateInput
              initialProvince={displayPlate.province}
              initialLetter={displayPlate.letter}
              initialNumber={displayPlate.mainNumber}
              initialSerial={displayPlate.serial}
              onChange={handleInputChange}
              showTypeSelector={false}
              size="sm"
            />
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">نمایش پلاک (IranianPlateDisplay)</h3>
            <div className="flex justify-center p-4 bg-secondary/30 rounded-lg">
              <IranianPlateDisplay
                province={displayPlate.province}
                letter={displayPlate.letter}
                mainNumber={displayPlate.mainNumber}
                serial={displayPlate.serial}
                type="private"
                size="sm"
              />
            </div>
            
            <div className="mt-4 text-[11px] font-mono" dir="ltr">
              <div>شماره استان: {displayPlate.province}</div>
              <div>حرف: {displayPlate.letter}</div>
              <div>عدد: {displayPlate.mainNumber}</div>
              <div>سریال: {displayPlate.serial}</div>
              <div className="mt-1">پلاک کامل: {displayPlate.province} {displayPlate.letter} {displayPlate.mainNumber} {displayPlate.serial}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}