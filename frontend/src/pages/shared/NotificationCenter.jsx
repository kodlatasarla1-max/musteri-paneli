import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, CheckCheck, Clock, Receipt, MessageSquare, AlertCircle, Info } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter = ({ userRole = 'client' }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [groupedNotifications, setGroupedNotifications] = useState({});
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [allRes, groupedRes, countRes] = await Promise.all([
        apiClient.get('/notifications/all'),
        apiClient.get('/notifications/grouped'),
        apiClient.get('/notifications/unread-count')
      ]);
      setNotifications(allRes.data);
      setGroupedNotifications(groupedRes.data);
      setUnreadCount(countRes.data.count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Bildirimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      loadNotifications();
    } catch (error) {
      toast.error('Bildirim güncellenemedi');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.put('/notifications/mark-all-read');
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
      loadNotifications();
    } catch (error) {
      toast.error('Bildirimler güncellenemedi');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      toast.success('Bildirim silindi');
      loadNotifications();
    } catch (error) {
      toast.error('Bildirim silinemedi');
    }
  };

  const handleClearAll = async () => {
    try {
      await apiClient.delete('/notifications/clear-all');
      toast.success('Tüm bildirimler silindi');
      setShowClearDialog(false);
      loadNotifications();
    } catch (error) {
      toast.error('Bildirimler silinemedi');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'receipt_approved':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'receipt_rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'receipt_uploaded':
        return <Receipt className="h-5 w-5 text-blue-600" />;
      case 'revision_request':
        return <MessageSquare className="h-5 w-5 text-purple-600" />;
      case 'revision_response':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'access_expiring':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'access_expired':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationBg = (type, isRead) => {
    if (isRead) return 'bg-white';
    
    switch (type) {
      case 'receipt_approved':
        return 'bg-green-50';
      case 'receipt_rejected':
      case 'access_expired':
        return 'bg-red-50';
      case 'access_expiring':
        return 'bg-amber-50';
      case 'revision_request':
      case 'revision_response':
        return 'bg-purple-50';
      default:
        return 'bg-blue-50';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto" data-testid="notification-center-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-slate-900" data-testid="notifications-title">
            Bildirimler
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={handleMarkAllAsRead}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
              data-testid="mark-all-read-button"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Tümünü Okundu İşaretle
            </Button>
          )}
          {notifications.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowClearDialog(true)}
              className="border-red-200 text-red-600 hover:bg-red-50"
              data-testid="clear-all-button"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Tümünü Sil
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-xl">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-blue-900">{notifications.length}</p>
              <p className="text-xs sm:text-sm text-slate-600">Toplam Bildirim</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-amber-100 rounded-xl">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold text-amber-900">{unreadCount}</p>
              <p className="text-xs sm:text-sm text-slate-600">Okunmamış</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="p-12 text-center border-blue-100">
          <Bell className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Bildirim Yok</h3>
          <p className="text-slate-600">Henüz bildiriminiz bulunmuyor.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedNotifications).sort().reverse().map((dateKey) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-slate-500 mb-3 sticky top-0 bg-slate-50 py-2 px-1">
                {formatDate(dateKey)}
              </h3>
              <div className="space-y-2">
                {groupedNotifications[dateKey].map((notification) => (
                  <Card 
                    key={notification.id}
                    className={`p-4 border-blue-100 cursor-pointer transition-all hover:shadow-md ${getNotificationBg(notification.type, notification.is_read)}`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${notification.is_read ? 'bg-slate-100' : 'bg-white'}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${notification.is_read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                            {notification.message}
                          </p>
                          {!notification.is_read && (
                            <Badge className="bg-blue-600 text-white shrink-0">Yeni</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="text-slate-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear All Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tüm Bildirimleri Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Tüm bildirimleriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">
              Tümünü Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
