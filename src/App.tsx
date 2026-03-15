/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  FileUp, 
  Send, 
  Check, 
  X, 
  ChevronRight, 
  MessageSquare, 
  History,
  Settings,
  Type,
  Loader2,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Download,
  FileText,
  FileCode,
  Share2,
  Ghost,
  Camera
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { geminiService } from './services/geminiService';
import { Suggestion, Attachment } from './types';
import { ChaosOverlay } from './components/ChaosOverlay';

const FONTS = [
  { name: 'Inter', className: 'font-sans' },
  { name: 'JetBrains Mono', className: 'font-mono' },
  { name: 'Playfair Display', className: 'serif' },
  { name: 'Space Grotesk', className: 'font-space' },
  { name: 'Cormorant Garamond', className: 'font-cormorant' }
];

export default function App() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled Masterpiece');
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const [iterationFeedback, setIterationFeedback] = useState('');
  const [isIterating, setIsIterating] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [chaosLevel, setChaosLevel] = useState<'tiger' | 'titz'>('tiger');
  const [writingStyle, setWritingStyle] = useState('Standard');
  const [customVibe, setCustomVibe] = useState('');
  const [audience, setAudience] = useState('General');
  const [format, setFormat] = useState('Essay');
  const [deeperCount, setDeeperCount] = useState(0);
  const [showVoid, setShowVoid] = useState(false);
  const [aiScore, setAiScore] = useState(0);
  const [earnedFonts, setEarnedFonts] = useState(['Inter']);
  const [currentFont, setCurrentFont] = useState('Inter');

  const editorRef = useRef<HTMLDivElement>(null);

  // Sync content from ref to state without re-rendering the editor div
  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerText);
    }
  };

  // Initial content load
  useEffect(() => {
    if (editorRef.current && content && editorRef.current.innerText !== content) {
      editorRef.current.innerText = content;
    }
  }, []); // Only on mount or when content is externally set (like generation)

  // Update editor when content is changed by AI
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== content) {
      // This happens when AI generates or rewrites
      editorRef.current.innerText = content;
    }
  }, [content]);

  // Handle text selection for in-line feedback
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: sel.toString(),
        start: 0, // Simplified
        end: 0    // Simplified
      });
    } else {
      setSelection(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const draft = await geminiService.generateInitialDraft(prompt, attachments, writingStyle, audience, format, customVibe);
      setContent(draft);
      setPrompt('');
      setAttachments([]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleIterate = async () => {
    if (!selection || !iterationFeedback.trim()) return;
    setIsIterating(true);
    try {
      const rewritten = await geminiService.iterateOnSelection(content, selection.text, iterationFeedback, writingStyle);
      // Simple replacement logic (needs to be more robust for real apps)
      const newContent = content.replace(selection.text, rewritten);
      setContent(newContent);
      setSelection(null);
      setIterationFeedback('');
      setAiScore(prev => prev + 1);
      
      if ((aiScore + 1) % 3 === 0 && earnedFonts.length < FONTS.length) {
        const nextFont = FONTS[earnedFonts.length].name;
        setEarnedFonts(prev => [...prev, nextFont]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsIterating(false);
    }
  };

  // Proactive feedback logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (content.length > 200 && suggestions.length === 0) {
        const newSuggestions = await geminiService.getProactiveFeedback(content);
        setSuggestions(newSuggestions.map((s, i) => ({
          id: `pro-${i}`,
          type: 'proactive',
          feedback: s.feedback,
          suggestedText: s.suggestion,
          originalText: s.targetText,
          status: 'pending'
        })));
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [content]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    setUploadError(null);

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const newAttachments: Attachment[] = [];

    try {
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        if (file.size > MAX_FILE_SIZE) {
          setUploadError(`File "${file.name}" is too large (max 20MB)`);
          continue;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64
        });
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to process some files');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const acceptSuggestion = (suggestion: Suggestion) => {
    if (suggestion.suggestedText && suggestion.originalText) {
      setContent(prev => prev.replace(suggestion.originalText!, suggestion.suggestedText!));
    }
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    setActiveSuggestion(null);
  };

  const exportDocument = (format: 'txt' | 'md') => {
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleScreenshot = async () => {
    if (editorRef.current) {
      const canvas = await html2canvas(editorRef.current, {
        backgroundColor: '#0A0A0A',
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-snapshot.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const scrollToTop = () => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
    
    setDeeperCount(prev => {
      const next = prev + 1;
      if (next % 3 === 0) {
        setShowVoid(true);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0A]">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 glass-panel border-r border-white/5 flex flex-col"
          >
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <span className="font-semibold tracking-tight">Lumina</span>
              </div>
              <button onClick={() => setShowSidebar(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* AI Score */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-500/60 uppercase font-bold tracking-widest">AI Outdid Yesteryear</p>
                    <p className="text-xl font-black text-emerald-500">{aiScore}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI OUTDID YESTERYEAR: {aiScore}
                  </div>
                  <div className="text-[8px] text-emerald-500/40 font-mono">EARLY ALPHA v0.6.9</div>
                </div>
              </div>

              {/* Chaos Mode Level */}
              <section>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Chaos Intensity</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'tiger', label: 'Tiger Cubs', color: 'text-orange-400' },
                    { id: 'titz', label: 'Titz to Wall', color: 'text-red-500' }
                  ].map(level => (
                    <button
                      key={level.id}
                      onClick={() => setChaosLevel(level.id as 'tiger' | 'titz')}
                      className={`px-4 py-3 rounded-xl text-[10px] transition-all border active:scale-95 shadow-[0_4px_0_0_rgba(0,0,0,0.3)] active:shadow-none translate-y-0 active:translate-y-1 ${
                        chaosLevel === level.id 
                          ? 'bg-white/10 border-white/30 ' + level.color
                          : 'bg-white/5 border-transparent text-white/20 hover:bg-white/10'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Writing Style */}
              <section>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Writing Style</h3>
                <div className="grid grid-cols-1 gap-2">
                  {['Standard', 'Academic Overachiever', 'Passive-Aggressive Assistant', 'The Over-Explainer', 'Custom'].map(style => (
                    <button
                      key={style}
                      onClick={() => setWritingStyle(style)}
                      className={`text-left px-4 py-3 rounded-xl text-xs transition-all border active:scale-95 shadow-[0_4px_0_0_rgba(0,0,0,0.3)] active:shadow-none translate-y-0 active:translate-y-1 ${
                        writingStyle === style 
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' 
                          : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
                {writingStyle === 'Custom' && (
                  <textarea
                    value={customVibe}
                    onChange={(e) => setCustomVibe(e.target.value)}
                    placeholder="Describe your vibe (e.g. 'Cyberpunk Noir', 'Victorian Gossip')..."
                    className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500/50 transition-all"
                    rows={2}
                  />
                )}
              </section>

              {/* Audience & Format */}
              <section className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Audience</h3>
                  <select 
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Expert">Expert</option>
                    <option value="Child">Child</option>
                    <option value="Skeptical">Skeptical</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Format</h3>
                  <select 
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
                  >
                    <option value="Essay">Essay</option>
                    <option value="Poem">Poem</option>
                    <option value="Manifesto">Manifesto</option>
                    <option value="Riddle">Riddle</option>
                  </select>
                </div>
              </section>

              {/* Earned Fonts */}
              <section>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Unlocked Fonts</h3>
                <div className="flex flex-wrap gap-2">
                  {FONTS.map(f => {
                    const isUnlocked = earnedFonts.includes(f.name);
                    return (
                      <button
                        key={f.name}
                        disabled={!isUnlocked}
                        onClick={() => setCurrentFont(f.name)}
                        className={`px-3 py-2 rounded-lg text-[10px] transition-all border ${
                          currentFont === f.name
                            ? 'bg-pink-500/10 border-pink-500/50 text-pink-500'
                            : isUnlocked
                              ? 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                              : 'bg-black/40 border-white/5 text-white/10 cursor-not-allowed'
                        } ${f.className}`}
                      >
                        {f.name} {!isUnlocked && '🔒'}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Draft Generation */}
              <section>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">New Draft</h3>
                <div className="space-y-4">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What are we writing today?"
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
                  />
                  
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 h-10 bg-white/5 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      ) : (
                        <FileUp className="w-4 h-4 text-white/40" />
                      )}
                      <span className="text-xs text-white/40">
                        {isUploading ? 'Processing...' : 'Attach files'}
                      </span>
                      <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept="image/*,application/pdf,text/*,.doc,.docx,.md"
                        onChange={handleFileUpload} 
                        disabled={isUploading}
                      />
                    </label>
                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || isUploading || !prompt.trim()}
                      className="h-10 px-4 bg-emerald-500 text-black rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Generate
                    </button>
                  </div>

                  {uploadError && (
                    <p className="text-[10px] text-red-400 mt-1">{uploadError}</p>
                  )}

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-white/60">
                          <span className="truncate max-w-[100px]">{att.name}</span>
                          <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Proactive Suggestions */}
              {suggestions.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">AI Suggestions</h3>
                  <div className="space-y-3">
                    {suggestions.map((s) => (
                      <motion.div 
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 glass-panel rounded-xl border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer group"
                        onClick={() => setActiveSuggestion(s)}
                      >
                        <p className="text-xs text-white/80 leading-relaxed mb-3">{s.feedback}</p>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSuggestions(prev => prev.filter(item => item.id !== s.id)); }}
                            className="p-1.5 hover:bg-white/5 rounded-md text-white/40"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); acceptSuggestion(s); }}
                            className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-md"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="p-6 border-t border-white/5 flex items-center justify-between text-white/40 relative">
              <button className="hover:text-white transition-colors"><History className="w-5 h-5" /></button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={`hover:text-white transition-all ${showExportMenu ? 'text-emerald-500 scale-110' : ''}`}
                >
                  <Download className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 20, rotate: -10 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        y: -10, 
                        rotate: 0,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 15
                        }
                      }}
                      exit={{ opacity: 0, scale: 0.5, y: 20, rotate: 10 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 glass-panel rounded-2xl p-2 shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="flex flex-col gap-1">
                        <motion.button
                          whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.05)" }}
                          onClick={handleScreenshot}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white transition-colors text-left"
                        >
                          <Camera className="w-4 h-4 text-emerald-500" />
                          Capture Snapshot
                        </motion.button>
                        <motion.button
                          whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.05)" }}
                          onClick={() => exportDocument('txt')}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white transition-colors text-left"
                        >
                          <FileText className="w-4 h-4 text-emerald-500" />
                          Plain Text
                        </motion.button>
                        <motion.button
                          whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.05)" }}
                          onClick={() => exportDocument('md')}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white transition-colors text-left"
                        >
                          <FileCode className="w-4 h-4 text-emerald-500" />
                          Markdown
                        </motion.button>
                        <motion.button
                          whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.05)" }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white transition-colors text-left opacity-50 cursor-not-allowed"
                        >
                          <Share2 className="w-4 h-4 text-emerald-500" />
                          Publish
                        </motion.button>
                      </div>
                      
                      {/* Rollercoaster decorative element */}
                      <motion.div 
                        animate={{ 
                          x: [-100, 200],
                          y: [0, -10, 0, 10, 0]
                        }}
                        transition={{ 
                          duration: 3, 
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                        className="absolute bottom-0 left-0 h-0.5 w-20 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setChaosMode(!chaosMode)}
                title="Chaos Mode"
                className={`hover:text-white transition-all ${chaosMode ? 'text-pink-500 animate-pulse' : 'text-white/40'}`}
              >
                <Ghost className="w-5 h-5" />
              </button>
              <button className="hover:text-white transition-colors text-white/40"><Settings className="w-5 h-5" /></button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto">
        {!showSidebar && (
          <button 
            onClick={() => setShowSidebar(true)}
            className="fixed top-6 left-6 z-50 w-10 h-10 glass-panel rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}

        <div className="editor-container">
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-4xl font-serif font-light mb-12 outline-none text-white/20 focus:text-white transition-colors"
            placeholder="Title..."
          />
          
          <div 
            ref={editorRef}
            contentEditable
            onMouseUp={handleMouseUp}
            onInput={handleInput}
            className="editor-content min-h-[60vh]"
            spellCheck={false}
          />

          {/* Cryptic Photos at the bottom */}
          <div className="mt-32 pt-12 border-t border-white/5 grid grid-cols-3 gap-6 opacity-40 hover:opacity-100 transition-opacity duration-700">
            {[
              { seed: 'rabbit-hole', label: "Who's yo momma?" },
              { seed: 'mad-hatter', label: "What the doos?" },
              { seed: 'cheshire', label: "Where am I?" }
            ].map((img, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-2xl bg-white/5 grayscale hover:grayscale-0 transition-all duration-500">
                <img 
                  src={`https://picsum.photos/seed/${img.seed}/400/400`} 
                  alt="Cryptic" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center p-4 transition-opacity">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-mono text-center leading-relaxed">
                    {img.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Rabbit Hole */}
          <div className="mt-24 flex flex-col items-center gap-8 pb-32">
            <div className="h-20 w-px bg-gradient-to-b from-white/20 to-transparent" />
            
            <div className="flex items-center gap-12">
              <motion.button 
                whileHover={{ y: -5, scale: 1.1 }}
                onClick={scrollToTop}
                className="group flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/5 transition-all">
                  <ChevronUp className="w-5 h-5 text-white/20 group-hover:text-emerald-500" />
                </div>
                <span className="text-[8px] uppercase tracking-[0.2em] text-white/20 group-hover:text-emerald-500">Back to Reality</span>
              </motion.button>

              <motion.button 
                whileHover={{ y: 5, scale: 1.1 }}
                onClick={scrollToBottom}
                className="group flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-pink-500/50 group-hover:bg-pink-500/5 transition-all">
                  <ChevronDown className="w-5 h-5 text-white/20 group-hover:text-pink-500" />
                </div>
                <span className="text-[8px] uppercase tracking-[0.2em] text-white/20 group-hover:text-pink-500">Deeper Down</span>
              </motion.button>
            </div>

            <p className="text-[9px] text-white/10 italic tracking-widest mt-4">
              "We're all mad here..."
            </p>
          </div>
        </div>

        {/* Selection Iteration Overlay */}
        <AnimatePresence>
          {selection && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[500px] glass-panel rounded-2xl shadow-2xl p-6 z-50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-xs font-medium text-white/60">Iterate on selection</span>
              </div>
              
              <div className="bg-white/5 rounded-lg p-3 mb-4 text-xs italic text-white/40 border border-white/5 max-h-24 overflow-y-auto">
                "{selection.text}"
              </div>

              <div className="flex gap-3">
                <input 
                  value={iterationFeedback}
                  onChange={(e) => setIterationFeedback(e.target.value)}
                  placeholder="How should we change this? (e.g., 'make it more punchy')"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleIterate()}
                />
                <button 
                  onClick={handleIterate}
                  disabled={isIterating || !iterationFeedback.trim()}
                  className="px-4 bg-emerald-500 text-black rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                >
                  {isIterating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Rewrite
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Suggestion Detail Overlay */}
        <AnimatePresence>
          {activeSuggestion && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
              onClick={() => setActiveSuggestion(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-xl glass-panel rounded-3xl p-8 space-y-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">AI Suggestion</h4>
                      <p className="text-xs text-white/40">Refining your thought</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveSuggestion(null)} className="text-white/20 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">Reasoning</span>
                    <p className="text-sm text-white/80 leading-relaxed">{activeSuggestion.feedback}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                      <span className="text-[10px] uppercase tracking-widest text-red-500/40 block mb-2">Original</span>
                      <p className="text-sm text-white/40 line-through">{activeSuggestion.originalText}</p>
                    </div>
                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <span className="text-[10px] uppercase tracking-widest text-emerald-500/40 block mb-2">Suggested</span>
                      <p className="text-sm text-white/90">{activeSuggestion.suggestedText}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setActiveSuggestion(null)}
                    className="flex-1 h-12 rounded-2xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    Keep Original
                  </button>
                  <button 
                    onClick={() => acceptSuggestion(activeSuggestion)}
                    className="flex-1 h-12 rounded-2xl bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition-colors"
                  >
                    Apply Change
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Status Bar */}
      <div className="fixed bottom-6 right-6 flex items-center gap-4 text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono">
        <span>{content.split(/\s+/).filter(x => x).length} words</span>
        <div className="w-1 h-1 bg-white/20 rounded-full" />
        <span>Zen Mode Active</span>
      </div>

      {chaosMode && <ChaosOverlay level={chaosLevel} />}

      {/* The Void Overlay */}
      <AnimatePresence>
        {showVoid && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8"
          >
            <motion.button 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setShowVoid(false)}
              className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-6 h-6" />
            </motion.button>

            <div className="relative w-full max-w-4xl aspect-video bg-zinc-900/50 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              
              {/* Chessy & Bokkie */}
              <div className="relative flex items-end gap-12 mb-12">
                <motion.div
                  animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="flex flex-col items-center"
                >
                  <div className="text-6xl mb-4">🐈‍⬛</div>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-[10px] uppercase tracking-widest text-white/60">
                    Netflix & Chill
                  </div>
                </motion.div>

                <motion.div
                  animate={{ scale: [1, 1.05, 1], rotate: [0, -3, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="flex flex-col items-center"
                >
                  <div className="text-7xl mb-4">🦌</div>
                  <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-emerald-500/20 text-[10px] uppercase tracking-widest text-emerald-500">
                    Springbokkie
                  </div>
                </motion.div>
              </div>

              <div className="absolute bottom-12 text-center">
                <h2 className="text-4xl font-black text-white mb-4 italic">"We're all mad here..."</h2>
                <p className="text-white/20 text-xs uppercase tracking-[0.5em]">You've reached the bottom of the rabbit hole.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
