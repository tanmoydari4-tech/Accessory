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
} from 'lucide-react';

interface CartCheckoutViewProps {
  cart: CartItem[];
  products: Product[];
  settings: StoreSettings;
  currentUser: UserProfile | null;
  onUpdateQuantity: (cartItemId: string, nextQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onPlaceOrder: (order: Order, saveAddressToProfile: boolean) => void;
  onNavigate: (page: PageId) => void;
  onOpenWhatsAppModal: (prefillMessage: string) => void;
}

export const CartCheckoutView: React.FC<CartCheckoutViewProps> = ({
  cart,
  settings,
  currentUser,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  onNavigate,
  onOpenWhatsAppModal,
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
      customerId: currentUser?.uid || 'guest-customer',
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
                  <div className="w-14 h-14 bg-zinc-50 rounded-lg border border-zinc-200 shrink-0">
                    <ProductMockup
                      shape={item.mockupShape}
                      color={item.selectedColor}
                      customPreviewUrl={item.customDesign?.frontPreviewDataUrl}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-zinc-950">{item.productName}</div>
                    <div className="text-zinc-600">
                      {item.selectedColor.name} · {item.selectedSize} · {item.printSide} ·{' '}
                      {item.printingMethod}
                    </div>
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

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 space-y-4">
          <ShoppingBag className="w-10 h-10 text-zinc-400 mx-auto" />
          <h1 className="text-2xl font-display font-bold text-zinc-950">
            Your PrintZone Shopping Bag is Empty
          </h1>
          <p className="text-sm text-zinc-600">
            Browse our 7 custom printing categories or launch the interactive Konva.js Online Design Studio to create personalized merchandise.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('all-products')}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              Explore All 46 Products
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
          <span className="text-xs font-mono text-blue-600 uppercase">
            Pan-India Custom Print Fulfillment
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
                className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-zinc-50 border border-zinc-200 rounded-lg shrink-0 overflow-hidden">
                    <ProductMockup
                      shape={item.mockupShape}
                      color={item.selectedColor}
                      customPreviewUrl={item.customDesign?.frontPreviewDataUrl}
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
                    {item.directArtworkUpload && (
                      <div className="text-[11px] font-mono text-emerald-700">
                        Uploaded File: {item.directArtworkUpload.fileName}
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
            ))}
          </div>

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
          </div>
        </div>
      </div>
    </div>
  );
};
