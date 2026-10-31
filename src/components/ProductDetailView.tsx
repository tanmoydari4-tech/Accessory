import React, { useRef, useState } from 'react';
import { CartItem, PageId, Product, ProductColor, SampleDesign } from '../types';
import { ProductMockup } from './ProductMockup';
import {
  Sliders,
  Upload,
  ShoppingBag,
  ArrowLeft,
  Check,
  Clock,
  Truck,
  Layers,
  FileText,
  X,
} from 'lucide-react';

interface ProductDetailViewProps {
  product: Product;
  relatedProducts: Product[];
  sampleDesigns: SampleDesign[];
  onBack: () => void;
  onSelectProduct: (prod: Product) => void;
  onOpenInStudio: (prod: Product, sample?: SampleDesign) => void;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (page: PageId) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  relatedProducts,
  sampleDesigns,
  onBack,
  onSelectProduct,
  onOpenInStudio,
  onAddToCart,
}) => {
  const [selectedColor, setSelectedColor] = useState<ProductColor>(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(product.materials[0]);
  const [printingMethod, setPrintingMethod] = useState<string>(product.printingMethods[0]);
  const [printSide, setPrintSide] = useState<Product['printPositions'][number]>(
    product.printPositions[0]
  );
  const [previewSide, setPreviewSide] = useState<'Front' | 'Back'>('Front');
  const [quantity, setQuantity] = useState<number>(Math.max(1, product.minOrderQty));
  const [uploadedFile, setUploadedFile] = useState<{
    fileName: string;
    fileDataUrl: string;
    fileType: string;
    fileSize: string;
  } | null>(null);
  const [customerRequirementNote, setCustomerRequirementNote] = useState<string>('');
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if user clicks a related product
  React.useEffect(() => {
    setSelectedColor(product.colors[0]);
    setSelectedSize(product.sizes[0]);
    setSelectedMaterial(product.materials[0]);
    setPrintingMethod(product.printingMethods[0]);
    setPrintSide(product.printPositions[0]);
    setPreviewSide('Front');
    setQuantity(Math.max(1, product.minOrderQty));
    setUploadedFile(null);
    setCustomerRequirementNote('');
  }, [product]);

  const applicableDiscount = product.bulkTiers.reduce(
    (acc, tier) => (quantity >= tier.minQty ? Math.max(acc, tier.discountPercent) : acc),
    0
  );
  const bothSidesExtra =
    printSide === 'Both Sides' ? product.bothSideExtraPrice : 0;
  const rawUnitPrice = product.basePrice + bothSidesExtra;
  const finalUnitPrice = Math.round(rawUnitPrice * (1 - applicableDiscount / 100));
  const totalAmount = finalUnitPrice * quantity;

  const handleDirectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const formattedSize =
      sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        fileName: file.name,
        fileDataUrl: reader.result as string,
        fileType: file.type || file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
        fileSize: formattedSize,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddProductToCart = () => {
    const hasUploadOrNote = Boolean(uploadedFile || customerRequirementNote.trim());
    const item: CartItem = {
      id: `cart-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      categoryName: product.categoryName,
      sku: product.sku,
      mockupShape: product.mockupShape,
      productImageUrl: product.imageUrl,
      selectedColor,
      selectedSize,
      selectedMaterial,
      printingMethod,
      printSide,
      quantity,
      unitBasePrice: product.basePrice,
      bothSideExtra: bothSidesExtra,
      discountPercent: applicableDiscount,
      finalUnitPrice,
      lineTotal: totalAmount,
      directArtworkUpload: hasUploadOrNote
        ? {
            fileName: uploadedFile
              ? uploadedFile.fileName
              : 'Customer Requirement Note Only',
            fileDataUrl: uploadedFile ? uploadedFile.fileDataUrl : '',
            fileType: uploadedFile ? uploadedFile.fileType : 'TEXT_NOTE',
            fileSize: uploadedFile ? uploadedFile.fileSize : '',
            notes: customerRequirementNote.trim() || undefined,
          }
        : undefined,
    };
    onAddToCart(item);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const matchingSamples = sampleDesigns.filter(
    (s) => s.productId === product.id || s.categoryId === product.categoryId
  );

  const isUploadedImage =
    uploadedFile?.fileDataUrl && uploadedFile.fileDataUrl.startsWith('data:image');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Shopping Catalog
      </button>

      {/* Contiguous 2-Column Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT 6 COLS: Sticky Product Picture Preview & Front/Back Toggle */}
        <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-4">
          <div className="aspect-square bg-zinc-100 border border-zinc-200 rounded-2xl relative flex items-center justify-center overflow-hidden">
            <ProductMockup
              shape={product.mockupShape}
              color={selectedColor}
              side={previewSide}
              graphicText={product.defaultGraphicText}
              graphicSubtext={product.defaultGraphicSubtext}
              accentColor={product.defaultAccentColor}
              productImageUrl={product.imageUrl}
              customPreviewUrl={isUploadedImage ? uploadedFile.fileDataUrl : undefined}
              className="w-full h-full"
            />

            {/* Front / Back Switcher */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-zinc-200 shadow-xs">
              <button
                type="button"
                onClick={() => setPreviewSide('Front')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  previewSide === 'Front'
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Front View
              </button>
              <button
                type="button"
                onClick={() => setPreviewSide('Back')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  previewSide === 'Back'
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Back View
              </button>
            </div>
          </div>

          {/* Matching Sample Designs for Quick Launch */}
          {matchingSamples.length > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-zinc-800 mb-3">
                Sample Designs for {product.categoryName} (Click to Customize)
              </div>
              <div className="grid grid-cols-3 gap-3">
                {matchingSamples.slice(0, 3).map((smp) => (
                  <button
                    key={smp.id}
                    type="button"
                    onClick={() => onOpenInStudio(product, smp)}
                    className="group bg-white border border-zinc-200 hover:border-blue-600 rounded-lg p-2 text-left transition-colors cursor-pointer"
                  >
                    <div className="aspect-square bg-zinc-50 rounded mb-1.5 overflow-hidden">
                      <ProductMockup
                        shape={smp.mockupShape}
                        color={smp.productColor}
                        elements={smp.frontElements}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="text-[11px] font-semibold text-zinc-900 truncate group-hover:text-blue-600">
                      {smp.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 6 COLS: Purchase Module, Options, Document Upload & Bulk Calculator */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            {/* Zero-Pill Unboxed Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-mono">
              <span>{product.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span>{product.subcategory}</span>
              <span aria-hidden="true">·</span>
              <span>SKU: {product.sku}</span>
              <span aria-hidden="true">·</span>
              <span className={product.inStock ? 'text-emerald-700 font-semibold' : 'text-red-600'}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-2">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-3xl font-mono font-bold text-zinc-950 tabular-nums">
                ₹{finalUnitPrice}
              </span>
              <span className="text-xs text-zinc-500">
                per unit (Starting base ₹{product.basePrice} · Min Order Qty: {product.minOrderQty})
              </span>
            </div>

            <p className="text-sm text-zinc-600 leading-relaxed mt-3">
              {product.description}
            </p>
          </div>

          {/* Quantity-Based Bulk Pricing Tiers Table */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-zinc-800 mb-2.5 flex items-center justify-between">
              <span>Quantity-Based Bulk Pricing Tiers</span>
              <span className="font-mono text-[11px] text-blue-600">
                Click any tier to apply
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div
                onClick={() => setQuantity(Math.max(1, product.minOrderQty))}
                className={`p-2 rounded-lg border cursor-pointer ${
                  applicableDiscount === 0
                    ? 'bg-white border-blue-600 font-semibold'
                    : 'bg-white border-zinc-200'
                }`}
              >
                <div className="text-[11px] text-zinc-500">1–9</div>
                <div className="font-mono font-bold text-zinc-950 mt-0.5 tabular-nums">
                  ₹{rawUnitPrice}
                </div>
              </div>
              {product.bulkTiers.map((tier) => {
                const tierPrice = Math.round(rawUnitPrice * (1 - tier.discountPercent / 100));
                const isActive = applicableDiscount === tier.discountPercent;
                return (
                  <div
                    key={tier.minQty}
                    onClick={() => setQuantity(tier.minQty)}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-50 border-blue-600 font-semibold'
                        : 'bg-white border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <div className="text-[11px] text-zinc-500">{tier.minQty}+ Qty</div>
                    <div className="font-mono font-bold text-zinc-950 mt-0.5 tabular-nums">
                      ₹{tierPrice}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-700">
                      Save {tier.discountPercent}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customization Options */}
          <div className="space-y-4 pt-2 border-t border-zinc-200">
            {/* Color Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-2">
                Select Color: <span className="font-normal text-zinc-600">{selectedColor.name}</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    className={`w-8 h-8 rounded-full border cursor-pointer transition-transform ${
                      selectedColor.name === c.name
                        ? 'ring-2 ring-offset-2 ring-blue-600 scale-105 border-zinc-900'
                        : 'border-zinc-300 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-2">
                Size / Format
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      selectedSize === sz
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-950'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Material & Printing Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Material / Paper Stock
                </label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-zinc-300 rounded-lg"
                >
                  {product.materials.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Printing Method
                </label>
                <select
                  value={printingMethod}
                  onChange={(e) => setPrintingMethod(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-zinc-300 rounded-lg"
                >
                  {product.printingMethods.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Printing Position & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Print Sides
                </label>
                <div className="flex gap-2">
                  {product.printPositions.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => {
                        setPrintSide(pos);
                        if (pos === 'Back') setPreviewSide('Back');
                        if (pos === 'Front') setPreviewSide('Front');
                      }}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        printSide === pos
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Quantity (Min: {product.minOrderQty})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(product.minOrderQty, q - 1))}
                    className="w-9 h-9 border border-zinc-300 rounded-lg font-bold hover:bg-zinc-50 cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={product.minOrderQty}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(product.minOrderQty, Number(e.target.value) || 1))
                    }
                    className="flex-1 h-9 text-center font-mono text-sm font-semibold border border-zinc-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 5)}
                    className="px-3 h-9 border border-zinc-300 rounded-lg text-xs font-mono font-semibold hover:bg-zinc-50 cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMER DOCUMENT / PICTURE UPLOAD & CUSTOM PRINTING RECOMMENDATION BOX */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-zinc-950">
                  Upload Your Document / Picture & Custom Printing Requirement
                </span>
              </div>
              <span className="text-[10px] font-mono text-blue-700">
                PDF, DOC, DOCX, XLS, JPG, PNG, CDR, ZIP
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.svg,.zip,.cdr,.ai,.psd"
              onChange={handleDirectUpload}
              className="hidden"
            />

            {uploadedFile ? (
              <div className="flex items-center justify-between gap-3 bg-white border border-emerald-300 rounded-xl p-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-800 truncate">
                    ✓ Attached File: {uploadedFile.fileName}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500">
                    Size: {uploadedFile.fileSize} · Format: {uploadedFile.fileType}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="p-1 text-zinc-400 hover:text-red-600 cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 text-xs font-semibold text-zinc-900 bg-white hover:bg-zinc-50 border border-dashed border-blue-400 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Click to Upload Document, Design File, or Photo (PDF, Word, Excel, Image, ZIP)</span>
              </button>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                Your Custom Recommendation / Printing Instructions (Optional):
              </label>
              <textarea
                rows={2}
                value={customerRequirementNote}
                onChange={(e) => setCustomerRequirementNote(e.target.value)}
                placeholder="Describe how you want your product printed (e.g., Front chest logo, back name & number, spiral binding, lamination type, special font/color)..."
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Primary Action Buttons: Customize in Studio + Add to Cart */}
          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleAddProductToCart}
                disabled={!product.inStock}
                className="py-3.5 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 rounded-xl flex items-center justify-between transition-colors cursor-pointer shadow-xs"
              >
                <span className="flex items-center gap-2">
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Add {quantity} to Cart
                    </>
                  )}
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenInStudio(product)}
                className="py-3.5 px-4 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-blue-400" />
                Open in Live Design Studio
              </button>
            </div>
          </div>

          {/* Production & Delivery Estimates */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong className="text-zinc-900">Estimated Production Time:</strong>{' '}
                {product.estimatedProductionDays}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong className="text-zinc-900">Delivery Estimate:</strong>{' '}
                {product.deliveryEstimateDays}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Pre-press digital artwork & document verification before bulk production begins.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products in Category */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-10 border-t border-zinc-200">
          <h2 className="text-xl font-display font-bold text-zinc-950 mb-6">
            More in {product.categoryName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.slice(0, 4).map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectProduct(rel)}
                className="group bg-white border border-zinc-200 hover:border-blue-600 rounded-xl p-4 cursor-pointer transition-all"
              >
                <div className="aspect-4/3 bg-zinc-100 rounded-lg mb-3 overflow-hidden">
                  <ProductMockup
                    shape={rel.mockupShape}
                    color={rel.colors[0]}
                    graphicText={rel.defaultGraphicText}
                    graphicSubtext={rel.defaultGraphicSubtext}
                    productImageUrl={rel.imageUrl}
                    className="w-full h-full"
                  />
                </div>
                <div className="text-[11px] font-mono text-zinc-500 uppercase">
                  {rel.subcategory}
                </div>
                <div className="text-sm font-bold text-zinc-950 mt-0.5 group-hover:text-blue-600 line-clamp-1">
                  {rel.name}
                </div>
                <div className="text-sm font-mono font-bold text-zinc-950 mt-1 tabular-nums">
                  ₹{rel.basePrice}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
