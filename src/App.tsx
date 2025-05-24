import React, { useState, useRef, useMemo, useEffect } from 'react';
import { format, parseISO, isAfter, isBefore, subYears, addYears, parse, differenceInDays, addDays, subDays } from 'date-fns';
import { ZoomIn, ZoomOut, Plus, X, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

// Utility function to parse date string to Date object
const parseDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  try {
    return parseISO(date);
  } catch (e) {
    // Fallback for malformed dates
    return new Date();
  }
};

// Calculate the position of an event on the timeline
const calculateEventPosition = (eventDate: Date, minDate: Date, maxDate: Date, width: number) => {
  const totalDays = differenceInDays(maxDate, minDate) || 1;
  const daysFromStart = differenceInDays(parseDate(eventDate), minDate);
  return (daysFromStart / totalDays) * width;
};

// Calculate the width of an event based on its duration (if provided)
const calculateEventWidth = (startDate: Date, endDate: Date | undefined, minDate: Date, maxDate: Date, width: number) => {
  if (!endDate) return 4; // Default width for point-in-time events
  const totalDays = differenceInDays(maxDate, minDate) || 1;
  const eventDays = Math.max(1, differenceInDays(parseDate(endDate), parseDate(startDate)));
  return Math.max(4, (eventDays / totalDays) * width);
};

// Types
type Event = {
  id: string;
  title: string;
  description: string;
  date: Date | string;
  endDate?: Date | string; // Optional end date for ranged events
  category: string;
  mediaUrl?: string;
  link?: string;
  color?: string;
};

type TimelineCategory = {
  id: string;
  name: string;
  color: string;
};

