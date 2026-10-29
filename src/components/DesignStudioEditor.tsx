import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import {
  CanvasElementData,
  CartItem,
  Product,
  ProductColor,
  SampleDesign,
  SavedCustomDesign,
} from '../types';
import { getPrintZoneGeometry, ProductMockup } from './ProductMockup';
import {
  Type,
  Upload,
  RotateCcw,
  Trash2,
  Eye,
  ShoppingBag,
  Bookmark,
  Layers,
  Award,
  Check,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface DesignStudioEditorProps {
  products: Product[];
  initialProduct: Product;
  initialSample?: SampleDesign | null;
  onAddToCart: (item: CartItem) => void;
  onSaveDesign: (design: SavedCustomDesign) => void;
}

const FONT_FAMILIES = [
  'Plus Jakarta Sans',
  'Oswald',
  'Playfair Display',
  'DM Sans',
  'JetBrains Mono',
];

const INK_COLORS = [
  '#FFFFFF',
  '#09090B',
  '#2563EB',
  '#60A5FA',
  '#DC2626',
  '#FACC15',
  '#15803D',
  '#D97706',
  '#EC4899',
];

export const DesignStudioEditor: React.FC<DesignStudioEditorProps> = ({
  products,
  initialProduct,
  initialSample,
  onAddToCart,
  onSaveDesign,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product>(initialProduct);
  const [selectedColor, setSelectedColor] = useState<ProductColor>(
    initialSample?.productColor || initialProduct.colors[0]
  );
  const [selectedSize, setSelectedSize] = useState<string>(initialProduct.sizes[0]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(initialProduct.materials[0]);
  const [printingMethod, setPrintingMethod] = useState<string>(initialProduct.printingMethods[0]);
  const [printSideMode, setPrintSideMode] = useState<'Front' | 'Back' | 'Both Sides'>('Front');
  const [activeCanvasSide, setActiveCanvasSide] = useState<'Front' | 'Back'>('Front');
  const [quantity, setQuantity] = useState<number>(Math.max(1, initialProduct.minOrderQty));
  const [designTitle, setDesignTitle] = useState<string>(
    initialSample ? `${initialSample.title} (Custom)` : `${initialProduct.name} Custom`
  );

  // Separate element arrays for Front and Back
  const [frontElements, setFrontElements] = useState<CanvasElementData[]>(() => {
    if (initialSample && initialSample.frontElements.length > 0) {
      return JSON.parse(JSON.stringify(initialSample.frontElements));
    }
    const isLight =
      initialProduct.colors[0].hex.toLowerCase() === '#f8fafc' ||
      initialProduct.colors[0].hex.toLowerCase() === '#efece6';
    return [
      {
        id: 'init-text-1',
        type: 'text',
        text: initialProduct.defaultGraphicText || 'YOUR BRAND',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 26,
        fill: isLight ? '#09090B' : '#FFFFFF',
        fontStyle: 'bold',
        align: 'center',
        x: 45,
        y: 70,
        width: 190,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      {
        id: 'init-text-2',
        type: 'text',
        text: initialProduct.defaultGraphicSubtext || 'CUSTOM STUDIO EDITION',
        fontFamily: 'JetBrains Mono',
        fontSize: 10,
        fill: '#3B82F6',
        fontStyle: 'bold',
        align: 'center',
        x: 45,
        y: 120,
        width: 190,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    ];
  });

  const [backElements, setBackElements] = useState<CanvasElementData[]>(() => {
    if (initialSample && initialSample.backElements.length > 0) {
      return JSON.parse(JSON.stringify(initialSample.backElements));
    }
    return [
      {
        id: 'init-back-1',
        type: 'text',
        text: 'BACK PRINT EDITION',
        fontFamily: 'Oswald',
        fontSize: 22,
        fill: '#FFFFFF',
        fontStyle: 'bold',
        align: 'center',
        x: 55,
        y: 90,
        width: 170,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    ];
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>('init-text-1');
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; dataUrl: string; side: 'Front' | 'Back' }[]
  >([]);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string>('');
  const [backPreviewUrl, setBackPreviewUrl] = useState<string>('');
  const [showBeforeOrderModal, setShowBeforeOrderModal] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);

  // Konva imperative refs
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentElements = activeCanvasSide === 'Front' ? frontElements : backElements;
  const setCurrentElements = activeCanvasSide === 'Front' ? setFrontElements : setBackElements;

  const selectedElement =
    currentElements.find((el) => el.id === selectedElementId) || null;

  // Update product defaults when user changes product inside customizer
  const handleProductChange = (prodId: string) => {
    const found = products.find((p) => p.id === prodId);
    if (!found) return;
    setSelectedProduct(found);
    setSelectedColor(found.colors[0]);
    setSelectedSize(found.sizes[0]);
    setSelectedMaterial(found.materials[0]);
    setPrintingMethod(found.printingMethods[0]);
    setQuantity(Math.max(1, found.minOrderQty));
    setDesignTitle(`${found.name} Custom`);
  };

  // Sync Konva Stage with responsive mobile scaling & touch support
  useEffect(() => {
    const container = stageContainerRef.current;
    if (!container) return;

    const LOGICAL_WIDTH = 280;
    const LOGICAL_HEIGHT = 240;

    const stage = new Konva.Stage({
      container,
      width: LOGICAL_WIDTH,
      height: LOGICAL_HEIGHT,
    });
    const layer = new Konva.Layer();
    const tr = new Konva.Transformer({
      anchorSize: 11,
      anchorCornerRadius: 3,
      anchorStroke: '#2563EB',
      anchorFill: '#FFFFFF',
      borderStroke: '#2563EB',
      borderDash: [4, 4],
      rotateAnchorOffset: 22,
      padding: 6,
    });
    layer.add(tr);
    stage.add(layer);

    const updateStageScale = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const scaleX = rect.width / LOGICAL_WIDTH;
        const scaleY = rect.height / LOGICAL_HEIGHT;
        const scale = Math.min(scaleX, scaleY);
        stage.width(LOGICAL_WIDTH * scale);
        stage.height(LOGICAL_HEIGHT * scale);
        stage.scale({ x: scale, y: scale });
        stage.batchDraw();
      }
    };

    updateStageScale();
    const resizeObserver = new ResizeObserver(() => {
      updateStageScale();
    });
    resizeObserver.observe(container);

    stage.on('click tap', (e) => {
      if (e.target === stage) {
        setSelectedElementId(null);
        tr.nodes([]);
        layer.batchDraw();
      }
    });

    stageRef.current = stage;
    layerRef.current = layer;
    trRef.current = tr;

    return () => {
      resizeObserver.disconnect();
      stage.destroy();
    };
  }, []);

  // Capture clean snapshot without transformer border
  const captureCurrentStageSnapshot = () => {
    if (!stageRef.current || !trRef.current || !layerRef.current) return '';
    const tr = trRef.current;
    const prevVisible = tr.visible();
    tr.visible(false);
    layerRef.current.draw();
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
    tr.visible(prevVisible);
    layerRef.current.draw();
    if (activeCanvasSide === 'Front') {
      setFrontPreviewUrl(dataUrl);
    } else {
      setBackPreviewUrl(dataUrl);
    }
    return dataUrl;
  };

  // Rebuild Konva nodes whenever currentElements or selectedElementId changes
  useEffect(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    const tr = trRef.current;
    if (!stage || !layer || !tr) return;

    // Destroy all children except transformer
    const children = layer.getChildren((node) => node !== tr);
    children.forEach((c) => c.destroy());

    let pendingImages = 0;

    const finalizeLayerDraw = () => {
      const targetNode = selectedElementId ? layer.findOne(`#${selectedElementId}`) : null;
      if (targetNode) {
        tr.nodes([targetNode]);
        tr.moveToTop();
      } else {
        tr.nodes([]);
      }
      layer.batchDraw();
      captureCurrentStageSnapshot();
    };

    currentElements.forEach((el) => {
      if (el.type === 'text') {
        const textNode = new Konva.Text({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width || 180,
          text: el.text || '',
          fontFamily: el.fontFamily || 'Plus Jakarta Sans',
          fontSize: el.fontSize || 22,
          fill: el.fill || '#FFFFFF',
          fontStyle: el.fontStyle || 'bold',
          align: el.align || 'center',
          rotation: el.rotation || 0,
          scaleX: el.scaleX || 1,
          scaleY: el.scaleY || 1,
          draggable: true,
        });

        textNode.on('click tap', () => {
          setSelectedElementId(el.id);
        });

        textNode.on('dragend', () => {
          setCurrentElements((prev) =>
            prev.map((item) =>
              item.id === el.id ? { ...item, x: Math.round(textNode.x()), y: Math.round(textNode.y()) } : item
            )
          );
        });

        textNode.on('transformend', () => {
          setCurrentElements((prev) =>
            prev.map((item) =>
              item.id === el.id
                ? {
                    ...item,
                    x: Math.round(textNode.x()),
                    y: Math.round(textNode.y()),
                    rotation: Math.round(textNode.rotation()),
                    scaleX: Number(textNode.scaleX().toFixed(2)),
                    scaleY: Number(textNode.scaleY().toFixed(2)),
                  }
                : item
            )
          );
        });

        layer.add(textNode);
      } else if (el.type === 'badge-stamp') {
        const group = new Konva.Group({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width || 140,
          height: el.height || 140,
          rotation: el.rotation || 0,
          scaleX: el.scaleX || 1,
          scaleY: el.scaleY || 1,
          draggable: true,
        });

        const stroke = el.strokeColor || '#2563EB';
        const w = el.width || 140;
        const h = el.height || 140;

        if (el.stampKind === 'bold-circle' || el.stampKind === 'star-crest') {
          group.add(
            new Konva.Circle({
              x: w / 2,
              y: h / 2,
              radius: Math.min(w, h) / 2,
              stroke,
              strokeWidth: 4,
              dash: el.stampKind === 'star-crest' ? [8, 4] : undefined,
            })
          );
          group.add(
            new Konva.Circle({
              x: w / 2,
              y: h / 2,
              radius: Math.min(w, h) / 2 - 10,
              stroke,
              strokeWidth: 1.5,
            })
          );
        } else {
          group.add(
            new Konva.Rect({
              x: 0,
              y: 0,
              width: w,
              height: h,
              stroke,
              strokeWidth: 3,
              cornerRadius: el.stampKind === 'eco-leaf' ? 24 : 4,
            })
          );
          group.add(
            new Konva.Rect({
              x: 6,
              y: 6,
              width: w - 12,
              height: h - 12,
              stroke,
              strokeWidth: 1,
              cornerRadius: el.stampKind === 'eco-leaf' ? 20 : 2,
            })
          );
        }

        group.on('click tap', () => {
          setSelectedElementId(el.id);
        });

        group.on('dragend', () => {
          setCurrentElements((prev) =>
            prev.map((item) =>
              item.id === el.id ? { ...item, x: Math.round(group.x()), y: Math.round(group.y()) } : item
            )
          );
        });

        group.on('transformend', () => {
          setCurrentElements((prev) =>
            prev.map((item) =>
              item.id === el.id
                ? {
                    ...item,
                    x: Math.round(group.x()),
                    y: Math.round(group.y()),
                    rotation: Math.round(group.rotation()),
                    scaleX: Number(group.scaleX().toFixed(2)),
                    scaleY: Number(group.scaleY().toFixed(2)),
                  }
                : item
            )
          );
        });

        layer.add(group);
      } else if (el.type === 'image' && el.imageUrl) {
        pendingImages++;
        const imgObj = new window.Image();
        imgObj.crossOrigin = 'anonymous';
        imgObj.onload = () => {
          const kImg = new Konva.Image({
            id: el.id,
            image: imgObj,
            x: el.x,
            y: el.y,
            width: el.width || 120,
            height: el.height || 120,
            rotation: el.rotation || 0,
            scaleX: el.scaleX || 1,
            scaleY: el.scaleY || 1,
            draggable: true,
          });

          kImg.on('click tap', () => {
            setSelectedElementId(el.id);
          });

          kImg.on('dragend', () => {
            setCurrentElements((prev) =>
              prev.map((item) =>
                item.id === el.id ? { ...item, x: Math.round(kImg.x()), y: Math.round(kImg.y()) } : item
              )
            );
          });

          kImg.on('transformend', () => {
            setCurrentElements((prev) =>
              prev.map((item) =>
                item.id === el.id
                  ? {
                      ...item,
                      x: Math.round(kImg.x()),
                      y: Math.round(kImg.y()),
                      rotation: Math.round(kImg.rotation()),
                      scaleX: Number(kImg.scaleX().toFixed(2)),
                      scaleY: Number(kImg.scaleY().toFixed(2)),
                    }
                  : item
              )
            );
          });

          layer.add(kImg);
          pendingImages--;
          if (pendingImages === 0) {
            finalizeLayerDraw();
          }
        };
        imgObj.onerror = () => {
          pendingImages--;
          if (pendingImages === 0) {
            finalizeLayerDraw();
          }
        };
        imgObj.src = el.imageUrl;
      }
    });

    if (pendingImages === 0) {
      finalizeLayerDraw();
    }
  }, [currentElements, selectedElementId, activeCanvasSide]);

  // Add new text layer
  const handleAddText = () => {
    const isLight =
      selectedColor.hex.toLowerCase() === '#f8fafc' ||
      selectedColor.hex.toLowerCase() === '#efece6';
    const newId = `txt-${Date.now()}`;
    const newEl: CanvasElementData = {
      id: newId,
      type: 'text',
      text: 'CUSTOM TEXT',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 22,
      fill: isLight ? '#09090B' : '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
      x: 55,
      y: 85,
      width: 170,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };
    setCurrentElements((prev) => [...prev, newEl]);
    setSelectedElementId(newId);
  };

  // Add vector graphic frame/badge
  const handleAddStamp = (stampKind: CanvasElementData['stampKind']) => {
    const newId = `stp-${Date.now()}`;
    const newEl: CanvasElementData = {
      id: newId,
      type: 'badge-stamp',
      stampKind,
      strokeColor: '#2563EB',
      x: 70,
      y: 50,
      width: 140,
      height: 140,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };
    setCurrentElements((prev) => [...prev, newEl]);
    setSelectedElementId(newId);
  };

  // Handle user image upload (JPG, PNG, WebP)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newId = `img-${Date.now()}`;
      const newEl: CanvasElementData = {
        id: newId,
        type: 'image',
        imageUrl: dataUrl,
        x: 80,
        y: 55,
        width: 120,
        height: 120,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      };
      setCurrentElements((prev) => [...prev, newEl]);
      setSelectedElementId(newId);
      setUploadedFiles((prev) => [
        ...prev,
        { name: file.name, dataUrl, side: activeCanvasSide },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updateSelectedProperty = (patch: Partial<CanvasElementData>) => {
    if (!selectedElementId) return;
    setCurrentElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...patch } : el))
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    setCurrentElements((prev) => prev.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
  };

  const handleMoveLayer = (direction: 'up' | 'down') => {
    if (!selectedElementId) return;
    setCurrentElements((prev) => {
      const idx = prev.findIndex((el) => el.id === selectedElementId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, removed);
      return copy;
    });
  };

  const handleResetCanvas = () => {
    setCurrentElements([]);
    setSelectedElementId(null);
  };

  // Price Calculation
  const applicableDiscount = selectedProduct.bulkTiers.reduce(
    (acc, tier) => (quantity >= tier.minQty ? Math.max(acc, tier.discountPercent) : acc),
    0
  );
  const bothSidesExtra =
    printSideMode === 'Both Sides' ? selectedProduct.bothSideExtraPrice : 0;
  const rawUnitPrice = selectedProduct.basePrice + bothSidesExtra;
  const finalUnitPrice = Math.round(rawUnitPrice * (1 - applicableDiscount / 100));
  const lineTotal = finalUnitPrice * quantity;

  const handleSaveToAccount = () => {
    const snap = captureCurrentStageSnapshot();
    const saved: SavedCustomDesign = {
      id: `dsn-${Date.now()}`,
      name: designTitle || `${selectedProduct.name} Custom`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      mockupShape: selectedProduct.mockupShape,
      selectedColor,
      selectedSize,
      printingMethod,
      printSide: printSideMode,
      frontElements,
      backElements,
      frontPreviewDataUrl: activeCanvasSide === 'Front' ? snap : frontPreviewUrl,
      backPreviewDataUrl: activeCanvasSide === 'Back' ? snap : backPreviewUrl,
      uploadedFiles,
      createdAt: new Date().toISOString(),
    };
    onSaveDesign(saved);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  const handleConfirmAddToCart = () => {
    const snap = captureCurrentStageSnapshot();
    const item: CartItem = {
      id: `cart-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      categoryName: selectedProduct.categoryName,
      sku: selectedProduct.sku,
      mockupShape: selectedProduct.mockupShape,
      selectedColor,
      selectedSize,
      selectedMaterial,
      printingMethod,
      printSide: printSideMode,
      quantity,
      unitBasePrice: selectedProduct.basePrice,
      bothSideExtra: bothSidesExtra,
      discountPercent: applicableDiscount,
      finalUnitPrice,
      lineTotal,
      customDesign: {
        designId: `dsn-${Date.now()}`,
        designName: designTitle || `${selectedProduct.name} Custom`,
        frontPreviewDataUrl: activeCanvasSide === 'Front' ? snap : frontPreviewUrl,
        backPreviewDataUrl: activeCanvasSide === 'Back' ? snap : backPreviewUrl,
        frontElements,
        backElements,
        uploadedFiles,
      },
    };
    onAddToCart(item);
    setShowBeforeOrderModal(false);
  };

  const printZone = getPrintZoneGeometry(selectedProduct.mockupShape);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Studio Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="text-xs font-mono text-blue-600 uppercase tracking-wider">
            Interactive Konva.js Canvas Engine · 300 DPI Vector & Raster Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
            Online Product Design Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              captureCurrentStageSnapshot();
              setShowBeforeOrderModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Before-Order Preview
          </button>

          <button
            type="button"
            onClick={handleSaveToAccount}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-900 border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {saveFeedback ? <Check className="w-4 h-4 text-emerald-600" /> : <Bookmark className="w-4 h-4" />}
            {saveFeedback ? 'Saved to Account' : 'Save Design'}
          </button>

          <button
            type="button"
            onClick={handleConfirmAddToCart}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Add Custom Order · ₹{lineTotal.toLocaleString('en-IN')}
          </button>
        </div>
      </div>

      {/* 3-Column Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {/* LEFT COLUMN: Design Tools & Element Inspector (4 cols) */}
        <div className="lg:col-span-4 space-y-6 bg-zinc-50 border border-zinc-200 rounded-xl p-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              1. Select Base Product to Customize
            </label>
            <select
              value={selectedProduct.id}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.basePrice} ({p.categoryName})
                </option>
              ))}
            </select>
          </div>

          {/* Add Elements Toolbar */}
          <div className="pt-4 border-t border-zinc-200">
            <span className="block text-xs font-semibold text-zinc-700 mb-2.5">
              2. Insert Artwork, Logos & Typography ({activeCanvasSide} View)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleAddText}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-zinc-900 bg-white border border-zinc-300 hover:border-blue-600 rounded-lg transition-colors cursor-pointer"
              >
                <Type className="w-4 h-4 text-blue-600" />
                Add Custom Text
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                Upload Image/Logo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Supports transparent PNG, high-res JPG, and WebP logos or photos.
            </p>
          </div>

          {/* Graphic Frames / Stamps */}
          <div className="pt-4 border-t border-zinc-200">
            <span className="block text-xs font-semibold text-zinc-700 mb-2">
              Add Studio Graphic Frame / Crest
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'minimal-frame', label: 'Architectural Frame' },
                { id: 'bold-circle', label: 'Concentric Ring' },
                { id: 'star-crest', label: 'Varsity Seal' },
                { id: 'eco-leaf', label: 'Rounded Crest' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleAddStamp(st.id as CanvasElementData['stampKind'])}
                  className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:border-blue-600 rounded-md transition-colors cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{st.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Element Inspector */}
          <div className="pt-4 border-t border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-700">
                Selected Layer Properties
              </span>
              {selectedElement && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveLayer('up')}
                    title="Bring Forward"
                    className="p-1.5 text-zinc-600 hover:text-zinc-950 bg-white border border-zinc-200 rounded cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveLayer('down')}
                    title="Send Backward"
                    className="p-1.5 text-zinc-600 hover:text-zinc-950 bg-white border border-zinc-200 rounded cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    title="Remove Element"
                    className="p-1.5 text-red-600 hover:bg-red-50 bg-white border border-zinc-200 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {!selectedElement ? (
              <div className="text-xs text-zinc-500 bg-white border border-zinc-200 rounded-lg p-3">
                Click any text, uploaded logo, or graphic frame on the product canvas to move, resize, rotate, or style it.
              </div>
            ) : selectedElement.type === 'text' ? (
              <div className="space-y-3 bg-white border border-zinc-200 rounded-lg p-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Text Content
                  </label>
                  <textarea
                    rows={2}
                    value={selectedElement.text || ''}
                    onChange={(e) => updateSelectedProperty({ text: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Font Family
                    </label>
                    <select
                      value={selectedElement.fontFamily || 'Plus Jakarta Sans'}
                      onChange={(e) => updateSelectedProperty({ fontFamily: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-zinc-300 rounded-md"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Font Size ({selectedElement.fontSize || 22}px)
                    </label>
                    <input
                      type="range"
                      min={9}
                      max={68}
                      value={selectedElement.fontSize || 22}
                      onChange={(e) => updateSelectedProperty({ fontSize: Number(e.target.value) })}
                      className="w-full accent-blue-600 mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1.5">
                    Print Ink Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {INK_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => updateSelectedProperty({ fill: hex })}
                        style={{ backgroundColor: hex }}
                        className={`w-6 h-6 rounded-full border cursor-pointer ${
                          selectedElement.fill === hex
                            ? 'ring-2 ring-offset-1 ring-blue-600 border-zinc-900'
                            : 'border-zinc-300'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={selectedElement.fill || '#FFFFFF'}
                      onChange={(e) => updateSelectedProperty({ fill: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Rotation ({selectedElement.rotation || 0}°)
                    </label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={selectedElement.rotation || 0}
                      onChange={(e) => updateSelectedProperty({ rotation: Number(e.target.value) })}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Alignment
                    </label>
                    <div className="flex border border-zinc-200 rounded overflow-hidden">
                      {(['left', 'center', 'right'] as const).map((al) => (
                        <button
                          key={al}
                          type="button"
                          onClick={() => updateSelectedProperty({ align: al })}
                          className={`flex-1 py-1 text-[11px] capitalize cursor-pointer ${
                            selectedElement.align === al
                              ? 'bg-zinc-900 text-white font-semibold'
                              : 'bg-white text-zinc-600'
                          }`}
                        >
                          {al}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-white border border-zinc-200 rounded-lg p-3.5">
                <div className="text-xs font-medium text-zinc-800">
                  {selectedElement.type === 'image' ? 'Uploaded Image Layer' : 'Graphic Frame Layer'}
                </div>
                {selectedElement.type === 'badge-stamp' && (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1.5">
                      Frame Stroke Color
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {INK_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => updateSelectedProperty({ strokeColor: hex })}
                          style={{ backgroundColor: hex }}
                          className={`w-6 h-6 rounded-full border cursor-pointer ${
                            selectedElement.strokeColor === hex
                              ? 'ring-2 ring-offset-1 ring-blue-600 border-zinc-900'
                              : 'border-zinc-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Rotation ({selectedElement.rotation || 0}°)
                  </label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={selectedElement.rotation || 0}
                    onChange={(e) => updateSelectedProperty({ rotation: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Interactive Live Product + Konva Stage (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          {/* Side Switcher Bar */}
          <div className="w-full flex items-center justify-between bg-zinc-100 p-1.5 rounded-lg mb-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  captureCurrentStageSnapshot();
                  setActiveCanvasSide('Front');
                  setSelectedElementId(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeCanvasSide === 'Front'
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Front View Canvas
              </button>
              <button
                type="button"
                onClick={() => {
                  captureCurrentStageSnapshot();
                  setActiveCanvasSide('Back');
                  if (printSideMode === 'Front') {
                    setPrintSideMode('Both Sides');
                  }
                  setSelectedElementId(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeCanvasSide === 'Back'
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Back View Canvas
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetCanvas}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-red-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear {activeCanvasSide}
            </button>
          </div>

          {/* Interactive Mockup Container with Embedded Konva Printable Area */}
          <div className="relative w-full aspect-square max-w-[460px] bg-zinc-100/80 border border-zinc-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
            <ProductMockup
              shape={selectedProduct.mockupShape}
              color={selectedColor}
              side={activeCanvasSide}
              hidePrintOverlay={true}
              className="w-full h-full"
            />

            {/* Konva Interactive Printable Zone Overlay */}
            <div
              style={{
                top: `${printZone.topPercent}%`,
                left: `${printZone.leftPercent}%`,
                width: `${printZone.widthPercent}%`,
                height: `${printZone.heightPercent}%`,
              }}
              className="absolute border border-dashed border-blue-500/60 rounded flex items-center justify-center overflow-visible"
            >
              <div className="absolute -top-5 left-0 text-[10px] font-mono text-blue-600 bg-white/90 px-1.5 py-0.5 rounded border border-blue-200 pointer-events-none">
                {activeCanvasSide} Safe Print Area · Drag / Resize / Rotate
              </div>
              <div
                ref={stageContainerRef}
                className="w-full h-full flex items-center justify-center cursor-move"
              />
            </div>
          </div>

          {/* Layer List Pill Strip */}
          <div className="w-full mt-4 bg-white border border-zinc-200 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Active {activeCanvasSide} Canvas Layers ({currentElements.length})
              </span>
              <span className="text-[11px] font-normal text-zinc-500">Click layer to select</span>
            </div>
            {currentElements.length === 0 ? (
              <p className="text-xs text-zinc-400">No elements on {activeCanvasSide} side yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {currentElements.map((el, idx) => (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => setSelectedElementId(el.id)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                      selectedElementId === el.id
                        ? 'bg-blue-50 border-blue-600 text-blue-700 font-semibold'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {idx + 1}.{' '}
                    {el.type === 'text'
                      ? `"${(el.text || '').slice(0, 14)}"`
                      : el.type === 'image'
                      ? 'Uploaded Image'
                      : 'Graphic Frame'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Product Color, Size, Print Method & Live Pricing (3 cols) */}
        <div className="order-3 lg:col-span-3 space-y-5 bg-white border border-zinc-200 rounded-xl p-4 sm:p-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Custom Design Name
            </label>
            <input
              type="text"
              value={designTitle}
              onChange={(e) => setDesignTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Product Color Swatches */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">
              Product Color: <span className="font-normal text-zinc-500">{selectedColor.name}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedProduct.colors.map((col) => (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => setSelectedColor(col)}
                  title={col.name}
                  style={{ backgroundColor: col.hex }}
                  className={`w-7 h-7 rounded-full border cursor-pointer transition-transform ${
                    selectedColor.name === col.name
                      ? 'ring-2 ring-offset-2 ring-blue-600 scale-105 border-zinc-900'
                      : 'border-zinc-300 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Select Size / Specification
            </label>
            <div className="flex flex-wrap gap-1.5">
              {selectedProduct.sizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    selectedSize === sz
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-900'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Printing Position */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Printing Sides
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Front', 'Back', 'Both Sides'] as const).map((sideOpt) => (
                <button
                  key={sideOpt}
                  type="button"
                  onClick={() => {
                    setPrintSideMode(sideOpt);
                    if (sideOpt === 'Front') setActiveCanvasSide('Front');
                    if (sideOpt === 'Back') setActiveCanvasSide('Back');
                  }}
                  className={`py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    printSideMode === sideOpt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-900'
                  }`}
                >
                  {sideOpt}
                </button>
              ))}
            </div>
            {printSideMode === 'Both Sides' && selectedProduct.bothSideExtraPrice > 0 && (
              <p className="text-[11px] text-blue-600 font-mono mt-1">
                +₹{selectedProduct.bothSideExtraPrice}/unit for back side printing
              </p>
            )}
          </div>

          {/* Printing Method */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Printing Technique
            </label>
            <select
              value={printingMethod}
              onChange={(e) => setPrintingMethod(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
            >
              {selectedProduct.printingMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Live Bulk Calculation */}
          <div className="pt-4 border-t border-zinc-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700">
                Order Quantity (Min: {selectedProduct.minOrderQty})
              </label>
              {applicableDiscount > 0 && (
                <span className="text-xs font-mono font-semibold text-emerald-700">
                  {applicableDiscount}% Bulk Saving Applied
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(selectedProduct.minOrderQty, q - 1))}
                className="w-9 h-9 flex items-center justify-center border border-zinc-300 rounded-lg font-bold hover:bg-zinc-50 cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min={selectedProduct.minOrderQty}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(selectedProduct.minOrderQty, Number(e.target.value) || 1))
                }
                className="flex-1 h-9 text-center font-mono text-sm font-semibold border border-zinc-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 5)}
                className="px-2.5 h-9 flex items-center justify-center border border-zinc-300 rounded-lg text-xs font-mono font-semibold hover:bg-zinc-50 cursor-pointer"
              >
                +5
              </button>
            </div>
          </div>

          {/* Pricing Breakdown Card */}
          <div className="bg-zinc-950 text-white rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Base + Print Side</span>
              <span className="font-mono tabular-nums">₹{rawUnitPrice}/unit</span>
            </div>
            {applicableDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Bulk Discount ({applicableDiscount}%)</span>
                <span className="font-mono tabular-nums">
                  -₹{rawUnitPrice - finalUnitPrice}/unit
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs text-zinc-300 pt-2 border-t border-zinc-800">
              <span>Net Unit Price</span>
              <span className="font-mono font-semibold tabular-nums">₹{finalUnitPrice} × {quantity}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Total Estimate
              </span>
              <span className="text-xl font-mono font-bold text-white tabular-nums">
                ₹{lineTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmAddToCart}
            className="w-full py-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Save & Add to Shopping Cart
          </button>
        </div>
      </div>

      {/* BEFORE-ORDER PREVIEW MODAL */}
      {showBeforeOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div>
                <span className="text-xs font-mono text-blue-600 uppercase">
                  Pre-Press Verification Proof
                </span>
                <h3 className="text-xl font-display font-bold text-zinc-950">
                  Before-Order Product Preview: {designTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBeforeOrderModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 border border-zinc-200 rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center">
                <span className="text-xs font-mono font-semibold text-zinc-600 mb-2">
                  FRONT VIEW PROOF
                </span>
                <div className="w-60 h-60">
                  <ProductMockup
                    shape={selectedProduct.mockupShape}
                    color={selectedColor}
                    side="Front"
                    customPreviewUrl={frontPreviewUrl}
                    elements={frontElements}
                    className="w-full h-full"
                  />
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col items-center">
                <span className="text-xs font-mono font-semibold text-zinc-600 mb-2">
                  BACK VIEW PROOF ({printSideMode === 'Both Sides' || printSideMode === 'Back' ? 'INCLUDED' : 'BLANK'})
                </span>
                <div className="w-60 h-60">
                  <ProductMockup
                    shape={selectedProduct.mockupShape}
                    color={selectedColor}
                    side="Back"
                    customPreviewUrl={backPreviewUrl}
                    elements={backElements}
                    hidePrintOverlay={printSideMode === 'Front'}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-zinc-200">
              <div className="text-xs text-zinc-600 space-y-1">
                <div>
                  <strong className="text-zinc-900">Product:</strong> {selectedProduct.name} ({selectedColor.name} · {selectedSize})
                </div>
                <div>
                  <strong className="text-zinc-900">Print Specification:</strong> {printingMethod} · {printSideMode} · Qty {quantity}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[11px] text-zinc-500">Total Amount</div>
                  <div className="text-lg font-mono font-bold text-zinc-950 tabular-nums">
                    ₹{lineTotal.toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmAddToCart}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Approve Proof & Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
