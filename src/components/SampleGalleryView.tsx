import React, { useState } from 'react';
import { CategoryId, Product, SampleDesign } from '../types';
import { CATEGORIES } from '../data/catalogData';
import { ProductMockup } from './ProductMockup';
import { Sliders, Eye, X, ArrowRight } from 'lucide-react';

interface SampleGalleryViewProps {
  sampleDesigns: SampleDesign[];
  products: Product[];
  onCustomizeSample: (sample: SampleDesign) => void;
}

export const SampleGalleryView: React.FC<SampleGalleryViewProps> = ({
  sampleDesigns,
  products,
  onCustomizeSample,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | CategoryId>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [activeModalSample, setActiveModalSample] = useState<SampleDesign | null>(null);
  const [modalViewSide, setModalViewSide] = useState<'Front' | 'Back'>('Front');

  const uniqueStyles = Array.from(new Set(sampleDesigns.map((s) => s.styleTag)));
  const uniqueColors = Array.from(new Set(sampleDesigns.map((s) => s.productColor.name)));

  const filteredSamples = sampleDesigns.filter((s) => {
    if (categoryFilter !== 'all' && s.categoryId !== categoryFilter) return false;
    if (styleFilter !== 'all' && s.styleTag !== styleFilter) return false;
    if (colorFilter !== 'all' && s.productColor.name !== colorFilter) return false;
    if (s.price > maxPrice) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-zinc-200">
        <div className="text-xs font-mono text-blue-600 uppercase tracking-wider">
          Curated Artwork & Mockup Showcase
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-950 mt-1">
          Sample Design Gallery
        </h1>
        <p className="text-sm text-zinc-600 mt-1 max-w-2xl">
          Inspect real product mockups across T-shirts, hoodies, organic bags, buttons, calendars, mugs, and stationery. Click any sample to inspect Front & Back views or customize it live.
        </p>
      </div>

      {/* Interactive Filter Bar */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">
            Filter by Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | CategoryId)}
            className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
          >
            <option value="all">All 7 Printing Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">
            Filter by Aesthetic Style
          </label>
          <select
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
          >
            <option value="all">All Design Styles</option>
            {uniqueStyles.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">
            Filter by Product Color
          </label>
          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg"
          >
            <option value="all">All Colors</option>
            {uniqueColors.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-zinc-700 mb-1">
            <span>Max Price</span>
            <span className="font-mono text-blue-600 tabular-nums">Up to ₹{maxPrice}</span>
          </div>
          <input
            type="range"
            min={35}
            max={1000}
            step={25}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredSamples.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 border border-zinc-200 rounded-xl">
          <p className="text-sm text-zinc-600">
            No sample designs match the current filter combination.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setStyleFilter('all');
              setColorFilter('all');
              setMaxPrice(1000);
            }}
            className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-zinc-950 rounded-lg cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredSamples.map((sample) => {
            const cat = CATEGORIES.find((c) => c.id === sample.categoryId);
            return (
              <div
                key={sample.id}
                className="group bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5"
              >
                <div>
                  <div
                    onClick={() => {
                      setActiveModalSample(sample);
                      setModalViewSide('Front');
                    }}
                    className="aspect-square bg-zinc-100/80 rounded-lg mb-3 relative overflow-hidden cursor-pointer flex items-center justify-center"
                  >
                    <ProductMockup
                      shape={sample.mockupShape}
                      color={sample.productColor}
                      side="Front"
                      elements={sample.frontElements}
                      className="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-end justify-end p-2.5">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-zinc-950 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs">
                        <Eye className="w-3 h-3" /> Larger Preview
                      </span>
                    </div>
                  </div>

                  {/* Clean Zero-Pill Metadata */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                    <span>{cat?.name || sample.categoryId}</span>
                    <span>·</span>
                    <span>{sample.styleTag}</span>
                  </div>

                  <h3
                    onClick={() => {
                      setActiveModalSample(sample);
                      setModalViewSide('Front');
                    }}
                    className="text-sm font-bold text-zinc-950 mt-1 cursor-pointer group-hover:text-blue-600"
                  >
                    {sample.title}
                  </h3>

                  <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                    {sample.description}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Starting</span>
                    <span className="text-sm font-mono font-bold text-zinc-950 tabular-nums">
                      ₹{sample.price}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCustomizeSample(sample)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Customize This Design
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LARGER PREVIEW MODAL WITH FRONT/BACK TOGGLE */}
      {activeModalSample && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div>
                <div className="text-xs font-mono text-blue-600 uppercase">
                  {activeModalSample.styleTag} Sample Mockup · {activeModalSample.productColor.name}
                </div>
                <h2 className="text-xl font-display font-bold text-zinc-950">
                  {activeModalSample.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalSample(null)}
                className="p-2 text-zinc-500 hover:text-zinc-950 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-6 items-center">
              <div className="space-y-3">
                <div className="aspect-square bg-zinc-100 rounded-xl p-4 flex items-center justify-center">
                  <ProductMockup
                    shape={activeModalSample.mockupShape}
                    color={activeModalSample.productColor}
                    side={modalViewSide}
                    elements={
                      modalViewSide === 'Front'
                        ? activeModalSample.frontElements
                        : activeModalSample.backElements.length > 0
                        ? activeModalSample.backElements
                        : activeModalSample.frontElements
                    }
                    className="w-full h-full"
                  />
                </div>

                {activeModalSample.supportsBackView && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalViewSide('Front')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        modalViewSide === 'Front'
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-700 border-zinc-300'
                      }`}
                    >
                      Front View
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalViewSide('Back')}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        modalViewSide === 'Back'
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-700 border-zinc-300'
                      }`}
                    >
                      Back View
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="text-2xl font-mono font-bold text-zinc-950 tabular-nums">
                  ₹{activeModalSample.price}{' '}
                  <span className="text-xs font-sans font-normal text-zinc-500">
                    / unit (Bulk discounts up to 30% off)
                  </span>
                </div>

                <p className="text-sm text-zinc-600 leading-relaxed">
                  {activeModalSample.description}
                </p>

                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs space-y-1.5 text-zinc-600">
                  <div>
                    <strong className="text-zinc-900">Base Product:</strong>{' '}
                    {products.find((p) => p.id === activeModalSample.productId)?.name ||
                      'Studio Custom Garment'}
                  </div>
                  <div>
                    <strong className="text-zinc-900">Shown Color:</strong>{' '}
                    {activeModalSample.productColor.name}
                  </div>
                  <div>
                    <strong className="text-zinc-900">Editable Layers:</strong>{' '}
                    {activeModalSample.frontElements.length} Front Layer(s)
                    {activeModalSample.supportsBackView
                      ? ` · ${activeModalSample.backElements.length} Back Layer(s)`
                      : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const target = activeModalSample;
                    setActiveModalSample(null);
                    onCustomizeSample(target);
                  }}
                  className="w-full py-3.5 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  Customize This Design in Studio
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
