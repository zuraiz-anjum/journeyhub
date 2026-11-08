// Shapes of the data the API sends back. Kept in one place so pages agree.

export type Role = 'member' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  bio: string;
  homeCity: string;
  createdAt: string;
}

export interface AuthorRef {
  _id: string;
  name: string;
}

export interface DestinationRef {
  _id: string;
  city: string;
  country: string;
  imageUrl?: string;
}

export interface Destination {
  _id: string;
  city: string;
  country: string;
  description: string;
  places: string[];
  estimatedBudget: number;
  imageUrl: string;
  archived: boolean;
  averageRating: number | null;
  reviewCount: number;
  isFavourite?: boolean;
}

export interface Story {
  _id: string;
  author: AuthorRef;
  destination: DestinationRef;
  title: string;
  travelDate: string;
  text: string;
  imageUrl: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  author: AuthorRef | string;
  destination: string;
  rating: number;
  comment: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TripDay {
  dayNumber: number;
  activities: string[];
}

export interface TripPlan {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  destinations: DestinationRef[];
  days: TripDay[];
  notes: string;
}

export type ReportStatus = 'open' | 'dismissed' | 'hidden';

export interface Report {
  _id: string;
  reporter: AuthorRef & { email: string };
  targetType: 'story' | 'review';
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  target: {
    title?: string;
    rating?: number;
    text: string;
    author: AuthorRef | null;
    hidden: boolean;
  } | null;
}

export type AccommodationType = 'hotel' | 'hostel' | 'guesthouse' | 'apartment';

export interface Accommodation {
  _id: string;
  destination: DestinationRef & { archived?: boolean };
  name: string;
  type: AccommodationType;
  pricePerNight: number;
  maxGuests: number;
  description: string;
  active: boolean;
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'Cancelled';

export interface BookingRequest {
  _id: string;
  member: AuthorRef & { email: string };
  accommodation: {
    _id: string;
    name: string;
    type: AccommodationType;
    pricePerNight: number;
    destination: DestinationRef;
  } | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  note: string;
  status: BookingStatus;
  createdAt: string;
}

export interface DashboardCounts {
  stories: number;
  reviews: number;
  tripPlans: number;
  savedPlaces: number;
  pendingBookings: number;
}

export interface StoryPage {
  stories: Story[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
