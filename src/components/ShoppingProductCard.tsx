import React, { useRef, useState } from 'react';
import { CartItem, Product, ProductColor } from '../types';
import { ProductMockup } from './ProductMockup';
import {
  ShoppingBag,
  Sliders,
  Plus,
  Minus,
  Check,
  Zap,
  Upload,
  FileText,
  X,
} from 'lucide-react';

interface ShoppingProductCardProps {
  product: Product;
  cart: CartItem[];
  onQuickAddToCart: (
    product: Product,
    selectedColor: ProductColor,
    selectedSize: string,
    quantity: number,
    openDrawer?: boolean,
    directArtworkUpload?: CartItem['directArtworkUpload']
  ) => void;
  onUpdateCartQuantity: (cartItemId: string, nextQty: number) => void;
  onRemoveCartItem: (cartItemId: string) => void;
  onBuyNow: (
    product: Product,
    selectedColor: ProductColor,
    selectedSize: string,
    quantity: number,
    directArtworkUpload?: CartItem['directArtworkUpload']
  ) => void;
  onViewDetails: (product: Product) => void;
  onCustomize: (product: Product) => void;
}

export const ShoppingProductCard: React.FC<ShoppingProductCardProps> = ({
  product,
  cart,
  onQuickAddToCart,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onBuyNow,
  onViewDetails,
  onCustomize,
}) => {
  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    product.colors[0] || { name: 'Standard', hex: '#18181B' }
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes[1] || product.sizes[0] || 'Standard'
  );
  const [justAdded, setJustAdded] = useState(false);

  // Customer Document / Picture Upload & Requirement Note right on the Shopping Card
  const [showDocUploadPanel, setShowDocUploadPanel] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<{
    fileName: string;
    fileDataUrl: string;
    fileType: string;
    fileSize: string;
  } | null>(null);
  const [customNote, setCustomNote] = useState('');
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const formattedSize =
      sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedDoc({
        fileName: file.name,
        fileDataUrl: reader.result as string,
        fileType: file.type || file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
        fileSize: formattedSize,
      });
      setShowDocUploadPanel(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const buildDirectUploadPayload = (): CartItem['directArtworkUpload'] | undefined => {
    if (!uploadedDoc && !customNote.trim()) return undefined;
    return {
      fileName: uploadedDoc ? uploadedDoc.fileName : 'Customer Requirement Note Only',
      fileDataUrl: uploadedDoc ? uploadedDoc.fileDataUrl : '',
      fileType: uploadedDoc ? uploadedDoc.fileType : 'TEXT_NOTE',
      fileSize: uploadedDoc ? uploadedDoc.fileSize : '',
      notes: customNote.trim() || undefined,
    };
  };

  // Check if this product + color + size is already in the cart (without custom attachment)
  const matchingCartItem = cart.find(
    (item) =>
      item.productId === product.id &&
      item.selectedColor.name === selectedColor.name &&
      item.selectedSize === selectedSize &&
      !item.customDesign &&
      !uploadedDoc &&
      !customNote.trim()
  );

  // Calculate display MRP and discount for shopping card feel
  const mrp = Math.round(product.basePrice * 1.35);
  const discountPct = Math.max(15, Math.round(((mrp - product.basePrice) / mrp) * 100));

  const handleAddClick = () => {
    const payload = buildDirectUploadPayload();
    onQuickAddToCart(
      product,
      selectedColor,
      selectedSize,
      product.minOrderQty,
      true,
      payload
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const isUploadedImage =
    uploadedDoc?.fileDataUrl && uploadedDoc.fileDataUrl.startsWith('data:image');

  return (
    <div className="group bg-white border border-zinc-200 hover:border-blue-600 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md">
      <div>
        {/* Product Picture Format Area */}
        <div className="relative aspect-4/3 bg-zinc-100 rounded-xl mb-3.5 overflow-hidden border border-zinc-200/80">
          <div
            onClick={() => onViewDetails(product)}
            className="w-full h-full flex items-center justify-center cursor-pointer transition-transform duration-300 group-hover:scale-105"
          >
            <ProductMockup
              shape={product.mockupShape}
              color={selectedColor}
              graphicText={product.defaultGraphicText}
              graphicSubtext={product.defaultGraphicSubtext}
              accentColor={product.defaultAccentColor}
              productImageUrl={product.imageUrl}
              customPreviewUrl={isUploadedImage ? uploadedDoc.fileDataUrl : undefined}
              className="w-full h-full"
            />
          </div>

          {/* Quick Customize Button on Image Corner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCustomize(product);
            }}
            title="Customize in Design Studio"
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-900 bg-white/95 hover:bg-blue-600 hover:text-white border border-zinc-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            Design Studio
          </button>

          {product.minOrderQty > 1 && (
            <span className="absolute bottom-2.5 left-2.5 text-[10px] font-mono font-semibold text-zinc-800 bg-white/95 px-2 py-0.5 rounded border border-zinc-200 shadow-2xs">
              Min Qty: {product.minOrderQty}
            </span>
          )}
        </div>

        {/* Category & Subcategory Metadata */}
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
          <span className="truncate">{product.subcategory}</span>
          <span className="text-emerald-700 font-semibold shrink-0">In Stock</span>
        </div>

        {/* Product Title */}
        <h3
          onClick={() => onViewDetails(product)}
          className="text-base font-display font-bold text-zinc-950 mt-1 cursor-pointer group-hover:text-blue-600 line-clamp-1"
        >
          {product.name}
        </h3>

        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
          {product.shortDescription}
        </p>

        {/* Interactive Color Swatches & Size Selector right on Card */}
        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
          {/* Color Swatches */}
          <div className="flex items-center gap-1.5">
            {product.colors.slice(0, 5).map((col) => {
              const active = selectedColor.name === col.name;
              return (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => setSelectedColor(col)}
                  title={`Color: ${col.name}`}
                  style={{ backgroundColor: col.hex }}
                  className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                    active
                      ? 'ring-2 ring-blue-600 ring-offset-1 scale-110 border-zinc-400'
                      : 'border-zinc-300 hover:scale-105'
                  }`}
                />
              );
            })}
          </div>

          {/* Size Dropdown */}
          {product.sizes.length > 0 && (
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              aria-label="Select Size"
              className="px-2 py-1 text-[11px] font-mono font-medium bg-zinc-50 border border-zinc-200 rounded-md text-zinc-800 focus:outline-none focus:border-blue-600 cursor-pointer max-w-[125px] truncate"
            >
              {product.sizes.map((sz) => (
                <option key={sz} value={sz}>
                  Size: {sz}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Customer Document / Picture Upload & Custom Recommendation Toggle */}
        <div className="mt-2.5">
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.svg,.zip,.cdr,.ai,.psd"
            onChange={handleFileChange}
            className="hidden"
          />

          {!showDocUploadPanel && !uploadedDoc && !customNote ? (
            <button
              type="button"
              onClick={() => setShowDocUploadPanel(true)}
              className="w-full py-1.5 px-2.5 text-[11px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Your Document / Photo & Custom Note</span>
            </button>
          ) : (
            <div className="bg-zinc-50 border border-blue-200 rounded-xl p-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-800 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Your Document & Print Requirement
                </span>
                <button
                  type="button"
                  onClick={() => setShowDocUploadPanel(false)}
                  className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                  title="Minimize"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {uploadedDoc ? (
                <div className="flex items-center justify-between gap-2 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-emerald-800 truncate">
                      ✓ {uploadedDoc.fileName}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {uploadedDoc.fileSize} · Ready for printing
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedDoc(null)}
                    className="text-[10px] font-semibold text-red-600 hover:underline shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="w-full py-1.5 px-2.5 text-[11px] font-semibold text-zinc-800 bg-white hover:bg-zinc-100 border border-dashed border-zinc-300 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Choose File (PDF, DOC, JPG, PNG, CDR, ZIP)
                </button>
              )}

              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Write your custom requirement (e.g., Front pocket logo, back name, paper GSM, exact size)..."
                className="w-full px-2.5 py-1.5 text-[11px] bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          )}
        </div>
      </div>

      {/* Price & Shopping Cart Actions */}
      <div className="mt-4 pt-3 border-t border-zinc-100 space-y-3">
        {/* Price Row */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-extrabold text-zinc-950 tabular-nums">
              ₹{product.basePrice}
            </span>
            <span className="text-xs font-mono text-zinc-400 line-through tabular-nums">
              ₹{mrp}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
              {discountPct}% OFF
            </span>
          </div>
          <button
            type="button"
            onClick={() => onViewDetails(product)}
            className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Full Details
          </button>
        </div>

        {/* Cart Buttons or Quantity Stepper */}
        {matchingCartItem ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between bg-zinc-100 border border-zinc-300 rounded-xl px-2 py-1.5">
              <button
                type="button"
                onClick={() => {
                  if (matchingCartItem.quantity <= product.minOrderQty) {
                    onRemoveCartItem(matchingCartItem.id);
                  } else {
                    onUpdateCartQuantity(
                      matchingCartItem.id,
                      matchingCartItem.quantity - 1
                    );
                  }
                }}
                className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-800 hover:bg-zinc-200 cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-mono font-bold text-zinc-950 tabular-nums">
                {matchingCartItem.quantity} in Cart
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateCartQuantity(matchingCartItem.id, matchingCartItem.quantity + 1)
                }
                className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-800 hover:bg-zinc-200 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onBuyNow(
                  product,
                  selectedColor,
                  selectedSize,
                  matchingCartItem.quantity,
                  buildDirectUploadPayload()
                )
              }
              className="py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              Buy Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleAddClick}
              className={`py-2.5 px-3 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Add to Cart
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                onBuyNow(
                  product,
                  selectedColor,
                  selectedSize,
                  product.minOrderQty,
                  buildDirectUploadPayload()
                )
              }
              className="py-2.5 px-3 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-zinc-950 hover:text-white border border-zinc-300 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              Buy Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
