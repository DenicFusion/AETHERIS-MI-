import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CheckCircle2, XCircle, Trash2, PlusCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function AdminCommunity() {
  const [proofs, setProofs] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newStory, setNewStory] = useState('');
  const [newImage, setNewImage] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'community_proofs'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, snap => {
       setProofs(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, error => {
       handleFirestoreError(error, OperationType.LIST, 'community_proofs');
    });
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'community_proofs', id), { status });
      toast.success(`Proof marked as ${status}`);
    } catch(e) {
      toast.error('Update failed');
    }
  };

  const deleteProof = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'community_proofs', id));
      toast.success('Proof deleted entirely.');
    } catch(e) {
      toast.error('Deletion failed');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
       toast.error("Image too large. Please select an image under 5MB.");
       return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
         const canvas = document.createElement('canvas');
         const MAX_WIDTH = 800;
         const MAX_HEIGHT = 800;
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
         
         // Compress to JPEG with 0.7 quality
         const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
         setNewImage(dataUrl);
         toast.success("Image added locally.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualAdd = async () => {
    if(!newName || !newCountry || !newStory) {
       toast.error("Please fill Name, Country, and Story");
       return;
    }
    try {
      await addDoc(collection(db, 'community_proofs'), {
        name: newName,
        country: newCountry,
        story: newStory,
        imageUrl: newImage,
        status: 'approved',
        created_at: new Date()
      });
      toast.success("Testimonial added and approved automatically.");
      setIsAdding(false);
      setNewName(''); setNewCountry(''); setNewStory(''); setNewImage('');
    } catch(e) {
      toast.error("Failed to add testimonial");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Community Proofs</h2>
          <p className="text-muted-foreground mt-1 text-sm">Moderate or manually add user testimonials and withdrawal proofs.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant="outline" className={`border-primary/50 text-primary ${isAdding && 'bg-primary/20'}`}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Testimonial
        </Button>
      </div>

      {isAdding && (
         <Card className="bg-[#111] border-primary/30 mb-8 shadow-xl shadow-primary/5">
            <CardHeader>
               <CardTitle className="text-lg text-primary uppercase font-bold tracking-wider">Manual Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Alias/Name</label>
                    <Input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="E.g. James M." className="bg-black/50 border-white/10" />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Country</label>
                    <Input value={newCountry} onChange={e=>setNewCountry(e.target.value)} placeholder="E.g. UK" className="bg-black/50 border-white/10" />
                  </div>
               </div>
               <div>
                  <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Image / Proof Screenshot</label>
                  <div className="flex gap-2 items-center">
                    <Input value={newImage} onChange={e=>setNewImage(e.target.value)} placeholder="https://... or click button to upload" className="bg-black/50 border-white/10 flex-1" />
                    <label className="cursor-pointer bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-lg border border-primary/50 transition-colors flex items-center justify-center">
                       <ImageIcon className="w-4 h-4 mr-2" />
                       <span className="text-xs font-bold uppercase">Upload</span>
                       <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  {newImage && (
                    <div className="mt-4 max-w-[200px] h-32 rounded-lg overflow-hidden border border-white/10">
                       <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
               </div>
               <div>
                  <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Story</label>
                  <Textarea value={newStory} onChange={e=>setNewStory(e.target.value)} placeholder="The testimonial content..." className="bg-black/50 border-white/10" />
               </div>
               <Button onClick={handleManualAdd} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Publish to Wall</Button>
            </CardContent>
         </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {proofs.map(p => (
            <Card key={p.id} className="bg-[#111] border-white/10 relative overflow-hidden flex flex-col justify-between">
               {p.status === 'pending' && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 blur-xl" />}
               <div>
                 <CardHeader className="pb-2">
                   <div className="flex justify-between items-start">
                      <div>
                         <CardTitle className="text-lg font-bold">{p.name}</CardTitle>
                         <p className="text-xs text-gray-500">{p.country}</p>
                      </div>
                      <Badge className={p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : p.status === 'rejected' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}>
                         {p.status.toUpperCase()}
                      </Badge>
                   </div>
                 </CardHeader>
                 <CardContent>
                   {p.imageUrl && (
                      <div className="w-full h-32 bg-white/5 rounded-md mb-4 overflow-hidden flex items-center justify-center relative">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={p.imageUrl} className="w-full h-full object-cover" alt="Proof" />
                      </div>
                   )}
                   <p className="text-sm text-gray-300 italic mb-4">"{p.story}"</p>
                 </CardContent>
               </div>
               <div className="p-4 pt-0 mt-auto">
                 <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 flex-1" onClick={() => updateStatus(p.id, 'approved')}><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 flex-1" onClick={() => updateStatus(p.id, 'rejected')}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                    <Button size="icon" variant="outline" className="border-white/10 hover:bg-white/10" onClick={() => deleteProof(p.id)}><Trash2 className="w-4 h-4 text-gray-400" /></Button>
                 </div>
               </div>
            </Card>
         ))}
         {proofs.length === 0 && <p className="text-gray-500 text-center py-10 col-span-full">No submissions found.</p>}
      </div>
    </div>
  )
}
