import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { MessageSquare, UserPlus, Bell } from 'lucide-react';

interface ToastProps {
  title: string;
  body: string;
  type: 'friend_request' | 'new_message' | 'system';
  onAction?: () => void;
}

export const showFuturisticToast = (props: ToastProps) => {
  toast.custom((t) => (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      onClick={() => {
        if (props.onAction) props.onAction();
        toast.dismiss(t);
      }}
      className="relative flex w-[350px] items-center gap-4 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/20 cursor-pointer group hover:bg-black/70 transition-colors"
    >
      {/* Icon with glow */}
      <div className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-500 ${
        props.type === 'new_message' ? 'from-primary/40 to-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' : 'from-blue-500/40 to-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
      }`}>
        {props.type === 'new_message' ? (
          <MessageSquare className="h-5 w-5 text-primary" />
        ) : (
          <UserPlus className="h-5 w-5 text-blue-400" />
        )}
      </div>

      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
        <h4 className="text-sm font-bold tracking-tight text-white/90">
          {props.title}
        </h4>
        <p className="text-[11px] leading-relaxed text-white/60 line-clamp-2">
          {props.body}
        </p>
      </div>

      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white transition-all">
        <Bell className="h-4 w-4" />
      </div>


      {/* Futuristic Progress Bar Border */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden rounded-b-2xl">
        <motion.div
           initial={{ width: '100%' }}
           animate={{ width: '0%' }}
           transition={{ duration: 4, ease: 'linear' }}
           className="h-full bg-primary"
        />
      </div>
    </motion.div>
  ), {
    duration: 4000,
  });
};
