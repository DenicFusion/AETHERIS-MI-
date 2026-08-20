import React, { useState } from 'react';
import { Bell, CheckCheck, Inbox, MessageSquare, X, Trash2, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence, useAnimation, useMotionValue } from 'motion/react';
import { toast } from 'sonner';

const tryDecodeBase64Notif = (str: string): string | null => {
  if (!str) return null;
  const clean = str.replace(/[\r\n\s]/g, '');
  if (clean.length < 8 || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/=]+$/.test(clean)) {
    return null;
  }
  try {
    const decoded = typeof window !== 'undefined' && window.atob ? window.atob(clean) : null;
    if (decoded && /^[\x20-\x7E\s\r\n\t\u00A0-\u024F\u4e00-\u9fa5]+$/.test(decoded)) {
      const trimmed = decoded.trim();
      if (trimmed.length > 0 && !/^(Received:|ARC-Seal:|DKIM-Signature:)/i.test(trimmed)) {
        return trimmed;
      }
    }
  } catch (e) {}
  return null;
};

const cleanNotificationText = (rawMsg: string): string => {
  if (!rawMsg) return "";
  let text = String(rawMsg).trim();

  if (text === "No message content extracted." || text === "No plain text content provided in inbound message.") {
    return "[Inbound Support Notification]";
  }

  // Strip prefixes like "From: ... Subject: ... Message: "
  text = text.replace(/^(From|Subject):\s*[^\r\n]*\r?\n/gmi, '');
  text = text.replace(/^Message:\s*/i, '');

  if (/^(Received:|Return-Path:|ARC-Seal:|ARC-Message-Signature:|Authentication-Results:|DKIM-Signature:|MIME-Version:|Content-Type:|X-)/i.test(text) ||
      text.includes("Received: from") ||
      text.includes("Content-Type:") ||
      text.includes("by cloudflare-email") ||
      text.includes("ARC-Message-Signature:")) {
    
    // Boundary split if present
    const boundaryMatch = text.match(/boundary=["']?([^"';\r\n]+)["']?/i);
    if (boundaryMatch && boundaryMatch[1]) {
      const boundary = boundaryMatch[1].trim().replace(/^--/, '');
      const parts = text.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      let selectedPart = parts.find(p => /Content-Type:\s*text\/plain/i.test(p));
      if (!selectedPart) selectedPart = parts.find(p => /Content-Type:\s*text\/html/i.test(p));
      if (!selectedPart && parts.length > 1) {
        selectedPart = parts.find(p => !/^(Received:|Return-Path:|ARC-|DKIM-)/i.test(p.trim())) || parts[parts.length - 1];
      }
      if (selectedPart) text = selectedPart;
    }

    // Strip top header block
    let loopGuard = 0;
    while (loopGuard < 10) {
      loopGuard++;
      const doubleNewlineIndex = text.search(/\r?\n\r?\n/);
      if (doubleNewlineIndex !== -1) {
        const headerBlock = text.substring(0, doubleNewlineIndex);
        if (/(Received:|Content-Type:|ARC-|DKIM-|From:|To:|Subject:|MIME-Version:|Return-Path:|Authentication-Results:|Received-SPF:|X-|dkim=|dmarc=|spf=)/i.test(headerBlock)) {
          text = text.substring(doubleNewlineIndex).trim();
          continue;
        }
      }
      break;
    }
  }

  text = text.replace(/^(Content-Type|Content-Transfer-Encoding|Content-Disposition|MIME-Version|Content-ID|Content-Description):[^\r\n]*\r?\n/gmi, '');
  text = text.replace(/^--[a-zA-Z0-9_=\-\.]+(?:--)?$/gm, '');

  // Quoted Printable
  if (text.includes("=3D") || text.includes("=\r\n") || text.includes("=\n") || /=([0-9A-F]{2})/i.test(text)) {
    text = text.replace(/=\r?\n/g, '')
               .replace(/=3D/gi, '=')
               .replace(/=20/gi, ' ')
               .replace(/=0A/gi, '\n')
               .replace(/=0D/gi, '\r')
               .replace(/=C2=A0/gi, ' ')
               .replace(/=E2=80=99/gi, "'")
               .replace(/=E2=80=9C/gi, '"')
               .replace(/=E2=80=9D/gi, '"')
               .replace(/=([0-9A-F]{2})/gi, (_, hex) => {
                 try { return String.fromCharCode(parseInt(hex, 16)); } catch(e) { return _; }
               });
  }

  // Base64 block decoding if present
  const decodedEntire = tryDecodeBase64Notif(text);
  if (decodedEntire) {
    text = decodedEntire;
  }

  // Strip HTML
  if (/<[a-z][\s\S]*>/i.test(text) && !text.includes("<http")) {
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
               .replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/<br\s*\/?>/gi, '\n')
               .replace(/<\/p>/gi, '\n\n')
               .replace(/<\/div>/gi, '\n')
               .replace(/<[^>]*>/g, ' ');
  }

  // Line filter
  const lines = text.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (const l of lines) {
    const t = l.trim();
    if (!t) {
      cleanLines.push("");
      continue;
    }

    // Drop any line containing header keywords or signature attributes anywhere in line
    if (/ARC-Message-Signature|DKIM-Signature|Authentication-Results|Received-SPF|Content-Type:|MIME-Version|by cloudflare-email|mx\.cloudflare\.net/i.test(t)) {
      continue;
    }

    // Header lines
    if (/^(Received|Return-Path|ARC-Seal|ARC-Message-Signature|ARC-Authentication-Results|Authentication-Results|Received-SPF|X-CF-|DKIM-Signature|MIME-Version|Content-Type|Content-Transfer-Encoding|Content-Disposition|Content-ID|X-[A-Za-z0-9-]+|From|To|Subject|Reply-To|Date|Message-ID|Status|Resent-[A-Za-z0-9-]+|Feedback-ID|List-[A-Za-z0-9-]+|DKIM|SPF|DMARC|ARC|Authentication|Header)[:=\s]/i.test(t)) {
      continue;
    }

    // Authentication results lines
    if (/^(dkim|dmarc|spf|arc|smtp\.helo|smtp\.mailfrom|header\.|policy\.|smtp\.remote-ip)=/i.test(t)) continue;
    if (/^(dkim|dmarc|spf|arc)[:=\s](pass|none|fail|neutral|softfail|permerror|temperror)/i.test(t)) continue;
    if (/^spf=(pass|none|fail|neutral|softfail)/i.test(t)) continue;

    // Server transport info
    if (/^(by|for|id|with|smtp|client-ip|envelope-from|helo|receiver|tls|cipher)[:=\s]/i.test(t)) continue;
    if (/^for\s+<[^>]*>;/i.test(t)) continue;
    if (/^by\s+cloudflare-email/i.test(t)) continue;
    if (/^for\s+;/i.test(t)) continue;

    // Signature parameters
    if (/^(b|bh|h|d|s|a)=/i.test(t)) continue;
    if (/^b=[a-zA-Z0-9+/=]+/i.test(t)) continue;
    if (/^bh=[a-zA-Z0-9+/=]+/i.test(t)) continue;
    if (/^h=[a-zA-Z0-9:\-]+/i.test(t)) continue;
    if (/^d=[a-zA-Z0-9\.\-]+/i.test(t)) continue;
    if (/^s=[a-zA-Z0-9\.\-]+/i.test(t)) continue;
    if (/^a=rsa-/i.test(t)) continue;

    // Signature parameters mid-line or at line start
    if (/;\s*(b|bh|h|d|s|a)=/i.test(t)) continue;
    if (/a=rsa-sha256|c=relaxed\/relaxed|d=google\.com|s=arc-/i.test(t)) continue;

    // Header continuation markers
    if (/^:[a-z0-9\-:]+/i.test(t)) continue;

    // Base64 hash lines or multi-part signature continuations
    if (/^[A-Za-z0-9+/=]{8,};?\s*(b=.*)?$/i.test(t) && !t.includes(' ')) {
      const decodedLine = tryDecodeBase64Notif(t);
      if (decodedLine) {
        cleanLines.push(decodedLine);
      }
      continue;
    }

    // Header metadata parameters
    if (/\b(header\.d|header\.s|header\.b|header\.from|policy\.dmarc|smtp\.helo|smtp\.mailfrom|mx\.cloudflare\.net|postmaster@)\b/i.test(t)) continue;

    cleanLines.push(l);
  }

  const cleanResult = cleanLines.join('\n').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();

  return cleanResult || "[Inbound Support Notification]";
};

