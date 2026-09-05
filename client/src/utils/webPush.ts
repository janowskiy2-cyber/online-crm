// Native Web Push & Service Worker Notification Helper for Online CRM Pro

export const isWebPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export const getWebPushPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
};

export const requestWebPushPermission = async (): Promise<boolean> => {
  if (!isWebPushSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification('Online CRM Pro', {
        body: 'Нативні Push-сповіщення увімкнено! Ви отримуватимете сигнали навіть при згорнутому браузері.',
        icon: 'https://img.icons8.com/color/192/crm.png',
        badge: 'https://img.icons8.com/color/48/crm.png'
      });
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Web push request failed:', e);
    return false;
  }
};

export const triggerNativePush = (title: string, options?: { body?: string; url?: string }) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const body = options?.body || 'Нове оновлення в системі';
  const url = options?.url || '/';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, {
          body,
          icon: 'https://img.icons8.com/color/192/crm.png',
          badge: 'https://img.icons8.com/color/48/crm.png',
          data: { url }
        });
      })
      .catch(() => {
        new Notification(title, { body, icon: 'https://img.icons8.com/color/192/crm.png' });
      });
  } else {
    new Notification(title, { body, icon: 'https://img.icons8.com/color/192/crm.png' });
  }
};
