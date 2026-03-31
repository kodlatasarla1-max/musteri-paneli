import { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, Video, Clock, Users, MapPin, Trash2 } from 'lucide-react';
import apiClient from '../../utils/api';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { tr } from '../../utils/translations';

export const AdminCalendar = () => {
  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [checklistInput, setChecklistInput] = useState('');
  
  const [eventForm, setEventForm] = useState({
    event_type: 'shoot',
    title: '',
    event_date: '',
    location: '',
    notes: '',
    checklist: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsRes, allEvents] = await Promise.all([
        apiClient.get('/clients'),
        loadAllEvents()
      ]);
      setClients(clientsRes.data);
      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadAllEvents = async () => {
    try {
      const clientsRes = await apiClient.get('/clients');
      const allEvents = [];
      for (const client of clientsRes.data) {
        const eventsRes = await apiClient.get(`/calendar-events/${client.id}`);
        allEvents.push(...eventsRes.data.map(e => ({ ...e, client_name: client.company_name })));
      }
      return allEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    } catch (error) {
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }

    try {
      await apiClient.post('/calendar-events', {
        ...eventForm,
        client_id: selectedClient,
        event_date: new Date(eventForm.event_date).toISOString()
      });
      toast.success('Etkinlik başarıyla oluşturuldu');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Etkinlik oluşturulamadı');
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) return;
    
    try {
      await apiClient.delete(`/calendar-events/${eventId}`);
      toast.success('Etkinlik silindi');
      loadData();
    } catch (error) {
      toast.error('Etkinlik silinemedi');
    }
  };

  const addToChecklist = () => {
    if (checklistInput.trim()) {
      setEventForm({
        ...eventForm,
        checklist: [...eventForm.checklist, checklistInput.trim()]
      });
      setChecklistInput('');
    }
  };

  const removeFromChecklist = (index) => {
    setEventForm({
      ...eventForm,
      checklist: eventForm.checklist.filter((_, i) => i !== index)
    });
  };

  const resetForm = () => {
    setEventForm({
      event_type: 'shoot',
      title: '',
      event_date: '',
      location: '',
      notes: '',
      checklist: []
    });
    setSelectedClient('');
    setChecklistInput('');
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'shoot':
        return <Video className="h-5 w-5 text-slate-900" />;
      case 'deadline':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'meeting':
        return <Users className="h-5 w-5 text-slate-600" />;
      default:
        return <CalendarIcon className="h-5 w-5 text-slate-600" />;
    }
  };

  const getEventTypeText = (type) => {
    return tr.admin.calendar[type] || type;
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'shoot':
        return 'border-slate-300 bg-slate-50';
      case 'deadline':
        return 'border-amber-200 bg-amber-50';
      case 'meeting':
        return 'border-slate-200 bg-white';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  if (loading) {
    return <div className="p-8">{tr.common.loading}</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="admin-calendar-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium text-slate-900" data-testid="calendar-title">{tr.admin.calendar.title}</h1>
          <p className="text-slate-600 mt-2">Çekim programları, son tarihler ve toplantıları yönetin</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-slate-900 hover:bg-black" data-testid="add-event-button">
          <Plus className="h-4 w-4 mr-2" />
          {tr.admin.calendar.addEvent}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {events.length === 0 ? (
          <Card className="p-12 text-center border-slate-200">
            <CalendarIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Henüz etkinlik yok</p>
          </Card>
        ) : (
          events.map((event) => (
            <Card 
              key={event.id} 
              className={`p-6 border-2 ${getEventColor(event.event_type)} shadow-sm hover:shadow-md transition-shadow`}
              data-testid={`event-item-${event.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-white rounded-lg">
                    {getEventIcon(event.event_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-slate-900">{event.title}</h3>
                      <span className="px-3 py-1 text-xs rounded-full bg-white border">
                        {getEventTypeText(event.event_type)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(event.event_date).toLocaleString('tr-TR')}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{event.client_name}</span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>

                    {event.notes && (
                      <p className="mt-3 text-sm text-slate-600 p-3 bg-white rounded-lg">
                        {event.notes}
                      </p>
                    )}

                    {event.checklist && event.checklist.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700 mb-2">Hazırlık Listesi:</p>
                        <ul className="space-y-1">
                          {event.checklist.map((item, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(event.id)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  data-testid={`delete-event-${event.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl" data-testid="event-dialog">
          <DialogHeader>
            <DialogTitle>{tr.admin.calendar.addEvent}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Müşteri</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{tr.admin.calendar.eventType}</Label>
                <Select value={eventForm.event_type} onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shoot">{tr.admin.calendar.shoot}</SelectItem>
                    <SelectItem value="deadline">{tr.admin.calendar.deadline}</SelectItem>
                    <SelectItem value="meeting">{tr.admin.calendar.meeting}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">{tr.admin.calendar.eventTitle}</Label>
                <Input
                  id="title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  required
                  className="border-slate-300"
                  placeholder="Örn: Ürün Çekimi"
                  data-testid="event-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_date">{tr.admin.calendar.eventDate}</Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  required
                  className="border-slate-300"
                  data-testid="event-date-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{tr.admin.calendar.location}</Label>
                <Input
                  id="location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="border-slate-300"
                  placeholder="İsteğe bağlı"
                  data-testid="event-location-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{tr.admin.calendar.notes}</Label>
                <Textarea
                  id="notes"
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  className="border-slate-300"
                  rows={3}
                  placeholder="İsteğe bağlı"
                />
              </div>

              <div className="space-y-2">
                <Label>Hazırlık Listesi (İsteğe bağlı)</Label>
                <div className="flex gap-2">
                  <Input
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    className="border-slate-300"
                    placeholder="Bir madde ekleyin"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToChecklist();
                      }
                    }}
                  />
                  <Button type="button" onClick={addToChecklist} variant="outline" className="border-slate-300">
                    Ekle
                  </Button>
                </div>
                {eventForm.checklist.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {eventForm.checklist.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span className="text-sm">{item}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromChecklist(idx)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {tr.common.cancel}
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-black" data-testid="submit-event-button">
                <Plus className="h-4 w-4 mr-2" />
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
