import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { toast } from 'sonner';

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
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface Notification {
  id: string;
  userId: string;
  type: "deposit" | "withdrawal" | "profit" | "interval" | "broadcast";
  title: string;
  message: string;
  status: "unread" | "read";
  createdAt: Timestamp;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const path = 'notifications';
    const q = query(
      collection(db, path),
      where('userId', '==', userId)
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const getMillis = (d: any) => {
        if (!d) return Date.now();
        if (typeof d.toMillis === 'function') return d.toMillis();
        if (d.seconds) return d.seconds * 1000;
        if (d._seconds) return d._seconds * 1000;
        if (typeof d === 'number') return d;
        if (typeof d === 'string') return new Date(d).getTime();
        return Date.now();
      };

      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      docs.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));

      setNotifications(docs);
      setUnreadCount(docs.filter(n => n.status === 'unread').length);
      setLoading(false);

      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as Notification;
            if (data.status === 'unread') {
              toast(data.title || "Notification", {
                description: data.message,
              });
            }
          }
        });
      }
      isInitialLoad = false;
    }, (error) => {
      console.warn("Notifications listener warning:", error?.message || error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    const path = `notifications/${notificationId}`;
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        status: 'read'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => n.status === 'unread');
      const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { status: 'read' }));
      await Promise.all(promises);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const path = `notifications/${notificationId}`;
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (e) {
      console.warn("Failed to delete notification document:", e);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification };
}

export async function sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'status'>) {
    const path = 'notifications';
    try {
        await addDoc(collection(db, path), {
            ...notification,
            status: 'unread',
            createdAt: Timestamp.now()
        });
    } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, path);
    }
}
