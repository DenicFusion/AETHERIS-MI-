import React, { useEffect, useState } from 'react';
import { MessageSquare, Upload, Star, MapPin, User, CheckCircle2, Image as ImageIcon, X, ZoomIn, Eye, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export function Community() {
  const [activeTab, setActiveTab] = useState<'wall' | 'submit'>('wall');
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [story, setStory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lightbox modal state for viewing images in full size
  const [lightboxProof, setLightboxProof] = useState<any | null>(null);

  useEffect(() => {
    // Realtime snapshot for approved proofs
    const q = query(
      collection(db, 'community_proofs'), 
      where('status', '==', 'approved'), 
      orderBy('created_at', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setProofs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Failed to load community proofs", err);
      // Fallback in case index is building
      getDocs(collection(db, 'community_proofs')).then(snap => {
        const approved = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(d => d.status === 'approved')
          .sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
        setProofs(approved);
        setLoading(false);
      }).catch(e => {
        console.error(e);
        setLoading(false);
      });
    });

    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large. Please select an image under 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // High quality compressed dataURL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setImageUrl(dataUrl);
        toast.success("Proof screenshot attached successfully!");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !country.trim() || !story.trim()) {
      toast.error('Please fill out all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'community_proofs'), {
        name: name.trim(),
        country: country.trim(),
        story: story.trim(),
        imageUrl: imageUrl || null,
        status: 'pending', // Moderated before showing publicly
        created_at: new Date()
      });
      toast.success("Community proof submitted successfully! It will appear on the wall once reviewed and approved by admin.");
      setName('');
      setCountry('');
      setStory('');
      setImageUrl('');
      setActiveTab('wall');
    } catch (e: any) {
      console.error("Submission failed:", e);
      toast.error('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-28 pb-24 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5 backdrop-blur-md">
            <Star className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-300">Global Verification</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">Community Proofs</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Real success stories, withdrawal proofs, and achievements from Aetheris members worldwide.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-10">
           <Button 
             variant={activeTab === 'wall' ? 'default' : 'outline'} 
             onClick={() => setActiveTab('wall')}
             className={`rounded-xl px-6 font-bold uppercase tracking-wider transition-all ${
               activeTab === 'wall' 
                 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary/50' 
                 : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
             }`}
           >
             Community Wall ({proofs.length})
           </Button>
           <Button 
             variant={activeTab === 'submit' ? 'default' : 'outline'} 
             onClick={() => setActiveTab('submit')}
             className={`rounded-xl px-6 font-bold uppercase tracking-wider transition-all ${
               activeTab === 'submit' 
                 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary/50' 
                 : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
             }`}
           >
             <Upload className="w-4 h-4 mr-2" />
             Submit Tale
           </Button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'wall' && (
            <motion.div 
              key="wall" 
              initial={{opacity:0, y:15}} 
              animate={{opacity:1, y:0}} 
              exit={{opacity:0, y:-15}} 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
               {loading ? (
                 <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-3">
                   <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                   Compiling Verified Testimonials...
                 </div>
               ) : proofs.length === 0 ? (
                 <div className="col-span-full py-20 text-center text-gray-400 bg-white/[0.02] border border-white/10 rounded-3xl p-8 max-w-xl mx-auto">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-primary/60" />
                    <p className="font-bold text-white text-lg mb-1">The Wall is quiet.</p>
                    <p className="text-sm text-gray-400 mb-6">Be the first member to submit your verified success story & proof.</p>
                    <Button onClick={() => setActiveTab('submit')} className="bg-primary text-primary-foreground font-bold">
                      Submit Your Story
                    </Button>
                 </div>
               ) : proofs.map(proof => (
                 <div 
                   key={proof.id} 
                   className="bg-[#0b0f19]/80 border border-white/10 rounded-2xl p-5 hover:border-primary/40 hover:bg-[#0e1424] transition-all flex flex-col justify-between group shadow-xl"
                 >
                    <div>
                      {/* Author Header */}
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 text-primary font-bold">
                             <User className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="font-bold text-sm text-white">{proof.name}</p>
                             <p className="text-xs text-gray-400 font-mono flex items-center gap-1">
                               <MapPin className="w-3 h-3 text-emerald-400" /> {proof.country}
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                           <CheckCircle2 className="w-3.5 h-3.5" />
                           <span>Verified</span>
                         </div>
                      </div>

                      {/* Image Proof Attachment (Clickable to view properly) */}
                      {proof.imageUrl && (
                         <div 
                           onClick={() => setLightboxProof(proof)}
                           className="w-full h-48 bg-black/60 rounded-xl mb-4 overflow-hidden relative border border-white/10 cursor-pointer group/img"
                         >
                            <img 
                              src={proof.imageUrl} 
                              alt={`${proof.name}'s withdrawal proof`} 
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                              <span className="bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-lg">
                                <ZoomIn className="w-3.5 h-3.5 text-primary" /> Click to View Full Image
                              </span>
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-gray-300 border border-white/10 flex items-center gap-1">
                              <Eye className="w-3 h-3 text-primary" /> View Proof
                            </div>
                         </div>
                      )}

                      {/* Testimonial Story */}
                      <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-primary/50 pl-3 py-1 mb-4">
                        "{proof.story}"
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                       <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider flex items-center gap-1">
                         <Sparkles className="w-3 h-3" /> Payout Confirmed
                       </span>
                       {proof.imageUrl && (
                         <button 
                           onClick={() => setLightboxProof(proof)}
                           className="text-primary hover:underline font-bold text-xs flex items-center gap-1"
                         >
                           View Screenshot
                         </button>
                       )}
                    </div>
                 </div>
               ))}
            </motion.div>
          )}

          {activeTab === 'submit' && (
             <motion.div 
               key="submit" 
               initial={{opacity:0, y:15}} 
               animate={{opacity:1, y:0}} 
               exit={{opacity:0, y:-15}} 
               className="max-w-2xl mx-auto"
             >
                <form onSubmit={handleSubmit} className="bg-[#0b0f19] border border-white/10 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
                   <div className="text-center mb-6 border-b border-white/10 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
                        <Upload className="w-6 h-6" />
                      </div>
                      <h3 className="font-black text-2xl uppercase tracking-tight text-white">Submit Your Proof</h3>
                      <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                        Share your withdrawal receipt or experience with the community. Submissions are moderated by administration prior to public display.
                      </p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Display Name / Alias <span className="text-red-400">*</span>
                        </label>
                        <Input 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          required 
                          className="h-12 bg-black/50 border-white/10 rounded-xl focus:border-primary/50 text-white" 
                          placeholder="E.g. James M." 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Country of Origin <span className="text-red-400">*</span>
                        </label>
                        <Input 
                          value={country} 
                          onChange={e => setCountry(e.target.value)} 
                          required 
                          className="h-12 bg-black/50 border-white/10 rounded-xl focus:border-primary/50 text-white" 
                          placeholder="E.g. United Kingdom, USA, Germany..." 
                        />
                      </div>
                   </div>

                   {/* Image / Proof Upload Section */}
                   <div className="space-y-3">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                        Upload Proof Screenshot / Image (Optional)
                      </label>

                      {!imageUrl ? (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <label className="cursor-pointer flex-1 bg-white/5 hover:bg-white/10 text-white px-5 py-4 rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left group">
                              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                  Click to Upload Screenshot
                                </p>
                                <p className="text-xs text-gray-400">
                                  PNG, JPG, JPEG or WebP (Max 8MB)
                                </p>
                              </div>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleImageUpload} 
                              />
                            </label>
                          </div>

                          <div className="relative flex items-center justify-center my-2">
                            <div className="border-t border-white/10 w-full" />
                            <span className="bg-[#0b0f19] px-3 text-[11px] font-mono uppercase text-gray-500">or paste image link</span>
                            <div className="border-t border-white/10 w-full" />
                          </div>

                          <Input 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)} 
                            placeholder="https://i.imgur.com/example.png" 
                            className="h-11 bg-black/40 border-white/10 rounded-xl text-xs text-white" 
                          />
                        </div>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-black/60 p-2">
                          <div className="w-full h-52 rounded-xl overflow-hidden relative">
                            <img src={imageUrl} alt="Uploaded Proof Preview" className="w-full h-full object-contain bg-black/80" />
                          </div>
                          <div className="flex items-center justify-between p-2">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Proof Attached
                            </span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setImageUrl('')}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-3 rounded-lg text-xs"
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Remove Image
                            </Button>
                          </div>
                        </div>
                      )}
                   </div>

                   <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Your Story & Achievement <span className="text-red-400">*</span>
                      </label>
                      <Textarea 
                        value={story} 
                        onChange={e => setStory(e.target.value)} 
                        required 
                        className="min-h-[140px] bg-black/50 border-white/10 rounded-xl resize-none p-4 text-white focus:border-primary/50 text-sm leading-relaxed" 
                        placeholder="Detail your experience with Aetheris, withdrawals you've made, and how the platform has supported your financial growth..." 
                      />
                   </div>

                   <Button 
                     type="submit" 
                     disabled={submitting} 
                     className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider rounded-xl shadow-xl shadow-primary/25 transition-all text-sm cursor-pointer"
                   >
                      {submitting ? "Submitting for Moderation..." : "Submit Proof for Verification"}
                   </Button>
                </form>
             </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Lightbox / Fullscreen Image Viewer Modal */}
      <AnimatePresence>
        {lightboxProof && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxProof(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative max-w-4xl w-full bg-[#0b0f19] border border-white/20 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base flex items-center gap-2">
                      {lightboxProof.name}
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Verified Member
                      </span>
                    </h4>
                    <p className="text-xs text-gray-400 font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" /> {lightboxProof.country}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setLightboxProof(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* High-res Image View */}
              <div className="flex-1 overflow-auto p-3 sm:p-6 bg-black flex items-center justify-center min-h-[300px] max-h-[60vh]">
                <img 
                  src={lightboxProof.imageUrl} 
                  alt={`${lightboxProof.name}'s withdrawal proof`} 
                  className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/5"
                />
              </div>

              {/* Story footer */}
              {lightboxProof.story && (
                <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40">
                  <p className="text-sm text-gray-300 italic border-l-2 border-primary/50 pl-3">
                    "{lightboxProof.story}"
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
