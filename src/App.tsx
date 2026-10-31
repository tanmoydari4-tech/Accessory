import React, { useEffect, useState } from 'react';
import {
  CartItem,
  CategoryId,
  Order,
  OrderStatus,
  PageId,
  Product,
  ProductColor,
  SampleDesign,
  SavedCustomDesign,
  StoreSettings,
  UserProfile,
} from './types';
import {
  CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SAMPLE_DESIGNS,
  INITIAL_STORE_SETTINGS,
} from './data/catalogData';
import { ProductMockup } from './components/ProductMockup';
import { ShoppingProductCard } from './components/ShoppingProductCard';
import { CartDrawer } from './components/CartDrawer';
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
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
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
  Home,
  Grid,
} from 'lucide-react';

const STORAGE_KEYS = {
  PRODUCTS: 'pz_studio_products_v1',
  ORDERS: 'pz_studio_orders_v2',
  SAMPLES: 'pz_studio_samples_v1',
  SETTINGS: 'pz_studio_settings_v1',
  LEGACY_SHARED_CART: 'pz_studio_cart_v1',
  USER: 'pz_studio_user_v2',
};

const getUserCartKey = (uid: string) => `pz_studio_user_cart_v3_${uid}`;

const loadCartForUserId = (uid?: string | null): CartItem[] => {
  if (!uid || uid.startsWith('guest-')) return [];
  try {
    const saved = localStorage.getItem(getUserCartKey(uid));
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priceSort, setPriceSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [priceRangeFilter, setPriceRangeFilter] = useState<'all' | 'under-199' | '200-499' | '500-plus'>('all');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);

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
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
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

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      // Remove any legacy shared guest cart so cart is never pre-populated without user login
      localStorage.removeItem(STORAGE_KEYS.LEGACY_SHARED_CART);
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as UserProfile;
      if (parsed?.uid?.startsWith('guest-')) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  // Cart is ALWAYS blank when signed out, and strictly isolated per signed-in User ID
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedUserRaw = localStorage.getItem(STORAGE_KEYS.USER);
      if (!savedUserRaw) return [];
      const parsedUser = JSON.parse(savedUserRaw) as UserProfile;
      if (!parsedUser?.uid || parsedUser.uid.startsWith('guest-')) return [];
      return loadCartForUserId(parsedUser.uid);
    } catch {
      return [];
    }
  });

  // Active Product / Studio Selection
  const [selectedProduct, setSelectedProduct] = useState<Product>(INITIAL_PRODUCTS[0]);
  const [studioProduct, setStudioProduct] = useState<Product>(INITIAL_PRODUCTS[0]);
  const [studioSample, setStudioSample] = useState<SampleDesign | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [requireLoginNotice, setRequireLoginNotice] = useState<boolean>(false);

  // WhatsApp Enquiry Modal
  const [whatsAppModalMsg, setWhatsAppModalMsg] = useState<string | null>(null);
  const [whatsAppSentNotice, setWhatsAppSentNotice] = useState<boolean>(false);
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(false);

  // Interactive Google Account Sign-In Modal state (used when browser iframe blocks popup or domain is not yet whitelisted in Firebase Console)
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
  const [googleInputEmail, setGoogleInputEmail] = useState<string>('');
  const [googleInputName, setGoogleInputName] = useState<string>('');
  const [googleInputPhone, setGoogleInputPhone] = useState<string>('');
  const [googleModalError, setGoogleModalError] = useState<string | null>(null);
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState<UserProfile[]>(() => {
    try {
      const raw = localStorage.getItem('pz_studio_google_accounts_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

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

  // When signed-in user ID changes, load ONLY that user's cart (or blank [] when signed out)
  useEffect(() => {
    if (!currentUser || currentUser.uid.startsWith('guest-')) {
      setCart([]);
      try {
        localStorage.removeItem(STORAGE_KEYS.USER);
      } catch {
        // ignore
      }
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } catch {
      // ignore
    }

    setCart(loadCartForUserId(currentUser.uid));
  }, [currentUser?.uid]);

  // Save cart strictly under the currently signed-in user's ID
  useEffect(() => {
    if (!currentUser || currentUser.uid.startsWith('guest-')) {
      return;
    }
    try {
      localStorage.setItem(getUserCartKey(currentUser.uid), JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, currentUser?.uid]);

  // Real-time Firebase Auth & Firestore listeners connected to user's project (detabase-f6c7f)
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (auth) {
      try {
        const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
          if (!fbUser) return;
          const isAdmin =
            fbUser.email?.toLowerCase() === 'tanmoydari4@gmail.com' ||
            fbUser.email?.toLowerCase() === 'admin@printzonestudio.in';
          let profile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'PrintZone Customer',
            email: fbUser.email || 'customer@printzonestudio.in',
            phone: fbUser.phoneNumber || '9830054321',
            role: isAdmin ? 'admin' : 'customer',
            savedAddresses: [],
            savedDesigns: [],
          };
          if (db) {
            try {
              const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
              if (userDoc.exists()) {
                profile = { ...profile, ...(userDoc.data() as Partial<UserProfile>) };
              } else {
                await setDoc(doc(db, 'users', fbUser.uid), profile, { merge: true });
              }
            } catch {
              // Ignore if Firestore rules restrict read before setup
            }
          }
          setCurrentUser((prev) => (prev && prev.uid === profile.uid ? prev : profile));
        });
        unsubs.push(unsubAuth);
      } catch {
        // Fallback to local session
      }
    }

    if (db) {
      try {
        const unsubOrders = onSnapshot(
          collection(db, 'orders'),
          (snap) => {
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
          },
          () => {}
        );
        unsubs.push(unsubOrders);

        const unsubSettings = onSnapshot(
          doc(db, 'store', 'settings'),
          (snap) => {
            if (snap.exists()) {
              setSettings(snap.data() as StoreSettings);
            }
          },
          () => {}
        );
        unsubs.push(unsubSettings);

        const unsubCatalog = onSnapshot(
          doc(db, 'store', 'catalog'),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as { items?: Product[] };
              if (Array.isArray(data.items) && data.items.length > 0) {
                setProducts(data.items);
              }
            }
          },
          () => {}
        );
        unsubs.push(unsubCatalog);

        const unsubSamples = onSnapshot(
          doc(db, 'store', 'samples'),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as { items?: SampleDesign[] };
              if (Array.isArray(data.items) && data.items.length > 0) {
                setSampleDesigns(data.items);
              }
            }
          },
          () => {}
        );
        unsubs.push(unsubSamples);
      } catch {
        // Firestore not yet enabled in user's console or offline — local persistence handles seamlessly
      }
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  const navigateTo = (page: PageId) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart Handlers — Require Sign In first; Cart is strictly tied to currentUser.uid
  const handleAddToCart = (item: CartItem) => {
    if (!currentUser || currentUser.uid.startsWith('guest-')) {
      setIsCartDrawerOpen(false);
      setRequireLoginNotice(true);
      navigateTo('auth');
      return;
    }
    setCart((prev) => [item, ...prev]);
  };

  const handleQuickAddToCart = (
    prod: Product,
    selectedColor: ProductColor,
    selectedSize: string,
    qtyToAdd: number,
    openDrawer = true,
    directArtworkUpload?: CartItem['directArtworkUpload']
  ) => {
    // Must be signed in to add items to cart; cart remains blank until user signs in
    if (!currentUser || currentUser.uid.startsWith('guest-')) {
      setIsCartDrawerOpen(false);
      setRequireLoginNotice(true);
      navigateTo('auth');
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.productId === prod.id &&
          item.selectedColor.name === selectedColor.name &&
          item.selectedSize === selectedSize &&
          !item.customDesign &&
          !item.directArtworkUpload &&
          !directArtworkUpload
      );

      if (existingIdx > -1) {
        const current = prev[existingIdx];
        const nextQty = current.quantity + 1;
        const disc = prod.bulkTiers.reduce(
          (acc, t) => (nextQty >= t.minQty ? Math.max(acc, t.discountPercent) : acc),
          0
        );
        const finalUnit = Math.round(prod.basePrice * (1 - disc / 100));
        const updatedItem: CartItem = {
          ...current,
          quantity: nextQty,
          discountPercent: disc,
          finalUnitPrice: finalUnit,
          lineTotal: finalUnit * nextQty,
        };
        const copy = [...prev];
        copy[existingIdx] = updatedItem;
        return copy;
      }

      const validQty = Math.max(prod.minOrderQty, qtyToAdd);
      const disc = prod.bulkTiers.reduce(
        (acc, t) => (validQty >= t.minQty ? Math.max(acc, t.discountPercent) : acc),
        0
      );
      const finalUnit = Math.round(prod.basePrice * (1 - disc / 100));
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: prod.id,
        productName: prod.name,
        categoryName: prod.categoryName,
        sku: prod.sku,
        mockupShape: prod.mockupShape,
        productImageUrl: prod.imageUrl,
        selectedColor,
        selectedSize,
        selectedMaterial: prod.materials[0] || 'Standard Studio Grade',
        printingMethod: prod.printingMethods[0] || 'HD Digital Print',
        printSide: 'Front',
        quantity: validQty,
        unitBasePrice: prod.basePrice,
        bothSideExtra: 0,
        discountPercent: disc,
        finalUnitPrice: finalUnit,
        lineTotal: finalUnit * validQty,
        directArtworkUpload,
      };
      return [newItem, ...prev];
    });

    if (openDrawer) {
      setIsCartDrawerOpen(true);
    }
  };

  const handleBuyNow = (
    prod: Product,
    selectedColor: ProductColor,
    selectedSize: string,
    qty: number,
    directArtworkUpload?: CartItem['directArtworkUpload']
  ) => {
    setIsCartDrawerOpen(false);
    // Require Sign In / Login before adding to cart or placing an order
    if (!currentUser || currentUser.uid.startsWith('guest-')) {
      setRequireLoginNotice(true);
      navigateTo('auth');
      return;
    }

    const exists = cart.some(
      (item) =>
        item.productId === prod.id &&
        item.selectedColor.name === selectedColor.name &&
        item.selectedSize === selectedSize &&
        !item.customDesign &&
        !directArtworkUpload
    );
    if (!exists) {
      handleQuickAddToCart(prod, selectedColor, selectedSize, qty, false, directArtworkUpload);
    }
    navigateTo('cart-checkout');
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

  const handleUpdateCartItemAttachment = (
    cartItemId: string,
    directArtworkUpload: CartItem['directArtworkUpload']
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, directArtworkUpload } : item
      )
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

  // Save Custom Design to User Profile + Firestore (`detabase-f6c7f`)
  const handleSaveCustomDesign = (design: SavedCustomDesign) => {
    if (currentUser && !currentUser.uid.startsWith('guest-')) {
      const updatedUser: UserProfile = {
        ...currentUser,
        savedDesigns: [design, ...currentUser.savedDesigns],
      };
      setCurrentUser(updatedUser);
      if (db && updatedUser.uid) {
        setDoc(doc(db, 'users', updatedUser.uid), updatedUser, { merge: true }).catch(() => {});
      }
    } else {
      navigateTo('auth');
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

  const completeGoogleSignInProfile = async (profile: UserProfile) => {
    let finalProfile = { ...profile };
    if (db) {
      try {
        const userDoc = await getDoc(doc(db, 'users', profile.uid));
        if (userDoc.exists()) {
          finalProfile = { ...finalProfile, ...(userDoc.data() as Partial<UserProfile>) };
        } else {
          await setDoc(doc(db, 'users', profile.uid), finalProfile, { merge: true });
        }
      } catch {
        // Ignore if Firestore rules restrict before setup
      }
    }

    // Save in device's remembered Google accounts for 1-click sign-in next time
    setSavedGoogleAccounts((prev) => {
      const filtered = prev.filter(
        (a) => a.email.toLowerCase() !== finalProfile.email.toLowerCase()
      );
      const updated = [finalProfile, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('pz_studio_google_accounts_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    const userOwnCart = loadCartForUserId(finalProfile.uid);
    setCurrentUser(finalProfile);
    setCart(userOwnCart);
    setIsGoogleModalOpen(false);
    setAuthError(null);
    setRequireLoginNotice(false);

    const isAdmin =
      finalProfile.role === 'admin' ||
      finalProfile.email.toLowerCase() === 'tanmoydari4@gmail.com' ||
      finalProfile.email.toLowerCase() === 'admin@printzonestudio.in';

    if (userOwnCart.length > 0 && !isAdmin) {
      navigateTo('cart-checkout');
    } else if (requireLoginNotice && !isAdmin) {
      navigateTo('all-products');
    } else {
      navigateTo(isAdmin ? 'admin-dashboard' : 'customer-dashboard');
    }
  };

  // Google Sign-In
  const handleGoogleLogin = async () => {
    setAuthError(null);
    setGoogleModalError(null);

    if (auth && googleProvider) {
      try {
        const res = await signInWithPopup(auth, googleProvider);
        const u = res.user;
        const isAdmin =
          u.email?.toLowerCase() === 'tanmoydari4@gmail.com' ||
          u.email?.toLowerCase() === 'admin@printzonestudio.in';
        const profile: UserProfile = {
          uid: u.uid,
          name: u.displayName || u.email?.split('@')[0] || 'PrintZone Customer',
          email: u.email || '',
          phone: u.phoneNumber ? u.phoneNumber.replace(/\D/g, '').slice(-10) : '',
          role: isAdmin ? 'admin' : 'customer',
          savedAddresses: [],
          savedDesigns: [],
        };
        await completeGoogleSignInProfile(profile);
        return;
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code || '';
        // If user explicitly closed the popup window themselves, do not force modal unless they want it
        if (code === 'auth/popup-closed-by-user') {
          return;
        }
        // For auth/unauthorized-domain, auth/operation-not-allowed, auth/popup-blocked, or iframe restrictions:
        // Open the seamless built-in Google Account Sign-In chooser modal
      }
    }

    setIsGoogleModalOpen(true);
  };

  const handleConfirmGoogleModalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleModalError(null);

    const cleanEmail = googleInputEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setGoogleModalError('Please enter a valid Google email address (e.g. yourname@gmail.com).');
      return;
    }

    const cleanPhone = googleInputPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setGoogleModalError('Please enter a valid 10-digit mobile number or leave it blank.');
      return;
    }

    const derivedName =
      googleInputName.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const isAdmin =
      cleanEmail === 'tanmoydari4@gmail.com' || cleanEmail === 'admin@printzonestudio.in';

    const existingAcc = savedGoogleAccounts.find(
      (a) => a.email.toLowerCase() === cleanEmail
    );

    const profile: UserProfile = {
      uid: existingAcc?.uid || `google-${cleanEmail.replace(/[^a-z0-9]/g, '')}`,
      name: derivedName,
      email: cleanEmail,
      phone: cleanPhone || existingAcc?.phone || '',
      role: isAdmin ? 'admin' : 'customer',
      savedAddresses: existingAcc?.savedAddresses || [],
      savedDesigns: existingAcc?.savedDesigns || [],
    };

    await completeGoogleSignInProfile(profile);
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
    setCart([]);
    setIsCartDrawerOpen(false);
    navigateTo('home');
  };

  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartSubtotal = cart.reduce((acc, i) => acc + i.lineTotal, 0);

  // Filtered & Sorted Products for Shopping Catalog
  const filteredCatalog = products
    .filter((p) => {
      if (selectedCategoryFilter !== 'all' && p.categoryId !== selectedCategoryFilter) {
        return false;
      }
      if (priceRangeFilter === 'under-199' && p.basePrice >= 200) return false;
      if (priceRangeFilter === '200-499' && (p.basePrice < 200 || p.basePrice > 499)) return false;
      if (priceRangeFilter === '500-plus' && p.basePrice < 500) return false;

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
    })
    .sort((a, b) => {
      if (priceSort === 'price-asc') return a.basePrice - b.basePrice;
      if (priceSort === 'price-desc') return b.basePrice - a.basePrice;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/40 text-zinc-950">
      {/* Slim Top Promo Bar (<= 40px) */}
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
            setSelectedCategoryFilter('all');
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
            Shop All
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
            Sample Designs
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
            Custom Studio
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

        {/* Zone 3: 1 primary Shopping Cart action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsCartDrawerOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono tabular-nums"
          >
            Cart ({cartItemCount}) · ₹{cartSubtotal.toLocaleString('en-IN')}
          </button>
        </div>
      </header>

      {/* Secondary Shopping Search & Account Bar */}
      <div className="bg-white border-b border-zinc-200 px-3 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* E-Commerce Search Input */}
          <div className="relative flex-1 w-full sm:max-w-lg">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activePage !== 'home' && activePage !== 'all-products') {
                  setActivePage('all-products');
                }
              }}
              placeholder="Search for custom T-shirts, photo mugs, tote bags, badges, calendars..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Quick Account, Orders, Bulk & Admin Links */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => navigateTo('cart-checkout')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              View Cart & Checkout ({cartItemCount})
            </button>

            <button
              type="button"
              onClick={() => navigateTo('order-tracking')}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-800 font-medium cursor-pointer whitespace-nowrap shrink-0"
            >
              My Orders / Track
            </button>

            <button
              type="button"
              onClick={() => navigateTo('bulk-printing')}
              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-800 font-medium cursor-pointer whitespace-nowrap shrink-0"
            >
              Bulk Deals
            </button>

            <button
              type="button"
              onClick={() =>
                navigateTo(currentUser ? 'customer-dashboard' : 'auth')
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-900 font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              {currentUser ? currentUser.name.split(' ')[0] : 'Login / Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => navigateTo('admin-dashboard')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-800 font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* VISUAL SHOPPING CATEGORY ICON STRIP (Flipkart / Myntra Style) */}
      {(activePage === 'home' || activePage === 'all-products' || activePage === 'categories') && (
        <div className="bg-white border-b border-zinc-200 shadow-2xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('all');
                  if (activePage !== 'home' && activePage !== 'all-products') {
                    navigateTo('all-products');
                  }
                }}
                className={`flex flex-col items-center gap-1.5 min-w-[76px] p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-blue-50/80 border-blue-600 text-blue-700 font-bold'
                    : 'bg-zinc-50/70 border-zinc-200 text-zinc-700 hover:border-zinc-400'
                }`}
              >
                <div className="w-11 h-11 rounded-lg bg-white border border-zinc-200 p-1 flex items-center justify-center">
                  <ProductMockup
                    shape="tshirt"
                    color={products[0]?.colors[0] || { name: 'Blue', hex: '#2563EB' }}
                    graphicText="ALL"
                    className="w-full h-full"
                  />
                </div>
                <span className="text-[11px] whitespace-nowrap">All ({products.length})</span>
              </button>

              {CATEGORIES.map((cat) => {
                const rep = products.find((p) => p.categoryId === cat.id) || products[0];
                const isSelected = selectedCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(cat.id);
                      if (activePage !== 'home' && activePage !== 'all-products') {
                        navigateTo('all-products');
                      }
                    }}
                    className={`flex flex-col items-center gap-1.5 min-w-[84px] p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-600 text-blue-700 font-bold'
                        : 'bg-zinc-50/70 border-zinc-200 text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-lg bg-white border border-zinc-200 p-1 flex items-center justify-center">
                      <ProductMockup
                        shape={cat.highlightShape}
                        color={rep.colors[0]}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-[11px] whitespace-nowrap">
                      {cat.name.replace(' Printing', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT ROUTER */}
      <main className="flex-1">
        {/* ================= PAGE 1: E-COMMERCE SHOPPING STOREFRONT (HOME) ================= */}
        {activePage === 'home' && (
          <div className="space-y-10 pb-12">
            {/* Compact E-Commerce Promotional Hero Banner */}
            <section className="bg-zinc-950 text-white border-b border-zinc-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="text-xs font-mono text-blue-400 uppercase tracking-wider">
                    Custom Printing Online Store · Free Shipping Above ₹{settings.freeDeliveryThreshold}
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight leading-tight">
                    Shop Custom Printed T-Shirts, Mugs, Tote Bags, Badges & Personalized Gifts
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                    Select your size & color, click <strong>Add to Cart</strong> or <strong>Buy Now</strong> for instant checkout, or click <strong>Customize</strong> on any item to add your own photo, logo, or name.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter('all');
                        navigateTo('all-products');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Shop All {products.length} Products
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('design-studio')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-100 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl cursor-pointer"
                    >
                      <Sliders className="w-4 h-4 text-blue-400" />
                      Custom Photo & Logo Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('sample-gallery')}
                      className="px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                    >
                      Ready Sample Designs →
                    </button>
                  </div>
                </div>

                {/* Right 5 Cols: Quick Deal Spotlight Cards */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                  {products.slice(0, 2).map((dealProd) => (
                    <div
                      key={dealProd.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between"
                    >
                      <div
                        onClick={() => {
                          setSelectedProduct(dealProd);
                          navigateTo('product-details');
                        }}
                        className="aspect-4/3 bg-zinc-950 rounded-lg overflow-hidden mb-2.5 cursor-pointer"
                      >
                        <ProductMockup
                          shape={dealProd.mockupShape}
                          color={dealProd.colors[0]}
                          graphicText={dealProd.defaultGraphicText}
                          productImageUrl={dealProd.imageUrl}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {dealProd.name}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
                        <span className="font-mono font-bold text-sm text-blue-400 tabular-nums">
                          ₹{dealProd.basePrice}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickAddToCart(
                              dealProd,
                              dealProd.colors[0],
                              dealProd.sizes[0] || 'Standard',
                              dealProd.minOrderQty,
                              true
                            )
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* MAIN SHOPPING PRODUCT GRID (Directly on Homepage!) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              {/* Filter & Sort Toolbar */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-zinc-950">
                    {selectedCategoryFilter === 'all'
                      ? `All Shopping Products (${filteredCatalog.length})`
                      : `${
                          CATEGORIES.find((c) => c.id === selectedCategoryFilter)?.name ||
                          'Category'
                        } (${filteredCatalog.length})`}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Select color & size on any card and click <strong>Add to Cart</strong> or <strong>Buy Now</strong>
                  </p>
                </div>

                {/* Price Filter & Sort Controls */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                    {[
                      { id: 'all', label: 'All Prices' },
                      { id: 'under-199', label: 'Under ₹199' },
                      { id: '200-499', label: '₹200 – ₹499' },
                      { id: '500-plus', label: '₹500+' },
                    ].map((pf) => (
                      <button
                        key={pf.id}
                        type="button"
                        onClick={() =>
                          setPriceRangeFilter(pf.id as typeof priceRangeFilter)
                        }
                        className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                          priceRangeFilter === pf.id
                            ? 'bg-white text-zinc-950 shadow-2xs'
                            : 'text-zinc-600 hover:text-zinc-950'
                        }`}
                      >
                        {pf.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={priceSort}
                    onChange={(e) => setPriceSort(e.target.value as typeof priceSort)}
                    className="px-3 py-2 bg-white border border-zinc-300 rounded-xl font-medium text-zinc-800 cursor-pointer"
                  >
                    <option value="featured">Sort: Featured & Popular</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* 3-Column Shopping Cart Product Grid */}
              {filteredCatalog.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3">
                  <div className="text-base font-display font-bold text-zinc-900">
                    No matching products found
                  </div>
                  <p className="text-xs text-zinc-500">
                    Try clearing your search or selecting "All Prices" and "All Categories".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter('all');
                      setPriceRangeFilter('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCatalog.map((prod) => (
                    <ShoppingProductCard
                      key={prod.id}
                      product={prod}
                      cart={cart}
                      onQuickAddToCart={handleQuickAddToCart}
                      onUpdateCartQuantity={handleUpdateCartQty}
                      onRemoveCartItem={handleRemoveCartItem}
                      onBuyNow={handleBuyNow}
                      onViewDetails={(p) => {
                        setSelectedProduct(p);
                        navigateTo('product-details');
                      }}
                      onCustomize={(p) => handleOpenInStudio(p)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* SHOP BY CATEGORY SHOWCASE */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-zinc-950">
                    Browse All 7 Custom Printing Departments
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Click any department to filter and add products to your shopping cart
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {CATEGORIES.map((cat) => {
                  const repProd =
                    products.find((p) => p.categoryId === cat.id) || products[0];
                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategoryFilter(cat.id);
                        window.scrollTo({ top: 280, behavior: 'smooth' });
                      }}
                      className="bg-white border border-zinc-200 hover:border-blue-600 rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-blue-600 font-semibold">
                          From ₹{cat.startingFrom}
                        </div>
                        <h3 className="text-base font-display font-bold text-zinc-950">
                          {cat.name}
                        </h3>
                        <p className="text-xs text-zinc-500 line-clamp-2">
                          {cat.subItems.join(' · ')}
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-zinc-50 border border-zinc-200 rounded-xl p-1.5 shrink-0">
                        <ProductMockup
                          shape={cat.highlightShape}
                          color={repProd.colors[0]}
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ================= PAGE 2: ALL PRODUCTS SHOPPING CATALOG ================= */}
        {activePage === 'all-products' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-zinc-950">
                  {selectedCategoryFilter === 'all'
                    ? `All Printable Products (${filteredCatalog.length})`
                    : `${
                        CATEGORIES.find((c) => c.id === selectedCategoryFilter)?.name ||
                        'Products'
                      } (${filteredCatalog.length})`}
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Pick your color & size and click Add to Cart or Buy Now
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={priceRangeFilter}
                  onChange={(e) =>
                    setPriceRangeFilter(e.target.value as typeof priceRangeFilter)
                  }
                  className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium text-zinc-800 cursor-pointer"
                >
                  <option value="all">Price: All Ranges</option>
                  <option value="under-199">Under ₹199</option>
                  <option value="200-499">₹200 – ₹499</option>
                  <option value="500-plus">₹500 & Above</option>
                </select>

                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value as typeof priceSort)}
                  className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium text-zinc-800 cursor-pointer"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCatalog.map((prod) => (
                <ShoppingProductCard
                  key={prod.id}
                  product={prod}
                  cart={cart}
                  onQuickAddToCart={handleQuickAddToCart}
                  onUpdateCartQuantity={handleUpdateCartQty}
                  onRemoveCartItem={handleRemoveCartItem}
                  onBuyNow={handleBuyNow}
                  onViewDetails={(p) => {
                    setSelectedProduct(p);
                    navigateTo('product-details');
                  }}
                  onCustomize={(p) => handleOpenInStudio(p)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ================= PAGE 3: PRODUCT CATEGORIES DIRECTORY ================= */}
        {activePage === 'categories' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
            {CATEGORIES.map((cat) => {
              const catProducts = products.filter((p) => p.categoryId === cat.id);
              return (
                <div key={cat.id} className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200">
                    <div>
                      <span className="text-xs font-mono text-blue-600 font-bold uppercase">
                        Category {cat.code} · Starting ₹{cat.startingFrom}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-display font-bold text-zinc-950">
                        {cat.name} ({catProducts.length} Items)
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter(cat.id);
                        navigateTo('all-products');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-zinc-950 rounded-lg cursor-pointer self-start"
                    >
                      View Only {cat.name}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catProducts.map((p) => (
                      <ShoppingProductCard
                        key={p.id}
                        product={p}
                        cart={cart}
                        onQuickAddToCart={handleQuickAddToCart}
                        onUpdateCartQuantity={handleUpdateCartQty}
                        onRemoveCartItem={handleRemoveCartItem}
                        onBuyNow={handleBuyNow}
                        onViewDetails={(prod) => {
                          setSelectedProduct(prod);
                          navigateTo('product-details');
                        }}
                        onCustomize={(prod) => handleOpenInStudio(prod)}
                      />
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
              if (!currentUser || currentUser.uid.startsWith('guest-')) {
                navigateTo('auth');
              } else {
                navigateTo('cart-checkout');
              }
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
            requireLoginForOrderNotice={requireLoginNotice || cart.length > 0}
            onLoginSuccess={(user) => {
              const userOwnCart = loadCartForUserId(user.uid);
              setCurrentUser(user);
              setCart(userOwnCart);
              setRequireLoginNotice(false);
              if (userOwnCart.length > 0 && user.role !== 'admin') {
                navigateTo('cart-checkout');
              } else if (requireLoginNotice && user.role !== 'admin') {
                navigateTo('all-products');
              } else {
                navigateTo(user.role === 'admin' ? 'admin-dashboard' : 'customer-dashboard');
              }
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
            onUpdateItemAttachment={handleUpdateCartItemAttachment}
            onRemoveItem={handleRemoveCartItem}
            onPlaceOrder={handlePlaceOrder}
            onNavigate={navigateTo}
            onOpenWhatsAppModal={(msg) => setWhatsAppModalMsg(msg)}
            onGoogleLogin={handleGoogleLogin}
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
            onAdminLoginSuccess={(adminUser) => setCurrentUser(adminUser)}
            onAdminLogout={handleLogout}
            products={products}
            onSaveProducts={(nextProducts) => {
              setProducts(nextProducts);
              if (db) {
                setDoc(doc(db, 'store', 'catalog'), { items: nextProducts }).catch(() => {});
              }
            }}
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            sampleDesigns={sampleDesigns}
            onSaveSampleDesigns={(nextSamples) => {
              setSampleDesigns(nextSamples);
              if (db) {
                setDoc(doc(db, 'store', 'samples'), { items: nextSamples }).catch(() => {});
              }
            }}
            settings={settings}
            onSaveSettings={(nextSettings) => {
              setSettings(nextSettings);
              if (db) {
                setDoc(doc(db, 'store', 'settings'), nextSettings).catch(() => {});
              }
            }}
          />
        )}
      </main>

      {/* MOBILE THUMB NAVIGATION BAR (Visible on Mobile screens <768px) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-2 py-1.5 grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
            activePage === 'home' ? 'text-blue-600' : 'text-zinc-600'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategoryFilter('all');
            navigateTo('all-products');
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
            activePage === 'all-products' || activePage === 'categories'
              ? 'text-blue-600'
              : 'text-zinc-600'
          }`}
        >
          <Grid className="w-4 h-4 mb-0.5" />
          <span>Products</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('design-studio')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
            activePage === 'design-studio' ? 'text-blue-600' : 'text-zinc-600'
          }`}
        >
          <Sliders className="w-4 h-4 mb-0.5" />
          <span>Customize</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCartDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
            activePage === 'cart-checkout' || isCartDrawerOpen
              ? 'text-blue-600'
              : 'text-zinc-600'
          }`}
        >
          <ShoppingBag className="w-4 h-4 mb-0.5" />
          <span>Cart ({cartItemCount})</span>
        </button>
      </div>

      {/* FLOATING VIEW CART & CHECKOUT BAR (Visible when items are in cart) */}
      {cartItemCount > 0 && activePage !== 'cart-checkout' && !isCartDrawerOpen && (
        <div className="fixed bottom-16 md:bottom-5 right-4 left-4 md:left-auto md:w-96 z-30 bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div
            onClick={() => setIsCartDrawerOpen(true)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-mono font-bold text-xs">
              {cartItemCount}
            </div>
            <div>
              <div className="text-xs font-bold">
                {cartItemCount} {cartItemCount === 1 ? 'Item' : 'Items'} ·{' '}
                <span className="font-mono">₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[10px] text-zinc-400">
                Click to view cart or checkout
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!currentUser || currentUser.uid.startsWith('guest-')) {
                navigateTo('auth');
              } else {
                navigateTo('cart-checkout');
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl cursor-pointer inline-flex items-center gap-1.5 shrink-0"
          >
            <span>{currentUser ? 'Checkout' : 'Sign In & Order'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SLIDE-OVER SHOPPING CART DRAWER */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={cart}
        settings={settings}
        currentUser={currentUser}
        onUpdateQuantity={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onGoogleLogin={handleGoogleLogin}
        onProceedToCheckout={() => {
          if (!currentUser || currentUser.uid.startsWith('guest-')) {
            navigateTo('auth');
          } else {
            navigateTo('cart-checkout');
          }
        }}
      />

      {/* NEWSLETTER & WHATSAPP FOOTER BAR */}
      <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-800 mt-16 pb-16 md:pb-0">
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
              © {new Date().getFullYear()} PrintZone – Custom Printing Studio. All rights reserved.
            </div>
            <div className="font-mono text-zinc-400">
              Custom Printing & Personalized Gifts across India
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

      {/* GOOGLE ACCOUNT SIGN-IN CHOOSER MODAL */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-5 border border-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2.5">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                <div>
                  <h3 className="text-base font-display font-bold text-zinc-950">
                    Sign in with Google
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Continue to PrintZone – Custom Printing Studio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Saved Google Accounts on this device */}
            {savedGoogleAccounts.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-zinc-600 uppercase font-mono">
                  Choose an account
                </div>
                <div className="space-y-1.5">
                  {savedGoogleAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => completeGoogleSignInProfile(acc)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 hover:border-blue-600 hover:bg-blue-50/40 flex items-center gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                        {acc.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-zinc-950 truncate">{acc.name}</div>
                        <div className="text-[11px] text-zinc-500 truncate">{acc.email}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="relative flex items-center justify-center py-1">
                  <div className="border-t border-zinc-200 w-full" />
                  <span className="bg-white px-2.5 text-[10px] font-mono uppercase text-zinc-400 whitespace-nowrap">
                    Or use another Google account
                  </span>
                  <div className="border-t border-zinc-200 w-full" />
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmGoogleModalSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Google Email / Gmail Address *
                </label>
                <input
                  type="email"
                  required
                  value={googleInputEmail}
                  onChange={(e) => setGoogleInputEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={googleInputName}
                  onChange={(e) => setGoogleInputName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  10-Digit Mobile Number (for Order & Delivery Updates)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={googleInputPhone}
                  onChange={(e) => setGoogleInputPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98300XXXXX (Optional)"
                  className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {googleModalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {googleModalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <span>Continue with Google</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
