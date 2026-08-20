import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function CommunityScrollTestimonials() {
  const [proofs, setProofs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'community_proofs'), 
      where('status', '==', 'approved'),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
       setProofs(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, error => {
       handleFirestoreError(error, OperationType.LIST, 'community_proofs');
    });
    return () => unsub();
  }, []);

  if (proofs.length === 0) return null;

  return (
    <section className="py-32 relative z-10 scroll-mt-20 border-y border-white/5 bg-black/20">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16 reveal">
          <Badge variant="outline" className="mb-4 border-amber-500/20 text-amber-500 bg-amber-500/5 px-4 py-1.5 uppercase font-mono text-[10px] tracking-widest">
            Verified Global Network
          </Badge>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
            Community Experiences
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Real outcomes from the global Aetheris node network. Our community's verified testimonials and payout proof.
          </p>
        </div>

        {/* Horizontal Scroll Area */}
        <div className="relative w-full overflow-hidden">
          {/* Fading edges */}
          <div className="absolute top-0 bottom-0 left-0 w-16 md:w-32 bg-gradient-to-r from-[#05050A] to-transparent z-10 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-16 md:w-32 bg-gradient-to-l from-[#05050A] to-transparent z-10 pointer-events-none" />
          
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar group pt-2 px-4 md:px-32">
            {proofs.map((proof, i) => (
              <motion.div 
                key={proof.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="snap-center shrink-0 w-[300px] md:w-[400px]"
              >
                <Link to="/community">
                  <Card className="bg-[#0b0c10] border-white/5 p-6 md:p-8 h-full rounded-3xl hover:border-primary/30 transition-all cursor-pointer shadow-xl shadow-black hover:-translate-y-2 flex flex-col justify-between group-hover:opacity-75 hover:!opacity-100 duration-300">
                    <div>
                      {proof.imageUrl ? (
                        <div className="w-full h-40 bg-white/5 rounded-xl mb-6 overflow-hidden relative">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={proof.imageUrl} alt="Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                      ) : (
                        <div className="flex gap-1 mb-6">
                          {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-emerald-500 fill-emerald-500" />)}
                        </div>
                      )}
                      
                      <p className="text-gray-300 italic mb-6 line-clamp-4 leading-relaxed tracking-wide text-sm md:text-base">
                        "{proof.story}"
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-white/5 pt-4">
                      <div>
                        <h4 className="font-bold text-white font-sans">{proof.name}</h4>
                        <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">{proof.country}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                         <span className="text-xs" title={proof.country}>
                           {proof.country === 'US' ? '🇺🇸' : proof.country === 'GB' || proof.country === 'UK' ? '🇬🇧' : proof.country === 'NG' ? '🇳🇬' : proof.country === 'ZA' ? '🇿🇦' : proof.country === 'CA' ? '🇨🇦' : proof.country === 'AU' ? '🇦🇺' : '🌐' }
                         </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link to="/community">
             <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-full px-8 py-6 h-auto tracking-wider uppercase font-bold text-xs group">
               View All Proofs
               <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
             </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
