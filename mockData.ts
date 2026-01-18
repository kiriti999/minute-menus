
import { Category, Dish, UserTier, WatchSession, AggregatedMetrics, Order, OrderItem, DishPerformance } from './types';

// --- Seed Data ---
export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'starters',
    title: 'Starters & Tapas',
    items: [
      {
        id: 's1',
        name: 'Crispy Calamari',
        description: 'Golden fried squid rings served with spicy marinara and lemon wedges.',
        price: 14.00,
        imageUrl: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/854139/854139-hd_1080_1920_30fps.mp4',
        category: 'starters',
        popularityScore: 85,
        prepTime: 8
      },
      {
        id: 's2',
        name: 'Truffle Arancini',
        description: 'Risotto balls infused with black truffle oil, stuffed with mozzarella.',
        price: 12.50,
        imageUrl: 'https://images.pexels.com/photos/4224315/pexels-photo-4224315.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/4253336/4253336-hd_1080_1920_25fps.mp4',
        category: 'starters',
        popularityScore: 92,
        prepTime: 10
      },
      {
        id: 's3',
        name: 'Wagyu Sliders',
        description: 'Mini wagyu beef burgers with caramelized onions and brioche buns.',
        price: 18.00,
        imageUrl: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/3622358/3622358-hd_1080_1920_25fps.mp4',
        category: 'starters',
        popularityScore: 78,
        prepTime: 12
      },
      {
        id: 's4',
        name: 'Spicy Tuna Tartare',
        description: 'Fresh tuna cubes with avocado, sesame oil, and crispy wonton chips.',
        price: 16.00,
        imageUrl: 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/3664458/3664458-hd_1080_1920_25fps.mp4',
        category: 'starters',
        popularityScore: 88,
        prepTime: 6
      },
      {
        id: 's5',
        name: 'Burrata Salad',
        description: 'Creamy burrata cheese with heirloom tomatoes and balsamic glaze.',
        price: 15.00,
        imageUrl: 'https://images.pexels.com/photos/1211887/pexels-photo-1211887.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/2881848/2881848-hd_1080_1920_30fps.mp4',
        category: 'starters',
        popularityScore: 65,
        prepTime: 5
      }
    ]
  },
  {
    id: 'mains',
    title: 'Signature Mains',
    items: [
      {
        id: 'm1',
        name: 'Lobster Risotto',
        description: 'Creamy arborio rice cooked with lobster bisque and fresh chunks of lobster tail.',
        price: 34.00,
        imageUrl: 'https://images.pexels.com/photos/566566/pexels-photo-566566.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/3195443/3195443-uhd_2560_1440_25fps.mp4',
        category: 'mains',
        popularityScore: 95,
        prepTime: 20
      },
      {
        id: 'm2',
        name: 'Pan-Seared Scallops',
        description: 'Jumbo scallops served with crispy pancetta and cauliflower puree.',
        price: 29.00,
        imageUrl: 'https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/4705148/4705148-hd_1080_1920_25fps.mp4',
        category: 'mains',
        popularityScore: 82,
        prepTime: 15
      },
      {
        id: 'm3',
        name: 'Herb-Crusted Lamb',
        description: 'Rack of lamb with a rosemary crust, served with roasted root vegetables.',
        price: 38.00,
        imageUrl: 'https://images.pexels.com/photos/323682/pexels-photo-323682.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/4253339/4253339-hd_1080_1920_25fps.mp4',
        category: 'mains',
        popularityScore: 75,
        prepTime: 25
      },
      {
        id: 'm4',
        name: 'Wild Mushroom Pasta',
        description: 'Fresh pappardelle pasta tossed in a creamy wild mushroom and thyme sauce.',
        price: 24.00,
        imageUrl: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/3209663/3209663-uhd_2560_1440_25fps.mp4',
        category: 'mains',
        popularityScore: 89,
        prepTime: 14
      },
      {
        id: 'm5',
        name: 'Miso Glazed Salmon',
        description: 'Sustainably sourced salmon fillet with a sweet and savory miso glaze.',
        price: 27.00,
        imageUrl: 'https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg?auto=compress&cs=tinysrgb&w=800',
        videoUrl: 'https://videos.pexels.com/video-files/3655944/3655944-hd_1080_1920_25fps.mp4',
        category: 'mains',
        popularityScore: 91,
        prepTime: 16
      }
    ]
  }
];

// --- Data Service Class ---

