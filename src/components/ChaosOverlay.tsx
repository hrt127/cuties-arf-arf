import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Sword, ShieldAlert, Heart, Target } from 'lucide-react';

interface Cutie {
  id: number;
  x: number;
  y: number;
  type: 'stabber' | 'breacher' | 'archer' | 'collie' | 'obsessed' | 'possessed';
  color: string;
  targetX: number;
  targetY: number;
  rotation?: number;
  mission?: string;
  riddle?: string;
}

const COLORS = [
  'text-pink-400', 
  'text-purple-400', 
  'text-cyan-400', 
  'text-orange-400', 
  'text-emerald-400',
  'text-rose-400',
  'text-indigo-400',
  'text-yellow-400',
  'text-red-500'
];

const RIDDLES = [
  "1, 1, 2, 3, 5, 8...",
  "The more you take, the more you leave behind.",
  "What has keys but no locks?",
  "I speak without a mouth.",
  "0, 1, 1, 2, 3, 5, 8, 13..."
];

interface ChaosOverlayProps {
  level: 'tiger' | 'titz';
}

export const ChaosOverlay: React.FC<ChaosOverlayProps> = ({ level }) => {
  const [cuties, setCuties] = useState<Cutie[]>([]);

  useEffect(() => {
    const spawnRate = level === 'tiger' ? 800 : 300;
    const maxCuties = level === 'tiger' ? 20 : 50;

    const interval = setInterval(() => {
      if (cuties.length < maxCuties) {
        const id = Date.now();
        const rand = Math.random();
        let type: Cutie['type'] = 'stabber';
        
        if (rand > 0.95) type = 'possessed';
        else if (rand > 0.85) type = 'obsessed';
        else if (rand > 0.75) type = 'collie';
        else if (rand > 0.55) type = 'archer';
        else if (rand > 0.30) type = 'breacher';
        
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        // Start from edges
        const side = Math.floor(Math.random() * 4);
        let x = 0, y = 0;
        if (side === 0) { x = Math.random() * window.innerWidth; y = -50; }
        else if (side === 1) { x = window.innerWidth + 50; y = Math.random() * window.innerHeight; }
        else if (side === 2) { x = Math.random() * window.innerWidth; y = window.innerHeight + 50; }
        else { x = -50; y = Math.random() * window.innerHeight; }

        // Target logic
        const centerX = window.innerWidth / 2;
        let targetX = Math.random() * window.innerWidth;
        let targetY = Math.random() * window.innerHeight;
        let mission = "";
        let riddle = Math.random() > 0.7 ? RIDDLES[Math.floor(Math.random() * RIDDLES.length)] : undefined;

        if (type === 'breacher') {
          targetX = centerX - 200 + Math.random() * 400;
          targetY = 100 + Math.random() * 100;
        } else if (type === 'collie') {
          targetX = centerX - 250 + Math.random() * 500;
          targetY = 80 + Math.random() * 150;
        } else if (type === 'obsessed') {
          mission = "OSTENSIBLY";
          // Obsessed cuties hover near the center-ish where text might be
          targetX = centerX - 100 + Math.random() * 200;
          targetY = window.innerHeight / 2 + (Math.random() * 200 - 100);
        } else if (type === 'possessed') {
          targetX = Math.random() * window.innerWidth;
          targetY = Math.random() * window.innerHeight;
        }

        setCuties(prev => [...prev, { id, x, y, type, color, targetX, targetY, mission, riddle }]);
      }
    }, spawnRate);

    return () => clearInterval(interval);
  }, [cuties, level]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {cuties.map(cutie => (
          <motion.div
            key={cutie.id}
            initial={{ x: cutie.x, y: cutie.y, opacity: 0, scale: 0 }}
            animate={{ 
              x: cutie.targetX, 
              y: cutie.targetY, 
              opacity: 1, 
              scale: 1,
              rotate: cutie.type === 'stabber' ? [0, -20, 20, -20, 0] : [0, 10, -10, 10, 0]
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ 
              duration: cutie.type === 'breacher' ? 4 : cutie.type === 'collie' ? 2 : 1.5,
              ease: cutie.type === 'collie' ? "anticipate" : "backOut",
              rotate: { repeat: Infinity, duration: 0.5 }
            }}
            onAnimationComplete={() => {
              setTimeout(() => {
                setCuties(prev => prev.filter(c => c.id !== cutie.id));
              }, 3000);
            }}
            className="absolute"
          >
            <div className="relative group">
              {cutie.type === 'stabber' ? (
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ y: [0, -8, 0], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 0.4 }}
                  >
                    <Ghost className={`w-6 h-6 ${cutie.color} fill-current opacity-60`} />
                  </motion.div>
                  <motion.div
                    animate={{ x: [0, 15, 0], rotate: [0, 90, 0] }}
                    transition={{ repeat: Infinity, duration: 0.2 }}
                    className="absolute -right-3 top-2"
                  >
                    <Sword className="w-5 h-5 text-white/60" />
                  </motion.div>
                </div>
              ) : cutie.type === 'archer' ? (
                <div className="flex flex-col items-center">
                  <Ghost className={`w-6 h-6 ${cutie.color} fill-current opacity-60`} />
                  <motion.div
                    animate={{ x: [0, -8, 0], scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="absolute -left-4 top-1"
                  >
                    <Target className="w-5 h-5 text-white/80 rotate-45" />
                  </motion.div>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, opacity: 0 }}
                      animate={{ x: 150, y: -80, opacity: [0, 1, 0] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.2, 
                        delay: i * 0.4,
                        ease: "easeOut" 
                      }}
                      className="absolute"
                    >
                      <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                    </motion.div>
                  ))}
                </div>
              ) : cutie.type === 'collie' ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <Ghost className="w-10 h-10 text-white fill-white opacity-80" />
                    <div className="absolute top-1 left-1 w-2 h-2 bg-black rounded-full" />
                    <div className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.3 }}
                    className="text-[10px] font-black text-white bg-black/80 px-1 rounded mt-1 uppercase italic"
                  >
                    Arf Arf!
                  </motion.div>
                </div>
              ) : cutie.type === 'obsessed' ? (
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Ghost className={`w-12 h-12 ${cutie.color} fill-current opacity-80`} />
                  </motion.div>
                  <div className="text-[10px] font-bold text-white bg-pink-500 px-2 rounded-full mt-2 animate-pulse">
                    {cutie.mission}
                  </div>
                </div>
              ) : cutie.type === 'possessed' ? (
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 2, 0.5, 1.5, 1],
                      rotate: [0, 90, 180, 270, 360],
                      filter: ["hue-rotate(0deg)", "hue-rotate(360deg)"]
                    }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Ghost className={`w-14 h-14 ${cutie.color} fill-current opacity-90`} />
                  </motion.div>
                  <div className="text-[8px] font-black text-white uppercase mt-1">Possessed</div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.4, 1],
                      filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
                    }}
                    transition={{ repeat: Infinity, duration: 0.6 }}
                  >
                    <ShieldAlert className={`w-10 h-10 ${cutie.color} opacity-70`} />
                  </motion.div>
                  <div className={`text-[9px] font-black ${cutie.color} bg-black/40 px-1 rounded uppercase tracking-tighter mt-1`}>
                    BREACHING!!!
                  </div>
                </div>
              )}

              {cutie.riddle && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-[8px] px-2 py-1 rounded border border-white/10">
                  {cutie.riddle}
                </div>
              )}
              
              <motion.div
                animate={{ 
                  opacity: [0, 0.8, 0], 
                  scale: [0.5, 2, 0.5],
                  rotate: [0, 180, 360]
                }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="absolute -inset-4 bg-white/10 rounded-full blur-2xl"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
