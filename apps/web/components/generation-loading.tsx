"use client";

import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function GenerationLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-background/50 backdrop-blur-sm rounded-xl border border-border/50">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-purple-500/20 blur-xl rounded-full animate-pulse" />
        <div className="relative flex flex-col items-center gap-6 p-8">
          {/* Animated Icon Container */}
          <div className="relative">
             <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-t-2 border-r-2 border-yellow-500/50"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-4px] rounded-full border-b-2 border-l-2 border-purple-500/50"
            />
            <div className="bg-card p-4 rounded-full shadow-lg border border-border relative z-10">
              <Sparkles className="size-8 text-yellow-500 animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-2 max-w-md">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-yellow-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
              Generating Your Vision
            </h3>
            <p className="text-sm text-muted-foreground">
              Our AI agents are crafting your creative assets defined in the brief. This usually takes about 1-2 minutes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground/80 bg-muted/50 px-3 py-1.5 rounded-full">
            <Loader2 className="size-3 animate-spin" />
            <span>Processing creative workflow...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
