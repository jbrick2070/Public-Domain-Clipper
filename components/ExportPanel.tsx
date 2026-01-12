import React, { useState, useEffect, useRef } from 'react';
import { TopicResult, ImageMetadata } from '../types';
import { FolderDown, FileArchive, Loader2, Wand2, CheckSquare, Square, Terminal, Wifi, Activity, ArrowRight, Play, Scissors, Image as ImageIcon } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { removeBackground } from '../services/aiService';

interface Props {
  results: TopicResult[];
  allLoaded: boolean;
  onUpdateImage: (topicId: string, imageTitle: string, updates: Partial<ImageMetadata>) => void;
}

const ExportPanel: React.FC<Props> = ({ results, allLoaded, onUpdateImage }) => {
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Track selection state of topics
  const [selectedTopics, setSelectedTopics] = useState<Record<string, boolean>>({});

  // Sync selection state when results change
  useEffect(() => {
    setSelectedTopics(prev => {
      const next = { ...prev };
      let changed = false;
      results.forEach(r => {
        if (next[r.topic.id] === undefined) {
          next[r.topic.id] = true;
          changed = true;
        }
      });
      // Remove IDs that no longer exist
      Object.keys(next).forEach(id => {
        if (!results.find(r => r.topic.id === id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [results]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const prefix = type === 'success' ? '✅ ' : type === 'warn' ? '⚠️ ' : 'ℹ️ ';
    setLogs(prev => [...prev, `[${time}] ${prefix}${msg}`]);
  };

  const getSelectedResults = () => results.filter(r => selectedTopics[r.topic.id]);

  const generateZipFilename = (selectedResults: TopicResult[], suffix: string) => {
    if (selectedResults.length === 0) return `pd_archive_${new Date().getTime()}.zip`;
    
    // Create a name string from selected topics, e.g. "Mushrooms_Bananas"
    const names = selectedResults.map(r => r.topic.name.replace(/[^a-zA-Z0-9]/g, ''));
    let baseName = names.join('_');
    
    // Truncate if too long to avoid filesystem issues
    if (baseName.length > 50) {
      baseName = baseName.substring(0, 50) + '_et_al';
    }
    
    return `${baseName}_${suffix}.zip`;
  };

  // Helper to fetch with simple retry
  const fetchWithRetry = async (url: string, attempts = 2): Promise<Blob> => {
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.blob();
        } catch (e) {
            if (i === attempts - 1) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw new Error("Failed after retries");
  };

  const runBulkAiAndDownload = async () => {
    if (zipping) return;
    const activeResults = getSelectedResults();
    if (activeResults.length === 0) {
        addLog("Error: No subjects selected for export.", 'warn');
        return;
    }

    setZipping(true);
    setZipProgress(0);
    setLogs([]); // Clear previous logs
    addLog("Initializing Bulk Export Sequence...", 'info');
    
    // Use a local map to track processed URLs to avoid closure staleness issues
    const processedMap = new Map<string, string>(); // Key: `${topicId}::${imgUrl}`

    const getKey = (topicId: string, url: string) => `${topicId}::${url}`;

    const allImages: { topicId: string, img: ImageMetadata, topicName: string }[] = [];
    activeResults.forEach(res => {
      res.images.forEach(img => {
        allImages.push({ topicId: res.topic.id, img, topicName: res.topic.name });
        // Pre-fill map if already processed
        if (img.processedUrl) {
            processedMap.set(getKey(res.topic.id, img.url), img.processedUrl);
        }
      });
    });

    if (allImages.length === 0) {
        addLog("Aborting: No images found.", 'warn');
        setZipping(false);
        return;
    }

    addLog(`Queued ${allImages.length} items for processing.`, 'info');

    try {
      // 1. Bulk AI Extraction Phase
      addLog("--- PHASE 1: AI EXTRACTION ---", 'info');
      for (let i = 0; i < allImages.length; i++) {
        const { topicId, img, topicName } = allImages[i];
        const key = getKey(topicId, img.url);
        
        // Check local map first
        if (!processedMap.has(key)) {
          addLog(`CONNECT: Gemini 2.5 -> '${img.title.substring(0, 15)}...'`, 'info');
          try {
            onUpdateImage(topicId, img.title, { processing: true });
            
            // Execute AI (Service now has built-in retries)
            const processedUrl = await removeBackground(img.url);
            
            // Update Global State (UI)
            onUpdateImage(topicId, img.title, { processedUrl, processing: false });
            
            // Update Local Map (For Zip)
            processedMap.set(key, processedUrl);
            
            addLog(`SUCCESS: Extracted '${img.title.substring(0, 15)}...'`, 'success');
          } catch (err) {
            addLog(`ERROR: AI failed for '${img.title.substring(0, 15)}...'`, 'warn');
            onUpdateImage(topicId, img.title, { processing: false });
          }
        } else {
            addLog(`CACHE: Using existing '${img.title.substring(0, 15)}...'`, 'info');
        }
        setZipProgress(Math.floor(((i + 1) / allImages.length) * 80));
      }

      // 2. Packaging Phase
      addLog("--- PHASE 2: ARCHIVING ---", 'info');
      const zip = new JSZip();
      const rootFolder = zip.folder("collection");
      
      let zipProcessed = 0;
      for (const res of activeResults) {
        const folderName = res.topic.name.replace(/\s+/g, '_');
        const topicFolder = rootFolder?.folder(folderName);
        
        for (let i = 0; i < res.images.length; i++) {
          const img = res.images[i];
          const key = getKey(res.topic.id, img.url);
          
          // CRITICAL: Retrieve from local map first to ensure we get the newly processed URL
          const processedUrl = processedMap.get(key);
          const finalUrl = processedUrl || img.url;
          
          try {
            const blob = await fetchWithRetry(finalUrl);
            
            const isProcessed = !!processedUrl;
            // Use PNG for processed images (transparency), preserve original extension otherwise
            const fileExt = isProcessed ? 'png' : (img.url.split('.').pop() || 'jpg');
            const safeTitle = img.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            const baseFileName = `${(i + 1).toString().padStart(2, '0')}_${safeTitle}`;
            
            topicFolder?.file(`${baseFileName}.${fileExt}`, blob);
          } catch (e) {
             const isOriginal = !processedUrl;
             if (isOriginal) {
                addLog(`CORS BLOCKED: ${img.title.substring(0, 15)} (Source blocked download)`, 'warn');
             } else {
                addLog(`WRITE ERROR: ${img.title.substring(0, 15)}`, 'warn');
             }
          }
          
          zipProcessed++;
          const progress = 80 + Math.floor((zipProcessed / allImages.length) * 20);
          setZipProgress(progress);
        }
      }

      addLog("COMPRESS: Generating ZIP...", 'info');
      const content = await zip.generateAsync({ type: "blob" });
      const filename = generateZipFilename(activeResults, 'Extracted');
      saveAs(content, filename);
      addLog(`COMPLETE: ${filename}`, 'success');
    } catch (err) {
      addLog("FATAL: Archive failed.", 'warn');
      console.error(err);
    } finally {
      setZipping(false);
      setZipProgress(0);
    }
  };

  const handleSimpleDownload = async () => {
    if (zipping) return;
    const activeResults = getSelectedResults();
    if (activeResults.length === 0) {
        addLog("Error: No subjects selected.", 'warn');
        return;
    }

    setZipping(true);
    setLogs([]);
    addLog("Starting Standard Archive...", 'info');
    
    const zip = new JSZip();
    const rootFolder = zip.folder("pd_original_archive");
    
    let processedCount = 0;
    const totalToProcess = activeResults.reduce((acc, r) => acc + r.images.length, 0);
    
    if (totalToProcess === 0) {
        addLog("No images found.", 'warn');
        setZipping(false);
        return;
    }

    try {
      for (const res of activeResults) {
        const folderName = res.topic.name.replace(/\s+/g, '_');
        const topicFolder = rootFolder?.folder(folderName);
        
        for (let i = 0; i < res.images.length; i++) {
          const img = res.images[i];
          try {
            const blob = await fetchWithRetry(img.url);
            
            const fileExt = img.url.split('.').pop() || 'jpg';
            const safeTitle = img.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            const baseFileName = `${(i + 1).toString().padStart(2, '0')}_${safeTitle}`;
            
            topicFolder?.file(`${baseFileName}.${fileExt}`, blob);
          } catch(e) {
             addLog(`CORS SKIP: ${img.title.substring(0, 10)}...`, 'warn');
          }
          
          processedCount++;
          setZipProgress(Math.floor((processedCount / totalToProcess) * 100));
        }
      }

      addLog("Finalizing ZIP...", 'info');
      const content = await zip.generateAsync({ type: "blob" });
      const filename = generateZipFilename(activeResults, 'Originals');
      saveAs(content, filename);
      addLog(`Done! ${filename}`, 'success');
    } catch (err) {
      console.error(err);
      addLog("Export failed.", 'warn');
    } finally {
      setZipping(false);
      setZipProgress(0);
    }
  };

  const anySelected = Object.values(selectedTopics).some(v => v);
  const activeCount = Object.values(selectedTopics).filter(v => v).length;

  return (
    <div className="flex flex-col h-full">
      {/* Top Section: Controls */}
      <div className="flex-none p-5 border-b border-yellow-100 bg-yellow-50/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center shadow-sm">
            <FolderDown className="w-4 h-4 text-yellow-900" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Export Manager</h2>
        </div>

        {/* Collection Selector */}
        <div className="mb-4">
           <div className="flex items-center justify-between mb-2">
             <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Select Collections</h3>
             <button 
                onClick={() => {
                   const allSelected = activeCount === results.length;
                   const newState: Record<string, boolean> = {};
                   results.forEach(r => newState[r.topic.id] = !allSelected);
                   setSelectedTopics(newState);
                }}
                className="text-[9px] text-indigo-600 font-bold hover:underline"
             >
               {activeCount === results.length ? 'NONE' : 'ALL'}
             </button>
           </div>
           <div className="max-h-32 overflow-y-auto pr-1 custom-scrollbar space-y-1 bg-white/80 p-2 rounded-lg border border-yellow-100/50 shadow-inner">
             {results.map(r => (
               <div 
                 key={r.topic.id} 
                 onClick={() => toggleTopic(r.topic.id)}
                 className={`flex items-center gap-2 p-2 rounded transition-all cursor-pointer group select-none ${selectedTopics[r.topic.id] ? 'bg-indigo-50 border border-indigo-100 shadow-sm' : 'hover:bg-white border border-transparent'}`}
               >
                 <div className={`flex-shrink-0 transition-colors ${selectedTopics[r.topic.id] ? 'text-indigo-600' : 'text-gray-300 group-hover:text-gray-400'}`}>
                   {selectedTopics[r.topic.id] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                 </div>
                 <span className={`text-xs font-medium truncate ${selectedTopics[r.topic.id] ? 'text-indigo-900' : 'text-gray-400'}`}>{r.topic.name}</span>
                 <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded font-bold transition-colors ${selectedTopics[r.topic.id] ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                   {r.images.length}
                 </span>
               </div>
             ))}
             {results.length === 0 && <div className="text-xs text-gray-400 p-2 italic text-center">Empty.</div>}
           </div>
        </div>
        
        {/* Buttons */}
        <div className="space-y-3">
          <button 
            disabled={!allLoaded || zipping || !anySelected}
            onClick={runBulkAiAndDownload}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-xl font-bold transition-all shadow-md transform active:scale-[0.99] border-b-2 text-sm relative overflow-hidden group ${
              !allLoaded || zipping || !anySelected
                ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed' 
                : 'bg-indigo-600 text-white border-indigo-800 hover:bg-indigo-700 hover:shadow-indigo-300'
            }`}
          >
             {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="flex flex-col items-start gap-0.5 text-left relative z-10">
              <div className="flex items-center gap-2">
                {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                <span>Subject Isolator</span>
              </div>
              <span className="text-[9px] font-normal opacity-70 pl-6">Remove backgrounds & Zip</span>
            </div>
            {zipping && <span className="text-[10px] font-mono opacity-90">{zipProgress}%</span>}
          </button>

          <button 
            disabled={!allLoaded || zipping || !anySelected}
            onClick={handleSimpleDownload}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all shadow-sm transform active:scale-[0.98] ${
              !allLoaded || zipping || !anySelected
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' 
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 hover:shadow'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Download Raw Images
          </button>
        </div>
      </div>

      {/* Bottom Section: Logs */}
      <div className="flex-grow bg-[#1e1e1e] flex flex-col p-4 overflow-hidden">
        <div className="flex-none flex items-center justify-between mb-3 pb-2 border-b border-[#333]">
          <div className="flex items-center gap-2 text-gray-400">
            <Terminal className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">Api Console</span>
          </div>
          <div className="flex items-center gap-2">
             {zipping && <span className="text-[9px] text-green-500 font-mono animate-pulse">RUNNING</span>}
            <Wifi className={`w-3 h-3 ${zipping ? 'text-green-500' : 'text-gray-600'}`} />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed space-y-1.5 pb-2">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 space-y-2">
               <Activity className="w-6 h-6" />
               <p className="text-center px-4">Ready for processing.</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-1 duration-300">
                <span className="text-green-500/50 select-none flex-shrink-0">{'>'}</span>
                <span className={`break-all ${log.includes('✅') ? 'text-green-400' : log.includes('⚠️') ? 'text-yellow-400' : 'text-gray-300'}`}>
                  {log}
                </span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
        
        {zipping && (
           <div className="flex-none mt-2">
             <div className="flex justify-between text-[9px] text-gray-400 mb-1 font-mono">
               <span>PROGRESS</span>
               <span>{zipProgress}%</span>
             </div>
             <div className="h-1 bg-[#333] rounded-full overflow-hidden">
                <div 
                   className="h-full bg-green-500 transition-all duration-300"
                   style={{ width: `${zipProgress}%` }}
                />
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;