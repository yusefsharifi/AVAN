import type { Bid, B2BNotification, CategoryNode, CompanyMarketplaceProfile, RFQ } from '../types';

export const mockCurrentCompany: CompanyMarketplaceProfile = {
  companyId: 'co-plastic', companyName: 'پلاستیک ایران', isSupplier: true, isBuyer: true,
  supplyCategories: ['plastic', 'packaging'], certifications: ['ISO 9001'], annualCapacity: '۱۲,۰۰۰ تن', employeeCount: 185,
  rating: 4.5, completedOrders: 42, onTimeDeliveryRate: 94, qualityRejectionRate: 1.2,
  totalRFQsCreated: 6, totalBidsSubmitted: 12, totalBidsWon: 5, winRate: 41.6, totalSavings: 780000000,
};
export const mockCompanies: CompanyMarketplaceProfile[] = [mockCurrentCompany,
  { companyId:'co-steel',companyName:'صنایع فولاد البرز',isSupplier:true,isBuyer:true,supplyCategories:['metal'],certifications:['ISO 9001','ISO 14001'],rating:4.7,completedOrders:88,onTimeDeliveryRate:96,qualityRejectionRate:0.8,totalRFQsCreated:8,totalBidsSubmitted:14,totalBidsWon:8,winRate:57,totalSavings:1200000000 },
  { companyId:'co-petro',companyName:'پتروشیمی پارس',isSupplier:true,isBuyer:true,supplyCategories:['chemicals'],certifications:['ISO 9001'],rating:4.4,completedOrders:52,onTimeDeliveryRate:91,qualityRejectionRate:1.5,totalRFQsCreated:4,totalBidsSubmitted:9,totalBidsWon:3,winRate:33,totalSavings:430000000 },
  { companyId:'co-electro',companyName:'الکتروتیک مشهد',isSupplier:true,isBuyer:false,supplyCategories:['electrical'],certifications:['CE'],rating:4.2,completedOrders:31,onTimeDeliveryRate:90,qualityRejectionRate:2,totalRFQsCreated:1,totalBidsSubmitted:18,totalBidsWon:6,winRate:33,totalSavings:0 },
];
export const mockCategories: CategoryNode[] = [
  { id:'metal',name:'فلزات',children:[{id:'steel-sheet',name:'ورق فولادی',children:[{id:'steel-316',name:'استیل ۳۱۶'}]},{id:'aluminum',name:'آلومینیوم',children:[{id:'al-sheet',name:'ورق آلومینیوم'}]}]},
  { id:'chemical',name:'مواد شیمیایی',children:[{id:'solvent',name:'حلال‌ها',children:[{id:'industrial-solvent',name:'حلال صنعتی'}]},{id:'paint',name:'رنگ و پوشش',children:[{id:'epoxy-paint',name:'رنگ اپوکسی'}]}]},
  { id:'electrical',name:'برق و الکترونیک',children:[{id:'cable',name:'کابل',children:[{id:'power-cable',name:'کابل قدرت'}]}]},
  { id:'service',name:'خدمات صنعتی',children:[{id:'cnc',name:'ماشین‌کاری CNC',children:[{id:'cnc-turning',name:'تراش CNC'}]}]},
];
const criteria = [{id:'c1',name:'قیمت',weight:40,type:'financial' as const},{id:'c2',name:'کیفیت فنی',weight:30,type:'technical' as const},{id:'c3',name:'زمان تحویل',weight:20,type:'delivery' as const},{id:'c4',name:'شرایط پرداخت',weight:10,type:'financial' as const}];
export const mockRFQs: RFQ[] = [
  {id:'rfq-1',rfqNumber:'RFQ-1403-00123',title:'خرید ۵ تن ورق استیل ۳۱۶',description:'ورق استیل صنعتی با گواهی آنالیز.',requesterCompanyId:'co-plastic',requesterCompanyName:'پلاستیک ایران',requesterUserId:'u1',requesterUserName:'علی رضایی',categoryId:'steel-316',categoryPath:['فلزات','ورق فولادی','استیل ۳۱۶'],itemType:'material',visibility:'private_park',type:'sealed_bid',publishDate:'۱۴۰۳/۰۴/۱۰',deadlineDate:'۱۴۰۳/۰۴/۲۵',specifications:[{id:'s1',parameter:'ضخامت',value:'۲',unit:'mm',isMandatory:true,tolerance:'±۰.۱'}],attachments:[{id:'att-1',fileName:'دیتاشیت-ورق-استیل-۳۱۶.pdf',fileType:'PDF',fileSize:840000,uploadDate:'۱۴۰۳/۰۴/۱۰'}],quantity:5000,uom:'کیلوگرم',maxBudget:4500000000,paymentTerms:'چک ۶۰ روزه',deliveryTerms:'تحویل درب کارخانه',deliveryLocation:'انبار اصلی شرکت',incoterm:'EXW',status:'bidding',evaluationCriteria:criteria,autoConvertToPO:true,viewCount:18,bidCount:3,createdAt:'۱۴۰۳/۰۴/۱۰ ۰۹:۰۰',updatedAt:'۱۴۰۳/۰۴/۱۲ ۱۰:۰۰'},
  {id:'rfq-2',rfqNumber:'RFQ-1403-00124',title:'خدمات ماشین‌کاری CNC',description:'ساخت قطعات فلزی طبق نقشه فنی.',requesterCompanyId:'co-steel',requesterCompanyName:'صنایع فولاد البرز',requesterUserId:'u2',requesterUserName:'مریم احمدی',categoryId:'cnc-turning',categoryPath:['خدمات صنعتی','ماشین‌کاری CNC','تراش CNC'],itemType:'service',visibility:'private_park',type:'sealed_bid',publishDate:'۱۴۰۳/۰۴/۰۸',deadlineDate:'۱۴۰۳/۰۴/۱۸',specifications:[{id:'s2',parameter:'تلرانس',value:'۰.۰۲',unit:'mm',isMandatory:true}],attachments:[],quantity:250,uom:'عدد',paymentTerms:'نقدی',deliveryTerms:'تحویل مرحله‌ای',deliveryLocation:'کارخانه فولاد البرز',incoterm:'EXW',status:'evaluation',evaluationCriteria:criteria,autoConvertToPO:false,viewCount:22,bidCount:4,createdAt:'۱۴۰۳/۰۴/۰۸ ۰۸:۰۰',updatedAt:'۱۴۰۳/۰۴/۱۸ ۱۱:۰۰'},
];
export const mockBids: Bid[] = [
  {id:'bid-1',bidNumber:'BID-1403-00123',rfqId:'rfq-1',rfqTitle:'خرید ۵ تن ورق استیل ۳۱۶',supplierId:'co-steel',supplierCompanyName:'صنایع فولاد البرز',supplierContactName:'رضا کریمی',supplierContactPhone:'۰۹۱۲۱۱۱۱۱۱۱',supplierEmail:'sales@steel.ir',unitPrice:870000,quantity:5000,totalPrice:4350000000,currency:'IRR',priceBreakdown:{materialCost:3800000000,laborCost:0,overheadCost:120000000,profitMargin:250000000,taxAmount:0,shippingCost:180000000,otherCosts:0},technicalCompliance:true,technicalResponse:'مطابق مشخصات فنی',sampleOffered:true,certifications:['ISO 9001'],deliveryDays:12,deliverySchedule:'تحویل کامل در ۱۲ روز',paymentTerms:'چک ۶۰ روزه',warrantyMonths:0,validityDays:30,status:'submitted',submittedAt:'۱۴۰۳/۰۴/۱۲ ۱۰:۰۰',createdAt:'۱۴۰۳/۰۴/۱۲',updatedAt:'۱۴۰۳/۰۴/۱۲'},
  {id:'bid-2',bidNumber:'BID-1403-00124',rfqId:'rfq-2',rfqTitle:'خدمات ماشین‌کاری CNC',supplierId:'co-plastic',supplierCompanyName:'پلاستیک ایران',supplierContactName:'علی رضایی',supplierContactPhone:'۰۹۱۲۲۲۲۲۲۲۲',supplierEmail:'supply@plastic.ir',unitPrice:2200000,quantity:250,totalPrice:550000000,currency:'IRR',priceBreakdown:{materialCost:250000000,laborCost:150000000,overheadCost:50000000,profitMargin:80000000,taxAmount:0,shippingCost:20000000,otherCosts:0},technicalCompliance:true,technicalResponse:'ماشین‌کاری با دستگاه CNC پنج محور',sampleOffered:false,certifications:['ISO 9001'],deliveryDays:15,deliverySchedule:'تحویل در دو مرحله',paymentTerms:'نقدی',validityDays:30,status:'under_review',createdAt:'۱۴۰۳/۰۴/۱۲',updatedAt:'۱۴۰۳/۰۴/۱۲'},
];
export const mockNotifications: B2BNotification[] = [{id:'n1',title:'فرصت جدید',message:'استعلام خرید ورق استیل با حوزه شما تطابق دارد.',date:'۱۴۰۳/۰۴/۱۲',type:'rfq',read:false,rfqId:'rfq-1'}];

