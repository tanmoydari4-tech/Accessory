import React, { useState } from 'react';
import { CanvasElementData, MockupShape, ProductColor } from '../types';

interface ProductMockupProps {
  shape: MockupShape;
  color: ProductColor;
  productImageUrl?: string;
  side?: 'Front' | 'Back';
  graphicText?: string;
  graphicSubtext?: string;
  accentColor?: string;
  elements?: CanvasElementData[];
  customPreviewUrl?: string;
  className?: string;
  hidePrintOverlay?: boolean;
  showPrintGuide?: boolean;
}

export const SHAPE_PHOTO_MAP: Record<MockupShape, string> = {
  tshirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
  polo: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=800&q=80',
  hoodie: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80',
  jersey: 'https://images.unsplash.com/photo-1580087433295-ab2600c1030e?auto=format&fit=crop&w=800&q=80',
  cap: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
  apron: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=800&q=80',
  totebag: 'https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=800&q=80',
  jutebag: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
  schoolbag: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
  badge: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  namebadge: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
  wallcalendar: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&w=800&q=80',
  deskcalendar: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  mug: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80',
  keychain: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
  mousepad: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
  phonecase: 'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=800&q=80',
  cushion: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
  frame: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
  sticker: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?auto=format&fit=crop&w=800&q=80',
  poster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
  visitingcard: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
  flyer: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80',
  certificate: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80',
  idcard: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
  canvasprint: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
};

export function getPrintZoneGeometry(shape: MockupShape): {
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
} {
  switch (shape) {
    case 'tshirt':
    case 'polo':
    case 'jersey':
      return { topPercent: 26, leftPercent: 30, widthPercent: 40, heightPercent: 46 };
    case 'hoodie':
      return { topPercent: 30, leftPercent: 31, widthPercent: 38, heightPercent: 38 };
    case 'cap':
      return { topPercent: 28, leftPercent: 32, widthPercent: 36, heightPercent: 28 };
    case 'apron':
      return { topPercent: 34, leftPercent: 31, widthPercent: 38, heightPercent: 36 };
    case 'totebag':
    case 'jutebag':
      return { topPercent: 38, leftPercent: 28, widthPercent: 44, heightPercent: 44 };
    case 'schoolbag':
      return { topPercent: 36, leftPercent: 32, widthPercent: 36, heightPercent: 36 };
    case 'badge':
    case 'sticker':
      return { topPercent: 24, leftPercent: 24, widthPercent: 52, heightPercent: 52 };
    case 'namebadge':
    case 'visitingcard':
      return { topPercent: 32, leftPercent: 18, widthPercent: 64, heightPercent: 36 };
    case 'wallcalendar':
    case 'deskcalendar':
      return { topPercent: 24, leftPercent: 22, widthPercent: 56, heightPercent: 42 };
    case 'mug':
      return { topPercent: 28, leftPercent: 24, widthPercent: 44, heightPercent: 46 };
    case 'phonecase':
      return { topPercent: 32, leftPercent: 33, widthPercent: 34, heightPercent: 48 };
    default:
      return { topPercent: 24, leftPercent: 24, widthPercent: 52, heightPercent: 52 };
  }
}

