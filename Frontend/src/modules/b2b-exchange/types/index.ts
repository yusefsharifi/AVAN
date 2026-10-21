export type RFQStatus = 'draft' | 'published' | 'bidding' | 'evaluation' | 'awarded' | 'cancelled' | 'expired';
export type RFQType = 'sealed_bid';
export type ItemType = 'material' | 'service' | 'equipment' | 'logistics' | 'chemicals' | 'electrical' | 'packaging' | 'spare_parts' | 'raw_material' | 'tools' | 'other';
export type Visibility = 'private_park';
export type BidStatus = 'draft' | 'submitted' | 'under_review' | 'shortlisted' | 'rejected' | 'awarded';

export interface RFQSpecification { id:string; parameter:string; value:string; unit?:string; isMandatory:boolean; tolerance?:string; }
export interface EvaluationCriterion { id:string; name:string; weight:number; type:'financial'|'technical'|'delivery'|'quality'|'reputation'|'certification'; }
export interface RFQAttachment { id:string; fileName:string; fileType:string; fileSize:number; uploadDate:string; }
export interface RFQ {
  id:string; rfqNumber:string; title:string; description:string;
  requesterCompanyId:string; requesterCompanyName:string; requesterDepartmentId?:string;
  requesterUserId:string; requesterUserName:string; categoryId:string; categoryPath:string[];
  itemType:ItemType; visibility:Visibility; type:RFQType; publishDate?:string; deadlineDate:string; deliveryDeadline?:string;
  specifications:RFQSpecification[]; attachments:RFQAttachment[]; quantity:number; uom:string; maxBudget?:number;
  paymentTerms:string; deliveryTerms:string; deliveryLocation:string; incoterm:string; status:RFQStatus;
  evaluationCriteria:EvaluationCriterion[]; awardedBidId?:string; awardedSupplierId?:string; awardedSupplierName?:string; awardDate?:string; awardReason?:string; autoConvertToPO:boolean; poId?:string; viewCount:number; bidCount:number; createdAt:string; updatedAt:string;
}
export interface PriceBreakdown { materialCost:number; laborCost:number; overheadCost:number; profitMargin:number; taxAmount:number; shippingCost:number; otherCosts:number; }
export interface Bid {
  id:string; bidNumber:string; rfqId:string; rfqTitle:string; supplierId:string; supplierCompanyName:string; supplierContactName:string; supplierContactPhone:string; supplierEmail:string;
  unitPrice:number; quantity:number; totalPrice:number; currency:'IRR'; priceBreakdown:PriceBreakdown; technicalCompliance:boolean; technicalResponse:string; sampleOffered:boolean; sampleAttachmentId?:string; certifications:string[]; deliveryDays:number; deliverySchedule:string; paymentTerms:string; warrantyMonths?:number; validityDays:number; status:BidStatus; submittedAt?:string; openedAt?:string; score?:number; priceScore?:number; technicalScore?:number; deliveryScore?:number; paymentScore?:number; createdAt:string; updatedAt:string;
}
export interface CompanyMarketplaceProfile { companyId:string; companyName:string; isSupplier:boolean; isBuyer:boolean; supplyCategories:string[]; certifications:string[]; annualCapacity?:string; employeeCount?:number; rating:number; completedOrders:number; onTimeDeliveryRate:number; qualityRejectionRate:number; totalRFQsCreated:number; totalBidsSubmitted:number; totalBidsWon:number; winRate:number; totalSavings:number; }
export interface CategoryNode { id:string; name:string; nameEn?:string; parentId?:string; children?:CategoryNode[]; icon?:string; }
export interface B2BNotification { id:string; title:string; message:string; date:string; type:'rfq'|'bid'|'deadline'|'award'; read:boolean; rfqId?:string; }
