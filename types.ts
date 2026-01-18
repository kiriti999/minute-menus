
export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  videoUrl: string;
  category: string;
  popularityScore: number; // 0-100
  prepTime: number; // minutes
  mediaTransform?: {
    x: number; // percentage
    y: number; // percentage
    scale: number; // 1-3
  };
}

export interface Category {
  id: string;
  title: string;
  items: Dish[];
}

export interface OrderItem {
  dishId: string;
  quantity: number;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  timestamp: number;
  timeToOrder: number; // seconds from app open to checkout
}

export interface AnalyticsMetric {
  timestamp: string;
  views: number;
  orders: number;
  avgTimeOnPage: number;
}

export interface DishPerformance {
  id: string;
  name: string;
  views: number;
  conversions: number;
  conversionRate: number;
  watchTime: number;
}

export enum AppMode {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  CUSTOMER = 'CUSTOMER',
  OWNER = 'OWNER'
}

export enum UserTier {
  FREE = 'FREE',
  PLUS = 'PLUS'
}

export interface WatchSession {
  reelId: string;
  startTime: number;
  duration: number;
  completed: boolean;
  timestamp: number;
}

export interface AggregatedMetrics {
  totalViews: number;
  totalWatchTime: number; // seconds
  avgWatchDuration: number; // seconds
  completionRate: number; // percentage
  mostPopularDishId: string;
  engagementRate: number;
  
  // Sales Metrics
  totalOrders: number;
  avgOrderTime: number; // seconds
  conversionRate: number; // percentage

  // Graph Data
  hourlyTraffic: { hour: string; views: number }[];
  conversionFunnel: { stage: string; count: number; fill: string }[];
  dishPerformance: DishPerformance[];
}