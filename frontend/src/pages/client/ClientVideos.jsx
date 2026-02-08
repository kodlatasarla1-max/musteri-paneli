import { useState, useEffect } from 'react';
import { Video, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import apiClient from '../../utils/api';
import { getUser } from '../../utils/auth';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

export const ClientVideos = () => {
  const user = getUser();
  const clientId = user?.client_id;
  const [videos, setVideos] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    try {
      const [videosRes, eventsRes] = await Promise.all([
        apiClient.get(`/videos/${clientId}`),
        apiClient.get(`/calendar-events/${clientId}`)
      ]);
      setVideos(videosRes.data);
      setEvents(eventsRes.data.filter(e => e.event_type === 'shoot'));
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (videoId, newStatus) => {
    try {
      await apiClient.put(`/videos/${videoId}/status`, null, {
        params: { status: newStatus, notes }
      });
      toast.success('Status updated successfully');
      setSelectedVideo(null);
      setNotes('');
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'revision_requested':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'revision_requested':
        return 'Revision Requested';
      default:
        return 'Uploaded';
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto" data-testid="client-videos-page">
      <h1 className="text-4xl font-medium text-slate-900 mb-8" data-testid="videos-title">Video Production</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-medium text-slate-900 mb-4">Upcoming Shoots</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.length === 0 ? (
            <Card className="p-6 col-span-2" data-testid="no-upcoming-shoots">
              <p className="text-slate-600">No upcoming shoots scheduled</p>
            </Card>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="p-6" data-testid={`shoot-event-${event.id}`}>
                <h3 className="text-lg font-medium text-slate-900 mb-2">{event.title}</h3>
                <p className="text-sm text-slate-600 mb-4">
                  {new Date(event.event_date).toLocaleString()}
                </p>
                {event.location && (
                  <p className="text-sm text-slate-600 mb-2">Location: {event.location}</p>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-medium text-slate-900 mb-4">Video Gallery</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {videos.length === 0 ? (
            <Card className="p-6 col-span-3" data-testid="no-videos">
              <p className="text-slate-600">No videos yet</p>
            </Card>
          ) : (
            videos.map((video) => (
              <Card key={video.id} className="overflow-hidden card-shadow" data-testid={`video-card-${video.id}`}>
                <div className="aspect-video bg-slate-200 relative flex items-center justify-center">
                  <Video className="h-12 w-12 text-slate-400" />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-slate-900 mb-1">{video.file_name}</h3>
                  <p className="text-sm text-slate-600 mb-3">{video.project_name}</p>
                  <div className="flex items-center gap-2 mb-3">
                    {getStatusIcon(video.status)}
                    <span className="text-sm">{getStatusText(video.status)}</span>
                  </div>
                  {video.status === 'uploaded' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedVideo({ ...video, action: 'approve' })}
                        data-testid={`approve-video-${video.id}`}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedVideo({ ...video, action: 'revision' })}
                        data-testid={`request-revision-${video.id}`}
                      >
                        Request Revision
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent data-testid="status-update-dialog">
          <DialogHeader>
            <DialogTitle>
              {selectedVideo?.action === 'approve' ? 'Approve Video' : 'Request Revision'}
            </DialogTitle>
            <DialogDescription>
              {selectedVideo?.action === 'approve'
                ? 'Approve this video to mark it as final.'
                : 'Request changes to this video.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="notes-textarea"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVideo(null)}>Cancel</Button>
            <Button
              onClick={() =>
                handleStatusUpdate(
                  selectedVideo?.id,
                  selectedVideo?.action === 'approve' ? 'approved' : 'revision_requested'
                )
              }
              data-testid="confirm-status-button"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
