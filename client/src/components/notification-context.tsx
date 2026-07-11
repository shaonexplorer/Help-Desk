import * as React from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  ticketId?: string;
  ticketSubject?: string;
  senderEmail?: string;
  timestamp: number;
}

interface NotificationContextValue {
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  notifications: Notification[];
  unreadTicketIds: Set<string>;
  markTicketAsRead: (ticketId: string) => void;
  clearUnreadTickets: () => void;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadTicketIds, setUnreadTicketIds] = React.useState<Set<string>>(() => new Set());

  const addNotification = React.useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = Date.now();
      setNotifications((prev) => [...prev, { ...notification, id, timestamp }]);

      // Track unread ticket if notification is for a ticket
      if (notification.ticketId) {
        setUnreadTicketIds((prev) => {
          const next = new Set(prev);
          next.add(notification.ticketId as string);
          return next;
        });
      }
    },
    [],
  );

  const removeNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);

  const markTicketAsRead = React.useCallback((ticketId: string) => {
    setUnreadTicketIds((prev) => {
      const next = new Set(prev);
      next.delete(ticketId);
      return next;
    });
  }, []);

  const clearUnreadTickets = React.useCallback(() => {
    setUnreadTicketIds(new Set());
  }, []);

  // Auto-dismiss notifications after 10 seconds (but keep unreadTicketIds)
  React.useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => Date.now() - n.timestamp < 10000));
    }, 10000);
    return () => clearTimeout(timer);
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        addNotification,
        removeNotification,
        clearAll,
        notifications,
        unreadTicketIds,
        markTicketAsRead,
        clearUnreadTickets,
      }}
    >
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

// ─── Container ─────────────────────────────────────────────────────────────────

function NotificationContainer() {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) throw new Error('NotificationContainer must be used within NotificationProvider');

  const { notifications, removeNotification } = ctx;

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      style={{ width: '380px', maxWidth: '90vw' }}
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

// ─── Single Item ─────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<
  NotificationType,
  { bg: string; border: string; text: string; icon: React.ElementType }
> = {
  info: {
    bg: 'bg-[#F7F6F1]',
    border: 'border-[#E4E1D7]',
    text: 'text-[#16150F]',
    icon: Mail,
  },
  success: {
    bg: 'bg-[#EEF7F1]',
    border: 'border-[#2F7D4F]/30',
    text: 'text-[#2F7D4F]',
    icon: AlertCircle,
  },
  warning: {
    bg: 'bg-[#FEF7EC]',
    border: 'border-[#D4943A]/30',
    text: 'text-[#8B5E1A]',
    icon: AlertCircle,
  },
  error: {
    bg: 'bg-[#FDF0EE]',
    border: 'border-[#B94A3A]/30',
    text: 'text-[#9B3627]',
    icon: AlertCircle,
  },
};

function NotificationItem({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose?: () => void;
}) {
  const styles = TYPE_STYLES[notification.type];
  const Icon = styles.icon;

  return (
    <div
      className="backdrop-blur-lg z-50 group relative flex items-start gap-3 rounded-lg border p-3 shadow-lg transition-all duration-200"
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.border,
      }}
    >
      <div className="flex shrink-0 items-center gap-2">
        <Icon className="size-4 opacity-70" />
        {notification.ticketId && (
          <span className="font-mono text-xs text-[#6B6860]">
            #{notification.ticketId.replace(/\D/g, '').slice(-4).padStart(4, '0')}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${styles.text}`}>{notification.title}</p>
        {notification.description && (
          <p className="mt-0.5 text-xs" style={{ color: '#6B6860' }}>
            {notification.description}
          </p>
        )}
        {notification.senderEmail && (
          <p className="mt-0.5 text-xs text-[#6B6860]">From: {notification.senderEmail}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 grid size-6 place-items-center rounded-md opacity-0 transition-opacity group-hover:opacity-50 hover:bg-black/5"
        aria-label="Close notification"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