const additionalRFQs: Array<Pick<RFQ, 'id' | 'rfqNumber' | 'title' | 'description' | 'itemType' | 'categoryPath' | 'quantity' | 'uom' | 'deadlineDate' | 'status' | 'maxBudget'>> = [
  { id:'rfq-3', rfqNumber:'RFQ-1403-00125', title:'خرید رنگ اپوکسی صنعتی', description:'رنگ اپوکسی دو جزئی مقاوم در برابر خوردگی.', itemType:'chemicals', categoryPath:['مواد شیمیایی','رنگ و پوشش','رنگ اپوکسی'], quantity:2000, uom:'لیتر', deadlineDate:'۱۴۰۳/۰۴/۲۸', status:'published', maxBudget:1800000000 },
  { id:'rfq-4', rfqNumber:'RFQ-1403-00126', title:'تأمین کابل قدرت سه فاز', description:'کابل مسی صنعتی برای تابلو برق خط تولید.', itemType:'electrical', categoryPath:['برق و الکترونیک','کابل','کابل قدرت'], quantity:3500, uom:'متر', deadlineDate:'۱۴۰۳/۰۴/۲۴', status:'bidding', maxBudget:2400000000 },
  { id:'rfq-5', rfqNumber:'RFQ-1403-00127', title:'خرید کارتن پنج لایه صادراتی', description:'کارتن چاپ‌دار برای بسته‌بندی محصول نهایی.', itemType:'packaging', categoryPath:['بسته‌بندی','کارتن','پنج لایه'], quantity:12000, uom:'عدد', deadlineDate:'۱۴۰۳/۰۴/۲۹', status:'draft', maxBudget:950000000 },
  { id:'rfq-6', rfqNumber:'RFQ-1403-00128', title:'بلبرینگ صنعتی 6205 SKF', description:'بلبرینگ شیار عمیق همراه گواهی اصالت.', itemType:'spare_parts', categoryPath:['قطعات یدکی','بلبرینگ','6205'], quantity:400, uom:'عدد', deadlineDate:'۱۴۰۳/۰۴/۲۲', status:'evaluation', maxBudget:420000000 },
  { id:'rfq-7', rfqNumber:'RFQ-1403-00129', title:'حمل زمینی مواد اولیه از بندرعباس', description:'حمل ۲۵ تن مواد اولیه با کامیون چادری.', itemType:'logistics', categoryPath:['خدمات صنعتی','حمل‌ونقل','حمل زمینی'], quantity:25, uom:'تن', deadlineDate:'۱۴۰۳/۰۴/۲۱', status:'awarded', maxBudget:320000000 },
  { id:'rfq-8', rfqNumber:'RFQ-1403-00130', title:'تأمین گرانول پلی‌اتیلن HDPE', description:'گرانول HDPE تزریقی گرید ۵۲۵۱۸.', itemType:'raw_material', categoryPath:['پلیمر','گرانول','HDPE'], quantity:30000, uom:'کیلوگرم', deadlineDate:'۱۴۰۳/۰۵/۰۳', status:'bidding', maxBudget:2100000000 },
];