const App: React.FC = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // State for events and categories
  const [events, setEvents] = useState<Event[]>([
    // Personal Events
    {
      id: 'p1',
      title: 'Started Learning React',
      description: 'Began my journey with React and TypeScript',
      date: '2024-01-15',
      category: 'Personal',
      color: 'bg-blue-200',
      link: 'https://reactjs.org/'
    },
    {
      id: 'p2',
      title: 'Completed Online Course',
      description: 'Finished Advanced React Patterns course',
      date: '2024-03-22',
      category: 'Personal',
      color: 'bg-blue-200'
    },
    
    // Work Events
    {
      id: 'w1',
      title: 'Promotion to Senior Developer',
      description: 'Promoted to Senior Developer role',
      date: '2024-02-10',
      category: 'Work',
      color: 'bg-green-200'
    },
    {
      id: 'w2',
      title: 'Launched New Feature',
      description: 'Successfully launched the new dashboard feature',
      date: '2024-04-05',
      endDate: '2024-04-10',
      category: 'Work',
      color: 'bg-green-200'
    },
    
    // Travel Events
    {
      id: 't1',
      title: 'Trip to Japan',
      description: 'Two-week vacation exploring Tokyo and Kyoto',
      date: '2024-03-01',
      endDate: '2024-03-15',
      category: 'Travel',
      color: 'bg-purple-200',
      mediaUrl: 'https://source.unsplash.com/random/400x200?japan'
    },
    
    // Volleyball Events
    {
      id: 'v1',
      title: 'Beach Volleyball Tournament',
      description: 'Annual summer beach volleyball competition',
      date: '2024-06-15',
      endDate: '2024-06-17',
      category: 'Volleyball',
      color: 'bg-orange-200'
    },
    {
      id: 'v2',
      title: 'Team Practice',
      description: 'Weekly team practice session',
      date: '2024-05-20',
      category: 'Volleyball',
      color: 'bg-orange-200'
    },
    
    // Family Events
    {
      id: 'f1',
      title: 'Family Reunion',
      description: 'Annual family reunion at the lake house',
      date: '2024-07-01',
      endDate: '2024-07-04',
      category: 'Family',
      color: 'bg-pink-200',
      mediaUrl: 'https://source.unsplash.com/random/400x200?family'
    },
    {
      id: 'f2',
      title: 'Mom\'s Birthday',
      description: 'Celebrating Mom\'s birthday',
      date: '2024-09-15',
      category: 'Family',
      color: 'bg-pink-200'
    }
  ]);
  const [categories, setCategories] = useState<TimelineCategory[]>([
    { id: '1', name: 'Personal', color: 'bg-blue-500' },
    { id: '2', name: 'Work', color: 'bg-green-500' },
    { id: '3', name: 'Travel', color: 'bg-purple-500' },
    { id: '4', name: 'Volleyball', color: 'bg-orange-500' },
    { id: '5', name: 'Family', color: 'bg-pink-500' },
  ]);
  
  // UI State
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Handle event click
  const handleEventClick = (event: Event) => {
    // Create a new object to ensure React detects the state change
    setSelectedEvent({...event});
  };
  
  // Form State
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>('bg-gray-500');
  
  // Timeline State
  const [timelineDimensions, setTimelineDimensions] = useState({ width: 10000, height: 600 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Calculate the actual date range based on events or use default range
  const { minDate, maxDate } = useMemo(() => {
    if (events.length === 0) {
      const today = new Date();
      return {
        minDate: subDays(today, 30),
        maxDate: addDays(today, 30),
      };
    }
    
    const dates = events
      .map(event => [parseDate(event.date), event.endDate ? parseDate(event.endDate) : parseDate(event.date)])
      .flat();
      
    return {
      minDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      maxDate: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }, [events]);
  
  // Generate date markers for the timeline (monthly markers with year indicators)
  const dateMarkers = useMemo(() => {
    const markers: Array<{date: Date; position: number; isYearStart: boolean}> = [];
    
    // If we don't have valid dates, return empty array
    if (!minDate || !maxDate) return markers;
    
    let currentDate = new Date(minDate);
    currentDate.setDate(1); // Start from the first day of the month
    
    while (currentDate <= maxDate) {
      const isYearStart = currentDate.getMonth() === 0; // January
      const position = calculateEventPosition(
        currentDate, 
        minDate, 
        maxDate, 
        timelineDimensions.width * zoomLevel
      );
      
      // Only add marker if it's the first month of the year or every 3 months
      if (isYearStart || currentDate.getMonth() % 3 === 0) {
        markers.push({
          date: new Date(currentDate),
          position,
          isYearStart
        });
      }
      
      // Move to first day of next month
      const nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      currentDate = nextDate;
    }
    
    return markers;
  }, [minDate, maxDate, timelineDimensions.width, zoomLevel]);
  
  // Filter events based on selected category
  const filteredEvents = useMemo(() => {
    return selectedCategory === 'All' 
      ? events 
      : events.filter(event => event.category === selectedCategory);
  }, [events, selectedCategory]);
  
  // Group events by category for the timeline view
  const eventsByCategory = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    
    // Initialize groups for all categories
    categories.forEach(category => {
      groups[category.name] = [];
    });
    
    // Add events to their respective categories
    filteredEvents.forEach(event => {
      if (!groups[event.category]) {
        groups[event.category] = [];
      }
      groups[event.category].push(event);
    });
    
    return groups;
  }, [filteredEvents, categories]);

  // Timeline mouse event handlers
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStartX(e.pageX - (timelineRef.current?.offsetLeft || 0));
    setScrollLeft(timelineRef.current?.scrollLeft || 0);
    if (timelineRef.current) {
      timelineRef.current.style.cursor = 'grabbing';
    }
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !timelineRef.current) return;
    e.preventDefault();
    const x = e.pageX - (timelineRef.current.offsetLeft || 0);
    const walk = (x - panStartX) * 2; // Adjust scroll speed
    timelineRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTimelineMouseUp = () => {
    setIsPanning(false);
    if (timelineRef.current) {
      timelineRef.current.style.cursor = 'grab';
    }
  };

  const [newEvent, setNewEvent] = useState<Omit<Event, 'id'>>({ 
    title: '',
    description: '',
    date: new Date(),
    endDate: undefined,
    category: 'Personal',
    link: '',
    mediaUrl: '',
  });
  
  // Update timeline dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (timelineRef.current) {
        setTimelineDimensions(prev => ({
          ...prev,
          width: timelineRef.current?.offsetWidth || 10000,
          height: timelineRef.current?.offsetHeight || 600
        }));
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  // Calculate total days in the timeline
  const totalDays = differenceInDays(maxDate, minDate) || 1;
  
  // Handle zooming
  const zoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 5));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  
  // Add a new category
  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCat: TimelineCategory = {
      id: Date.now().toString(),
      name: newCategoryName,
      color: newCategoryColor,
    };
    
    setCategories([...categories, newCat]);
    setNewCategoryName('');
    setNewCategoryColor('bg-gray-500');
    setIsAddingCategory(false);
  };

  const addEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const event: Event = {
      ...newEvent,
      id: Date.now().toString(),
      date: parseDate(newEvent.date),
      endDate: newEvent.endDate ? parseDate(newEvent.endDate) : undefined,
    };
    
    setEvents([...events, event]);
    setNewEvent({ 
      title: '',
      description: '',
      date: new Date(),
      endDate: undefined,
      category: categories[0]?.name || 'Personal',
      link: '',
      mediaUrl: '',
    });
    setIsAddingEvent(false);
  };

  // Date markers are now handled in the main dateMarkers memo above
  
  // Handle file upload for event media
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewEvent(prev => ({
        ...prev,
        mediaUrl: event.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Format date for display
  const formatDateDisplay = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedEvent.title}
                  </h2>
                  <div className="flex items-center mt-1">
                    <span 
                      className={`inline-block w-3 h-3 rounded-full mr-2 ${categories.find(c => c.name === selectedEvent.category)?.color || 'bg-gray-500'}`}
                    ></span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedEvent.category}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatDateDisplay(selectedEvent.date)}
                      {selectedEvent.endDate && ` to ${formatDateDisplay(selectedEvent.endDate)}`}
                    </p>
                  </div>
                  {selectedEvent.link && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Link</h3>
                      <a 
                        href={selectedEvent.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-blue-600 hover:underline dark:text-blue-400 flex items-center"
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        Open Link
                      </a>
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-line">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {selectedEvent.mediaUrl && (
                  <div className="mt-4">
                    <img 
                      src={selectedEvent.mediaUrl} 
                      alt="Event media" 
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <header className="bg-white dark:bg-gray-800 shadow z-10">
        <div className="max-w-full mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interactive Timeline</h1>
            <div className="flex space-x-2">
              <button
                onClick={zoomOut}
                className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              <div className="flex items-center px-3 text-sm text-gray-700 dark:text-gray-300">
                {Math.round(zoomLevel * 100)}%
              </div>
              <button
                onClick={zoomIn}
                className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="ml-4 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsAddingCategory(true)}
                className="ml-2 px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 flex items-center"
              >
                <Plus size={16} className="mr-1" /> Category
              </button>
              <button
                onClick={() => setIsAddingEvent(true)}
                className="ml-2 px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 flex items-center"
              >
                <Plus size={16} className="mr-1" /> Event
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Timeline Header with Date Markers */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div 
            className="relative h-16 overflow-hidden"
            style={{ width: `${timelineDimensions.width * zoomLevel}px` }}
          >
            {dateMarkers.map((marker, index) => (
              <div 
                key={index}
                className="absolute top-0 h-full flex flex-col items-start"
                style={{ left: `${marker.position}px` }}
              >
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-600"></div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {marker.isYearStart 
                    ? format(marker.date, 'yyyy') 
                    : format(marker.date, 'MMM d')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Rows */}
        <div 
          ref={timelineRef}
          className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900"
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          onMouseUp={handleTimelineMouseUp}
          onMouseLeave={handleTimelineMouseUp}
        >
          <div 
            className="relative h-full min-h-[400px]"
            style={{ width: `${timelineDimensions.width * zoomLevel}px` }}
          >
            {/* Category Rows */}
            {categories.map((category, index) => {
              const categoryEvents = eventsByCategory[category.name] || [];
              return (
                <div 
                  key={category.id}
                  className="relative timeline-row border-b border-gray-200 dark:border-gray-700 flex items-center"
                >
                  {/* Category Label */}
                  <div className="sticky left-0 z-10 w-32 px-4 py-2 bg-white dark:bg-gray-800 h-full flex items-center border-r border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <span 
                        className={`w-3 h-3 rounded-full ${category.color} mr-2`}
                        title={category.name}
                      ></span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {category.name}
                      </span>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="relative flex-1 h-full">
                    {categoryEvents.map((event) => {
                      const eventDate = parseDate(event.date);
                      const eventEndDate = event.endDate ? parseDate(event.endDate) : undefined;
                      const left = calculateEventPosition(eventDate, minDate, maxDate, timelineDimensions.width * zoomLevel);
                      const width = calculateEventWidth(eventDate, eventEndDate, minDate, maxDate, timelineDimensions.width * zoomLevel);
                      
                      return (
                        <div
                          key={event.id}
                          className={`absolute top-1/2 -translate-y-1/2 min-h-16 rounded ${category.color} text-white text-sm cursor-pointer timeline-event`}
                          style={{
                            left: `${left}px`,
                            width: `${Math.max(width, 100)}px`,
                            minWidth: '100px',
                            zIndex: 10,
                          }}
                          onClick={() => handleEventClick(event)}
                          title={`${event.title}\n${format(eventDate, 'PPp')}${eventEndDate ? ` - ${format(eventEndDate, 'PPp')}` : ''}`}
                        >
                          <div className="p-2 event-content">
                            <div className="event-title font-medium">{event.title}</div>
                            {event.description && (
                              <div className="event-description text-xs opacity-90 mt-0.5">
                                {event.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Add Category Modal */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Category</h2>
              <button 
                onClick={() => setIsAddingCategory(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addCategory(); }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    id="categoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter category name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <div className="flex space-x-2">
                    {['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full ${color} ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
                        onClick={() => setNewCategoryColor(color)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Event</h2>
              <button 
                onClick={() => setIsAddingEvent(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={addEvent}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="eventTitle"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="eventCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category *
                    </label>
                    <select
                      id="eventCategory"
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="datetime-local"
                      id="eventDate"
                      value={newEvent.date instanceof Date ? newEvent.date.toISOString().slice(0, 16) : newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="eventEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date (optional)
                    </label>
                    <input
                      type="datetime-local"
                      id="eventEndDate"
                      value={newEvent.endDate ? (newEvent.endDate instanceof Date ? newEvent.endDate.toISOString().slice(0, 16) : newEvent.endDate) : ''}
                      onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value || undefined})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    id="eventDescription"
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="eventLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Link URL
                    </label>
                    <div className="flex rounded-md shadow-sm">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                        <LinkIcon size={16} />
                      </span>
                      <input
                        type="url"
                        id="eventLink"
                        value={newEvent.link}
                        onChange={(e) => setNewEvent({...newEvent, link: e.target.value})}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="eventMedia" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Media
                    </label>
                    <div className="flex items-center">
                      <label className="flex-1 cursor-pointer">
                        <span className="sr-only">Upload media</span>
                        <div className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                          <ImageIcon size={16} className="mr-2" />
                          <span>Upload Image</span>
                        </div>
                        <input
                          id="eventMedia"
                          name="eventMedia"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleMediaUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {newEvent.mediaUrl && (
                  <div className="mt-2">
                    <img 
                      src={newEvent.mediaUrl} 
                      alt="Preview" 
                      className="h-32 object-cover rounded-md"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsAddingEvent(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Event
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
