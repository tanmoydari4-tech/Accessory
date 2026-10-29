export type PageId =
  | 'home'
  | 'all-products'
  | 'categories'
  | 'product-details'
  | 'sample-gallery'
  | 'design-studio'
  | 'bulk-printing'
  | 'corporate-gifts'
  | 'about'
  | 'contact'
  | 'faq'
  | 'shipping-policy'
  | 'returns-policy'
  | 'privacy-policy'
  | 'terms'
  | 'auth'
  | 'cart-checkout'
  | 'customer-dashboard'
  | 'order-tracking'
  | 'admin-dashboard';

export type CategoryId =
  | 'apparel'
  | 'bags'
  | 'buttons-badges'
  | 'calendars'
  | 'gifts-accessories'
  | 'business-marketing'
  | 'photo-promotional';

export type MockupShape =
  | 'tshirt'
  | 'polo'
  | 'hoodie'
  | 'jersey'
  | 'cap'
  | 'apron'
  | 'totebag'
  | 'jutebag'
  | 'schoolbag'
  | 'badge'
  | 'namebadge'
  | 'wallcalendar'
  | 'deskcalendar'
  | 'mug'
  | 'keychain'
  | 'mousepad'
  | 'phonecase'
  | 'cushion'
  | 'frame'
  | 'sticker'
  | 'poster'
  | 'visitingcard'
  | 'flyer'
  | 'certificate'
  | 'idcard'
  | 'canvasprint';

export interface BulkTier {
  minQty: number;
  discountPercent: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  textColor?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: CategoryId;
  categoryName: string;
  subcategory: string;
  sku: string;
  shortDescription: string;
  description: string;
  basePrice: number; // in INR (₹)
  minOrderQty: number;
  sizes: string[];
  colors: ProductColor[];
  materials: string[];
  printingMethods: string[];
  printPositions: ('Front' | 'Back' | 'Both Sides' | 'Full Wrap' | 'Single Side')[];
  bothSideExtraPrice: number;
  estimatedProductionDays: string; // e.g., "3–5 business days (Standard)"
  deliveryEstimateDays: string; // e.g., "4–7 business days across India"
  bulkTiers: BulkTier[];
  mockupShape: MockupShape;
  defaultGraphicText: string;
  defaultGraphicSubtext: string;
  defaultAccentColor: string;
  inStock: boolean;
  featured?: boolean;
  bestSeller?: boolean;
}

export interface CanvasElementData {
  id: string;
  type: 'text' | 'image' | 'shape' | 'badge-stamp';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  // Text properties
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
  // Image properties
  imageUrl?: string;
  // Stamp/Shape properties
  stampKind?: 'star-crest' | 'minimal-frame' | 'bold-circle' | 'event-pass' | 'eco-leaf' | 'vintage-seal';
  strokeColor?: string;
}

export interface SampleDesign {
  id: string;
  title: string;
  categoryId: CategoryId;
  productId: string;
  mockupShape: MockupShape;
  styleTag: 'Minimalist' | 'Streetwear' | 'Corporate' | 'Event & Fest' | 'Photo Gift' | 'Eco Brand' | 'Typography';
  productColor: ProductColor;
  price: number;
  description: string;
  frontElements: CanvasElementData[];
  backElements: CanvasElementData[];
  supportsBackView: boolean;
  featured?: boolean;
}

export interface SavedCustomDesign {
  id: string;
  name: string;
  productId: string;
  productName: string;
  mockupShape: MockupShape;
  selectedColor: ProductColor;
  selectedSize: string;
  printingMethod: string;
  printSide: 'Front' | 'Back' | 'Both Sides';
  frontElements: CanvasElementData[];
  backElements: CanvasElementData[];
  frontPreviewDataUrl: string;
  backPreviewDataUrl?: string;
  uploadedFiles: { name: string; dataUrl: string; side: 'Front' | 'Back' }[];
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  sku: string;
  mockupShape: MockupShape;
  selectedColor: ProductColor;
  selectedSize: string;
  selectedMaterial: string;
  printingMethod: string;
  printSide: 'Front' | 'Back' | 'Both Sides' | 'Full Wrap' | 'Single Side';
  quantity: number;
  unitBasePrice: number;
  bothSideExtra: number;
  discountPercent: number;
  finalUnitPrice: number;
  lineTotal: number;
  customDesign?: {
    designId: string;
    designName: string;
    frontPreviewDataUrl: string;
    backPreviewDataUrl?: string;
    frontElements: CanvasElementData[];
    backElements: CanvasElementData[];
    uploadedFiles: { name: string; dataUrl: string; side: 'Front' | 'Back' }[];
  };
  directArtworkUpload?: {
    fileName: string;
    fileDataUrl: string;
    notes?: string;
  };
}

export type OrderStatus =
  | 'Pending'
  | 'Design Review'
  | 'Confirmed'
  | 'Printing'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Rejected';

export interface IndianAddress {
  id: string;
  label: string; // e.g., "Home", "Office / Studio"
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  landmark?: string;
  district: string;
  state: string;
  pinCode: string;
  deliveryInstructions?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: IndianAddress;
  items: CartItem[];
  subtotal: number;
  bulkDiscountTotal: number;
  gstAmount: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMethod: 'COD' | 'UPI' | 'ONLINE_GATEWAY';
  paymentStatus: 'Pending COD' | 'Verified Paid' | 'Verification Pending';
  paymentReferenceId?: string;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; timestamp: string; note: string }[];
  createdAt: string;
  adminNotes?: string;
}

export interface StoreSettings {
  heroTitle: string;
  heroSubtitle: string;
  promoBannerText: string;
  codEnabled: boolean;
  upiEnabled: boolean;
  upiMerchantId: string;
  upiMerchantName: string;
  onlineGatewayEnabled: boolean;
  onlineGatewayName: string;
  standardDeliveryCharge: number;
  freeDeliveryThreshold: number;
  gstPercentage: number;
  whatsappNumber: string;
  supportEmail: string;
  supportPhone: string;
  studioAddress: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  savedAddresses: IndianAddress[];
  savedDesigns: SavedCustomDesign[];
}