mockRFQs.push(...additionalRFQs.map((entry, index) => ({
  ...mockRFQs[0],
  ...entry,
  requesterCompanyId: index % 2 ? 'co-steel' : 'co-petro',
  requesterCompanyName: index % 2 ? 'صنایع فولاد البرز' : 'پتروشیمی پارس',
  requesterUserId: `u-${index + 3}`,
  requesterUserName: 'کاربر شرکت',
  categoryId: entry.id,
  bidCount: index % 3 + 1,
  viewCount: 10 + index,
  publishDate: entry.status === 'draft' ? undefined : '۱۴۰۳/۰۴/۱۵',
  awardedSupplierId: entry.status === 'awarded' ? 'co-plastic' : undefined,
  awardedSupplierName: entry.status === 'awarded' ? 'پلاستیک ایران' : undefined,
  awardDate: entry.status === 'awarded' ? '۱۴۰۳/۰۴/۱۸' : undefined,
  createdAt: '۱۴۰۳/۰۴/۱۵ ۰۹:۰۰',
  updatedAt: '۱۴۰۳/۰۴/۲۰ ۱۰:۰۰',
})));

mockBids.push(...mockRFQs.slice(2).flatMap((rfq, index) => [0, 1].map((offset) => ({
  ...mockBids[0],
  id: `bid-extra-${index}-${offset}`,
  bidNumber: `BID-1403-${String(125 + index * 2 + offset).padStart(5, '0')}`,
  rfqId: rfq.id,
  rfqTitle: rfq.title,
  supplierId: offset ? 'co-electro' : 'co-plastic',
  supplierCompanyName: offset ? 'الکتروتیک مشهد' : 'پلاستیک ایران',
  totalPrice: Math.round((rfq.maxBudget || 500000000) * (offset ? .96 : .91)),
  unitPrice: Math.round(((rfq.maxBudget || 500000000) * (offset ? .96 : .91)) / rfq.quantity),
  quantity: rfq.quantity,
  deliveryDays: 8 + offset * 5,
  status: rfq.status === 'evaluation' ? 'under_review' : 'submitted',
  createdAt: '۱۴۰۳/۰۴/۱۷',
  updatedAt: '۱۴۰۳/۰۴/۱۷',
}))));

