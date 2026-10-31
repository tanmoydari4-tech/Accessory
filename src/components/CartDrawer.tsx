import React from 'react';
import { CartItem, StoreSettings, UserProfile } from '../types';
import { ProductMockup } from './ProductMockup';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Truck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  settings: StoreSettings;
  currentUser?: UserProfile | null;
  onUpdateQuantity: (cartItemId: string, nextQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToCheckout: () => void;
  onGoogleLogin?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  settings,
  currentUser,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onGoogleLogin,
}) => {
  if (!isOpen) return null;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.lineTotal, 0);
  const gstAmount = Math.round((subtotal * settings.gstPercentage) / 100);
  const deliveryCharge =
    subtotal >= settings.freeDeliveryThreshold || subtotal === 0
      ? 0
      : settings.standardDeliveryCharge;
  const grandTotal = subtotal + gstAmount + deliveryCharge;
  const amountForFreeDelivery = Math.max(0, settings.freeDeliveryThreshold - subtotal);
  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotal / settings.freeDeliveryThreshold) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-Over Cart Panel */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-zinc-200 animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div>
          <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-950 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShoppingBag className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base font-display font-bold truncate">
                  Your Shopping Cart ({totalItems})
                </h2>
                {currentUser ? (
                  <p className="text-[11px] font-mono text-emerald-400 truncate">
                    ID: {currentUser.email} ({currentUser.name})
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-400">
                    Not Signed In · Cart is Blank
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Signed-in Account ID Banner */}
          {currentUser && (
            <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
              <span className="truncate">
                Showing Cart for ID: <strong className="font-mono">{currentUser.email}</strong>
              </span>
              <span className="font-mono text-[10px] text-emerald-700 shrink-0 ml-2">
                Verified Account
              </span>
            </div>
          )}

          {/* Free Shipping Progress Strip (Only when signed in) */}
          {currentUser && (
            <div className="px-5 py-3 bg-blue-50/80 border-b border-blue-100">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-950">
                {amountForFreeDelivery === 0 && subtotal > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Congratulations! You have unlocked <strong>FREE Delivery</strong>!
                    </span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Add <strong className="font-mono">₹{amountForFreeDelivery}</strong> more for{' '}
                      <strong>FREE Delivery</strong> across India!
                    </span>
                  </>
                )}
              </div>
              <div className="w-full h-1.5 bg-blue-200 rounded-full mt-2 overflow-hidden">
                <div
                  style={{ width: `${freeShippingProgress}%` }}
                  className="h-full bg-blue-600 transition-all duration-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* Cart Items Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {!currentUser ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 px-3 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="text-base font-display font-bold text-zinc-950">
                  Sign In to Use Your Personal Cart
                </div>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Your cart is always blank until you sign in. Sign in with your Google Account or User ID to view and add items to your personal cart!
                </p>
              </div>

              <div className="w-full max-w-xs space-y-2.5 pt-2">
                {onGoogleLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoogleLogin();
                    }}
                    className="w-full py-3 px-4 text-xs font-semibold text-zinc-900 bg-white hover:bg-zinc-50 border-2 border-zinc-300 hover:border-blue-600 rounded-xl cursor-pointer flex items-center justify-center gap-2.5 shadow-xs transition-all"
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
                  onClick={() => {
                    onClose();
                    onProceedToCheckout();
                  }}
                  className="w-full py-3 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In / Register with Email</span>
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="text-base font-display font-bold text-zinc-900">
                Your Cart is Empty
              </div>
              <div className="text-[11px] font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
                Signed in as: {currentUser.email}
              </div>
              <p className="text-xs text-zinc-500 max-w-xs">
                Browse our T-shirts, mugs, tote bags, calendars, and gifts and click "Add to Cart" to add items to your account!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex gap-3 items-start"
              >
                {/* Product Thumbnail */}
                <div className="w-16 h-16 bg-white border border-zinc-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
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

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-zinc-950 truncate">
                      {item.productName}
                    </h4>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      title="Remove item"
                      className="text-zinc-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Color: <strong className="text-zinc-700">{item.selectedColor.name}</strong> · Size:{' '}
                    <strong className="text-zinc-700">{item.selectedSize}</strong>
                  </div>

                  {item.customDesign && (
                    <div className="text-[10px] font-mono text-blue-600 font-semibold mt-0.5">
                      ✓ Customized Print Design Attached
                    </div>
                  )}

                  {item.directArtworkUpload && (
                    <div className="mt-1 space-y-0.5">
                      {item.directArtworkUpload.fileDataUrl && (
                        <div className="text-[10px] font-mono text-emerald-700 font-semibold truncate">
                          ✓ Doc: {item.directArtworkUpload.fileName}
                        </div>
                      )}
                      {item.directArtworkUpload.notes && (
                        <div className="text-[10px] text-zinc-600 bg-white border border-zinc-200 rounded px-1.5 py-0.5 line-clamp-2">
                          <strong>Note:</strong> {item.directArtworkUpload.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stepper & Line Total */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-200/70">
                    <div className="flex items-center gap-1.5 bg-white border border-zinc-300 rounded-lg px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity <= 1) {
                            onRemoveItem(item.id);
                          } else {
                            onUpdateQuantity(item.id, item.quantity - 1);
                          }
                        }}
                        className="w-5 h-5 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 rounded cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold px-1.5 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-5 h-5 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 rounded cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-zinc-950 tabular-nums">
                        ₹{item.lineTotal.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-zinc-400 tabular-nums">
                        ₹{item.finalUnitPrice}/pc
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Checkout Summary */}
        {cart.length > 0 && (
          <div className="p-5 bg-zinc-50 border-t border-zinc-200 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Items Subtotal ({totalItems} items)</span>
                <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>GST ({settings.gstPercentage}%)</span>
                <span className="font-mono tabular-nums">
                  ₹{gstAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Delivery Charge</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-zinc-950 pt-2 border-t border-zinc-200">
                <span>Total Amount</span>
                <span className="font-mono text-base tabular-nums">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {!currentUser && (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    Please <strong>Sign In / Login</strong> to complete your order.
                  </span>
                </div>

                {onGoogleLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoogleLogin();
                    }}
                    className="w-full py-3 px-4 text-xs font-semibold text-zinc-900 bg-white hover:bg-zinc-100 border-2 border-zinc-300 hover:border-blue-600 rounded-xl cursor-pointer flex items-center justify-center gap-2.5 shadow-xs transition-all"
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
                    <span>Sign in with Google & Order</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <span>
                {currentUser
                  ? 'Proceed to Checkout & Address'
                  : 'Sign In with Email & Proceed'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
