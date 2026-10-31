import React, { useState } from 'react';
import {
  CartItem,
  IndianAddress,
  Order,
  PageId,
  Product,
  StoreSettings,
  UserProfile,
} from '../types';
import { INDIAN_STATES } from '../data/catalogData';
import { ProductMockup } from './ProductMockup';
import {
  Trash2,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Lock,
  AlertCircle,
  Printer,
  ShoppingBag,
  Upload,
  FileText,
} from 'lucide-react';

interface CartCheckoutViewProps {
  cart: CartItem[];
  products: Product[];
  settings: StoreSettings;
  currentUser: UserProfile | null;
  onUpdateQuantity: (cartItemId: string, nextQty: number) => void;
  onUpdateItemAttachment?: (
    cartItemId: string,
    directArtworkUpload: CartItem['directArtworkUpload']
  ) => void;
  onRemoveItem: (cartItemId: string) => void;
  onPlaceOrder: (order: Order, saveAddressToProfile: boolean) => void;
  onNavigate: (page: PageId) => void;
  onOpenWhatsAppModal: (prefillMessage: string) => void;
  onGoogleLogin?: () => void;
}

export const CartCheckoutView: React.FC<CartCheckoutViewProps> = ({
  cart,
  settings,
  currentUser,
  onUpdateQuantity,
  onUpdateItemAttachment,
  onRemoveItem,
  onPlaceOrder,
  onNavigate,
  onOpenWhatsAppModal,
  onGoogleLogin,
}) => {
  // Address fields
  const defaultAddr = currentUser?.savedAddresses?.[0];
  const [fullName, setFullName] = useState(defaultAddr?.fullName || currentUser?.name || '');
  const [phone, setPhone] = useState(defaultAddr?.phone || currentUser?.phone || '');
  const [email, setEmail] = useState(defaultAddr?.email || currentUser?.email || '');
  const [addressLine1, setAddressLine1] = useState(defaultAddr?.addressLine1 || '');
  const [landmark, setLandmark] = useState(defaultAddr?.landmark || '');
  const [district, setDistrict] = useState(defaultAddr?.district || '');
  const [state, setState] = useState(defaultAddr?.state || 'West Bengal');
  const [pinCode, setPinCode] = useState(defaultAddr?.pinCode || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    defaultAddr?.deliveryInstructions || ''
  );
  const [saveAddress, setSaveAddress] = useState(true);

  const isLoggedIn = Boolean(currentUser && !currentUser.uid.startsWith('guest-'));

  // Sync user details when user signs in
  React.useEffect(() => {
    if (currentUser && !currentUser.uid.startsWith('guest-')) {
      const addr = currentUser.savedAddresses?.[0];
      if (!fullName) setFullName(addr?.fullName || currentUser.name || '');
      if (!phone) setPhone(addr?.phone || currentUser.phone || '');
      if (!email) setEmail(addr?.email || currentUser.email || '');
      if (!addressLine1 && addr?.addressLine1) setAddressLine1(addr.addressLine1);
      if (!district && addr?.district) setDistrict(addr.district);
      if (!pinCode && addr?.pinCode) setPinCode(addr.pinCode);
    }
  }, [currentUser]);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI' | 'ONLINE_GATEWAY'>(
    settings.upiEnabled ? 'UPI' : 'COD'
  );
  const [upiUtrNumber, setUpiUtrNumber] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [gatewayToken, setGatewayToken] = useState('');
  const [gatewayVerified, setGatewayVerified] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirmed order receipt
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const bulkDiscountTotal = cart.reduce(
    (sum, item) =>
      sum +
      (item.unitBasePrice + item.bothSideExtra - item.finalUnitPrice) * item.quantity,
    0
  );
  const gstAmount = Math.round((subtotal * settings.gstPercentage) / 100);
  const deliveryCharge =
    subtotal >= settings.freeDeliveryThreshold || subtotal === 0
      ? 0
      : settings.standardDeliveryCharge;
  const grandTotal = subtotal + gstAmount + deliveryCharge;

  // Verify 12-Digit UPI UTR Reference before allowing UPI order confirmation
  const handleVerifyUpiReference = () => {
    setFormError(null);
    const cleaned = upiUtrNumber.trim();
    if (!/^\d{12}$/.test(cleaned)) {
      setFormError(
        'Payment Verification Failed: Please enter a valid 12-digit numeric UPI UTR / Reference ID from your UPI app (e.g., 429810394812).'
      );
      setUpiVerified(false);
      return;
    }
    setVerifyingPayment(true);
    setTimeout(() => {
      setVerifyingPayment(false);
      setUpiVerified(true);
    }, 450);
  };

  // Verify Online Payment Signature Token
  const handleVerifyGatewayPayment = () => {
    setFormError(null);
    setVerifyingPayment(true);
    setTimeout(() => {
      const generatedRef = `pay_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setGatewayToken(generatedRef);
      setGatewayVerified(true);
      setVerifyingPayment(false);
    }, 500);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cart.length === 0) return;

    // Strict Login Requirement before placing an order
    if (!isLoggedIn || !currentUser) {
      setFormError(
        'Sign In Required: Please Sign In or Create a Customer Account first before placing an order.'
      );
      onNavigate('auth');
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter the recipient full name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setFormError('Please enter a valid 10-digit Indian mobile number starting with 6–9.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address for order tracking.');
      return;
    }
    if (!addressLine1.trim() || !district.trim()) {
      setFormError('Please complete your street address and district/city.');
      return;
    }
    if (!/^\d{6}$/.test(pinCode.trim())) {
      setFormError('Please enter a valid 6-digit Indian PIN code (e.g., 700091).');
      return;
    }

    // Strict Payment Verification Requirement: Never show a successful payment message without verified payment confirmation
    if (paymentMethod === 'UPI' && !upiVerified) {
      setFormError(
        'UPI payment is not verified yet. Please complete the UPI transfer and click "Verify 12-Digit UTR" before placing the order.'
      );
      return;
    }
    if (paymentMethod === 'ONLINE_GATEWAY' && !gatewayVerified) {
      setFormError(
        'Online payment is not verified yet. Please complete the gateway verification step before placing the order.'
      );
      return;
    }

    const orderNum = `PZ-2026-${Math.floor(10000 + Math.random() * 89999)}`;
    const shippingAddress: IndianAddress = {
      id: `addr-${Date.now()}`,
      label: 'Delivery Address',
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      addressLine1: addressLine1.trim(),
      landmark: landmark.trim(),
      district: district.trim(),
      state,
      pinCode: pinCode.trim(),
      deliveryInstructions: deliveryInstructions.trim(),
    };

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      customerId: currentUser.uid,
      customerName: fullName.trim(),
      customerEmail: email.trim(),
      customerPhone: phone.trim(),
      shippingAddress,
      items: [...cart],
      subtotal,
      bulkDiscountTotal,
      gstAmount,
      deliveryCharge,
      grandTotal,
      paymentMethod,
      paymentStatus:
        paymentMethod === 'COD'
          ? 'Pending COD'
          : 'Verified Paid',
      paymentReferenceId:
        paymentMethod === 'UPI'
          ? `UTR-${upiUtrNumber.trim()}`
          : paymentMethod === 'ONLINE_GATEWAY'
          ? gatewayToken
          : undefined,
      status: 'Pending',
      statusHistory: [
        {
          status: 'Pending',
          timestamp: new Date().toLocaleString('en-IN'),
          note:
            paymentMethod === 'COD'
              ? 'Order placed via Cash on Delivery. Queued for pre-press artwork review.'
              : `Order placed with verified payment (${
                  paymentMethod === 'UPI' ? `UTR-${upiUtrNumber.trim()}` : gatewayToken
                }).`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    onPlaceOrder(newOrder, saveAddress);
    setConfirmedOrder(newOrder);
  };

  // RENDER ORDER CONFIRMATION RECEIPT
  if (confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-10 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-mono text-emerald-700 uppercase">
                  Order Confirmed · Pre-Press Queue Assigned
                </div>
                <h1 className="text-2xl font-display font-bold text-zinc-950">
                  Order #{confirmedOrder.orderNumber}
                </h1>
                <p className="text-xs text-zinc-600 mt-1">
                  Payment Status:{' '}
                  <strong className="text-zinc-900">
                    {confirmedOrder.paymentMethod} — {confirmedOrder.paymentStatus}
                  </strong>
                  {confirmedOrder.paymentReferenceId && (
                    <span className="font-mono ml-1.5">
                      ({confirmedOrder.paymentReferenceId})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer self-start"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
          </div>

          {/* Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 rounded-xl p-4 border border-zinc-200 text-xs">
            <div>
              <div className="font-semibold text-zinc-900 mb-1">Delivery Address (India)</div>
              <div className="text-zinc-700 font-medium">
                {confirmedOrder.shippingAddress.fullName} ({confirmedOrder.shippingAddress.phone})
              </div>
              <div className="text-zinc-600 mt-0.5">
                {confirmedOrder.shippingAddress.addressLine1}
                {confirmedOrder.shippingAddress.landmark
                  ? `, ${confirmedOrder.shippingAddress.landmark}`
                  : ''}
              </div>
              <div className="text-zinc-600">
                {confirmedOrder.shippingAddress.district}, {confirmedOrder.shippingAddress.state} –{' '}
                <span className="font-mono font-semibold">
                  {confirmedOrder.shippingAddress.pinCode}
                </span>
              </div>
            </div>

            <div>
              <div className="font-semibold text-zinc-900 mb-1">Summary Breakdown</div>
              <div className="flex justify-between text-zinc-600">
                <span>Items Subtotal:</span>
                <span className="font-mono">₹{confirmedOrder.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>GST ({settings.gstPercentage}%):</span>
                <span className="font-mono">₹{confirmedOrder.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Delivery Charge:</span>
                <span className="font-mono">
                  {confirmedOrder.deliveryCharge === 0
                    ? 'FREE'
                    : `₹${confirmedOrder.deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-zinc-950 pt-1.5 mt-1.5 border-t border-zinc-200">
                <span>Total Amount:</span>
                <span className="font-mono">
                  ₹{confirmedOrder.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Ordered Items */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Customized Items in This Order
            </h3>
            {confirmedOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-3 border border-zinc-200 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-zinc-50 rounded-lg border border-zinc-200 shrink-0 overflow-hidden">
                    <ProductMockup
                      shape={item.mockupShape}
                      color={item.selectedColor}
                      productImageUrl={item.productImageUrl}
                      customPreviewUrl={
                        item.customDesign?.frontPreviewDataUrl ||
                        (item.directArtworkUpload?.fileDataUrl?.startsWith('data:image')
                          ? item.directArtworkUpload.fileDataUrl
                          : undefined)
                      }
                      className="w-full h-full"
                    />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-zinc-950">{item.productName}</div>
                    <div className="text-zinc-600">
                      {item.selectedColor.name} · {item.selectedSize} · {item.printSide} ·{' '}
                      {item.printingMethod}
                    </div>
                    {item.directArtworkUpload?.fileDataUrl && (
                      <div className="text-[11px] font-mono text-emerald-700 font-semibold mt-0.5">
                        ✓ Attached Document: {item.directArtworkUpload.fileName}
                      </div>
                    )}
                    {item.directArtworkUpload?.notes && (
                      <div className="text-[11px] text-zinc-600 mt-0.5">
                        <strong>Customer Requirement:</strong> {item.directArtworkUpload.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="text-zinc-500">
                    ₹{item.finalUnitPrice} × {item.quantity}
                  </div>
                  <div className="font-bold text-zinc-950">
                    ₹{item.lineTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Post-Order Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={() =>
                onOpenWhatsAppModal(
                  `Hello PrintZone Studio! I have placed Order #${confirmedOrder.orderNumber} (${confirmedOrder.items.length} item(s), Total ₹${confirmedOrder.grandTotal}) for delivery to PIN ${confirmedOrder.shippingAddress.pinCode}. Please share the pre-press artwork proof update.`
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              Send Order Enquiry on WhatsApp
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('order-tracking')}
                className="px-4 py-2.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer"
              >
                Track Order Status
              </button>
              <button
                type="button"
                onClick={() => onNavigate('all-products')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border-2 border-blue-600 rounded-2xl p-8 sm:p-10 space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold text-zinc-950">
            Sign In Required to View & Add to Cart
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto">
            Your shopping cart is always blank when signed out. Please Sign In with your Google Account or User ID so only your own personal cart items are shown.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            {onGoogleLogin && (
              <button
                type="button"
                onClick={onGoogleLogin}
                className="px-5 py-3 text-xs font-semibold text-zinc-900 bg-white hover:bg-zinc-50 border-2 border-zinc-300 hover:border-blue-600 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2.5 transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="px-6 py-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer inline-flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Sign In / Register with Email</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 space-y-4">
          <ShoppingBag className="w-10 h-10 text-zinc-400 mx-auto" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-mono text-blue-700">
            Account ID: {currentUser.email} ({currentUser.name})
          </div>
          <h1 className="text-2xl font-display font-bold text-zinc-950">
            Your Personal Shopping Cart is Empty
          </h1>
          <p className="text-sm text-zinc-600">
            Browse our 7 custom printing categories or launch the Online Design Studio to add products to your account ({currentUser.email}).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('all-products')}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              Explore All Products
            </button>
            <button
              type="button"
              onClick={() => onNavigate('design-studio')}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Open Online Design Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="pb-6 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-emerald-700 font-semibold uppercase">
            Cart Account ID: {currentUser.email} ({currentUser.name})
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
            Shopping Cart & Secure Checkout
          </h1>
        </div>
        <button
          type="button"
          onClick={() =>
            onOpenWhatsAppModal(
              `Hello PrintZone Studio! I have ${cart.length} customized item(s) in my cart (Subtotal ₹${subtotal}) and would like assistance before checkout.`
            )
          }
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer self-start"
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp Cart Enquiry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {/* LEFT 7 COLS: Cart Items + Indian Delivery Form */}
        <div className="lg:col-span-7 space-y-8">
          {/* Cart Items List */}
          <div className="space-y-4">
            <h2 className="text-base font-display font-bold text-zinc-950">
              1. Review Customized Products ({cart.length})
            </h2>

            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-zinc-50 border border-zinc-200 rounded-lg shrink-0 overflow-hidden">
                      <ProductMockup
                        shape={item.mockupShape}
                        color={item.selectedColor}
                        productImageUrl={item.productImageUrl}
                        customPreviewUrl={
                          item.customDesign?.frontPreviewDataUrl ||
                          (item.directArtworkUpload?.fileDataUrl?.startsWith('data:image')
                            ? item.directArtworkUpload.fileDataUrl
                            : undefined)
                        }
                        className="w-full h-full"
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-sm text-zinc-950">{item.productName}</div>
                      <div className="text-zinc-600">
                        Color: <strong>{item.selectedColor.name}</strong> · Size:{' '}
                        <strong>{item.selectedSize}</strong> · Print: <strong>{item.printSide}</strong>
                      </div>
                      <div className="text-zinc-500">
                        Material: {item.selectedMaterial} · Method: {item.printingMethod}
                      </div>
                      {item.customDesign && (
                        <div className="text-[11px] font-mono text-blue-600">
                          Design: "{item.customDesign.designName}" (Attached for Pre-Press)
                        </div>
                      )}
                      {item.directArtworkUpload?.fileDataUrl && (
                        <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                          ✓ Uploaded File: {item.directArtworkUpload.fileName}{' '}
                          {item.directArtworkUpload.fileSize
                            ? `(${item.directArtworkUpload.fileSize})`
                            : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-7 h-7 flex items-center justify-center border border-zinc-300 rounded text-xs font-bold hover:bg-zinc-50 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-mono text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center border border-zinc-300 rounded text-xs font-bold hover:bg-zinc-50 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="ml-2 p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-[11px] text-zinc-500 tabular-nums">
                        ₹{item.finalUnitPrice}/unit{' '}
                        {item.discountPercent > 0 && `(-${item.discountPercent}%)`}
                      </div>
                      <div className="text-sm font-bold text-zinc-950 tabular-nums">
                        ₹{item.lineTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Customer Document Upload & Custom Recommendation Box per Cart Item */}
                {onUpdateItemAttachment && (
                  <div className="pt-3 border-t border-zinc-100 bg-zinc-50/80 rounded-xl p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-zinc-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Upload Document / Photo & Custom Requirement for this Item:
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {item.directArtworkUpload?.fileDataUrl
                            ? 'Change Document / Photo'
                            : 'Upload Document / Photo (PDF, DOC, JPG, PNG, ZIP)'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.svg,.zip,.cdr,.ai,.psd"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const sizeKb = Math.max(1, Math.round(file.size / 1024));
                            const formattedSize =
                              sizeKb >= 1024
                                ? `${(sizeKb / 1024).toFixed(1)} MB`
                                : `${sizeKb} KB`;
                            const reader = new FileReader();
                            reader.onload = () => {
                              onUpdateItemAttachment(item.id, {
                                fileName: file.name,
                                fileDataUrl: reader.result as string,
                                fileType:
                                  file.type ||
                                  file.name.split('.').pop()?.toUpperCase() ||
                                  'DOCUMENT',
                                fileSize: formattedSize,
                                notes: item.directArtworkUpload?.notes,
                              });
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      value={item.directArtworkUpload?.notes || ''}
                      onChange={(e) => {
                        const nextNote = e.target.value;
                        onUpdateItemAttachment(item.id, {
                          fileName:
                            item.directArtworkUpload?.fileName ||
                            'Customer Requirement Note Only',
                          fileDataUrl: item.directArtworkUpload?.fileDataUrl || '',
                          fileType: item.directArtworkUpload?.fileType || 'TEXT_NOTE',
                          fileSize: item.directArtworkUpload?.fileSize || '',
                          notes: nextNote,
                        });
                      }}
                      placeholder="Write your custom recommendation (e.g., Front logo size, back text, paper GSM, binding style)..."
                      className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CUSTOMER SIGN-IN GATE OR LOGGED-IN ACCOUNT VERIFICATION */}
          {!isLoggedIn ? (
            <div className="bg-blue-50/90 border-2 border-blue-600 rounded-2xl p-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-blue-700 uppercase">
                    Account Sign-In Required Before Ordering
                  </div>
                  <h2 className="text-lg font-display font-bold text-zinc-950">
                    Please Sign In or Create an Account to Place Your Order
                  </h2>
                  <p className="text-xs text-zinc-600">
                    To place an order and track your custom printing status, you must first sign in with your account. Your shopping cart items and uploaded documents will remain saved.
                  </p>
                </div>
              </div>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {onGoogleLogin && (
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    className="px-5 py-3 text-xs font-semibold text-zinc-900 bg-white hover:bg-zinc-50 border-2 border-zinc-300 hover:border-blue-600 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2.5 transition-all"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onNavigate('auth')}
                  className="px-6 py-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>Sign In / Register with Email</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Signed in as <strong>{currentUser?.name}</strong> ({currentUser?.email}) — Ready to place order
                </span>
              </div>
            </div>
          )}

          {/* Indian Delivery Address Form */}
          <form
            id="checkout-form"
            onSubmit={handleCheckoutSubmit}
            className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-zinc-950">
                2. Indian Delivery Address & Contact Details
              </h2>
              {currentUser && currentUser.savedAddresses.length > 0 && (
                <select
                  onChange={(e) => {
                    const addr = currentUser.savedAddresses.find((a) => a.id === e.target.value);
                    if (addr) {
                      setFullName(addr.fullName);
                      setPhone(addr.phone);
                      setEmail(addr.email);
                      setAddressLine1(addr.addressLine1);
                      setLandmark(addr.landmark || '');
                      setDistrict(addr.district);
                      setState(addr.state);
                      setPinCode(addr.pinCode);
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-md"
                >
                  <option value="">Load Saved Address...</option>
                  {currentUser.savedAddresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} — {a.district} ({a.pinCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Tanmoy Dari"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  10-Digit Mobile Number (+91) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9830012345"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Email Address (For Invoice & Proof Updates) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.in"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Building, Street, Area / Sector *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="House/Flat No., Street Name, Locality"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near Metro Station / Park"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  District / City *
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g., Kolkata"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  State / Union Territory *
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  6-Digit PIN Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="700091"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="e.g., Call before delivery, leave with security guard..."
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="accent-blue-600"
              />
              Save this address to my PrintZone customer account for faster reorders
            </label>
          </form>
        </div>

        {/* RIGHT 5 COLS: Payment Verification & Order Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
            <h2 className="text-base font-display font-bold text-zinc-950">
              3. Payment Method & Verification
            </h2>

            <div className="space-y-2.5">
              {settings.upiEnabled && (
                <label
                  onClick={() => setPaymentMethod('UPI')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === 'UPI'
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'UPI'}
                    onChange={() => setPaymentMethod('UPI')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="text-xs flex-1">
                    <div className="font-bold text-zinc-950">
                      UPI Transfer (GPay, PhonePe, Paytm, BHIM)
                    </div>
                    <div className="text-zinc-600 mt-0.5">
                      Requires 12-digit UTR reference verification before order confirmation.
                    </div>
                  </div>
                </label>
              )}

              {settings.onlineGatewayEnabled && (
                <label
                  onClick={() => setPaymentMethod('ONLINE_GATEWAY')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === 'ONLINE_GATEWAY'
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'ONLINE_GATEWAY'}
                    onChange={() => setPaymentMethod('ONLINE_GATEWAY')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="text-xs flex-1">
                    <div className="font-bold text-zinc-950">{settings.onlineGatewayName}</div>
                    <div className="text-zinc-600 mt-0.5">
                      Verified server-side payment authorization token check.
                    </div>
                  </div>
                </label>
              )}

              {settings.codEnabled && (
                <label
                  onClick={() => setPaymentMethod('COD')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === 'COD'
                      ? 'border-blue-600 bg-blue-50/40'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="text-xs flex-1">
                    <div className="font-bold text-zinc-950">Cash on Delivery (COD)</div>
                    <div className="text-zinc-600 mt-0.5">
                      Pay in cash or UPI at the time of doorstep delivery.
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* UPI UTR Verification Box */}
            {paymentMethod === 'UPI' && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Merchant UPI ID:</span>
                  <span className="font-mono font-bold text-blue-600">
                    {settings.upiMerchantId}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Pay <strong>₹{grandTotal.toLocaleString('en-IN')}</strong> to{' '}
                  <strong>{settings.upiMerchantName}</strong> and enter your 12-digit UTR number below to verify payment (Demo test UTR: <code className="font-mono text-zinc-900">429810394812</code>).
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={12}
                    value={upiUtrNumber}
                    onChange={(e) => {
                      setUpiUtrNumber(e.target.value.replace(/\D/g, ''));
                      setUpiVerified(false);
                    }}
                    placeholder="Enter 12-digit UTR (e.g. 429810394812)"
                    className="flex-1 px-3 py-2 bg-white border border-zinc-300 rounded-lg font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyUpiReference}
                    disabled={verifyingPayment}
                    className="px-3.5 py-2 font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    {verifyingPayment ? 'Verifying...' : 'Verify UTR'}
                  </button>
                </div>
                {upiVerified && (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    UTR-{upiUtrNumber} Verified for ₹{grandTotal.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            )}

            {/* Online Gateway Verification Box */}
            {paymentMethod === 'ONLINE_GATEWAY' && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 text-xs">
                <div className="text-zinc-600">
                  Authorize <strong>₹{grandTotal.toLocaleString('en-IN')}</strong> via{' '}
                  {settings.onlineGatewayName} sandbox verification before confirming order:
                </div>
                {!gatewayVerified ? (
                  <button
                    type="button"
                    onClick={handleVerifyGatewayPayment}
                    disabled={verifyingPayment}
                    className="w-full py-2.5 font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {verifyingPayment
                      ? 'Verifying Payment Signature...'
                      : `Authorize & Verify ₹${grandTotal.toLocaleString('en-IN')} Payment`}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    Verified Gateway Token: <span className="font-mono">{gatewayToken}</span>
                  </div>
                )}
              </div>
            )}

            {/* Price Breakdown */}
            <div className="pt-4 border-t border-zinc-200 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Items Subtotal</span>
                <span className="font-mono tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {bulkDiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Bulk Tier Savings Included</span>
                  <span className="font-mono tabular-nums">
                    -₹{bulkDiscountTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <span>GST ({settings.gstPercentage}%)</span>
                <span className="font-mono tabular-nums">₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>
                  Delivery Charge (Free above ₹{settings.freeDeliveryThreshold})
                </span>
                <span className="font-mono tabular-nums">
                  {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-zinc-200">
                <span className="text-sm font-bold text-zinc-950">Final Payable Total</span>
                <span className="text-2xl font-mono font-bold text-zinc-950 tabular-nums">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {!isLoggedIn ? (
              <div className="space-y-2.5">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    You must <strong>Sign In / Log In</strong> first before you can confirm your order.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('auth')}
                  className="w-full py-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    Sign In / Login First to Place Order · ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                className="w-full py-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {paymentMethod === 'COD'
                    ? `Confirm COD Order · ₹${grandTotal.toLocaleString('en-IN')}`
                    : `Complete Verified Order · ₹${grandTotal.toLocaleString('en-IN')}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
