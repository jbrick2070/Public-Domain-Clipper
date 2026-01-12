
import React from 'react';
import { TopicResult, ImageMetadata } from '../types';
import { Loader2, ExternalLink, Download, Sparkles, RefreshCw, Library, Globe, FileText, Trash2, Landmark, Palette, Rocket, Building2 } from 'lucide-react';
import { removeBackground } from '../services/aiService';

interface Props {
  result: TopicResult;
  onUpdateImage: (topicId: string, imageTitle: string, updates: Partial<ImageMetadata>) => void;
  onRemove?: (topicId: string) => void;
}

const SourceBadge: React.FC<{ source: ImageMetadata['source'] }> = ({ source }) => {
  const config = {
    'Wikimedia': { color: 'bg-blue-100 text-blue-700', icon: Globe, label: 'WIKI' },
    'Internet Archive': { color: 'bg-amber-100 text-amber-700', icon: FileText, label: 'IA' },
    'Library of Congress': { color: 'bg-gray-100 text-gray-700', icon: Library, label: 'LOC' },
    'The Met': { color: 'bg-rose-100 text-rose-800', icon: Landmark, label: 'MET' },
    'Art Institute of Chicago': { color: 'bg-stone-100 text-stone-700', icon: Palette, label: 'AIC' },
    'Cleveland Museum of Art': { color: 'bg-emerald-100 text-emerald-700', icon: Building2, label: 'CMA' },
    'NASA': { color: 'bg-indigo-900 text-white border-none', icon: Rocket, label: 'NASA' }
  }[source];

  const Icon = config?.icon || Globe;
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black ${config?.color || 'bg-gray-100'} border border-current opacity-90 shadow-sm`}>
      <Icon className="w-2 h-2" />
      {config?.label || 'WEB'}
    </div>
  );
};

const CultivarCard: React.FC<Props> = ({ result, onUpdateImage, onRemove }) => {
  const { topic, images, status } = result;

  const handleCleanBackground = async (img: ImageMetadata) => {
    if (img.processing) return;
    onUpdateImage(topic.id, img.title, { processing: true });
    try {
      const processedUrl = await removeBackground(img.url);
      onUpdateImage(topic.id, img.title, { processedUrl, processing: false });
    } catch (error) {
      onUpdateImage(topic.id, img.title, { processing: false });
      console.error(error);
      alert("AI Processing Error: Could not extract object from this image.");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 overflow-hidden flex flex-col group transition-all hover:shadow-lg hover:border-yellow-400 relative">
      <div className="p-4 border-b border-yellow-50 bg-yellow-50/50 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight capitalize">{topic.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{images.length} sources found</p>
        </div>
        {onRemove && (
          <button 
            onClick={() => onRemove(topic.id)}
            className="text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-grow">
        {status === 'loading' ? (
          <div className="h-64 flex flex-col gap-3 items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
            <span className="text-xs text-gray-400 font-mono animate-pulse">Searching archives...</span>
          </div>
        ) : images.length === 0 ? (
          <div className="h-64 flex items-center justify-center bg-gray-50 text-gray-400 p-8 text-center italic text-xs leading-relaxed">
            No public domain results found for this term.
          </div>
        ) : (
          <div className="grid grid-cols-2 bg-gray-200 gap-px">
            {images.slice(0, 6).map((img, idx) => (
              <div key={idx} className="relative aspect-square group/img bg-white overflow-hidden">
                <div className="absolute inset-0 bg-gray-100 animate-pulse" />
                <img 
                  src={img.processedUrl || img.thumbUrl} 
                  alt={img.title} 
                  loading="lazy"
                  className={`relative w-full h-full object-cover transition-all duration-700 ${img.processedUrl ? 'scale-90 object-contain' : 'group-hover/img:scale-110'}`} 
                  style={img.processedUrl ? {backgroundColor: 'black'} : {}}
                />
                
                <div className="absolute top-1 left-1 z-30">
                  <SourceBadge source={img.source} />
                </div>

                {img.processing && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-center gap-2 z-20">
                   <div className="flex gap-2">
                    <a href={img.descriptionUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white rounded-lg text-black hover:bg-yellow-400 transition-all">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button 
                      onClick={() => handleCleanBackground(img)}
                      disabled={img.processing}
                      className="p-1.5 bg-yellow-400 rounded-lg text-black hover:bg-white transition-all shadow-sm"
                    >
                      {img.processedUrl ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </button>
                   </div>
                  <p className="text-[9px] text-white font-bold uppercase tracking-tighter leading-tight line-clamp-2">{img.attribution || img.title}</p>
                </div>

                {img.processedUrl && (
                  <div className="absolute bottom-1 right-1 bg-indigo-600 text-[7px] font-black px-1.5 py-0.5 rounded text-white shadow-lg uppercase tracking-widest">
                    AI EXTRACTED
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-yellow-50">
         {images.length > 0 && (
           <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
              <span>{images.filter(i => i.processedUrl).length} Extracted</span>
              <span>{images.length} Available</span>
           </div>
         )}
      </div>
    </div>
  );
};

export default CultivarCard;