mockCompanies.push(
  { companyId:'co-food',companyName:'فرآوری غذایی تهران',isSupplier:true,isBuyer:true,supplyCategories:['food','packaging'],certifications:['ISO 22000'],rating:4.1,completedOrders:24,onTimeDeliveryRate:89,qualityRejectionRate:2.4,totalRFQsCreated:3,totalBidsSubmitted:7,totalBidsWon:2,winRate:28,totalSavings:170000000 },
  { companyId:'co-auto',companyName:'قطعات خودرو تبریز',isSupplier:true,isBuyer:true,supplyCategories:['automotive','spare_parts'],certifications:['IATF 16949'],rating:4.6,completedOrders:63,onTimeDeliveryRate:95,qualityRejectionRate:0.9,totalRFQsCreated:7,totalBidsSubmitted:11,totalBidsWon:6,winRate:54,totalSavings:620000000 },
  { companyId:'co-textile',companyName:'ریسندگی اصفهان',isSupplier:true,isBuyer:true,supplyCategories:['textile','packaging'],certifications:['ISO 9001'],rating:4.0,completedOrders:19,onTimeDeliveryRate:87,qualityRejectionRate:2.8,totalRFQsCreated:2,totalBidsSubmitted:5,totalBidsWon:1,winRate:20,totalSavings:80000000 },
  { companyId:'co-ceramic',companyName:'سرامیک شیراز',isSupplier:true,isBuyer:true,supplyCategories:['ceramic','chemicals'],certifications:['ISO 9001'],rating:4.3,completedOrders:38,onTimeDeliveryRate:92,qualityRejectionRate:1.7,totalRFQsCreated:5,totalBidsSubmitted:10,totalBidsWon:4,winRate:40,totalSavings:310000000 },
);

mockCategories.push(
  { id:'polymer',name:'پلیمر',children:[{id:'hdpe',name:'HDPE',children:[{id:'hdpe-injection',name:'گرید تزریقی'}]},{id:'pp',name:'پلی‌پروپیلن',children:[{id:'pp-homo',name:'هموپلیمر'}]}]},
  { id:'packaging',name:'بسته‌بندی',children:[{id:'carton',name:'کارتن',children:[{id:'five-layer',name:'پنج لایه'}]},{id:'film',name:'فیلم بسته‌بندی',children:[{id:'stretch-film',name:'استرچ فیلم'}]}]},
  { id:'spare',name:'قطعات یدکی',children:[{id:'bearing',name:'بلبرینگ',children:[{id:'bearing-6205',name:'6205'}]},{id:'seal',name:'آب‌بند',children:[{id:'mechanical-seal',name:'مکانیکی'}]}]},
  { id:'tools',name:'ابزارآلات',children:[{id:'cutting',name:'ابزار برش',children:[{id:'endmill',name:'فرز انگشتی'}]},{id:'measuring',name:'ابزار اندازه‌گیری',children:[{id:'caliper',name:'کولیس'}]}]},
  { id:'logistics',name:'حمل‌ونقل',children:[{id:'road',name:'حمل زمینی',children:[{id:'covered-truck',name:'کامیون چادری'}]},{id:'warehouse-service',name:'خدمات انبار',children:[{id:'forklift',name:'لیفتراک'}]}]},
);

mockBids.push({
  ...mockBids[0],
  id: 'bid-extra-final',
  bidNumber: 'BID-1403-00140',
  rfqId: 'rfq-8',
  rfqTitle: 'تأمین گرانول پلی‌اتیلن HDPE',
  supplierId: 'co-petro',
  supplierCompanyName: 'پتروشیمی پارس',
  unitPrice: 69000,
  quantity: 30000,
  totalPrice: 2070000000,
  deliveryDays: 10,
  status: 'submitted',
  createdAt: '۱۴۰۳/۰۴/۱۹',
  updatedAt: '۱۴۰۳/۰۴/۱۹',
});
