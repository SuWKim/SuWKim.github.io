/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, signIn, logOut } from './lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, LogIn, LogOut, Send, Image as ImageIcon, Trash2, Camera } from 'lucide-react';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error("Database error. Please check your permissions.");
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: Timestamp;
  userId: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    const q = query(collection(db, 'portfolio'), orderBy('createdAt', 'desc'));
    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PortfolioItem[];
      setItems(newItems);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'portfolio');
    });

    return () => {
      unsubscribeAuth();
      unsubscribeItems();
    };
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'portfolio'), {
        title: newTitle,
        description: newDesc,
        imageUrl: newUrl,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewTitle('');
      setNewDesc('');
      setNewUrl('');
      setIsAdding(false);
      toast.success("Portfolio item added!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'portfolio');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        name: contactName,
        email: contactEmail,
        message: contactMsg,
        createdAt: serverTimestamp(),
      });
      setContactName('');
      setContactEmail('');
      setContactMsg('');
      toast.success("Message sent! I'll get back to you soon.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-800 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      <Toaster position="top-center" />
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">PORTFOLIO</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={logOut} className="gap-2">
                  <LogOut className="w-4 h-4" /> Log Out
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={signIn} className="gap-2">
                <LogIn className="w-4 h-4" /> Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="py-24 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl sm:text-7xl font-bold tracking-tighter mb-6">
            Capturing <span className="text-accent-green">moments</span>,<br />
            telling <span className="text-accent-rust">stories</span>.
          </h2>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto mb-10">
            A curated collection of visual experiences and creative projects. 
            Explore the gallery below and feel free to reach out.
          </p>
          {user && (
            <Button 
              size="lg" 
              onClick={() => setIsAdding(!isAdding)} 
              className="gap-2 rounded-full px-8 bg-accent-green hover:bg-accent-green/90 text-white border-none"
            >
              <Plus className="w-5 h-5" /> {isAdding ? 'Close Editor' : 'Add New Work'}
            </Button>
          )}
        </motion.div>
      </header>

      {/* Add Item Form */}
      <AnimatePresence>
        {isAdding && user && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-zinc-100 border-y border-zinc-200"
          >
            <div className="max-w-3xl mx-auto py-12 px-6">
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle>Add Portfolio Item</CardTitle>
                  <CardDescription>Share your latest masterpiece with the world.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form id="add-item-form" onSubmit={handleAddItem} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input 
                        id="title" 
                        placeholder="Project Name" 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image">Image URL</Label>
                      <Input 
                        id="image" 
                        placeholder="https://images.unsplash.com/..." 
                        value={newUrl} 
                        onChange={e => setNewUrl(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desc">Description</Label>
                      <Textarea 
                        id="desc" 
                        placeholder="Tell the story behind this photo..." 
                        value={newDesc} 
                        onChange={e => setNewDesc(e.target.value)} 
                        className="min-h-[100px]"
                      />
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                  <Button type="submit" form="add-item-form">Publish Work</Button>
                </CardFooter>
              </Card>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Portfolio Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.length > 0 ? (
            items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="group overflow-hidden border-none bg-white shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl">
                  <div className="aspect-[4/5] overflow-hidden relative">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-accent-green/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                       <Camera className="text-white w-10 h-10 drop-shadow-lg" />
                    </div>
                  </div>
                  <CardHeader className="p-6">
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-zinc-500 mt-2">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-zinc-400 border-2 border-dashed border-zinc-200 rounded-3xl">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No works to display yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-zinc-900 text-white py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Get in Touch</h2>
            <p className="text-zinc-400">Have a project in mind? Let's create something beautiful together.</p>
          </div>
          
          <form onSubmit={handleContactSubmit} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contact-name" className="text-zinc-300">Name</Label>
                <Input 
                  id="contact-name" 
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 focus:border-zinc-500 text-white h-12" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-zinc-300">Email</Label>
                <Input 
                  id="contact-email" 
                  type="email" 
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 focus:border-zinc-500 text-white h-12" 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-msg" className="text-zinc-300">Message</Label>
              <Textarea 
                id="contact-msg" 
                value={contactMsg}
                onChange={e => setContactMsg(e.target.value)}
                className="bg-zinc-800 border-zinc-700 focus:border-zinc-500 text-white min-h-[150px]" 
                required 
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSending}
              className="w-full h-14 bg-accent-rust hover:bg-accent-rust/90 text-white text-lg font-semibold rounded-full gap-2 border-none"
            >
              {isSending ? 'Sending...' : <><Send className="w-5 h-5" /> Send Message</>}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zinc-200 text-center text-zinc-500 text-sm">
        <p>© {new Date().getFullYear()} Portfolio Builder. All rights reserved.</p>
      </footer>
    </div>
  );
}