interface SwipeableNotificationItemProps {
  notification: any;
  onDelete: (id: string) => void;
  onClick: (id: string, e: React.MouseEvent) => void;
  isExpanded: boolean;
  onCloseExpand: () => void;
}

function SwipeableNotificationItem({ 
  notification, 
  onDelete, 
  onClick, 
  isExpanded, 
  onCloseExpand 
}: SwipeableNotificationItemProps) {
  const controls = useAnimation();
  const x = useMotionValue(0);

  // Auto reset swipe when notification identity changes
  React.useEffect(() => {
    controls.start({ x: 0 });
  }, [notification.id, controls]);

  const handleDragEnd = (_event: any, info: any) => {
    // If pulled left past threshold, lock open. Otherwise, bounce home.
    if (info.offset.x < -30) {
      controls.start({ x: -100, transition: { type: 'spring', stiffness: 400, damping: 28 } });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } });
    }
  };

  const day = notification.createdAt?.toDate ? notification.createdAt.toDate().getDate() : new Date().getDate();
  const month = notification.createdAt?.toDate ? notification.createdAt.toDate().toLocaleString('en-US', { month: 'short' }) : 'Dec';
  
  const getOrdinalSuffix = (d: number) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };

  const timeStr = notification.createdAt?.toDate 
    ? notification.createdAt.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
    : '7:17 PM';
  
  const formattedTime = `${timeStr} | ${day}${getOrdinalSuffix(day)} ${month}`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#EF4444] shadow-md border border-transparent select-none">
      {/* Underlying Red Delete Action */}
      <div className="absolute inset-y-0 right-0 w-[100px] flex items-center justify-center z-0 bg-[#EF4444] mr-0.5 rounded-r-2xl">
        <button 
          onClick={async (e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(notification.id);
          }}
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-white bg-[#EF4444] hover:bg-red-650 transition-colors cursor-pointer rounded-r-2xl"
        >
          <Trash2 className="w-5 h-5 text-white" strokeWidth={2.5} />
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Delete</span>
        </button>
      </div>

      {/* Foreground Draggable Notification Panel Card */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        dragMomentum={false}
        style={{ x }}
        animate={controls}
        onDragEnd={handleDragEnd}
        className={`relative z-10 flex flex-col items-start p-4 cursor-pointer transition-colors bg-[#111625] rounded-2xl border ${
          notification.status === 'unread' 
            ? 'border-primary/40 shadow-[0_0_15px_rgba(46,91,255,0.06)] bg-gradient-to-r from-[#182138] to-[#111625]' 
            : 'border-slate-800/80 hover:bg-[#141d30]'
        }`}
        onClick={(e) => onClick(notification.id, e)}
      >
        <div className="flex w-full items-center justify-between pointer-events-none select-none">
          {/* Accent tag based on notification types */}
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
            notification.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' :
            notification.type === 'withdrawal' ? 'bg-amber-500/10 text-amber-400' :
            notification.type === 'profit' ? 'bg-purple-500/10 text-purple-400' :
            'bg-slate-500/10 text-slate-400'
          }`}>
            {notification.type}
          </span>
          
          {/* Optimized Timestamp format aligned right like banking screenshots */}
          <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap ml-2">
            {formattedTime}
          </span>
        </div>
        
        <div className="flex items-start justify-between w-full mt-2.5">
          <h4 className="text-sm font-black text-white tracking-tight leading-tight pr-4">
            {notification.title}
          </h4>
          {isExpanded && (
            <Button
              variant="ghost" 
              size="icon" 
              className="w-5 h-5 shrink-0 rounded-full text-slate-500 hover:bg-slate-850 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onCloseExpand();
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="w-full mt-1.5 text-left">
          <AnimatePresence initial={false}>
            {isExpanded ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-slate-300 leading-relaxed bg-[#0b0f19] p-3 rounded-xl border border-slate-900 w-full break-all"
              >
                {cleanNotificationText(notification.message)}
              </motion.div>
            ) : (
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed w-full break-all pointer-events-none">
                {cleanNotificationText(notification.message)}
              </p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user?.uid);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleNotificationClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      markAsRead(id);
      setExpandedId(id);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (deleteNotification) {
        await deleteNotification(id);
        toast.success("Notification deleted");
        if (expandedId === id) setExpandedId(null);
      }
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding transition-all outline-hidden select-none hover:bg-white/5 active:translate-y-px disabled:pointer-events-none disabled:opacity-50">
        <Bell className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-background animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[360px] sm:w-[420px] p-0 border-white/5 bg-[#0a0f1d]/95 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.5)]"
      >
        {/* Customized Header based on Screenshot layout */}
        <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-[#0e1424]">
          {/* Pill style "Clear All" on the Left */}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 rounded-full border border-slate-800 bg-[#121826] text-slate-300 text-[11px] font-bold hover:bg-slate-800 hover:text-white transition-all px-3.5"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (notifications.length === 0) {
                toast.info("No notifications to clear");
                return;
              }
              try {
                const promises = notifications.map(n => deleteNotification ? deleteNotification(n.id).catch(err => console.warn(err)) : Promise.resolve());
                await Promise.all(promises);
                toast.success("Cleared all notifications");
                setExpandedId(null);
              } catch (err) {
                toast.error("Failed to clear notifications");
              }
            }}
          >
            Clear All
          </Button>
          
          {/* Centered Heading */}
          <span className="font-extrabold text-[#f1f5f9] tracking-wide text-xs sm:text-sm">Notifications</span>
          
          {/* Pill style "Close" with red X mark on the Right */}
          <Button 
            variant="ghost" 
            className="h-8 rounded-full border border-slate-800/80 bg-[#121826] hover:bg-red-500/10 text-slate-300 text-[11px] font-bold flex items-center gap-1.5 px-3.5 transition-all cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <X className="w-3.5 h-3.5 text-rose-500 font-extrabold" /> Close
          </Button>
        </div>

        {/* Dynamic Interactive "Mark All as Read" Banner */}
        {unreadCount > 0 && (
          <div className="bg-primary/5 px-4 py-2 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400 select-none">
            <span>{unreadCount} unread message{unreadCount > 1 ? 's' : ''}</span>
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                await markAllAsRead();
                toast.success("All notifications marked as read");
              }}
              className="text-primary hover:text-blue-400 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark All as Read
            </button>
          </div>
        )}

        <ScrollArea className="h-[430px]">
          {notifications.length > 0 ? (
            <div className="flex flex-col gap-3 py-4 px-4 overflow-x-hidden">
              <AnimatePresence initial={false}>
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SwipeableNotificationItem
                      notification={notification}
                      onDelete={handleDelete}
                      onClick={handleNotificationClick}
                      isExpanded={expandedId === notification.id}
                      onCloseExpand={() => setExpandedId(null)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center h-full">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-5 border border-slate-900">
                <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-bold text-white mb-1">All Clear!</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                You don't have any notifications at the moment.
              </p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
