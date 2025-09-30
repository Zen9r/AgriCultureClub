// types/database.ts

// The Event interface represents a row in your 'events' table
export interface Event {
  id: number;
  created_at: string;
  title: string | null;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  image_url: string | null;
  max_attendees?: number | null;
  category?: string | null;
  // --- The Fix ---
  // Add registered_attendees as an optional property.
  // The '?' makes it optional, so TypeScript won't complain if it's not there initially.
  registered_attendees?: number;
}

// The GalleryImage interface represents a row in your 'gallery_images' table
export interface GalleryImage {
  id: number;
  created_at: string;
  image_url: string | null;
  alt_text: string | null;
  category: string | null;
}

// You can add other types for your database tables here as needed.
