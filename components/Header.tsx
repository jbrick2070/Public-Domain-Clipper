
import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Settings2, Check, SlidersHorizontal, Layers, Brush, Rocket } from 'lucide-react';
import { DataSource } from '../types';
import { ALL_SOURCES, DEFAULT_SOURCES, MUSEUM_SOURCES } from '../constants';

interface Props {
  onSearch: (term: string, sources: DataSource[], limit: number) => void;
}

const Header: React.FC<Props> = ({ onSearch }) => {
  const [inputValue, setInputValue] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [limit, setLimit] = useState(3);
  
  // Initialize with DEFAULT_SOURCES only (General purpose)
  const [sources, setSources] = useState<Record<DataSource, boolean>>(() => {
    const initial: Partial<Record<DataSource, boolean>> = {};
    ALL_SOURCES.forEach(s => initial[s] = false);
    DEFAULT_SOURCES.forEach(s => initial[s] = true);
    return initial as Record<DataSource, boolean>;
  });

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      const activeSources = ALL_SOURCES.filter(s => sources[s]);
      onSearch(inputValue.trim(), activeSources, limit);
      setInputValue("");
      setIsFilterOpen(false);
    }
  };

  const toggleSource = (source: DataSource) => {
    setSources(prev => ({ ...prev, [source]: !prev[source] }));
  };

  const applyPreset = (preset: 'general' | 'museums' | 'space' | 'all') => {
    const newState: Record<DataSource, boolean> = { ...sources };
    ALL_SOURCES.forEach(s => newState[s] = false); // Reset all

    if (preset === 'general') {
        DEFAULT_SOURCES.forEach(s => newState[s] = true);
    } else if (preset === 'museums') {
        MUSEUM_SOURCES.forEach(s => newState[s] = true);
    } else if (preset === 'space') {
        newState['NASA'] = true;
    } else if (preset === 'all') {
        ALL_SOURCES.forEach(s => newState[s] = true);
    }
    setSources(newState);
  };

  const activeCount = Object.values(sources).filter(Boolean).length;

  return (
    <header className="banana-gradient border-b border-yellow-400 py-3 px-4 shadow-sm z-30 relative">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg shadow-inner transform -rotate-3">
            <span className="text-2xl">🏛️</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">PUBLIC DOMAIN<br/>CLIPPER</h1>
          </div>
        </div>

        <div className="w-full max-w-lg relative" ref={filterRef}>
          <form onSubmit={handleSubmit} className="relative z-20">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search for a subject (e.g., 'Vintage Bicycle', 'Moon')..."
              className="w-full pl-5 pr-20 py-2 rounded-full border-2 border-yellow-500/50 bg-white/90 backdrop-blur shadow-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-semibold text-gray-800 text-sm placeholder-gray-400"
            />
            
            <div className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center gap-1">
               <button
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`h-full aspect-square rounded-full flex items-center justify-center transition-all ${isFilterOpen ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                  title="Filter Sources"
               >
                  <Settings2 className="w-3.5 h-3.5" />
               </button>
               <button 
                  type="submit"
                  className="h-full aspect-square bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
               >
                  {inputValue ? <Plus className="w-4 h-4" /> : <Search className="w-3 h-3" />}
               </button>
            </div>
          </form>

          {/* Nested Filter UI */}
          {isFilterOpen && (
             <div className="absolute top-full left-0 right-0 mt-2 p-5 bg-white rounded-2xl shadow-xl border border-yellow-200 z-10 animate-in fade-in slide-in-from-top-2 origin-top">
                
                {/* Results Limit Control */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            <SlidersHorizontal className="w-3 h-3" />
                            Results Per Source
                        </h3>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{limit}</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={limit} 
                        onChange={(e) => setLimit(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                        <span>1 (Fast)</span>
                        <span>10 (Slow)</span>
                    </div>
                </div>

                {/* Quick Presets */}
                <div className="mb-4">
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Quick Filters</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => applyPreset('general')}
                            className="flex-1 bg-gray-100 hover:bg-yellow-100 hover:text-yellow-800 text-gray-600 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                            <Layers className="w-3 h-3" /> General
                        </button>
                        <button 
                            onClick={() => applyPreset('museums')}
                            className="flex-1 bg-gray-100 hover:bg-rose-100 hover:text-rose-800 text-gray-600 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                            <Brush className="w-3 h-3" /> Art
                        </button>
                        <button 
                            onClick={() => applyPreset('space')}
                            className="flex-1 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-800 text-gray-600 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                            <Rocket className="w-3 h-3" /> Space
                        </button>
                        <button 
                            onClick={() => applyPreset('all')}
                            className="flex-1 bg-gray-900 text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            All
                        </button>
                    </div>
                </div>

                {/* Source Selection */}
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Archives ({activeCount})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                   {ALL_SOURCES.map(source => (
                      <button
                         key={source}
                         type="button"
                         onClick={() => toggleSource(source)}
                         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            sources[source] 
                               ? 'bg-yellow-50 border-yellow-400 text-yellow-900 shadow-sm' 
                               : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'
                         }`}
                      >
                         <div className={`w-3 h-3 rounded flex items-center justify-center ${sources[source] ? 'bg-yellow-400 text-white' : 'bg-gray-200'}`}>
                            {sources[source] && <Check className="w-2 h-2" />}
                         </div>
                         {source}
                      </button>
                   ))}
                </div>
             </div>
          )}
        </div>
        
        <nav className="hidden lg:flex items-center gap-6">
          <div className="text-[10px] font-bold text-gray-800 uppercase tracking-widest opacity-60">
            Powered by Gemini AI
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
