import React, { useEffect, useState } from 'react';
import { Bell, Check, MessageSquare, UserPlus, X, Trash2, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, type Notification } from '@/lib/notificationStore';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const NotificationBell = () => {
  const { unreadCount, loadNotifications } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="group relative rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Notifications"
        >
          <Bell className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'scale-110 text-primary' : 'group-hover:scale-110'}`} />
          
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-80 border-border bg-card/90 backdrop-blur-2xl p-0 shadow-2xl overflow-hidden ring-1 ring-white/10"
      >
        <NotificationDropdown />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const NotificationDropdown = () => {
  const { 
    notifications, 
    markAllAsRead, 
    markAsRead, 
    unreadCount, 
    deleteNotification,
    selectedIds,
    toggleSelect,
    selectAll,
    deselectAll,
    deleteSelected
  } = useNotificationStore();
  
  const navigate = useNavigate();
  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;

  const handleAction = (notif: Notification, e: React.MouseEvent) => {
    // If clicking the checkbox or trash icon, we don't want to navigate
    if ((e.target as HTMLElement).closest('.stop-nav')) return;

    markAsRead(notif.id);
    if (notif.type === 'new_message' && notif.actionId) {
      navigate(`/friends?chat=${notif.actionId}`);
    } else if (notif.type === 'friend_request') {
      navigate('/friends?tab=requests');
    }
  };

  const handleToggleAll = () => {
    if (allSelected) deselectAll();
    else selectAll();
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex flex-col border-b border-white/5 bg-white/5 p-3 gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold gradient-text">Notifications</h3>
          <div className="flex items-center gap-2">
             {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between bg-white/5 rounded-lg px-2 py-1.5 mt-1 border border-white/5 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all" 
                checked={allSelected} 
                onCheckedChange={handleToggleAll} 
                className="h-3.5 w-3.5 border-muted-foreground"
              />
              <label htmlFor="select-all" className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select All'}
              </label>
            </div>
            
            {selectedIds.length > 0 && (
              <button
                onClick={() => deleteSelected()}
                className="text-[10px] flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors font-medium"
              >
                <Trash2 className="h-3 w-3" />
                Delete Selected
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-8 text-center">
                <div className="relative mb-4">
                  <Bell className="h-10 w-10 opacity-10" />
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Check className="h-4 w-4 text-primary opacity-50" />
                  </motion.div>
                </div>
                <p className="text-xs font-medium">All caught up!</p>
                <p className="text-[10px] opacity-60 mt-1">No new notifications locally stored.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative flex gap-3 p-4 border-b border-white/5 cursor-pointer transition-all duration-200 hover:bg-white/10 ${!notif.isRead ? 'bg-primary/5' : ''}`}
                  onClick={(e) => handleAction(notif, e)}
                >
                  {/* Checkbox (Stop Nav) */}
                  <div className="flex items-start pt-1 stop-nav">
                    <Checkbox 
                      checked={selectedIds.includes(notif.id)} 
                      onCheckedChange={() => toggleSelect(notif.id)} 
                      className="h-3.5 w-3.5 border-muted-foreground"
                    />
                  </div>

                  <div className={`mt-0.5 rounded-full p-2 h-fit ${!notif.isRead ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]' : 'bg-secondary text-muted-foreground'}`}>
                    {notif.type === 'new_message' ? <MessageSquare className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  </div>
                  
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                       <span className={`text-xs font-semibold truncate ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                         {notif.title}
                       </span>
                       <span className="text-[9px] text-muted-foreground whitespace-nowrap opacity-60">
                         {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                       </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed opacity-80">
                      {notif.body}
                    </p>
                  </div>

                  {/* Individual Delete Button (Stop Nav) */}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="stop-nav p-1.5 h-fit rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Delete locally"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {!notif.isRead && (
                    <div className="absolute right-0 top-0 h-full w-1.5 bg-primary/40" />
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-2 border-t border-white/5 bg-white/5">
        <Button 
          variant="ghost" 
          className="w-full text-[10px] h-8 text-muted-foreground hover:text-foreground font-medium uppercase tracking-widest gap-2"
          onClick={() => navigate('/notifications')}
        >
          History Log <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
