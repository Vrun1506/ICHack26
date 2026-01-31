"use client";

import React, { useState } from 'react';
import { MapPin, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for cleaner tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LandingPage() {
  const [postcode, setPostcode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Validation
    if (postcode.length < 5) {
      setStatus('error');
      setErrorMessage('Please enter a valid postcode.');
      return;
    }

    // Simulate API Call
    setStatus('loading');
    setErrorMessage('');

    setTimeout(() => {
      // Mock success for demo purposes
      console.log(`Searching for: ${postcode}`);
      setStatus('success');
      // Redirect logic would go here: router.push('/results')
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 selection:bg-indigo-100">
      
      {/* Navigation (Simple) */}
      <nav className="w-full py-6 px-4 sm:px-8 flex justify-between items-center max-w-7xl mx-auto">
        <div className="font-bold text-xl tracking-tight text-indigo-600">AuraFarming.</div>
        <div className="hidden sm:flex gap-6 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-indigo-600 transition-colors">How it works</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Pricing</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Login</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center px-4 relative overflow-hidden">
        
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10" />

        <div className="max-w-2xl w-full text-center space-y-8">
          
          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
              Check statistics<br className="hidden sm:block" />
              <span className="text-indigo-600">Act accordingly.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-lg mx-auto">
              Enter your postcode below to see the predictions of your farmland.
            </p>
          </div>

          {/* Postcode Input Box */}
          <div className="max-w-md mx-auto relative group">
            <div className={cn(
              "absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200",
              status === 'error' && "from-red-500 to-orange-500 opacity-50"
            )}></div>
            
            <form onSubmit={handleSubmit} className="relative flex items-center bg-white rounded-xl shadow-xl ring-1 ring-slate-900/5 p-2">
              <div className="pl-4 text-slate-400">
                <MapPin className="h-6 w-6" />
              </div>
              
              <input
                type="text"
                value={postcode}
                onChange={(e) => {
                  setPostcode(e.target.value.toUpperCase());
                  if (status === 'error') setStatus('idle');
                }}
                placeholder="Ex. SW1A 1AA"
                className="flex-auto block w-full border-0 bg-transparent py-4 pl-4 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-lg font-medium outline-none"
                disabled={status === 'loading' || status === 'success'}
              />

              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className={cn(
                  "flex-none rounded-lg py-3 px-6 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all duration-200 flex items-center gap-2",
                  status === 'success' ? "bg-green-600 hover:bg-green-500" : "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600",
                  status === 'loading' && "opacity-80 cursor-not-allowed"
                )}
              >
                {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {status === 'idle' || status === 'error' ? 'Check Now' : status === 'success' ? 'Found!' : 'Checking...'}
                {status === 'idle' && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>

          {/* Feedback Message */}
          <div className="h-6">
            {status === 'error' && (
              <p className="text-red-500 text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top-2 fade-in">
                <AlertCircle className="h-4 w-4" /> {errorMessage}
              </p>
            )}
            {status === 'success' && (
              <p className="text-green-600 text-sm font-medium animate-in slide-in-from-top-2 fade-in">
                Great news! We are available in {postcode}.
              </p>
            )}
          </div>
          
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
            Trusted all over the UK.
          </p>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm">
        2026 ICHACK SUBMISSION.
      </footer>
    </div>
  );
}