import React, { useState } from 'react';
import {
  CategoryId,
  MockupShape,
  Order,
  OrderStatus,
  Product,
  SampleDesign,
  StoreSettings,
  UserProfile,
} from '../types';
import { CATEGORIES, PRODUCT_COLORS } from '../data/catalogData';
import { ProductMockup } from './ProductMockup';
import {
  Download,
  Plus,
  Trash2,
  Edit3,
  Check,
  FileSpreadsheet,
  Package,
  Settings,
  Layers,
  TrendingUp,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface AdminDashboardViewProps {
  currentUser: UserProfile | null;
  onAdminQuickLogin: () => void;
  products: Product[];
  onSaveProducts: (next: Product[]) => void;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus, note: string) => void;
  sampleDesigns: SampleDesign[];
  onSaveSampleDesigns: (next: SampleDesign[]) => void;
  settings: StoreSettings;
  onSaveSettings: (next: StoreSettings) => void;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Design Review',
  'Confirmed',
  'Printing',
  'Packed',
  'Shipped',
  'Delivered',
  'Rejected',
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onAdminQuickLogin,
  products,
  onSaveProducts,
  orders,
  onUpdateOrderStatus,
  sampleDesigns,
  onSaveSampleDesigns,
  settings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<
    'orders' | 'products' | 'samples' | 'settings' | 'reports'
  >('orders');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showNewProductForm, setShowNewProductForm] = useState<boolean>(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<boolean>(false);

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState<CategoryId>('apparel');
  const [newProdSubcat, setNewProdSubcat] = useState('Custom T-shirts');
  const [newProdPrice, setNewProdPrice] = useState(299);
  const [newProdMoq, setNewProdMoq] = useState(1);
  const [newProdShape, setNewProdShape] = useState<MockupShape>('tshirt');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdLeadTime, setNewProdLeadTime] = useState('2–4 business days');

  // New Sample Design Form State
  const [newSampleTitle, setNewSampleTitle] = useState('');
  const [newSampleCat, setNewSampleCat] = useState<CategoryId>('apparel');
  const [newSampleText, setNewSampleText] = useState('LIMITED EDITION');
  const [newSamplePrice, setNewSamplePrice] = useState(349);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 space-y-4">
          <ShieldCheck className="w-10 h-10 text-blue-600 mx-auto" />
          <h1 className="text-2xl font-display font-bold text-zinc-950">
            Admin Studio Access Required
          </h1>
          <p className="text-sm text-zinc-600">
            Only authenticated PrintZone administrators can manage product pricing, download customer print files, or update order production statuses.
          </p>
          <button
            type="button"
            onClick={onAdminQuickLogin}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            Sign In as Demo Studio Admin (tanmoydari4@gmail.com)
          </button>
        </div>
      </div>
    );
  }

  // Export Orders to CSV
  const handleExportOrdersCsv = () => {
    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'District',
      'State',
      'PIN Code',
      'Items Count',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Grand Total (INR)',
    ];
    const rows = orders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.customerPhone,
      o.customerEmail,
      `"${o.shippingAddress.district}"`,
      `"${o.shippingAddress.state}"`,
      o.shippingAddress.pinCode,
      o.items.reduce((s, i) => s + i.quantity, 0),
      o.paymentMethod,
      o.paymentStatus,
      o.status,
      o.grandTotal,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `printzone-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Customer Print Artwork or Production Job Ticket
  const handleDownloadArtwork = (order: Order, itemIdx: number) => {
    const item = order.items[itemIdx];
    const previewUrl =
      item.customDesign?.frontPreviewDataUrl || item.directArtworkUpload?.fileDataUrl;

    if (previewUrl && previewUrl.startsWith('data:image')) {
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = `${order.orderNumber}-${item.sku}-print-artwork.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Export structured Pre-Press Production Spec JSON
      const spec = {
        orderNumber: order.orderNumber,
        customer: order.customerName,
        sku: item.sku,
        product: item.productName,
        color: item.selectedColor.name,
        size: item.selectedSize,
        material: item.selectedMaterial,
        printingMethod: item.printingMethod,
        printSide: item.printSide,
        quantity: item.quantity,
        elements: item.customDesign?.frontElements || [],
      };
      const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.orderNumber}-${item.sku}-job-ticket.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    const catObj = CATEGORIES.find((c) => c.id === newProdCat) || CATEGORIES[0];
    const created: Product = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      categoryId: newProdCat,
      categoryName: catObj.name,
      subcategory: newProdSubcat,
      sku: `PZ-ADM-${Math.floor(100 + Math.random() * 900)}`,
      shortDescription: newProdDesc || 'Custom printed studio product.',
      description: newProdDesc || 'Configurable custom printed product added via PrintZone Admin.',
      basePrice: Number(newProdPrice) || 199,
      minOrderQty: Number(newProdMoq) || 1,
      sizes: ['Standard', 'M', 'L', 'XL'],
      colors: [
        PRODUCT_COLORS.obsidianBlack,
        PRODUCT_COLORS.crispWhite,
        PRODUCT_COLORS.electricBlue,
      ],
      materials: ['Standard Studio Grade Material'],
      printingMethods: ['HD Digital Print', 'Screen Print'],
      printPositions: ['Front', 'Back', 'Both Sides'],
      bothSideExtraPrice: 80,
      estimatedProductionDays: newProdLeadTime,
      deliveryEstimateDays: '3–6 business days across India',
      bulkTiers: [
        { minQty: 10, discountPercent: 10 },
        { minQty: 50, discountPercent: 20 },
      ],
      mockupShape: newProdShape,
      defaultGraphicText: newProdName.slice(0, 16).toUpperCase(),
      defaultGraphicSubtext: 'CUSTOM EDITION',
      defaultAccentColor: '#2563EB',
      inStock: true,
    };
    onSaveProducts([created, ...products]);
    setNewProdName('');
    setNewProdDesc('');
    setShowNewProductForm(false);
  };

  const handleAddSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSampleTitle.trim()) return;
    const targetProduct =
      products.find((p) => p.categoryId === newSampleCat) || products[0];
    const created: SampleDesign = {
      id: `smp-${Date.now()}`,
      title: newSampleTitle.trim(),
      categoryId: newSampleCat,
      productId: targetProduct.id,
      mockupShape: targetProduct.mockupShape,
      styleTag: 'Minimalist',
      productColor: PRODUCT_COLORS.obsidianBlack,
      price: Number(newSamplePrice) || targetProduct.basePrice,
      description: 'Sample design template created in Admin Studio.',
      supportsBackView: true,
      frontElements: [
        {
          id: `el-${Date.now()}`,
          type: 'text',
          text: newSampleText,
          fontFamily: 'Plus Jakarta Sans',
          fontSize: 24,
          fill: '#FFFFFF',
          fontStyle: 'bold',
          align: 'center',
          x: 55,
          y: 85,
          width: 170,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      ],
      backElements: [],
    };
    onSaveSampleDesigns([created, ...sampleDesigns]);
    setNewSampleTitle('');
  };

  const totalRevenue = orders
    .filter((o) => o.status !== 'Rejected')
    .reduce((acc, o) => acc + o.grandTotal, 0);

  const filteredOrders =
    statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="text-xs font-mono text-blue-600 uppercase tracking-wider">
            PrintZone Studio Operations · Role: Administrator ({currentUser.email})
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
            Admin Production & Catalog Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportOrdersCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            Export Orders CSV
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Total Studio Revenue</div>
          <div className="text-2xl font-mono font-bold text-zinc-950 mt-1 tabular-nums">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Across {orders.length} active & completed orders
          </div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Orders in Production Queue</div>
          <div className="text-2xl font-mono font-bold text-blue-600 mt-1 tabular-nums">
            {orders.filter((o) => ['Pending', 'Design Review', 'Confirmed', 'Printing'].includes(o.status)).length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Awaiting pre-press or printing
          </div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Active Products & SKUs</div>
          <div className="text-2xl font-mono font-bold text-zinc-950 mt-1 tabular-nums">
            {products.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Across 7 printing categories
          </div>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <div className="text-xs text-zinc-500">Sample Gallery Templates</div>
          <div className="text-2xl font-mono font-bold text-zinc-950 mt-1 tabular-nums">
            {sampleDesigns.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Ready for 1-click customization
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 rounded-lg mb-8 w-fit">
        {[
          { id: 'orders', label: 'Orders & Artwork Queue', icon: Package },
          { id: 'products', label: 'Products & Pricing', icon: Layers },
          { id: 'samples', label: 'Sample Gallery Manager', icon: Edit3 },
          { id: 'settings', label: 'Payments, Shipping & Banners', icon: Settings },
          { id: 'reports', label: 'Sales & Customer Reports', icon: TrendingUp },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ORDERS & CUSTOMER ARTWORK */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', ...ORDER_STATUSES].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-base text-zinc-950">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-zinc-500">·</span>
                      <span className="text-xs font-semibold text-blue-600">
                        Status: {order.status}
                      </span>
                      <span className="text-xs text-zinc-500">·</span>
                      <span className="text-xs font-mono text-zinc-600">
                        {order.paymentMethod} ({order.paymentStatus})
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      <strong>Customer:</strong> {order.customerName} ({order.customerPhone} ·{' '}
                      {order.customerEmail}) — {order.shippingAddress.addressLine1},{' '}
                      {order.shippingAddress.district}, {order.shippingAddress.state} –{' '}
                      <span className="font-mono">{order.shippingAddress.pinCode}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right mr-2">
                      <div className="text-[11px] text-zinc-500">Order Total</div>
                      <div className="text-base font-mono font-bold text-zinc-950 tabular-nums">
                        ₹{order.grandTotal.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <select
                      value={order.status}
                      onChange={(e) =>
                        onUpdateOrderStatus(
                          order.id,
                          e.target.value as OrderStatus,
                          `Status updated to ${e.target.value} by Admin`
                        )
                      }
                      className="px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {ORDER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          Set Status: {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Order Line Items & Print File Download */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 p-3 bg-zinc-50 rounded-lg border border-zinc-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 bg-white border border-zinc-200 rounded-lg shrink-0 overflow-hidden">
                          <ProductMockup
                            shape={item.mockupShape}
                            color={item.selectedColor}
                            customPreviewUrl={item.customDesign?.frontPreviewDataUrl}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-900 truncate">
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-zinc-600">
                            {item.selectedColor.name} · Size {item.selectedSize} · {item.printSide} ·{' '}
                            <strong className="font-mono">Qty {item.quantity}</strong>
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            Method: {item.printingMethod}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadArtwork(order, idx)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Print File
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS & PRICING MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-zinc-950">
              Manage Product Catalog, Base Prices, MOQ & Lead Times
            </h2>
            <button
              type="button"
              onClick={() => setShowNewProductForm(!showNewProductForm)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Product
            </button>
          </div>

          {showNewProductForm && (
            <form
              onSubmit={handleCreateProduct}
              className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g., Heavyweight Acid-Wash Tee"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Category
                </label>
                <select
                  value={newProdCat}
                  onChange={(e) => setNewProdCat(e.target.value as CategoryId)}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Mockup Silhouette
                </label>
                <select
                  value={newProdShape}
                  onChange={(e) => setNewProdShape(e.target.value as MockupShape)}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                >
                  {[
                    'tshirt',
                    'polo',
                    'hoodie',
                    'jersey',
                    'cap',
                    'apron',
                    'totebag',
                    'jutebag',
                    'schoolbag',
                    'badge',
                    'namebadge',
                    'deskcalendar',
                    'wallcalendar',
                    'mug',
                    'phonecase',
                    'visitingcard',
                    'idcard',
                    'canvasprint',
                  ].map((sh) => (
                    <option key={sh} value={sh}>
                      {sh}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Base Price (₹ INR)
                </label>
                <input
                  type="number"
                  min={1}
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Minimum Order Quantity (MOQ)
                </label>
                <input
                  type="number"
                  min={1}
                  value={newProdMoq}
                  onChange={(e) => setNewProdMoq(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Estimated Production Time
                </label>
                <input
                  type="text"
                  value={newProdLeadTime}
                  onChange={(e) => setNewProdLeadTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Material, GSM, and printing specification..."
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-950 rounded-lg cursor-pointer"
                >
                  Save Product
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewProductForm(false)}
                  className="px-3 py-2 text-xs text-zinc-600 hover:text-zinc-950 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Product Table */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-mono uppercase text-zinc-500">
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Base Price (₹)</th>
                  <th className="py-3 px-4">MOQ</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-950">{p.name}</div>
                      <div className="text-[11px] font-mono text-zinc-500">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {p.categoryName} · {p.subcategory}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold tabular-nums">
                      {editingProduct?.id === p.id ? (
                        <input
                          type="number"
                          value={editingProduct.basePrice}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              basePrice: Number(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 border border-blue-600 rounded font-mono"
                        />
                      ) : (
                        `₹${p.basePrice}`
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      {editingProduct?.id === p.id ? (
                        <input
                          type="number"
                          value={editingProduct.minOrderQty}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              minOrderQty: Number(e.target.value),
                            })
                          }
                          className="w-16 px-2 py-1 border border-blue-600 rounded font-mono"
                        />
                      ) : (
                        p.minOrderQty
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          onSaveProducts(
                            products.map((item) =>
                              item.id === p.id ? { ...item, inStock: !item.inStock } : item
                            )
                          )
                        }
                        className={`text-xs font-medium cursor-pointer ${
                          p.inStock ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {p.inStock ? 'In Stock' : 'Out of Stock'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      {editingProduct?.id === p.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSaveProducts(
                              products.map((item) =>
                                item.id === editingProduct.id ? editingProduct : item
                              )
                            );
                            setEditingProduct(null);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 rounded cursor-pointer"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          Edit Price/MOQ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSaveProducts(products.filter((item) => item.id !== p.id))}
                        className="p-1 text-zinc-400 hover:text-red-600 cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SAMPLE GALLERY MANAGER */}
      {activeTab === 'samples' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddSample}
            className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Sample Template Title
              </label>
              <input
                type="text"
                required
                value={newSampleTitle}
                onChange={(e) => setNewSampleTitle(e.target.value)}
                placeholder="e.g., Founder Summit Hoodie"
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Category
              </label>
              <select
                value={newSampleCat}
                onChange={(e) => setNewSampleCat(e.target.value as CategoryId)}
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Headline Print Text
              </label>
              <input
                type="text"
                value={newSampleText}
                onChange={(e) => setNewSampleText(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Add Sample to Gallery
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sampleDesigns.map((smp) => (
              <div
                key={smp.id}
                className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square bg-zinc-50 rounded-lg mb-3">
                    <ProductMockup
                      shape={smp.mockupShape}
                      color={smp.productColor}
                      elements={smp.frontElements}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="text-xs font-bold text-zinc-950">{smp.title}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {smp.styleTag} · ₹{smp.price}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSaveSampleDesigns(sampleDesigns.filter((item) => item.id !== smp.id))
                  }
                  className="mt-3 text-xs text-red-600 hover:underline self-start cursor-pointer"
                >
                  Remove Sample
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: STORE, PAYMENT & SHIPPING SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-display font-bold text-zinc-950">
            Storefront Banners, Indian Payment Gateways & Delivery Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Homepage Hero Headline
              </label>
              <input
                type="text"
                value={settings.heroTitle}
                onChange={(e) => onSaveSettings({ ...settings, heroTitle: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Promotional Top Bar Notice
              </label>
              <input
                type="text"
                value={settings.promoBannerText}
                onChange={(e) => onSaveSettings({ ...settings, promoBannerText: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Standard Delivery Charge (₹)
              </label>
              <input
                type="number"
                value={settings.standardDeliveryCharge}
                onChange={(e) =>
                  onSaveSettings({ ...settings, standardDeliveryCharge: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Free Delivery Threshold (₹)
              </label>
              <input
                type="number"
                value={settings.freeDeliveryThreshold}
                onChange={(e) =>
                  onSaveSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Merchant UPI ID (Verified Checkout)
              </label>
              <input
                type="text"
                value={settings.upiMerchantId}
                onChange={(e) => onSaveSettings({ ...settings, upiMerchantId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                WhatsApp Order Enquiry Number
              </label>
              <input
                type="text"
                value={settings.whatsappNumber}
                onChange={(e) => onSaveSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.codEnabled}
                onChange={(e) => onSaveSettings({ ...settings, codEnabled: e.target.checked })}
                className="accent-blue-600"
              />
              Enable Cash on Delivery (COD) for eligible Indian PIN codes
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.upiEnabled}
                onChange={(e) => onSaveSettings({ ...settings, upiEnabled: e.target.checked })}
                className="accent-blue-600"
              />
              Enable UPI Payment with 12-Digit UTR Reference Verification
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-zinc-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.onlineGatewayEnabled}
                onChange={(e) =>
                  onSaveSettings({ ...settings, onlineGatewayEnabled: e.target.checked })
                }
                className="accent-blue-600"
              />
              Enable Online Card / NetBanking Gateway Verification
            </label>
          </div>

          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSettingsSavedMsg(true);
                setTimeout(() => setSettingsSavedMsg(false), 2500);
              }}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Save Store Configuration
            </button>
            {settingsSavedMsg && (
              <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                <Check className="w-4 h-4" /> Configuration updated live
              </span>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SALES & CUSTOMER REPORTS */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-display font-bold text-zinc-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Category Catalog & Revenue Distribution
            </h3>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between text-xs py-2 border-b border-zinc-100"
                  >
                    <span className="font-medium text-zinc-800">{cat.name}</span>
                    <span className="font-mono text-zinc-600 tabular-nums">
                      {count} Products · Starting ₹{cat.startingFrom}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-display font-bold text-zinc-950 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Customer Directory & Delivery Locations
            </h3>
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-xs py-2 border-b border-zinc-100"
                >
                  <div>
                    <div className="font-semibold text-zinc-900">{o.customerName}</div>
                    <div className="text-zinc-500">
                      {o.customerEmail} · {o.customerPhone}
                    </div>
                  </div>
                  <div className="text-right font-mono text-zinc-600">
                    <div>
                      {o.shippingAddress.district}, {o.shippingAddress.state}
                    </div>
                    <div className="text-[11px] text-zinc-400">PIN {o.shippingAddress.pinCode}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
