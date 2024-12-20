import { useState, useEffect } from 'react';
import { getEvents } from '../services/calendarService';

function useCalendarEvents() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await getEvents();
        setEvents(fetchedEvents);
        setError(null);
      } catch (err) {
        setError('Failed to load calendar events. Please check your connection and permissions.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return { events, error, isLoading };
}

export default useCalendarEvents; 