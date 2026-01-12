
import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';

interface Props {
  onSearch: (term: string) => void;
}

const Header: React.FC<Props> = ({ onSearch }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
      setInputValue("");
    }
  };

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

        <form onSubmit={handleSubmit} className="w-full max-w-lg relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search for a subject (e.g., 'Vintage Bicycle', 'Mushrooms')..."
            className="w-full pl-5 pr-14 py-2 rounded-full border-2 border-yellow-500/50 bg-white/90 backdrop-blur shadow-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-semibold text-gray-800 text-sm placeholder-gray-400"
          />
          <button 
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-black text-white px-3 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            {inputValue ? <Plus className="w-4 h-4" /> : <Search className="w-3 h-3" />}
          </button>
        </form>
        
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