export const ProductMockup: React.FC<ProductMockupProps> = ({
  shape,
  color,
  productImageUrl,
  side = 'Front',
  graphicText = 'PRINTZONE',
  graphicSubtext = 'CUSTOM STUDIO',
  accentColor = '#2563EB',
  elements,
  customPreviewUrl,
  className = '',
  hidePrintOverlay = false,
  showPrintGuide = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const fillHex = color?.hex || '#141417';
  const isLightProduct =
    fillHex.toLowerCase() === '#f8fafc' ||
    fillHex.toLowerCase() === '#ffffff' ||
    fillHex.toLowerCase() === '#efece6' ||
    fillHex.toLowerCase() === '#c8b08e';
  const strokeHex = isLightProduct ? '#CBD5E1' : '#334155';
  const textPrimary = isLightProduct ? '#09090B' : '#FFFFFF';
  const printZone = getPrintZoneGeometry(shape);
  const resolvedPhotoUrl = productImageUrl || SHAPE_PHOTO_MAP[shape] || SHAPE_PHOTO_MAP.tshirt;

  const renderShapeSvg = () => {
    switch (shape) {
      case 'tshirt':
      case 'polo':
      case 'jersey':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id={`grad-${shape}-${fillHex}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={fillHex} />
                <stop offset="100%" stopColor={fillHex} stopOpacity="0.92" />
              </linearGradient>
            </defs>
            {/* Garment Body */}
            <path
              d="M92 38 L120 38 C128 54 172 54 180 38 L208 38 L266 84 L238 126 L206 104 L206 262 L94 262 L94 104 L62 126 L34 84 Z"
              fill={`url(#grad-${shape}-${fillHex})`}
              stroke={strokeHex}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Back vs Front Neckline */}
            {side === 'Front' ? (
              <path
                d="M120 38 C128 58 172 58 180 38 C174 44 126 44 120 38 Z"
                fill="#09090B"
                fillOpacity="0.22"
              />
            ) : (
              <path
                d="M120 38 Q150 45 180 38"
                fill="none"
                stroke={strokeHex}
                strokeWidth="3"
              />
            )}
            {/* Polo Collar & Placket */}
            {shape === 'polo' && side === 'Front' && (
              <g>
                <path
                  d="M116 36 L138 58 L150 48 L162 58 L184 36"
                  fill={fillHex}
                  stroke={strokeHex}
                  strokeWidth="2"
                />
                <rect x="146" y="48" width="8" height="38" rx="2" fill={strokeHex} fillOpacity="0.35" />
                <circle cx="150" cy="58" r="2" fill={textPrimary} />
                <circle cx="150" cy="72" r="2" fill={textPrimary} />
              </g>
            )}
            {/* Jersey Side Stripes */}
            {shape === 'jersey' && (
              <g>
                <rect x="95" y="110" width="6" height="150" fill={accentColor} fillOpacity="0.8" />
                <rect x="199" y="110" width="6" height="150" fill={accentColor} fillOpacity="0.8" />
              </g>
            )}
            {/* Subtle Fabric Drape Lines */}
            <path d="M94 104 L104 128" stroke={strokeHex} strokeWidth="1.2" opacity="0.5" />
            <path d="M206 104 L196 128" stroke={strokeHex} strokeWidth="1.2" opacity="0.5" />
          </svg>
        );

      case 'hoodie':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-md">
            {/* Hood */}
            <path
              d="M108 42 C108 14 192 14 192 42 L182 54 L118 54 Z"
              fill={fillHex}
              stroke={strokeHex}
              strokeWidth="2"
            />
            {/* Body & Long Sleeves */}
            <path
              d="M104 42 L196 42 L258 96 L236 238 L208 234 L204 118 L204 258 L96 258 L96 118 L92 234 L64 238 L42 96 Z"
              fill={fillHex}
              stroke={strokeHex}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Ribbed Hem */}
            <rect x="96" y="246" width="108" height="14" fill={strokeHex} fillOpacity="0.25" />
            {side === 'Front' && (
              <g>
                {/* Drawstrings */}
                <line x1="138" y1="50" x2="138" y2="86" stroke={textPrimary} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                <line x1="162" y1="50" x2="162" y2="86" stroke={textPrimary} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                {/* Kangaroo Pocket */}
                <path
                  d="M112 192 L188 192 L198 244 L102 244 Z"
                  fill={fillHex}
                  stroke={strokeHex}
                  strokeWidth="1.6"
                />
              </g>
            )}
          </svg>
        );

      case 'cap':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-md">
            {/* Crown */}
            <path
              d="M68 168 C68 84 232 84 232 168 Z"
              fill={fillHex}
              stroke={strokeHex}
              strokeWidth="2"
            />
            {/* Top Button */}
            <circle cx="150" cy="88" r="5" fill={strokeHex} />
            {/* Visor Bill */}
            <path
              d="M52 166 Q150 144 248 166 Q266 208 150 212 Q34 208 52 166 Z"
              fill={fillHex}
              stroke={strokeHex}
              strokeWidth="2"
            />
            <path d="M150 88 L150 160" stroke={strokeHex} strokeWidth="1" opacity="0.4" />
          </svg>
        );

      case 'apron':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-md">
            {/* Neck Strap */}
            <path
              d="M122 68 C122 24 178 24 178 68"
              fill="none"
              stroke={strokeHex}
              strokeWidth="5"
            />
            {/* Apron Bib & Skirt */}
            <path
              d="M116 68 L184 68 L194 124 L218 140 L218 262 L82 262 L82 140 L106 124 Z"
              fill={fillHex}
              stroke={strokeHex}
              strokeWidth="2"
            />
            {/* Utility Pocket */}
            <rect x="106" y="198" width="88" height="42" rx="4" fill="none" stroke={strokeHex} strokeWidth="1.8" />
            <line x1="150" y1="198" x2="150" y2="240" stroke={strokeHex} strokeWidth="1.5" />
          </svg>
        );

      case 'totebag':
      case 'jutebag':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-md">
            {/* Dual Shoulder Handles */}
            <path
              d="M114 96 C114 28 134 28 134 96"
              fill="none"
              stroke={shape === 'jutebag' ? '#92400E' : fillHex}
              strokeWidth="8"
            />
            <path
              d="M166 96 C166 28 186 28 186 96"
              fill="none"
              stroke={shape === 'jutebag' ? '#92400E' : fillHex}
              strokeWidth="8"
            />
            <path
              d="M114 96 C114 28 134 28 134 96 M166 96 C166 28 186 28 186 96"
              fill="none"
              stroke={strokeHex}
              strokeWidth="1.5"
            />
            {/* Bag Body */}
            <rect
              x="68"
              y="92"
              width="164"
              height="176"
              rx="6"
              fill={fillHex}
              stroke={strokeHex}
              strokeWidth="2"
            />
            {/* Gusset Seam Lines */}
            {shape === 'jutebag' && (
              <g>
                <line x1="82" y1="92" x2="82" y2="268" stroke="#92400E" strokeWidth="1.5" strokeDasharray="4 3" />
                <line x1="218" y1="92" x2="218" y2="268" stroke="#92400E" strokeWidth="1.5" strokeDasharray="4 3" />
              </g>
            )}
          </svg>
        );

      case 'schoolbag':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-md">
            {/* Top Grab Handle */}
            <path d="M126 52 C126 28 174 28 174 52" fill="none" stroke="#1E293B" strokeWidth="6" />
            {/* Main Backpack Shell */}
            <path
              d="M78 110 C78 54 222 54 222 110 L226 254 C226 264 216 268 206 268 L94 268 C84 268 74 264 74 254 Z"
              fill={fillHex}
              stroke={strokeHex}
              strokeWidth="2"
            />
            {/* Zipper Arc */}
            <path d="M84 122 Q150 98 216 122" fill="none" stroke={strokeHex} strokeWidth="2.5" strokeDasharray="4 2" />
            {/* Front Pouch */}
            <rect x="92" y="188" width="116" height="62" rx="10" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
          </svg>
        );

      case 'badge':
      case 'sticker':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-lg">
            <defs>
              <radialGradient id={`badge-shine-${fillHex}`} cx="32%" cy="28%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
                <stop offset="60%" stopColor={fillHex} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="150" cy="150" r="106" fill={fillHex} stroke={strokeHex} strokeWidth="4" />
            <circle cx="150" cy="150" r="98" fill="none" stroke={accentColor} strokeWidth="1.5" strokeDasharray={shape === 'sticker' ? '6 4' : 'none'} opacity="0.6" />
            <circle cx="150" cy="150" r="106" fill={`url(#badge-shine-${fillHex})`} />
          </svg>
        );

      case 'namebadge':
      case 'visitingcard':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-lg">
            <rect
              x="28"
              y="78"
              width="244"
              height="144"
              rx={shape === 'namebadge' ? '12' : '6'}
              fill={fillHex}
              stroke={strokeHex}
              strokeWidth="2.5"
            />
            {/* Accent Top Bar */}
            <rect x="28" y="78" width="244" height="8" rx="4" fill={accentColor} />
            {shape === 'namebadge' && (
              <circle cx="248" cy="104" r="6" fill={accentColor} opacity="0.8" />
            )}
          </svg>
        );

      case 'wallcalendar':
      case 'deskcalendar':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-lg">
            {/* Tent Base if Desk Calendar */}
            {shape === 'deskcalendar' && (
              <polygon points="40,242 260,242 272,264 28,264" fill="#1E293B" />
            )}
            {/* Calendar Sheet */}
            <rect x="46" y="46" width="208" height="198" rx="6" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
            {/* Twin-Loop Wiro Binding Rings */}
            {[68, 92, 116, 140, 164, 188, 212, 232].map((cx) => (
              <rect key={cx} x={cx - 3} y="38" width="6" height="16" rx="2" fill="#64748B" />
            ))}
            {/* Bottom Date Grid Mock */}
            <g opacity="0.45">
              {[0, 1, 2, 3, 4, 5, 6].map((col) =>
                [0, 1, 2].map((row) => (
                  <rect
                    key={`${col}-${row}`}
                    x={64 + col * 25}
                    y={192 + row * 14}
                    width="18"
                    height="9"
                    rx="1.5"
                    fill={textPrimary}
                  />
                ))
              )}
            </g>
          </svg>
        );

      case 'mug':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-lg">
            {/* C-Handle */}
            <path
              d="M206 102 C258 102 258 208 206 208"
              fill="none"
              stroke={fillHex}
              strokeWidth="18"
              strokeLinecap="round"
            />
            <path
              d="M206 102 C258 102 258 208 206 208"
              fill="none"
              stroke={strokeHex}
              strokeWidth="2"
            />
            {/* Mug Cylinder */}
            <rect x="58" y="68" width="152" height="176" rx="12" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
            {/* Top Rim Ellipse */}
            <ellipse cx="134" cy="68" rx="76" ry="12" fill="#E2E8F0" stroke={strokeHex} strokeWidth="2" />
          </svg>
        );

      case 'phonecase':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-lg">
            <rect x="86" y="32" width="128" height="236" rx="24" fill={fillHex} stroke={strokeHex} strokeWidth="3" />
            {/* Camera Bump */}
            <rect x="98" y="44" width="46" height="46" rx="12" fill="#09090B" stroke="#334155" strokeWidth="1.5" />
            <circle cx="111" cy="57" r="7" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
            <circle cx="111" cy="76" r="7" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
            <circle cx="130" cy="66" r="7" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
          </svg>
        );

      case 'idcard':
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-lg">
            {/* Lanyard Strap */}
            <path d="M118 10 L144 64 L156 64 L182 10" fill="none" stroke={accentColor} strokeWidth="10" />
            {/* Metal Clip */}
            <rect x="138" y="58" width="24" height="14" rx="3" fill="#94A3B8" />
            {/* Card Body */}
            <rect x="72" y="70" width="156" height="196" rx="10" fill={fillHex} stroke={strokeHex} strokeWidth="2" />
            <rect x="72" y="70" width="156" height="28" rx="8" fill={accentColor} />
          </svg>
        );

      default:
        // Frame, Canvas Print, Poster, Flyer, Certificate, Cushion, Mousepad, Keychain
        return (
          <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-lg">
            <rect
              x="46"
              y="42"
              width="208"
              height="216"
              rx={shape === 'cushion' || shape === 'mousepad' ? '24' : '4'}
              fill={fillHex}
              stroke={shape === 'frame' ? '#09090B' : strokeHex}
              strokeWidth={shape === 'frame' ? '12' : '2'}
            />
            <rect
              x="58"
              y="54"
              width="184"
              height="192"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.2"
              opacity="0.45"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`relative select-none flex items-center justify-center overflow-hidden rounded-xl ${className}`}
    >
      {/* Real Photographic Picture Format (<picture> + <img>) with automatic fallback */}
      {!imgFailed && !hidePrintOverlay ? (
        <picture className="w-full h-full block relative">
          <source srcSet={resolvedPhotoUrl} type="image/jpeg" />
          <img
            src={resolvedPhotoUrl}
            alt={graphicText || shape}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover rounded-xl"
          />
          {/* Selected Color Swatch Tint Indicator Badge */}
          {color && (
            <span
              title={`Selected Color: ${color.name}`}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-mono text-white"
            >
              <span
                style={{ backgroundColor: fillHex }}
                className="w-2.5 h-2.5 rounded-full border border-white/60 inline-block"
              />
              {color.name}
            </span>
          )}
        </picture>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-3">
          {renderShapeSvg()}
        </div>
      )}

      {/* Printable Zone Overlay (Shown when custom design/photo is uploaded or in customizer) */}
      {!hidePrintOverlay && (customPreviewUrl || (elements && elements.length > 0) || showPrintGuide) && (
        <div
          style={{
            top: `${printZone.topPercent}%`,
            left: `${printZone.leftPercent}%`,
            width: `${printZone.widthPercent}%`,
            height: `${printZone.heightPercent}%`,
          }}
          className={`absolute flex flex-col items-center justify-center text-center pointer-events-none overflow-hidden transition-all ${
            showPrintGuide ? 'border border-dashed border-blue-500/70 bg-blue-500/5 rounded' : ''
          }`}
        >
          {customPreviewUrl ? (
            <img
              src={customPreviewUrl}
              alt="Custom Design Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain drop-shadow-md bg-white/85 p-1 rounded"
            />
          ) : elements && elements.length > 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-1.5 bg-black/40 backdrop-blur-2xs rounded">
              {elements
                .filter((el) => el.type === 'text')
                .map((el) => (
                  <div
                    key={el.id}
                    style={{
                      color: el.fill || '#FFFFFF',
                      fontFamily: el.fontFamily || 'Plus Jakarta Sans',
                    }}
                    className="font-bold leading-tight tracking-tight whitespace-pre-line text-[11px] sm:text-xs drop-shadow-xs"
                  >
                    {el.text}
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
