import React, { useState, useEffect } from 'react';
import { Loader2, Database, Cloud, Cpu, CheckCircle } from 'lucide-react';

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Database, label: "Analyzing soil composition...", duration: 800 },
    { icon: Cloud, label: "Fetching weather patterns...", duration: 1200 },
    { icon: Cpu, label: "Running ML predictions...", duration: 1000 },
    { icon: CheckCircle, label: "Compiling insights...", duration: 500 }
  ];

  useEffect(() => {
    // Simulate step progression
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 1000);

    // Simulate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) return prev + 2;
        return prev;
      });
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in duration-300">
      <div className="max-w-md w-full mx-4">
        {/* Central spinner */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200/30 rounded-full"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-indigo-400" />
          </div>
        </div>

        {/* Main message */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Fetching real-time farm analysis
        </h2>
        <p className="text-indigo-200 text-center text-sm mb-8">
          Processing climate data and soil telemetry...
        </p>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>Processing...</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div 
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                  isActive 
                    ? 'bg-indigo-900/50 border-indigo-500/50 scale-105' 
                    : isCompleted 
                      ? 'bg-slate-800/30 border-slate-700/30' 
                      : 'bg-slate-800/10 border-slate-700/10 opacity-50'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  isActive 
                    ? 'bg-indigo-500' 
                    : isCompleted 
                      ? 'bg-green-500' 
                      : 'bg-slate-600'
                }`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className={`text-sm font-medium ${
                  isActive 
                    ? 'text-white' 
                    : isCompleted 
                      ? 'text-green-400' 
                      : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
                {isCompleted && (
                  <CheckCircle className="h-4 w-4 text-green-400 ml-auto" />
                )}
                {isActive && (
                  <div className="ml-auto">
                    <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Skeleton preview (optional) */}
        <div className="mt-8 space-y-3 opacity-30">
          <div className="h-16 bg-slate-700/30 rounded-lg animate-pulse"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-slate-700/30 rounded-lg animate-pulse"></div>
            <div className="h-24 bg-slate-700/30 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