class DataService {
  private readonly MENU_KEY = 'mm_menu_v1';
  private readonly SESSIONS_KEY = 'mm_sessions_v1';
  private readonly ORDERS_KEY = 'mm_orders_v1';
  private readonly TIER_KEY = 'mm_tier_v1';

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!localStorage.getItem(this.MENU_KEY)) {
      localStorage.setItem(this.MENU_KEY, JSON.stringify(INITIAL_CATEGORIES));
    }
    if (!localStorage.getItem(this.SESSIONS_KEY)) {
      // Seed with dummy sessions so charts aren't empty
      const dummySessions: WatchSession[] = [];
      const allDishIds = INITIAL_CATEGORIES.flatMap(c => c.items.map(i => i.id));
      
      // Generate ~50 random sessions
      for (let i = 0; i < 50; i++) {
        const randomDish = allDishIds[Math.floor(Math.random() * allDishIds.length)];
        const isCompleted = Math.random() > 0.5;
        dummySessions.push({
            reelId: randomDish,
            startTime: Date.now() - Math.random() * 86400000 * 2, // Past 48 hours
            duration: 2 + Math.random() * 10,
            completed: isCompleted,
            timestamp: Date.now() - Math.random() * 86400000 * 2
        });
      }
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(dummySessions));
    }
    if (!localStorage.getItem(this.ORDERS_KEY)) {
        // Seed with some dummy orders for initial dashboard data
        const dummyOrders: Order[] = Array.from({length: 5}).map((_, i) => ({
            id: `ord_${i}`,
            items: [],
            totalAmount: 45,
            timestamp: Date.now() - (Math.random() * 86400000),
            timeToOrder: 120 + (Math.random() * 60)
        }));
        localStorage.setItem(this.ORDERS_KEY, JSON.stringify(dummyOrders));
    }
    if (!localStorage.getItem(this.TIER_KEY)) {
        localStorage.setItem(this.TIER_KEY, UserTier.FREE);
    }
  }

  // --- Menu Operations ---
  getMenu(): Category[] {
    const data = localStorage.getItem(this.MENU_KEY);
    return data ? JSON.parse(data) : INITIAL_CATEGORIES;
  }

  saveMenu(menu: Category[]) {
    localStorage.setItem(this.MENU_KEY, JSON.stringify(menu));
    window.dispatchEvent(new Event('storage')); 
  }

  // --- User Tier Operations ---
  getTier(): UserTier {
      return (localStorage.getItem(this.TIER_KEY) as UserTier) || UserTier.FREE;
  }

  setTier(tier: UserTier) {
      localStorage.setItem(this.TIER_KEY, tier);
      window.dispatchEvent(new Event('storage'));
  }

  // --- Analytics Recording ---
  recordWatchSession(session: WatchSession) {
    const sessions = this.getRawSessions();
    sessions.push(session);
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event('storage'));
  }

  recordOrder(items: OrderItem[], timeToOrder: number) {
      const orders = this.getRawOrders();
      const totalAmount = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      
      const newOrder: Order = {
          id: `ord_${Date.now()}`,
          items,
          totalAmount,
          timestamp: Date.now(),
          timeToOrder
      };
      
      orders.push(newOrder);
      localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));
      window.dispatchEvent(new Event('storage'));
  }

  private getRawSessions(): WatchSession[] {
    const data = localStorage.getItem(this.SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private getRawOrders(): Order[] {
      const data = localStorage.getItem(this.ORDERS_KEY);
      return data ? JSON.parse(data) : [];
  }

  // --- Analytics Aggregation ---
  getAggregatedMetrics(timeWindow: '24h' | '7d' | '30d' = '24h'): AggregatedMetrics {
    const now = Date.now();
    let timeLimit = 24 * 60 * 60 * 1000;
    if (timeWindow === '7d') timeLimit = 7 * 24 * 60 * 60 * 1000;
    if (timeWindow === '30d') timeLimit = 30 * 24 * 60 * 60 * 1000;

    const allSessions = this.getRawSessions();
    const allOrders = this.getRawOrders();

    // Filter by time window
    const sessions = allSessions.filter(s => (now - s.timestamp) < timeLimit);
    const orders = allOrders.filter(o => (now - o.timestamp) < timeLimit);

    const menu = this.getMenu();
    const allDishes = menu.flatMap(c => c.items);

    // 1. Basic Counters
    const totalViews = sessions.length;
    const totalWatchTime = sessions.reduce((acc, s) => acc + s.duration, 0);
    const avgWatchDuration = totalViews > 0 ? totalWatchTime / totalViews : 0;
    
    const completedSessions = sessions.filter(s => s.completed).length;
    const completionRate = totalViews > 0 ? (completedSessions / totalViews) * 100 : 0;

    // 2. Order Metrics
    const totalOrders = orders.length;
    const avgOrderTime = totalOrders > 0 
        ? orders.reduce((acc, o) => acc + o.timeToOrder, 0) / totalOrders 
        : 0;
    
    // Heuristic: Conversion Rate = Total Orders / (Total Views / 5) (Assuming ~5 views per session)
    // or simpler: Orders / Estimated Sessions
    const estimatedSessions = Math.max(1, Math.floor(totalViews / 4));
    const conversionRate = estimatedSessions > 0 ? (totalOrders / estimatedSessions) * 100 : 0;

    // 3. Dish Performance
    const dishMap = new Map<string, { views: number, watchTime: number, completions: number }>();
    
    sessions.forEach(s => {
        const current = dishMap.get(s.reelId) || { views: 0, watchTime: 0, completions: 0 };
        current.views += 1;
        current.watchTime += s.duration;
        if (s.completed) current.completions += 1;
        dishMap.set(s.reelId, current);
    });

    const dishPerformance: DishPerformance[] = Array.from(dishMap.entries()).map(([id, stats]) => {
        const dish = allDishes.find(d => d.id === id);
        // Calculate specific conversions for dish if it was in an order (complex matching omitted for simplified demo)
        return {
            id,
            name: dish ? dish.name : 'Unknown Dish',
            conversionRate: stats.views > 0 ? (stats.completions / stats.views) * 100 : 0,
            views: stats.views,
            watchTime: stats.watchTime,
            conversions: stats.completions // mapped from completed watch sessions
        };
    }).sort((a, b) => b.views - a.views);

    const mostPopularDishId = dishPerformance.length > 0 ? dishPerformance[0].id : '';

    // 4. Hourly Traffic (For "Peak Activity") & Views Graph
    const hourMap = new Map<string, number>();
    // Initialize chart data points based on window
    const points = timeWindow === '24h' ? 24 : (timeWindow === '7d' ? 7 : 30);
    const interval = timeLimit / points;

    for(let i=points-1; i>=0; i--) {
        const d = new Date(now - i * interval);
        // Label formatting
        let key = '';
        if (timeWindow === '24h') key = `${d.getHours()}:00`;
        else key = `${d.getMonth()+1}/${d.getDate()}`;
        
        if (!hourMap.has(key)) hourMap.set(key, 0);
    }

    sessions.forEach(s => {
        const d = new Date(s.timestamp);
        let key = '';
        if (timeWindow === '24h') key = `${d.getHours()}:00`;
        else key = `${d.getMonth()+1}/${d.getDate()}`;
        
        if (hourMap.has(key)) {
            hourMap.set(key, (hourMap.get(key) || 0) + 1);
        }
    });

    const hourlyTraffic = Array.from(hourMap.entries()).map(([hour, views]) => ({
        hour,
        views
    }));

    // 5. Conversion Funnel
    // View -> Engaged (>5s watch) -> Order
    const engagedViews = sessions.filter(s => s.duration > 5).length;
    const conversionFunnel = [
        { stage: 'Menu Views', count: totalViews, fill: '#fff' },
        { stage: 'Engaged (>5s)', count: engagedViews, fill: '#aaa' },
        { stage: 'Orders', count: totalOrders, fill: '#4ade80' }
    ];

    // Mock Engagement Rate
    const engagementRate = totalViews > 0 ? (engagedViews / totalViews) * 100 : 0;

    return {
        totalViews,
        totalWatchTime,
        avgWatchDuration,
        completionRate,
        mostPopularDishId,
        engagementRate,
        totalOrders,
        avgOrderTime,
        conversionRate,
        hourlyTraffic,
        conversionFunnel,
        dishPerformance
    };
  }

  // --- CSV Export ---
  getCSVData(): string {
      const metrics = this.getAggregatedMetrics('30d');
      const headers = ['Item Name', 'Total Views', 'Watch Time (s)', 'Completions', 'Est. Conversion Rate'];
      const rows = metrics.dishPerformance.map(d => [
          d.name,
          d.views.toString(),
          d.watchTime.toFixed(1),
          d.conversions.toString(),
          d.conversionRate.toFixed(1) + '%'
      ]);

      const csvContent = [
          headers.join(','),
          ...rows.map(r => r.join(','))
      ].join('\n');

      return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  }

  // Helper to reset data
  resetAnalytics() {
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify([]));
      localStorage.setItem(this.ORDERS_KEY, JSON.stringify([]));
      window.dispatchEvent(new Event('storage'));
  }
}

export const dataService = new DataService();
