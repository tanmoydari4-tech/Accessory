import React, { useEffect, useState } from 'react';
import {
  CartItem,
  CategoryId,
  Order,
  OrderStatus,
  PageId,
  Product,
  SampleDesign,
  SavedCustomDesign,
  StoreSettings,
  UserProfile,
} from './types';
import {
  CATEGORIES,
  INITIAL_DEMO_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_SAMPLE_DESIGNS,
  INITIAL_STORE_SETTINGS,
} from './data/catalogData';
import { ProductMockup } from './components/ProductMockup';
import { DesignStudioEditor } from './components/DesignStudioEditor';
import { ProductDetailView } from './components/ProductDetailView';
import { SampleGalleryView } from './components/SampleGalleryView';
import { CartCheckoutView } from './components/CartCheckoutView';
import { AdminDashboardView } from './components/AdminDashboardView';
import {
  AuthView,
  BulkPrintingView,
  CorporateGiftsView,
  CustomerDashboardView,
  InformationalPageView,
  OrderTrackingView,
} from './components/SecondaryPagesView';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import {
  Search,
  Sliders,
  ShoppingBag,
  ArrowRight,
  MessageSquare,
  User,
  Shield,
  Check,
  X,
  Send,
  Layers,
  BookOpen,
} from 'lucide-react';

