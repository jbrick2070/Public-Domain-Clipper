
import React, { useState, useEffect } from 'react';
import { TopicResult, ImageMetadata } from './types';
import { getTopicImages } from './services/wikimediaService';
import CultivarCard from './components/CultivarCard';
import ExportPanel from './components/ExportPanel';
import Header from './components/Header';
import { Loader2, Sparkles, LayoutGrid, Github, Heart } from 'lucide-react';

const App: React.FC = () => {
  // Initial state with a demo topic
  const [results, setResults] = useState<TopicResult[]>([
    { 
      topic: { id: 'demo-1', name: 'Bananas', description: 'Demo Subject' }, 
      images: [], 
      status: 'loading' 
    }
  ]);

  // Load the initial demo topic on mount
  useEffect(() => {
    handleSearch('Bananas', 'demo-1');
  }, []);

  const handleSearch = async (term: string, existingId?: string) => {
    const id = existingId || Date.now().toString();
    
    if (!existingId) {
      // Add new topic card immediately
      setResults(prev => [
        { 
          topic: { id, name: term, description: 'Custom Search' }, 
          images: [], 
          status: 'loading' 
        },
        ...prev
      ]);
    }

    try {
      const images = await getTopicImages(term);
      setResults(prev => prev.map(r => 
        r.topic.id === id 
          ? { ...r, images, status: 'success' as const } 
          : r
      ));
    } catch (error) {
      setResults(prev => prev.map(r => 
        r.topic.id === id 
          ? { ...r, status: 'error' as const } 
          : r
      ));
    }
  };

  const handleRemoveTopic = (id: string) => {
    setResults(prev => prev.filter(r => r.topic.id !== id));
  };

  const handleUpdateImage = (topicId: string, imageTitle: string, updates: Partial<ImageMetadata>) => {
    setResults(prev => prev.map(res => {
      if (res.topic.id !== topicId) return res;
      return {
        ...res,
        images: res.images.map(img => 
          img.title === imageTitle ? { ...img, ...updates } : img
        )
      };
    }));
  };

  const allLoaded = results.every(r => r.status !== 'loading');
  const totalImages = results.reduce((acc, r) => acc + r.images.length, 0);
  const processedCount = results.reduce((acc, r) => acc + r.images.filter(i => i.processedUrl).length, 0);

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none">
        <Header onSearch={(term) => handleSearch(term)} />
      </div>
      
      {/* Main Dashboard Area */}
      <div className="flex-grow flex overflow-hidden">
        
        {/* Left Column: Content Grid (Scrollable) */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sticky top-0 z-10 bg-[#f8fafc]/95 backdrop-blur py-2 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Board</h2>
                <p className="text-xs text-gray-500">Manage your collections before export.</p>
              </div>
              
              <div className="flex items-center gap-3">
                 {!allLoaded && (
                   <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-xs font-medium animate-pulse">
                     <Loader2 className="w-3 h-3 animate-spin" />
                     Searching...
                   </div>
                 )}
                 {totalImages > 0 && (
                   <div className="flex items-center gap-2">
                     <div className="bg-white text-gray-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-gray-200 shadow-sm">
                       <LayoutGrid className="w-3 h-3 text-gray-400" />
                       {results.length} Topics
                     </div>
                     <div className="bg-white text-gray-800 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-gray-200 shadow-sm">
                        {totalImages} Imgs
                     </div>
                     {processedCount > 0 && (
                       <div className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider border border-indigo-200">
                         <Sparkles className="w-3 h-3" />
                         {processedCount} AI Cleaned
                       </div>
                     )}
                   </div>
                 )}
              </div>
            </div>

            {results.length === 0 ? (
              <div className="h-96 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                 <div className="text-5xl mb-4 opacity-50">🏛️</div>
                 <p className="text-lg font-medium">Search to start collecting</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-12">
                {results.map((result) => (
                  <CultivarCard 
                    key={result.topic.id} 
                    result={result} 
                    onUpdateImage={handleUpdateImage}
                    onRemove={handleRemoveTopic}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Column: Export Sidebar (Fixed width) */}
        <aside className="w-96 bg-white border-l border-yellow-200 shadow-xl flex flex-col z-20">
           {/* Wrap ExportPanel to take available space and handle internal scrolling without breaking layout */}
           <div className="flex-1 min-h-0 overflow-hidden">
             <ExportPanel results={results} allLoaded={allLoaded} onUpdateImage={handleUpdateImage} />
           </div>
           
           <div className="flex-none p-4 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-500 space-y-3">
              
              <div className="flex justify-center gap-3 opacity-60">
                <span>Wiki</span> &bull; <span>LOC</span> &bull; <span>IA</span> &bull; <span>Met</span> &bull; <span>AIC</span>
              </div>
              
              <div className="text-center space-y-2">
                 <p className="leading-tight opacity-80">
                   Public Domain Clipper is live: open-source, free, and hostable by anyone. Grab public-domain images, isolate subjects, build archives for all.
                 </p>
                 <a 
                   href="https://github.com/jbrick2070/Public-Domain-Clipper" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-1.5 rounded-full hover:bg-gray-700 transition-colors mx-auto"
                 >
                   <Github className="w-3 h-3" />
                   <span className="font-bold">View Source</span>
                 </a>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
};

export default App;
