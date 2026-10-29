import React, { useState } from 'react';
import {
  CartItem,
  Order,
  OrderStatus,
  PageId,
  Product,
  SavedCustomDesign,
  StoreSettings,
  UserProfile,
} from '../types';
import { ProductMockup } from './ProductMockup';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Package,
  RefreshCw,
  MapPin,
  Bookmark,
  CheckCircle2,
  Search,
  MessageSquare,
  Building2,
  Sliders,
  LogOut,
  Lock,
} from 'lucide-react';

const TRACKING_STEPS: OrderStatus[] = [
  'Pending',
  'Design Review',
  'Confirmed',
  'Printing',
  'Packed',
  'Shipped',
  'Delivered',
];

// ================= 1. CUSTOMER DASHBOARD & ACCOUNT =================
export const CustomerDashboardView: React.FC<{
  currentUser: UserProfile | null;
  orders: Order[];
  products: Product[];
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
  onReorder: (order: Order) => void;
  onLoadSavedDesign: (design: SavedCustomDesign) => void;
}> = ({
  currentUser,
  orders,
  onNavigate,
  onLogout,
  onReorder,
  onLoadSavedDesign,
}) => {
  const [tab, setTab] = useState<'orders' | 'designs' | 'addresses'>('orders');

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 space-y-4">
          <h1 className="text-2xl font-display font-bold text-zinc-950">
            Sign In to Your PrintZone Account
          </h1>
          <p className="text-sm text-zinc-600">
            Access your order history, live print status tracking, saved Konva designs, and Indian delivery addresses.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
          >
            Go to Login / Register
          </button>
        </div>
      </div>
    );
  }

  const userOrders = orders.filter(
    (o) =>
      o.customerEmail.toLowerCase() === currentUser.email.toLowerCase() ||
      o.customerId === currentUser.uid
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="text-xs font-mono text-blue-600 uppercase">
            Customer Account · {currentUser.role.toUpperCase()}
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {currentUser.email} · {currentUser.phone}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate('admin-dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              Open Admin Panel
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg my-6 w-fit">
        {[
          { id: 'orders', label: `My Orders (${userOrders.length})`, icon: Package },
          {
            id: 'designs',
            label: `Saved Custom Designs (${currentUser.savedDesigns.length})`,
            icon: Bookmark,
          },
          {
            id: 'addresses',
            label: `Delivery Addresses (${currentUser.savedAddresses.length})`,
            icon: MapPin,
          },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                tab === t.id
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

      {tab === 'orders' && (
        <div className="space-y-4">
          {userOrders.length === 0 ? (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-600">You have not placed any orders yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('all-products')}
                className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg cursor-pointer"
              >
                Browse Products
              </button>
            </div>
          ) : (
            userOrders.map((order) => {
              const currentStepIdx = Math.max(0, TRACKING_STEPS.indexOf(order.status));
              return (
                <div
                  key={order.id}
                  className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-zinc-950">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-zinc-400">·</span>
                        <span className="text-xs font-semibold text-blue-600">
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Ordered on {new Date(order.createdAt).toLocaleDateString('en-IN')} ·{' '}
                        {order.paymentMethod} ({order.paymentStatus})
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <div className="text-[11px] text-zinc-500">Grand Total</div>
                        <div className="text-sm font-bold text-zinc-950 tabular-nums">
                          ₹{order.grandTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onReorder(order)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reorder Items
                      </button>
                    </div>
                  </div>

                  {/* 7-Stage Progress Tracker */}
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-1">
                    {TRACKING_STEPS.map((st, idx) => {
                      const done = idx <= currentStepIdx && order.status !== 'Rejected';
                      return (
                        <div
                          key={st}
                          className={`p-2 rounded-lg border text-center text-[11px] ${
                            done
                              ? 'bg-blue-50/70 border-blue-600 text-blue-800 font-semibold'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                          }`}
                        >
                          {idx + 1}. {st}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-xs"
                      >
                        <div className="w-12 h-12 bg-white rounded border border-zinc-200 shrink-0">
                          <ProductMockup
                            shape={item.mockupShape}
                            color={item.selectedColor}
                            customPreviewUrl={item.customDesign?.frontPreviewDataUrl}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 truncate">{item.productName}</div>
                          <div className="text-zinc-500">
                            {item.selectedColor.name} · {item.selectedSize} · Qty {item.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'designs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {currentUser.savedDesigns.length === 0 ? (
            <div className="col-span-full bg-zinc-50 border border-zinc-200 rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-600">
                No saved custom designs yet. Use "Save Design" inside the Online Design Studio to store your artwork templates.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('design-studio')}
                className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg cursor-pointer"
              >
                Open Design Studio
              </button>
            </div>
          ) : (
            currentUser.savedDesigns.map((dsn) => (
              <div
                key={dsn.id}
                className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square bg-zinc-50 rounded-lg mb-3">
                    <ProductMockup
                      shape={dsn.mockupShape}
                      color={dsn.selectedColor}
                      customPreviewUrl={dsn.frontPreviewDataUrl}
                      elements={dsn.frontElements}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="text-xs font-bold text-zinc-950">{dsn.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {dsn.productName} · {dsn.selectedColor.name}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onLoadSavedDesign(dsn)}
                  className="mt-3 w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Edit & Order in Studio
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'addresses' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {currentUser.savedAddresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-white border border-zinc-200 rounded-xl p-5 text-xs space-y-1.5"
            >
              <div className="font-bold text-sm text-zinc-950">{addr.label}</div>
              <div className="font-medium text-zinc-800">
                {addr.fullName} · +91 {addr.phone}
              </div>
              <div className="text-zinc-600">{addr.addressLine1}</div>
              {addr.landmark && <div className="text-zinc-500">Landmark: {addr.landmark}</div>}
              <div className="text-zinc-700 font-medium">
                {addr.district}, {addr.state} – <span className="font-mono">{addr.pinCode}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ================= 2. ORDER TRACKING PAGE =================
export const OrderTrackingView: React.FC<{
  orders: Order[];
  onOpenWhatsAppModal: (msg: string) => void;
}> = ({ orders, onOpenWhatsAppModal }) => {
  const [queryOrderNo, setQueryOrderNo] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryOrderNo.trim()) return;
    const match = orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === queryOrderNo.trim().toLowerCase() ||
        o.customerPhone === queryOrderNo.trim()
    );
    if (match) {
      setSearchedOrder(match);
      setNotFound(false);
    } else {
      setSearchedOrder(null);
      setNotFound(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="pb-6 border-b border-zinc-200">
        <div className="text-xs font-mono text-blue-600 uppercase">
          Live Pre-Press, Printing & Dispatch Tracker
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
          Track Your Custom Print Order
        </h1>
      </div>

      <form
        onSubmit={handleTrackSubmit}
        className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          required
          value={queryOrderNo}
          onChange={(e) => setQueryOrderNo(e.target.value)}
          placeholder="Enter your Order Number or 10-digit Registered Mobile Number"
          className="flex-1 px-4 py-2.5 text-xs bg-white border border-zinc-300 rounded-lg font-mono"
        />
        <button
          type="submit"
          className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <Search className="w-4 h-4" />
          Track Order Status
        </button>
      </form>

      {notFound && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          No order found matching "{queryOrderNo}". Please verify your Order Number or registered 10-digit mobile number.
        </div>
      )}

      {searchedOrder && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <div className="font-mono font-bold text-lg text-zinc-950">
                Order #{searchedOrder.orderNumber}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Customer: {searchedOrder.customerName} · Destination:{' '}
                {searchedOrder.shippingAddress.district}, {searchedOrder.shippingAddress.state} (PIN{' '}
                {searchedOrder.shippingAddress.pinCode})
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenWhatsAppModal(
                  `Hello PrintZone! Please share the latest dispatch update for Order #${searchedOrder.orderNumber}.`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer self-start"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Support
            </button>
          </div>

          {/* 7-Stage Pipeline */}
          <div>
            <div className="text-xs font-semibold text-zinc-700 mb-3">
              Current Stage: <span className="text-blue-600">{searchedOrder.status}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
              {TRACKING_STEPS.map((st, idx) => {
                const activeIdx = TRACKING_STEPS.indexOf(searchedOrder.status);
                const isCompleted = idx <= activeIdx && searchedOrder.status !== 'Rejected';
                return (
                  <div
                    key={st}
                    className={`p-3 rounded-xl border text-xs flex flex-col items-center justify-center text-center gap-1 ${
                      isCompleted
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{st}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline Logs */}
          <div className="space-y-2.5 pt-2">
            <div className="text-xs font-semibold text-zinc-800">Production Activity Log</div>
            {searchedOrder.statusHistory.map((h, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-3 bg-zinc-50 rounded-lg border border-zinc-200"
              >
                <div>
                  <strong className="text-zinc-950">{h.status}:</strong>{' '}
                  <span className="text-zinc-600">{h.note}</span>
                </div>
                <span className="font-mono text-[11px] text-zinc-500 mt-1 sm:mt-0">
                  {h.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ================= 3. CUSTOMER LOGIN & REGISTRATION =================
interface StoredAccount {
  uid: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  savedAddresses: UserProfile['savedAddresses'];
  savedDesigns: UserProfile['savedDesigns'];
}

const ACCOUNTS_STORAGE_KEY = 'pz_studio_registered_accounts_v1';

function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredAccounts(accounts: StoredAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

export const AuthView: React.FC<{
  onLoginSuccess: (user: UserProfile) => void;
  onGoogleLogin: () => Promise<void>;
  authError: string | null;
}> = ({ onLoginSuccess, onGoogleLogin, authError }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setLocalError('Please enter your email address and password.');
      return;
    }

    if (isRegister) {
      if (!name.trim() || name.trim().length < 2) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone.trim())) {
        setLocalError('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
    }

    setSubmittingAuth(true);

    const buildProfile = (uid: string, displayName?: string | null): UserProfile => ({
      uid,
      name: name.trim() || displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: phone.trim(),
      role: 'customer',
      savedAddresses: [],
      savedDesigns: [],
    });

    // Try Firebase Auth first
    if (auth) {
      try {
        if (isRegister) {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          if (name.trim()) {
            await updateProfile(cred.user, { displayName: name.trim() });
          }
          const profile = buildProfile(cred.user.uid, cred.user.displayName);
          if (db) {
            await setDoc(doc(db, 'users', cred.user.uid), profile).catch(() => {});
          }
          // Also mirror in local accounts
          const existing = getStoredAccounts().filter((a) => a.email !== cleanEmail);
          saveStoredAccounts([
            ...existing,
            { ...profile, passwordHash: password },
          ]);
          setSubmittingAuth(false);
          onLoginSuccess(profile);
          return;
        } else {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          let profile = buildProfile(cred.user.uid, cred.user.displayName);
          if (db) {
            const snap = await getDoc(doc(db, 'users', cred.user.uid)).catch(() => null);
            if (snap && snap.exists()) {
              profile = snap.data() as UserProfile;
            } else {
              await setDoc(doc(db, 'users', cred.user.uid), profile).catch(() => {});
            }
          }
          setSubmittingAuth(false);
          onLoginSuccess(profile);
          return;
        }
      } catch (fbErr: unknown) {
        const errCode = (fbErr as { code?: string })?.code || '';
        if (
          errCode === 'auth/wrong-password' ||
          errCode === 'auth/invalid-credential'
        ) {
          setSubmittingAuth(false);
          setLocalError('Incorrect email or password. Please try again.');
          return;
        }
        if (errCode === 'auth/email-already-in-use') {
          setSubmittingAuth(false);
          setLocalError('An account with this email already exists. Please Sign In.');
          return;
        }
        // If Email/Password provider is not enabled yet in Firebase Console, fall through to verified account store
      }
    }

    // Verified Account Store
    const accounts = getStoredAccounts();
    if (isRegister) {
      if (accounts.some((a) => a.email === cleanEmail)) {
        setSubmittingAuth(false);
        setLocalError('An account with this email already exists. Please Sign In.');
        return;
      }
      const newProfile = buildProfile(`usr-${Date.now()}`);
      saveStoredAccounts([
        ...accounts,
        { ...newProfile, passwordHash: password },
      ]);
      if (db) {
        setDoc(doc(db, 'users', newProfile.uid), newProfile).catch(() => {});
      }
      setSubmittingAuth(false);
      onLoginSuccess(newProfile);
    } else {
      const matched = accounts.find(
        (a) => a.email === cleanEmail && a.passwordHash === password
      );
      if (!matched) {
        setSubmittingAuth(false);
        setLocalError(
          'Invalid email or password. If you do not have an account yet, please Register first.'
        );
        return;
      }
      const { passwordHash: _, ...profile } = matched;
      setSubmittingAuth(false);
      onLoginSuccess(profile);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
        <div>
          <div className="text-xs font-mono text-blue-600 uppercase flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Customer Account Portal
          </div>
          <h1 className="text-2xl font-display font-bold text-zinc-950 mt-1">
            {isRegister ? 'Create Customer Account' : 'Customer Sign In'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isRegister
              ? 'Register with your name, mobile number, and email to save custom designs and track orders.'
              : 'Sign in with your registered email address and password.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'Create a password (min 6 chars)' : 'Enter your password'}
              className="w-full px-3.5 py-2.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {(localError || authError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {localError || authError}
            </div>
          )}

          <button
            type="submit"
            disabled={submittingAuth}
            className="w-full py-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg cursor-pointer transition-colors"
          >
            {submittingAuth
              ? 'Authenticating...'
              : isRegister
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-zinc-200 space-y-3">
          <button
            type="button"
            onClick={onGoogleLogin}
            className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer transition-colors"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setLocalError(null);
            }}
            className="w-full text-center text-xs font-semibold text-blue-600 hover:underline cursor-pointer pt-1"
          >
            {isRegister
              ? 'Already have an account? Sign In'
              : "Don't have an account? Register Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================= 4. BULK PRINTING & QUOTE CALCULATOR =================
export const BulkPrintingView: React.FC<{
  products: Product[];
  onOpenInStudio: (prod: Product) => void;
  onOpenWhatsAppModal: (msg: string) => void;
}> = ({ products, onOpenInStudio, onOpenWhatsAppModal }) => {
  const [selectedProdId, setSelectedProdId] = useState(products[0].id);
  const [qty, setQty] = useState(50);
  const [orgName, setOrgName] = useState('');
  const [submittedQuote, setSubmittedQuote] = useState(false);

  const prod = products.find((p) => p.id === selectedProdId) || products[0];
  const discount = prod.bulkTiers.reduce(
    (acc, t) => (qty >= t.minQty ? Math.max(acc, t.discountPercent) : acc),
    0
  );
  const unitPrice = Math.round(prod.basePrice * (1 - discount / 100));
  const totalEstimate = unitPrice * qty;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="pb-6 border-b border-zinc-200">
        <div className="text-xs font-mono text-blue-600 uppercase">
          Colleges · Startups · Marathons · Retail Merchandising
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
          Bulk Custom Printing & Instant Quote Estimator
        </h1>
        <p className="text-sm text-zinc-600 mt-1 max-w-2xl">
          Save up to 30% on bulk orders of custom T-shirts, hoodies, organic cotton tote bags, event badges, lanyards, and calendars with dedicated pre-press account management.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-display font-bold text-zinc-950">
            Interactive Bulk Price Calculator
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Select Product
              </label>
              <select
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white border border-zinc-300 rounded-lg"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Base ₹{p.basePrice})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Target Bulk Quantity ({qty} units)
              </label>
              <input
                type="number"
                min={10}
                max={5000}
                value={qty}
                onChange={(e) => setQty(Math.max(10, Number(e.target.value) || 10))}
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            {[25, 50, 100, 250].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQty(preset)}
                className={`py-2 rounded-lg border font-mono cursor-pointer ${
                  qty === preset
                    ? 'bg-zinc-950 text-white border-zinc-950 font-bold'
                    : 'bg-white text-zinc-700 border-zinc-200'
                }`}
              >
                {preset} Units
              </button>
            ))}
          </div>

          <div className="bg-zinc-950 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-zinc-400">
                Bulk Tier Applied: <strong className="text-emerald-400">{discount}% OFF</strong>
              </div>
              <div className="text-2xl font-mono font-bold mt-1 tabular-nums">
                ₹{unitPrice}/unit · Total ₹{totalEstimate.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Excludes GST · Free Pan-India Institutional Shipping Included
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenInStudio(prod)}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer whitespace-nowrap"
            >
              Design This Bulk Item
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-display font-bold text-zinc-950">
            Request Official GST Proforma Invoice
          </h2>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Company / College / Organization Name"
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
          />
          <button
            type="button"
            onClick={() => {
              setSubmittedQuote(true);
              onOpenWhatsAppModal(
                `Hello PrintZone Bulk Team! Organization: ${orgName || 'Institutional Buyer'}. Requesting proforma quote for ${qty} units of ${prod.name} (Estimated ₹${totalEstimate}).`
              );
            }}
            className="w-full py-3 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            Send Bulk Quote Request via WhatsApp & Email
          </button>
          {submittedQuote && (
            <p className="text-xs text-emerald-700 font-medium">
              Quote inquiry prepared! Our institutional desk responds with sample swatch options and GST proforma invoices.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ================= 5. CUSTOM CORPORATE GIFTS =================
export const CorporateGiftsView: React.FC<{
  products: Product[];
  onAddToCart: (item: CartItem) => void;
  onNavigate: (page: PageId) => void;
}> = ({ products, onAddToCart, onNavigate }) => {
  const corporateBundles = [
    {
      id: 'corp-kit-1',
      title: 'The Founder & Engineer Onboarding Kit',
      itemsIncluded: '220 GSM Crewneck Tee + 11oz Matte Ceramic Mug + Stitched Mouse Pad + Die-Cut Sticker Pack + Magnetic Name Badge',
      price: 899,
      moq: 10,
      baseProd: products[0],
    },
    {
      id: 'corp-kit-2',
      title: 'Eco-Executive Sustainable Conference Pack',
      itemsIncluded: '320 GSM Organic Cotton Tote + Laminated Jute Folder + Wiro Desk Calendar + Textured Visiting Cards + Seed Pen',
      price: 649,
      moq: 15,
      baseProd: products.find((p) => p.id === 'bag-cotton-tote') || products[0],
    },
    {
      id: 'corp-kit-3',
      title: 'Festive Client Appreciation Hamper Box',
      itemsIncluded: 'Executive Pique Polo + Gold-Foil Table Calendar + Acrylic Keychain + Rigid Kraft Gift Box with Custom Sleeve',
      price: 1199,
      moq: 10,
      baseProd: products.find((p) => p.id === 'app-polo-tshirt') || products[0],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="pb-6 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-blue-600 uppercase">
            Employee Welcome Kits · Client Gifting · Expo Giveaways
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
            Custom Corporate Gifts & Welcome Combos
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('bulk-printing')}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-zinc-950 rounded-lg cursor-pointer self-start"
        >
          Open Bulk Quote Calculator
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {corporateBundles.map((bundle) => (
          <div
            key={bundle.id}
            className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="aspect-4/3 bg-zinc-100 rounded-xl p-4">
                <ProductMockup
                  shape={bundle.baseProd.mockupShape}
                  color={bundle.baseProd.colors[0]}
                  graphicText="CORPORATE KIT"
                  graphicSubtext="CUSTOM BRANDED"
                  className="w-full h-full"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Min Order: {bundle.moq} Kits</span>
              </div>
              <h3 className="text-lg font-display font-bold text-zinc-950">{bundle.title}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">{bundle.itemsIncluded}</p>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 block">Per Kit Price</span>
                <span className="text-lg font-mono font-bold text-zinc-950 tabular-nums">
                  ₹{bundle.price}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddToCart({
                    id: `cart-${Date.now()}`,
                    productId: bundle.baseProd.id,
                    productName: bundle.title,
                    categoryName: 'Corporate Gift Kit',
                    sku: bundle.id.toUpperCase(),
                    mockupShape: bundle.baseProd.mockupShape,
                    selectedColor: bundle.baseProd.colors[0],
                    selectedSize: 'Standard Kit',
                    selectedMaterial: 'Curated Multi-Item Box',
                    printingMethod: 'Custom Logo Branding Included',
                    printSide: 'Front',
                    quantity: bundle.moq,
                    unitBasePrice: bundle.price,
                    bothSideExtra: 0,
                    discountPercent: 0,
                    finalUnitPrice: bundle.price,
                    lineTotal: bundle.price * bundle.moq,
                  });
                  onNavigate('cart-checkout');
                }}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Add {bundle.moq} Kits to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================= 6. INFORMATIONAL & POLICY PAGES =================
export const InformationalPageView: React.FC<{
  page: PageId;
  settings: StoreSettings;
  onNavigate: (page: PageId) => void;
  onOpenWhatsAppModal: (msg: string) => void;
}> = ({ page, settings, onNavigate, onOpenWhatsAppModal }) => {
  const [contactSent, setContactSent] = useState(false);

  if (page === 'about') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="text-xs font-mono text-blue-600 uppercase">
          About PrintZone – Custom Printing Studio
        </div>
        <h1 className="text-3xl font-display font-bold text-zinc-950">
          Precision Custom Printing Engineered for Brands, Creators & Celebrations
        </h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          PrintZone – Custom Printing Studio combines industrial DTG garment printers, automatic multi-station screen printing carousels, UV flatbed presses, and 6-color digital offset machines with an interactive browser-based Konva.js design studio.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
            <div className="text-xl font-mono font-bold text-zinc-950">7 Categories</div>
            <p className="text-xs text-zinc-600 mt-1">
              46+ customizable products across apparel, eco bags, badges, calendars, gifts, and business printing.
            </p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
            <div className="text-xl font-mono font-bold text-zinc-950">300 DPI Pre-Press</div>
            <p className="text-xs text-zinc-600 mt-1">
              Every customer-uploaded artwork undergoes colour profile and resolution inspection before printing.
            </p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
            <div className="text-xl font-mono font-bold text-zinc-950">Pan-India Delivery</div>
            <p className="text-xs text-zinc-600 mt-1">
              Tracked courier dispatch to 19,000+ Indian PIN codes with GST invoicing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'contact') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="text-xs font-mono text-blue-600 uppercase">Get In Touch</div>
          <h1 className="text-3xl font-display font-bold text-zinc-950">
            Contact PrintZone Studio
          </h1>
          <p className="text-sm text-zinc-600">
            Need help preparing a print-ready CMYK file or scheduling a bulk institutional order? Reach out to our print specialists.
          </p>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-2 text-xs text-zinc-700">
            <div>
              <strong>Studio Address:</strong> {settings.studioAddress}
            </div>
            <div>
              <strong>Phone / WhatsApp:</strong> {settings.supportPhone}
            </div>
            <div>
              <strong>Support Email:</strong> {settings.supportEmail}
            </div>
            <div>
              <strong>Working Hours:</strong> Monday – Saturday, 9:30 AM to 7:30 PM IST
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenWhatsAppModal('Hello PrintZone Studio! I have a question regarding custom printing.')
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            Chat on WhatsApp Support
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setContactSent(true);
          }}
          className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-base font-display font-bold text-zinc-950">Send Us a Message</h2>
          <input
            type="text"
            required
            placeholder="Your Name"
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
          />
          <input
            type="email"
            required
            placeholder="Your Email"
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
          />
          <textarea
            rows={4}
            required
            placeholder="Tell us about your custom printing requirement..."
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
          />
          <button
            type="submit"
            className="w-full py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
          >
            Submit Enquiry
          </button>
          {contactSent && (
            <p className="text-xs text-emerald-700 font-semibold">
              Thank you! Your inquiry has been logged with our support desk.
            </p>
          )}
        </form>
      </div>
    );
  }

  if (page === 'faq') {
    const faqs = [
      {
        q: 'What image formats can I upload in the Online Design Studio?',
        a: 'You can upload high-resolution PNG (with transparent backgrounds recommended for apparel), JPG, and WebP files directly onto the Konva.js product canvas.',
      },
      {
        q: 'How are bulk discounts calculated?',
        a: 'Bulk discounts are applied automatically in real time as you increase item quantity (e.g., 8% off for 10+ units, 15% off for 25+ units, 22% off for 50+ units, and 30% off for 100+ units). All tiers are configurable in the Admin panel.',
      },
      {
        q: 'Can I print on both the front and back of a T-shirt, hoodie, or tote bag?',
        a: 'Yes. Select "Both Sides" in the product options or inside the Online Design Studio to design both Front and Back canvases independently.',
      },
      {
        q: 'How is UPI or Online Payment verified?',
        a: 'To prevent unverified order confirmations, UPI checkout verifies your 12-digit UTR reference number before marking an order as Verified Paid.',
      },
    ];
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-display font-bold text-zinc-950">
          Frequently Asked Questions (FAQ)
        </h1>
        <div className="space-y-4">
          {faqs.map((item, i) => (
            <div key={i} className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-950">{item.q}</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const policyContent: Record<string, { title: string; points: string[] }> = {
    'shipping-policy': {
      title: 'Shipping & Delivery Policy',
      points: [
        `Standard shipping across India is ₹${settings.standardDeliveryCharge}, and FREE on orders above ₹${settings.freeDeliveryThreshold}.`,
        'Production estimates vary by product complexity and printing method, and are displayed transparently on every product page (configurable by the store administrator).',
        'Every order receives a tracking number once packed and handed over to our surface or air courier partner.',
      ],
    },
    'returns-policy': {
      title: 'Returns, Reprint & Refund Policy',
      points: [
        'Because personalized products are custom printed to your exact artwork, returns are accepted for manufacturing defects, transit damage, or printing errors.',
        'If your print differs from the approved Before-Order Proof or arrives damaged, share a photo within 48 hours of delivery for a free reprint or full refund.',
      ],
    },
    'privacy-policy': {
      title: 'Privacy & Customer Artwork Protection Policy',
      points: [
        'Customer-uploaded logos, family photographs, and private design files are strictly isolated and used exclusively to fulfill your print order.',
        'We never sell customer contact information or publicly display private uploaded artwork in the sample gallery without explicit permission.',
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      points: [
        'By uploading artwork to PrintZone – Custom Printing Studio, you confirm that you hold the rights or permission to reproduce the logos, text, and photographs submitted.',
        'All sample product prices and production timelines shown initially are configurable demo store data and can be updated anytime via the Admin Dashboard.',
      ],
    },
  };

  const currentPolicy = policyContent[page] || policyContent.terms;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="text-xs font-mono text-blue-600 uppercase">PrintZone Store Policies</div>
      <h1 className="text-3xl font-display font-bold text-zinc-950">{currentPolicy.title}</h1>
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-3">
        {currentPolicy.points.map((pt, i) => (
          <p key={i} className="text-xs text-zinc-700 leading-relaxed">
            {i + 1}. {pt}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="px-4 py-2 text-xs font-semibold text-zinc-900 bg-zinc-100 rounded-lg cursor-pointer"
      >
        Return to Homepage
      </button>
    </div>
  );
};