const STORAGE_KEYS = {
  PRODUCTS: 'pz_studio_products_v1',
  ORDERS: 'pz_studio_orders_v1',
  SAMPLES: 'pz_studio_samples_v1',
  SETTINGS: 'pz_studio_settings_v1',
  CART: 'pz_studio_cart_v1',
  USER: 'pz_studio_user_v1',
};

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core Persistent State
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : INITIAL_DEMO_ORDERS;
    } catch {
      return INITIAL_DEMO_ORDERS;
    }
  });

  const [sampleDesigns, setSampleDesigns] = useState<SampleDesign[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SAMPLES);
      return saved ? JSON.parse(saved) : INITIAL_SAMPLE_DESIGNS;
    } catch {
      return INITIAL_SAMPLE_DESIGNS;
    }
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_STORE_SETTINGS;
    } catch {
      return INITIAL_STORE_SETTINGS;
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active Product / Studio Selection
  const [selectedProduct, setSelectedProduct] = useState<Product>(INITIAL_PRODUCTS[0]);
  const [studioProduct, setStudioProduct] = useState<Product>(INITIAL_PRODUCTS[0]);
  const [studioSample, setStudioSample] = useState<SampleDesign | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // WhatsApp Enquiry Modal & Setup Guide Modal
  const [whatsAppModalMsg, setWhatsAppModalMsg] = useState<string | null>(null);
  const [whatsAppSentNotice, setWhatsAppSentNotice] = useState<boolean>(false);
  const [showSetupGuideModal, setShowSetupGuideModal] = useState<boolean>(false);
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(false);

  // Persist to localStorage + attempt non-blocking Firestore sync on user's project (detabase-f6c7f)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore quota error
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(sampleDesigns));
    } catch {
      // ignore
    }
  }, [sampleDesigns]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Non-blocking initial Firestore sync from detabase-f6c7f if enabled
  useEffect(() => {
    async function syncFromFirestore() {
      try {
        const snap = await getDocs(collection(db, 'orders'));
        if (!snap.empty) {
          const remoteOrders: Order[] = [];
          snap.forEach((d) => remoteOrders.push(d.data() as Order));
          if (remoteOrders.length > 0) {
            setOrders((prev) => {
              const map = new Map(prev.map((o) => [o.id, o]));
              remoteOrders.forEach((ro) => map.set(ro.id, ro));
              return Array.from(map.values());
            });
          }
        }
      } catch {
        // Firestore not yet enabled in user's console or offline — local persistence handles seamlessly
      }
    }
    syncFromFirestore();
  }, []);

  const navigateTo = (page: PageId) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart Handlers
  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => [item, ...prev]);
  };

  const handleUpdateCartQty = (cartItemId: string, nextQty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== cartItemId) return item;
        const prod = products.find((p) => p.id === item.productId);
        const minQ = prod ? prod.minOrderQty : 1;
        const validQty = Math.max(minQ, nextQty);
        const disc = prod
          ? prod.bulkTiers.reduce(
              (acc, t) => (validQty >= t.minQty ? Math.max(acc, t.discountPercent) : acc),
              0
            )
          : item.discountPercent;
        const rawUnit = item.unitBasePrice + item.bothSideExtra;
        const finalUnit = Math.round(rawUnit * (1 - disc / 100));
        return {
          ...item,
          quantity: validQty,
          discountPercent: disc,
          finalUnitPrice: finalUnit,
          lineTotal: finalUnit * validQty,
        };
      })
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  // Place Order + Sync to Firestore (`detabase-f6c7f`)
  const handlePlaceOrder = async (newOrder: Order, saveAddressToProfile: boolean) => {
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);

    if (saveAddressToProfile && currentUser) {
      setCurrentUser({
        ...currentUser,
        savedAddresses: [newOrder.shippingAddress, ...currentUser.savedAddresses],
      });
    }

    try {
      if (db) {
        await setDoc(doc(db, 'orders', newOrder.id), newOrder);
      }
    } catch {
      // Stored locally if Firestore rules aren't open yet
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: OrderStatus,
    note: string
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updated: Order = {
          ...o,
          status: nextStatus,
          statusHistory: [
            ...o.statusHistory,
            {
              status: nextStatus,
              timestamp: new Date().toLocaleString('en-IN'),
              note,
            },
          ],
        };
        if (db) {
          setDoc(doc(db, 'orders', updated.id), updated).catch(() => {});
        }
        return updated;
      })
    );
  };

  // Save Custom Design to User Profile
  const handleSaveCustomDesign = (design: SavedCustomDesign) => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        savedDesigns: [design, ...currentUser.savedDesigns],
      });
    } else {
      const guestProfile: UserProfile = {
        uid: 'guest-designer',
        name: 'Studio Creator',
        email: 'creator@printzonestudio.in',
        phone: '9830054321',
        role: 'customer',
        savedAddresses: [],
        savedDesigns: [design],
      };
      setCurrentUser(guestProfile);
    }
  };

  // Open Product or Sample in Konva.js Design Studio
  const handleOpenInStudio = (prod: Product, sample?: SampleDesign) => {
    setStudioProduct(prod);
    setStudioSample(sample || null);
    navigateTo('design-studio');
  };

  const handleCustomizeSampleFromGallery = (sample: SampleDesign) => {
    const prod =
      products.find((p) => p.id === sample.productId) ||
      products.find((p) => p.categoryId === sample.categoryId) ||
      products[0];
    setStudioProduct(prod);
    setStudioSample(sample);
    navigateTo('design-studio');
  };

  // Google Sign-In via user's Firebase project
  const handleGoogleLogin = async () => {
    setAuthError(null);
    if (!auth || !googleProvider) {
      setAuthError('Firebase Auth is not initialized. Please use the 1-Click Demo Login buttons.');
      return;
    }
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const u = res.user;
      const isAdmin =
        u.email?.toLowerCase() === 'tanmoydari4@gmail.com' ||
        u.email?.toLowerCase() === 'admin@printzonestudio.in';
      const profile: UserProfile = {
        uid: u.uid,
        name: u.displayName || 'PrintZone User',
        email: u.email || 'user@printzonestudio.in',
        phone: u.phoneNumber || '9830054321',
        role: isAdmin ? 'admin' : 'customer',
        savedAddresses: [],
        savedDesigns: [],
      };
      setCurrentUser(profile);
      navigateTo(isAdmin ? 'admin-dashboard' : 'customer-dashboard');
    } catch (err) {
      setAuthError(
        `Google Sign-In note: Make sure Google provider & authorized domain are enabled in Firebase Console (detabase-f6c7f). You can also use the 1-Click Demo Customer / Admin buttons on the right.`
      );
    }
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch {
      // ignore
    }
    setCurrentUser(null);
    navigateTo('home');
  };

  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartSubtotal = cart.reduce((acc, i) => acc + i.lineTotal, 0);

  // Filtered Products for All Products View
  const filteredCatalog = products.filter((p) => {
    if (selectedCategoryFilter !== 'all' && p.categoryId !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950">
      {/* Slim Dismissible Top Promo Bar (<= 40px per E-Commerce Design Rules) */}
      <div className="bg-zinc-950 text-zinc-200 text-[11px] font-mono py-2 px-4 text-center border-b border-zinc-800">
        {settings.promoBannerText}
      </div>

      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between gap-8 px-4 sm:px-8 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('home');
          }}
          className="text-xl font-display font-extrabold tracking-tight text-zinc-950 whitespace-nowrap shrink-0"
        >
          PrintZone
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
          <a
            href="#all-products"
            onClick={(e) => {
              e.preventDefault();
              setSelectedCategoryFilter('all');
              navigateTo('all-products');
            }}
            className={`hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'all-products' ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            All Products
          </a>
          <a
            href="#categories"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('categories');
            }}
            className={`hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'categories' ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            Categories
          </a>
          <a
            href="#sample-gallery"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('sample-gallery');
            }}
            className={`hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'sample-gallery' ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            Sample Gallery
          </a>
          <a
            href="#design-studio"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('design-studio');
            }}
            className={`hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'design-studio' ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            Design Studio
          </a>
          <a
            href="#order-tracking"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('order-tracking');
            }}
            className={`hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'order-tracking' ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            Track Order
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('cart-checkout')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono tabular-nums"
          >
            Cart ({cartItemCount}) · ₹{cartSubtotal.toLocaleString('en-IN')}
          </button>
        </div>
      </header>

      {/* Secondary Workspace & Search Utility Bar (Below the Top Header) */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Search Bar for Products and Designs */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activePage !== 'all-products') {
                  setActivePage('all-products');
                }
              }}
              placeholder="Search T-shirts, tote bags, 58mm badges, calendars, mugs, visiting cards..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Secondary Quick Links: Bulk, Corporate, Account, Admin, Setup Guide */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigateTo('bulk-printing')}
              className="px-2.5 py-1 text-zinc-700 hover:text-zinc-950 font-medium cursor-pointer whitespace-nowrap"
            >
              Bulk Printing
            </button>
            <span className="text-zinc-300">·</span>
            <button
              type="button"
              onClick={() => navigateTo('corporate-gifts')}
              className="px-2.5 py-1 text-zinc-700 hover:text-zinc-950 font-medium cursor-pointer whitespace-nowrap"
            >
              Corporate Gifts
            </button>
            <span className="text-zinc-300">·</span>
            <button
              type="button"
              onClick={() =>
                navigateTo(currentUser ? 'customer-dashboard' : 'auth')
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 text-zinc-800 hover:text-blue-600 font-semibold cursor-pointer whitespace-nowrap"
            >
              <User className="w-3.5 h-3.5" />
              {currentUser ? currentUser.name.split(' ')[0] : 'Login / Register'}
            </button>
            <span className="text-zinc-300">·</span>
            <button
              type="button"
              onClick={() => navigateTo('admin-dashboard')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-zinc-800 hover:text-blue-600 font-semibold cursor-pointer whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Admin Panel
            </button>
            <span className="text-zinc-300">·</span>
            <button
              type="button"
              onClick={() => setShowSetupGuideModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded font-semibold cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Firebase & Setup Guide
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT ROUTER */}
      <main className="flex-1">
        {/* ================= PAGE 1: HOME ================= */}
        {activePage === 'home' && (
          <div>
            {/* 1. HERO BANNER: "Your Ideas. Our Prints." */}
            <section className="bg-zinc-950 text-white border-b border-zinc-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                {/* Left 7 Cols */}
                <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                  <div className="text-xs font-mono text-blue-400 uppercase tracking-wider">
                    PrintZone – Custom Printing Studio · Retail & Bulk Fulfillment
                  </div>

                  <h1
                    style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)' }}
                    className="font-display font-extrabold tracking-tight leading-[1.08] text-balance"
                  >
                    {settings.heroTitle}
                  </h1>

                  <p className="text-base text-zinc-300 leading-relaxed max-w-2xl">
                    {settings.heroSubtitle}
                  </p>

                  {/* Primary Action & Secondary Route */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigateTo('design-studio')}
                      className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Sliders className="w-4 h-4" />
                      Launch Online Design Studio
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter('all');
                        navigateTo('all-products');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Explore All 46 Products
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo('sample-gallery')}
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Browse Sample Gallery →
                    </button>
                  </div>

                  {/* Unboxed Quantitative Trust Strip */}
                  <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-3 gap-6 text-xs">
                    <div>
                      <div className="text-lg font-mono font-bold text-white tabular-nums">
                        7 Categories
                      </div>
                      <div className="text-zinc-400 mt-0.5">
                        46+ Custom Print Products
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-mono font-bold text-blue-400 tabular-nums">
                        Up to 30% Off
                      </div>
                      <div className="text-zinc-400 mt-0.5">
                        Automated Bulk Order Tiers
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-mono font-bold text-white tabular-nums">
                        300 DPI CMYK
                      </div>
                      <div className="text-zinc-400 mt-0.5">
                        Live Konva.js Proofing
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 5 Cols: Interactive Multi-Product Studio Showcase */}
                <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-4">
                    {sampleDesigns.slice(0, 4).map((smp) => (
                      <div
                        key={smp.id}
                        onClick={() => handleCustomizeSampleFromGallery(smp)}
                        className="group bg-zinc-950/80 border border-zinc-800 hover:border-blue-500 rounded-xl p-3 cursor-pointer transition-all"
                      >
                        <div className="aspect-square bg-zinc-900 rounded-lg mb-2">
                          <ProductMockup
                            shape={smp.mockupShape}
                            color={smp.productColor}
                            elements={smp.frontElements}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="text-[11px] font-bold text-white truncate group-hover:text-blue-400">
                          {smp.title}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-0.5">
                          <span>{smp.styleTag}</span>
                          <span className="text-blue-400 font-semibold">₹{smp.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                    <span>Click any sample above to edit text & logos</span>
                    <button
                      type="button"
                      onClick={() => navigateTo('sample-gallery')}
                      className="text-blue-400 hover:underline font-semibold cursor-pointer"
                    >
                      View All Samples →
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. SHOP BY CATEGORY (All 7 Categories & Sub-Items) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <div>
                  <div className="text-xs font-mono text-blue-600 uppercase">
                    01. Complete Custom Printing Catalog
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
                    Shop by Printing Category
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('categories')}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer self-start sm:self-auto"
                >
                  View Detailed Category Directory →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CATEGORIES.map((cat) => {
                  const repProd =
                    products.find((p) => p.categoryId === cat.id) || products[0];
                  return (
                    <div
                      key={cat.id}
                      className="bg-zinc-50 border border-zinc-200 hover:border-zinc-900 rounded-2xl p-6 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <span className="text-xs font-mono text-blue-600 font-semibold">
                              {cat.code}. {cat.name}
                            </span>
                            <h3 className="text-lg font-display font-bold text-zinc-950 mt-0.5">
                              {cat.name}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-0.5">{cat.tagline}</p>
                          </div>
                          <div className="w-20 h-20 bg-white border border-zinc-200 rounded-xl shrink-0">
                            <ProductMockup
                              shape={cat.highlightShape}
                              color={repProd.colors[0]}
                              graphicText={cat.name.split(' ')[0].toUpperCase()}
                              className="w-full h-full"
                            />
                          </div>
                        </div>

                        {/* Sub-items unboxed list */}
                        <div className="text-xs text-zinc-600 leading-relaxed pt-3 border-t border-zinc-200/80">
                          {cat.subItems.join('  ·  ')}
                        </div>
                      </div>

                      <div className="pt-5 mt-5 border-t border-zinc-200 flex items-center justify-between">
                        <span className="text-xs font-mono text-zinc-700 tabular-nums">
                          Starting from <strong>₹{cat.startingFrom}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategoryFilter(cat.id);
                            navigateTo('all-products');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Explore {cat.subItems.length} Products
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. BEST-SELLING PRODUCTS & POPULAR T-SHIRT, BAG, BUTTON & CALENDAR SAMPLES */}
            <section className="bg-zinc-50 border-y border-zinc-200 py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-blue-600 uppercase">
                      02. Best-Sellers & Trending Custom Designs
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
                      Popular T-Shirts, Tote Bags, Badges, Calendars & Mugs
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter('all');
                      navigateTo('all-products');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-zinc-900 bg-white border border-zinc-300 hover:border-zinc-900 rounded-lg cursor-pointer self-start"
                  >
                    View All 46 Products
                  </button>
                </div>

                {/* 3-Column Featured Product Grid per E-Commerce Design Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                  {products
                    .filter((p) => p.featured)
                    .slice(0, 6)
                    .map((prod) => (
                      <div
                        key={prod.id}
                        className="group bg-white border border-zinc-200 hover:border-zinc-900 rounded-2xl p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5"
                      >
                        <div>
                          <div
                            onClick={() => {
                              setSelectedProduct(prod);
                              navigateTo('product-details');
                            }}
                            className="aspect-4/3 bg-zinc-100/80 rounded-xl mb-4 flex items-center justify-center p-4 cursor-pointer"
                          >
                            <ProductMockup
                              shape={prod.mockupShape}
                              color={prod.colors[0]}
                              graphicText={prod.defaultGraphicText}
                              graphicSubtext={prod.defaultGraphicSubtext}
                              accentColor={prod.defaultAccentColor}
                              className="w-full h-full max-w-[220px]"
                            />
                          </div>

                          {/* Clean Metadata without pills */}
                          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                            <span>{prod.categoryName}</span>
                            <span>·</span>
                            <span>MOQ: {prod.minOrderQty}</span>
                          </div>

                          <h3
                            onClick={() => {
                              setSelectedProduct(prod);
                              navigateTo('product-details');
                            }}
                            className="text-base font-display font-bold text-zinc-950 mt-1 cursor-pointer group-hover:text-blue-600"
                          >
                            {prod.name}
                          </h3>

                          <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                            {prod.shortDescription}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[11px] text-zinc-400 block">Starting from</span>
                            <span className="text-base font-mono font-bold text-zinc-950 tabular-nums">
                              ₹{prod.basePrice}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(prod);
                                navigateTo('product-details');
                              }}
                              className="px-3 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenInStudio(prod)}
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                            >
                              Customize
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>

            {/* 4. HOW CUSTOM PRINTING WORKS + BULK ORDER PROMOTION + REVIEWS */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
              {/* How It Works */}
              <div>
                <div className="text-xs font-mono text-blue-600 uppercase">
                  03. Studio Workflow
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1 mb-8">
                  How Custom Printing Works at PrintZone
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      num: '01. Select Product & Spec',
                      title: 'Choose from 46+ Blank Products',
                      desc: 'Pick your garment GSM, bag fabric, badge diameter, calendar paper stock, or ceramic mug color with transparent bulk tier pricing.',
                    },
                    {
                      num: '02. Design Live on Canvas',
                      title: 'Customize in Konva.js Studio',
                      desc: 'Upload your PNG/JPG/WebP logo or photograph, add typography, switch between Front & Back views, and inspect your Before-Order Proof.',
                    },
                    {
                      num: '03. Pre-Press & Dispatch',
                      title: 'Verified Print & Pan-India Shipping',
                      desc: 'Our pre-press team verifies 300 DPI clarity before printing via DTG, Screen Print, or UV flatbed and shipping to your Indian PIN code.',
                    },
                  ].map((step) => (
                    <div
                      key={step.num}
                      className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-2"
                    >
                      <div className="text-xs font-mono font-bold text-blue-600">
                        {step.num}
                      </div>
                      <h3 className="text-base font-display font-bold text-zinc-950">
                        {step.title}
                      </h3>
                      <p className="text-xs text-zinc-600 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bulk Order Promotion + WhatsApp Direct Enquiry */}
              <div className="bg-zinc-950 text-white rounded-2xl p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-3">
                  <div className="text-xs font-mono text-blue-400 uppercase">
                    Institutional, Corporate & College Fest Printing
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold">
                    Ordering 25 to 5,000+ Custom Units? Save Up to 30% Automatically
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
                    Get dedicated pre-press artwork assistance, Pantone ink matching, GST tax invoices, and doorstep delivery across India for corporate welcome kits, marathons, and college fests.
                  </p>
                </div>
                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => navigateTo('bulk-printing')}
                    className="w-full py-3 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl cursor-pointer text-center"
                  >
                    Open Bulk Quote Calculator
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setWhatsAppModalMsg(
                        'Hello PrintZone Studio! I would like to discuss a bulk custom printing order for our organization.'
                      )
                    }
                    className="w-full py-3 px-5 text-xs font-semibold text-emerald-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl cursor-pointer flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Bulk Desk
                  </button>
                </div>
              </div>

              {/* Attributable Customer Reviews (Claim-to-Proof Adjacency) */}
              <div>
                <div className="text-xs font-mono text-blue-600 uppercase">
                  04. Verified Client Outcomes
                </div>
                <h2 className="text-2xl font-display font-bold text-zinc-950 mt-1 mb-6">
                  Trusted by Startups, Colleges & Retail Brands Across India
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      quote:
                        'We ordered 150 heavyweight 220 GSM black crewneck tees and 300 pin-back badges for our annual developer conference. The Konva studio proof matched the final DTG print accurately.',
                      author: 'Siddharth Verma',
                      role: 'Community Lead, DevStack Bengaluru',
                      metric: '150 Tees + 300 Badges · Delivered in 5 Days',
                    },
                    {
                      quote:
                        'Switched our organic bakery packaging to PrintZone’s 320 GSM unbleached cotton tote bags and die-cut waterproof jar labels. Saved 22% with the 50+ bulk slab.',
                      author: 'Meera Krishnan',
                      role: 'Founder, Oven & Earth Artisanal Bakehouse, Chennai',
                      metric: '200 Organic Totes · 22% Bulk Saving',
                    },
                    {
                      quote:
                        'Ordered 100 tent-stand corporate desk calendars and magnetic executive name badges for our New Year client hampers in Kolkata. Zero pin damage on formal blazers.',
                      author: 'Arindam Sen',
                      role: 'Operations Director, Apex Industrial Pvt Ltd, Kolkata',
                      metric: '100 Desk Calendars + Magnetic Badges',
                    },
                  ].map((rev, i) => (
                    <div
                      key={i}
                      className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between space-y-4"
                    >
                      <p className="text-xs text-zinc-700 leading-relaxed">"{rev.quote}"</p>
                      <div className="pt-3 border-t border-zinc-200/80 text-xs">
                        <div className="font-bold text-zinc-950">{rev.author}</div>
                        <div className="text-zinc-500">{rev.role}</div>
                        <div className="text-[11px] font-mono text-blue-600 mt-1">
                          {rev.metric}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= PAGE 2: ALL PRODUCTS ================= */}
        {activePage === 'all-products' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="pb-6 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-blue-600 uppercase">
                  Complete Studio Catalog · Demo Prices Configurable in Admin
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
                  All Custom Printable Products ({filteredCatalog.length})
                </h1>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900'
                  }`}
                >
                  All ({products.length})
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                      selectedCategoryFilter === cat.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900'
                    }`}
                  >
                    {cat.name.replace(' Printing', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {filteredCatalog.map((prod) => (
                <div
                  key={prod.id}
                  className="group bg-white border border-zinc-200 hover:border-zinc-900 rounded-2xl p-5 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div
                      onClick={() => {
                        setSelectedProduct(prod);
                        navigateTo('product-details');
                      }}
                      className="aspect-4/3 bg-zinc-100/80 rounded-xl mb-4 p-4 flex items-center justify-center cursor-pointer"
                    >
                      <ProductMockup
                        shape={prod.mockupShape}
                        color={prod.colors[0]}
                        graphicText={prod.defaultGraphicText}
                        graphicSubtext={prod.defaultGraphicSubtext}
                        accentColor={prod.defaultAccentColor}
                        className="w-full h-full max-w-[200px]"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                      <span>{prod.categoryName}</span>
                      <span>·</span>
                      <span>{prod.subcategory}</span>
                      <span>·</span>
                      <span>MOQ {prod.minOrderQty}</span>
                    </div>

                    <h3
                      onClick={() => {
                        setSelectedProduct(prod);
                        navigateTo('product-details');
                      }}
                      className="text-base font-display font-bold text-zinc-950 mt-1 cursor-pointer group-hover:text-blue-600"
                    >
                      {prod.name}
                    </h3>

                    <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
                      {prod.shortDescription}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Starting Price</span>
                      <span className="text-base font-mono font-bold text-zinc-950 tabular-nums">
                        ₹{prod.basePrice}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(prod);
                          navigateTo('product-details');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer"
                      >
                        Options & Price
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenInStudio(prod)}
                        className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                      >
                        Customize
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= PAGE 3: PRODUCT CATEGORIES DIRECTORY ================= */}
        {activePage === 'categories' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
            <div className="pb-6 border-b border-zinc-200">
              <div className="text-xs font-mono text-blue-600 uppercase">
                7 Specialized Printing Divisions · 46 Sub-Products
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
                Product Categories & Customization Directory
              </h1>
            </div>

            {CATEGORIES.map((cat) => {
              const catProducts = products.filter((p) => p.categoryId === cat.id);
              return (
                <div
                  key={cat.id}
                  className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
                    <div>
                      <span className="text-xs font-mono text-blue-600 font-bold">
                        CATEGORY {cat.code}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-display font-bold text-zinc-950">
                        {cat.name}
                      </h2>
                      <p className="text-xs text-zinc-600 mt-1">{cat.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter(cat.id);
                        navigateTo('all-products');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-zinc-950 rounded-lg cursor-pointer self-start"
                    >
                      Filter All {cat.name}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {catProducts.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-16 h-16 bg-zinc-50 rounded-lg border border-zinc-200 shrink-0">
                            <ProductMockup
                              shape={p.mockupShape}
                              color={p.colors[0]}
                              graphicText={p.defaultGraphicText}
                              className="w-full h-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-blue-600">
                              {p.subcategory}
                            </div>
                            <div
                              onClick={() => {
                                setSelectedProduct(p);
                                navigateTo('product-details');
                              }}
                              className="text-xs font-bold text-zinc-950 truncate hover:text-blue-600 cursor-pointer"
                            >
                              {p.name}
                            </div>
                            <div className="text-xs font-mono font-bold text-zinc-800 mt-0.5 tabular-nums">
                              ₹{p.basePrice} <span className="font-normal text-zinc-400">· MOQ {p.minOrderQty}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenInStudio(p)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer shrink-0"
                        >
                          Design
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= PAGE 4: PRODUCT DETAILS ================= */}
        {activePage === 'product-details' && (
          <ProductDetailView
            product={selectedProduct}
            relatedProducts={products.filter(
              (p) => p.categoryId === selectedProduct.categoryId && p.id !== selectedProduct.id
            )}
            sampleDesigns={sampleDesigns}
            onBack={() => navigateTo('all-products')}
            onSelectProduct={(prod) => {
              setSelectedProduct(prod);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenInStudio={handleOpenInStudio}
            onAddToCart={handleAddToCart}
            onNavigate={navigateTo}
          />
        )}

        {/* ================= PAGE 5: SAMPLE DESIGN GALLERY ================= */}
        {activePage === 'sample-gallery' && (
          <SampleGalleryView
            sampleDesigns={sampleDesigns}
            products={products}
            onCustomizeSample={handleCustomizeSampleFromGallery}
          />
        )}

        {/* ================= PAGE 6: ONLINE DESIGN STUDIO (KONVA.JS) ================= */}
        {activePage === 'design-studio' && (
          <DesignStudioEditor
            products={products}
            initialProduct={studioProduct}
            initialSample={studioSample}
            onAddToCart={(item) => {
              handleAddToCart(item);
              navigateTo('cart-checkout');
            }}
            onSaveDesign={handleSaveCustomDesign}
          />
        )}

        {/* ================= PAGE 7: BULK PRINTING ================= */}
        {activePage === 'bulk-printing' && (
          <BulkPrintingView
            products={products}
            onOpenInStudio={(prod) => handleOpenInStudio(prod)}
            onOpenWhatsAppModal={(msg) => setWhatsAppModalMsg(msg)}
          />
        )}

        {/* ================= PAGE 8: CUSTOM CORPORATE GIFTS ================= */}
        {activePage === 'corporate-gifts' && (
          <CorporateGiftsView
            products={products}
            onAddToCart={handleAddToCart}
            onNavigate={navigateTo}
          />
        )}

        {/* ================= PAGES 9–15: ABOUT, CONTACT, FAQ & POLICIES ================= */}
        {(activePage === 'about' ||
          activePage === 'contact' ||
          activePage === 'faq' ||
          activePage === 'shipping-policy' ||
          activePage === 'returns-policy' ||
          activePage === 'privacy-policy' ||
          activePage === 'terms') && (
          <InformationalPageView
            page={activePage}
            settings={settings}
            onNavigate={navigateTo}
            onOpenWhatsAppModal={(msg) => setWhatsAppModalMsg(msg)}
          />
        )}

        {/* ================= PAGE 16: LOGIN / REGISTER ================= */}
        {activePage === 'auth' && (
          <AuthView
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              navigateTo(user.role === 'admin' ? 'admin-dashboard' : 'customer-dashboard');
            }}
            onGoogleLogin={handleGoogleLogin}
            authError={authError}
          />
        )}

        {/* ================= PAGE 17: CART & CHECKOUT ================= */}
        {activePage === 'cart-checkout' && (
          <CartCheckoutView
            cart={cart}
            products={products}
            settings={settings}
            currentUser={currentUser}
            onUpdateQuantity={handleUpdateCartQty}
            onRemoveItem={handleRemoveCartItem}
            onPlaceOrder={handlePlaceOrder}
            onNavigate={navigateTo}
            onOpenWhatsAppModal={(msg) => setWhatsAppModalMsg(msg)}
          />
        )}

        {/* ================= PAGE 18: CUSTOMER DASHBOARD ================= */}
        {activePage === 'customer-dashboard' && (
          <CustomerDashboardView
            currentUser={currentUser}
            orders={orders}
            products={products}
            onNavigate={navigateTo}
            onLogout={handleLogout}
            onReorder={(order) => {
              order.items.forEach((i) =>
                handleAddToCart({ ...i, id: `cart-${Date.now()}-${Math.random()}` })
              );
              navigateTo('cart-checkout');
            }}
            onLoadSavedDesign={(dsn) => {
              const p = products.find((item) => item.id === dsn.productId) || products[0];
              const tempSample: SampleDesign = {
                id: dsn.id,
                title: dsn.name,
                categoryId: p.categoryId,
                productId: p.id,
                mockupShape: dsn.mockupShape,
                styleTag: 'Minimalist',
                productColor: dsn.selectedColor,
                price: p.basePrice,
                description: 'Loaded from Saved Customer Designs',
                frontElements: dsn.frontElements,
                backElements: dsn.backElements,
                supportsBackView: true,
              };
              handleOpenInStudio(p, tempSample);
            }}
          />
        )}

        {/* ================= PAGE 19: ORDER TRACKING ================= */}
        {activePage === 'order-tracking' && (
          <OrderTrackingView
            orders={orders}
            onOpenWhatsAppModal={(msg) => setWhatsAppModalMsg(msg)}
          />
        )}

        {/* ================= PAGE 20: ADMIN DASHBOARD ================= */}
        {activePage === 'admin-dashboard' && (
          <AdminDashboardView
            currentUser={currentUser}
            onAdminQuickLogin={() =>
              setCurrentUser({
                uid: 'admin-demo-1',
                name: 'Tanmoy Dari (Studio Admin)',
                email: 'tanmoydari4@gmail.com',
                phone: '9830054321',
                role: 'admin',
                savedAddresses: [],
                savedDesigns: [],
              })
            }
            products={products}
            onSaveProducts={setProducts}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            sampleDesigns={sampleDesigns}
            onSaveSampleDesigns={setSampleDesigns}
            settings={settings}
            onSaveSettings={setSettings}
          />
        )}
      </main>

      {/* NEWSLETTER & WHATSAPP FOOTER BAR */}
      <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          {/* Newsletter Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-10 border-b border-zinc-800">
            <div>
              <h3 className="text-lg font-display font-bold text-white">
                Subscribe to PrintZone Studio Dispatch
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Receive seasonal template drops, corporate gifting lookbooks, and bulk print offers.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newsletterEmail.trim()) {
                  setNewsletterSubscribed(true);
                  setNewsletterEmail('');
                }
              }}
              className="flex gap-2 w-full md:w-auto"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your work email..."
                className="px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 min-w-[240px]"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer whitespace-nowrap"
              >
                {newsletterSubscribed ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
          </div>

          {/* 4-Column All 20 Website Pages Navigation Directory */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
            <div className="space-y-2.5">
              <div className="font-display font-bold text-white text-sm">
                PrintZone – Custom Printing Studio
              </div>
              <p className="text-zinc-400 leading-relaxed">{settings.studioAddress}</p>
              <div className="font-mono text-zinc-300">{settings.supportPhone}</div>
              <div className="font-mono text-blue-400">{settings.supportEmail}</div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono">
                Catalog & Studio
              </div>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => navigateTo('home')} className="hover:text-white cursor-pointer">
                    1. Home
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('all-products')} className="hover:text-white cursor-pointer">
                    2. All Products (46 SKUs)
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('categories')} className="hover:text-white cursor-pointer">
                    3. Product Categories (7)
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('product-details')} className="hover:text-white cursor-pointer">
                    4. Product Details & Pricing
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('sample-gallery')} className="hover:text-white cursor-pointer">
                    5. Sample Design Gallery
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('design-studio')} className="hover:text-white cursor-pointer">
                    6. Online Design Studio (Konva.js)
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('bulk-printing')} className="hover:text-white cursor-pointer">
                    7. Bulk Printing Calculator
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono">
                Customer & Operations
              </div>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => navigateTo('corporate-gifts')} className="hover:text-white cursor-pointer">
                    8. Custom Corporate Gifts
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('auth')} className="hover:text-white cursor-pointer">
                    16. Login / Register
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('cart-checkout')} className="hover:text-white cursor-pointer">
                    17. Cart & Indian Checkout
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('customer-dashboard')} className="hover:text-white cursor-pointer">
                    18. Customer Dashboard
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('order-tracking')} className="hover:text-white cursor-pointer">
                    19. Order Status Tracking
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('admin-dashboard')} className="hover:text-white cursor-pointer">
                    20. Admin Studio Dashboard
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-white uppercase tracking-wider text-[11px] font-mono">
                Company & Policies
              </div>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => navigateTo('about')} className="hover:text-white cursor-pointer">
                    9. About Us
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('contact')} className="hover:text-white cursor-pointer">
                    10. Contact Us
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('faq')} className="hover:text-white cursor-pointer">
                    11. FAQ
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('shipping-policy')} className="hover:text-white cursor-pointer">
                    12. Shipping & Delivery Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('returns-policy')} className="hover:text-white cursor-pointer">
                    13. Returns & Refund Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('privacy-policy')} className="hover:text-white cursor-pointer">
                    14. Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('terms')} className="hover:text-white cursor-pointer">
                    15. Terms & Conditions
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-500">
            <div>
              © {new Date().getFullYear()} PrintZone – Custom Printing Studio. Demo sample products & prices are configurable via the Admin Panel.
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowSetupGuideModal(true)}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                Firebase (detabase-f6c7f) & Deployment Instructions
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* WHATSAPP ORDER ENQUIRY MODAL (Avoids window.open block in iframe) */}
      {whatsAppModalMsg !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-display font-bold text-zinc-950">
                  WhatsApp Studio Order Enquiry (+{settings.whatsappNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWhatsAppModalMsg(null);
                  setWhatsAppSentNotice(false);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-600">
              Review or customize your WhatsApp enquiry message for PrintZone Pre-Press Desk:
            </div>

            <textarea
              rows={4}
              value={whatsAppModalMsg}
              onChange={(e) => setWhatsAppModalMsg(e.target.value)}
              className="w-full p-3 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono"
            />

            {whatsAppSentNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>
                  Enquiry logged and formatted for WhatsApp (+{settings.whatsappNumber})!
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                  whatsAppModalMsg
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsAppSentNotice(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send via WhatsApp Web / App
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SETUP, FIREBASE (detabase-f6c7f) & DEPLOYMENT GUIDE MODAL */}
      {showSetupGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 border border-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div>
                <div className="text-xs font-mono text-blue-600 uppercase">
                  Setup, Database & Production Deployment Guide
                </div>
                <h2 className="text-xl font-display font-bold text-zinc-950">
                  PrintZone – Custom Printing Studio Configuration
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupGuideModal(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-950 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-zinc-700 leading-relaxed max-h-[65vh] overflow-y-auto pr-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1.5">
                <div className="font-bold text-blue-950">
                  1. Your Firebase Project (detabase-f6c7f) Is Connected! (এবার কী করবেন?)
                </div>
                <p className="text-blue-900">
                  আপনার দেওয়া Firebase config (<code className="font-mono">projectId: "detabase-f6c7f"</code>) ইতিমধ্যেই <code className="font-mono">src/firebase.ts</code> ফাইলে যুক্ত করা হয়েছে। এখন Firebase Console-এ গিয়ে নিচের দুটি অপশন চালু করে নিন:
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-900">
                  <li>
                    <strong>Authentication:</strong> Firebase Console → Build → Authentication → Sign-in method-এ গিয়ে <strong>Google</strong> এবং <strong>Email/Password</strong> Enable করুন।
                  </li>
                  <li>
                    <strong>Firestore Database:</strong> Firebase Console → Build → Firestore Database → Create Database ক্লিক করুন। তখন আপনার সমস্ত অর্ডার, প্রোডাক্ট ও কাস্টম ডিজাইন ক্লাউডে সেভ হবে।
                  </li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-zinc-950">
                  2. Managing Products, Prices & Customer Print Files (Admin Panel)
                </div>
                <p>
                  Click <strong>Admin Panel</strong> in the top utility bar (or sign in with <code className="font-mono">tanmoydari4@gmail.com</code>). From there you can edit any product’s base price, MOQ, stock status, download customer-created PNG print proofs, update order statuses, and export orders to CSV.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-zinc-950">
                  3. Deploying from the <code className="font-mono text-blue-600">main</code> Branch (GitHub / Firebase / Vercel)
                </div>
                <p>
                  <code className="font-mono">firebase.json</code>, <code className="font-mono">.firebaserc</code>, <code className="font-mono">.github/workflows/deploy-main.yml</code>, এবং <code className="font-mono">vercel.json</code> ফাইলগুলো <code className="font-mono">main</code> ব্রাঞ্চের জন্য রেডি করা হয়েছে:
                </p>
                <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
{`git branch -M main
git push -u origin main

# Or deploy directly to Firebase Hosting (detabase-f6c7f):
npm run build
npx firebase-tools deploy --only hosting`}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSetupGuideModal(false)}
                className="px-5 py-2 text-xs font-semibold text-white bg-zinc-950 rounded-lg cursor-pointer"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
