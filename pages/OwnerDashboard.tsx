import {
  BrainCircuit,
  Calendar,
  Check,
  Copy,
  Crown,
  DollarSign,
  Download,
  Edit2,
  EyeOff,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  Menu,
  MoreVertical,
  MousePointer2,
  Move,
  Play,
  Plus,
  Printer,
  QrCode,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Utensils,
  Video,
  X,
  ZoomIn,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAiInsights } from "../services/geminiService";
import { supabase } from "../lib/supabase";
import { supabaseService } from "../services/supabaseService";
import {
  type AggregatedMetrics,
  type Category,
  type Dish,
  UserTier,
} from "../types";

type ViewMode = "DASHBOARD" | "MENU" | "CUSTOMERS";
type TimeWindow = "24h" | "7d" | "30d";

// --- Paywall Modal Component ---
interface PaywallModalProps {
  onClose: () => void;
  onUpgrade: () => void;
  trigger: string;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  onClose,
  onUpgrade,
  trigger,
}) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="bg-gradient-to-br from-purple-900 to-black p-8 md:w-2/5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 bg-white text-black rounded flex items-center justify-center mb-6">
              <Plus size={24} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Unlock Plus</h2>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Scale your restaurant with advanced analytics and AI power.
            </p>
          </div>
          <div className="mt-8">
            <ul className="space-y-3 text-xs text-white/80">
              <li className="flex items-center gap-2">
                <Check size={14} /> Unlimited Menu Categories
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} /> Real-time Engagement Graphs
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} /> AI-Powered Analysis
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} /> Data Export (CSV/PDF)
              </li>
            </ul>
          </div>
        </div>
        <div className="p-8 md:w-3/5 bg-black relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-8">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
              Feature Locked
            </p>
            <h3 className="text-xl font-bold text-white">{trigger}</h3>
          </div>

          <div className="space-y-4">
            <button
              onClick={onUpgrade}
              className="w-full border border-white/20 bg-zinc-900 hover:bg-zinc-800 p-4 rounded-lg flex justify-between items-center group transition-all"
            >
              <div className="text-left">
                <div className="text-white font-bold">Annual Plan</div>
                <div className="text-zinc-500 text-xs">Billed $120/year</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-green-900/30 text-green-400 text-[10px] font-bold px-2 py-1 rounded">
                  SAVE 17%
                </span>
                <span className="text-xl font-bold text-white">
                  $10
                  <span className="text-xs font-normal text-zinc-500">/mo</span>
                </span>
              </div>
            </button>

            <button
              onClick={onUpgrade}
              className="w-full border border-white p-4 rounded-lg flex justify-between items-center bg-white hover:bg-zinc-200 transition-all"
            >
              <div className="text-left">
                <div className="text-black font-bold">Monthly Plan</div>
                <div className="text-zinc-600 text-xs">Cancel anytime</div>
              </div>
              <span className="text-xl font-bold text-black">
                $12
                <span className="text-xs font-normal text-zinc-600">/mo</span>
              </span>
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={onClose}
              className="text-xs text-zinc-600 hover:text-zinc-400"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- QR Code Modal Component ---
interface QrCodeModalProps {
  onClose: () => void;
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ onClose }) => {
  const [color, setColor] = useState("000000");
  const currentUrl = window.location.href.split("?")[0]; // Clean URL
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentUrl)}&color=${color}`;

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <QrCode className="text-white" size={20} />
            <h2 className="text-xl font-bold text-white">QR Code Studio</h2>
          </div>
          <button onClick={onClose}>
            <X size={20} className="text-zinc-500 hover:text-white" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center bg-zinc-950">
          <div className="bg-white p-6 rounded-xl shadow-xl mb-8">
            <img
              src={qrUrl}
              alt="Restaurant QR"
              className="w-48 h-48 mix-blend-multiply"
            />
          </div>

          <div className="w-full space-y-8">
            <div className="text-center">
              <label className="text-xs text-zinc-500 uppercase tracking-widest mb-4 block">
                Select Brand Color
              </label>
              <div className="flex gap-4 justify-center">
                {[
                  { hex: "000000", label: "Black" },
                  { hex: "4f46e5", label: "Indigo" },
                  { hex: "10b981", label: "Emerald" },
                  { hex: "f43f5e", label: "Rose" },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    className={`w-10 h-10 rounded-full border-2 transition-all shadow-lg ${color === c.hex ? "border-white scale-110" : "border-transparent hover:scale-110"}`}
                    style={{ backgroundColor: `#${c.hex}` }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <a
                href={qrUrl}
                download="restaurant-qr.png"
                target="_blank"
                rel="noreferrer"
                className="bg-white text-black py-3 rounded font-bold text-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Download PNG
              </a>
              <button
                onClick={() => window.print()}
                className="bg-zinc-800 text-white py-3 rounded font-bold text-sm hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 border border-zinc-700"
              >
                <Printer size={16} />
                Print Cards
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-500">
            Scan this code to instantly open the customer menu experience.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Media Editor Component (Reuse) ---
interface MediaEditorProps {
  file: File;
  initialPreviewUrl: string;
  initialTransform?: { x: number; y: number; scale: number };
  onSave: (
    processedUrl: string,
    transform: { x: number; y: number; scale: number },
  ) => void;
  onCancel: () => void;
}

const MediaEditor: React.FC<MediaEditorProps> = ({
  file,
  initialPreviewUrl,
  initialTransform,
  onSave,
  onCancel,
}) => {
  const [scale, setScale] = useState(initialTransform?.scale || 1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const isVideo = file.type.startsWith("video/");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    // Use first touch point
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.5, scale + delta), 3);
    setScale(newScale);
  };

  const handleConfirm = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const xPercent = (position.x / width) * 100;
    const yPercent = (position.y / height) * 100;
    onSave(initialPreviewUrl, { x: xPercent, y: yPercent, scale: scale });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-5xl w-full flex flex-col lg:flex-row overflow-hidden h-[85vh] lg:h-auto lg:max-h-[90vh]">
        {/* Left/Top: Preview Area */}
        <div className="flex-1 bg-black relative flex items-center justify-center p-4 lg:p-8 overflow-hidden select-none">
          <div
            ref={containerRef}
            className="relative w-full max-w-[240px] md:max-w-[280px] lg:max-w-[320px] aspect-[9/16] bg-zinc-800 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-zinc-700 ring-1 ring-white/10 group cursor-move touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isVideo ? (
              <video
                src={initialPreviewUrl}
                className="w-full h-full object-cover pointer-events-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                }}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={initialPreviewUrl}
                className="w-full h-full object-cover pointer-events-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                }}
                draggable={false}
              />
            )}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-black/50 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full border border-white/10">
                DRAG TO PAN
              </div>
            </div>
          </div>
        </div>

        {/* Right/Bottom: Controls Sidebar */}
        <div className="w-full lg:w-80 bg-zinc-900 p-6 flex flex-col border-t lg:border-t-0 lg:border-l border-zinc-800 z-10 shrink-0 h-auto">
          <div className="mb-4 lg:mb-6">
            <h3 className="text-white font-bold text-lg">Edit Media</h3>
            <p className="text-zinc-500 text-xs">
              Adjust your content to fit the vertical 9:16 format.
            </p>
          </div>

          {/* Zoom Control */}
          <div className="mb-4 lg:mb-8 space-y-4 lg:space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Zoom</span>
                <span>{(scale * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-12 md:h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto w-full flex flex-col items-center gap-4">
            <button
              onClick={handleConfirm}
              className="w-full md:w-[80%] lg:w-full h-12 bg-white text-black font-bold text-sm rounded hover:bg-zinc-200 flex items-center justify-center transition-colors"
            >
              SAVE CHANGES
            </button>
            <button
              onClick={onCancel}
              className="w-full md:w-[80%] lg:w-full h-12 bg-transparent border border-zinc-700 text-white font-bold text-sm rounded hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main OwnerDashboard Component ---

interface OwnerDashboardProps {
  onNavigateToCustomer: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onNavigateToCustomer,
}) => {
  const [currentView, setCurrentView] = useState<ViewMode>("DASHBOARD");
  const [insights, setInsights] = useState<string>("");
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Data State
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [menuItems, setMenuItems] = useState<Category[]>([]);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h");

  // Tier & Paywall State
  const [userTier, setUserTier] = useState<UserTier>(UserTier.FREE);
  const [paywallTrigger, setPaywallTrigger] = useState<string | null>(null);

  // Editor State
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [tempCategoryTitle, setTempCategoryTitle] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [editingMedia, setEditingMedia] = useState<{
    file: File;
    previewUrl: string;
    catIndex: number;
    dishIndex: number;
  } | null>(null);
  const [activeOptionsDishId, setActiveOptionsDishId] = useState<string | null>(
    null,
  );

  // Load Initial Data
  useEffect(() => {
    // One-time: ensure restaurant row exists for new Google OAuth users
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (uid) {
        supabaseService
          .ensureRestaurant("My Restaurant", uid)
          .catch(() => { /* already exists */ });
      }
    });

    refreshData();

    // Poll for real-time updates every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [timeWindow]);

  const refreshData = () => {
    supabaseService.getTier().then(setUserTier).catch(console.error);
    supabaseService.getMenu().then(setMenuItems).catch(console.error);
    supabaseService
      .getAggregatedMetrics(timeWindow)
      .then(setMetrics)
      .catch(console.error);
  };

  const handleUpgrade = () => {
    // TODO: Integrate Razorpay (India) / Clover (US/CA) payment here
    supabaseService
      .setTier(UserTier.PLUS)
      .then(() => {
        setUserTier(UserTier.PLUS);
        setPaywallTrigger(null);
        alert("Welcome to Plus! Features unlocked.");
      })
      .catch(console.error);
  };

  const triggerPaywall = (reason: string) => {
    if (userTier === UserTier.FREE) {
      setPaywallTrigger(reason);
      return true;
    }
    return false;
  };

  const handleGenerateInsights = async () => {
    if (triggerPaywall("AI Analysis")) return;

    setIsLoadingInsights(true);
    if (metrics) {
      const dp = metrics.dishPerformance.map((d) => ({
        id: d.id,
        name: d.name,
        views: d.views,
        conversions: d.conversions,
        conversionRate: d.conversionRate,
        watchTime: d.watchTime,
      }));
      const traffic = metrics.hourlyTraffic.map((t) => ({
        timestamp: t.hour,
        views: t.views,
        orders: 0,
        avgTimeOnPage: 0,
      }));
      const result = await getAiInsights(dp, traffic);
      setInsights(result);
    }
    setIsLoadingInsights(false);
  };

  const handleExportCSV = async () => {
    if (triggerPaywall("Data Export")) return;

    const csvUrl = await supabaseService.getCSVData();
    const link = document.createElement("a");
    link.href = csvUrl;
    link.download = `minute_menus_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDishUpdate = (
    catIndex: number,
    dishIndex: number,
    field: keyof Dish,
    value: any,
  ) => {
    const newMenu = [...menuItems];
    newMenu[catIndex].items[dishIndex] = {
      ...newMenu[catIndex].items[dishIndex],
      [field]: value,
    };
    setMenuItems(newMenu);
    setUnsavedChanges(true);
  };

  const handleDuplicateDish = (catIndex: number, dishIndex: number) => {
    const newMenu = [...menuItems];
    const dishToCopy = newMenu[catIndex].items[dishIndex];
    const newDish = {
      ...dishToCopy,
      id: crypto.randomUUID(),
      name: `${dishToCopy.name} (Copy)`,
    };
    newMenu[catIndex].items.splice(dishIndex + 1, 0, newDish);
    setMenuItems(newMenu);
    setUnsavedChanges(true);
    setActiveOptionsDishId(null);
  };

  const handleDeleteDish = (catIndex: number, dishIndex: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      const newMenu = [...menuItems];
      newMenu[catIndex].items.splice(dishIndex, 1);
      setMenuItems(newMenu);
      setUnsavedChanges(true);
      setActiveOptionsDishId(null);
    }
  };

  const handleAddCategory = () => {
    if (menuItems.length >= 2) {
      if (triggerPaywall("Unlimited Categories")) return;
    }
    const newCategory: Category = {
      id: crypto.randomUUID(),
      title: `Category ${menuItems.length + 1}`,
      items: [],
    };
    const newMenu = [...menuItems, newCategory];
    setMenuItems(newMenu);
    setSelectedCategoryIdx(newMenu.length - 1);
    setTempCategoryTitle(newCategory.title);
    setIsEditingCategory(true);
    setUnsavedChanges(true);
  };

  const handleAddDish = () => {
    const newDish: Dish = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      price: 0,
      imageUrl: "",
      videoUrl: "",
      category: menuItems[selectedCategoryIdx]?.id ?? "",
      popularityScore: 0,
      prepTime: 0,
    };
    const newMenu = [...menuItems];
    newMenu[selectedCategoryIdx].items.push(newDish);
    setMenuItems(newMenu);
    setUnsavedChanges(true);
  };

  const onFileSelect = (catIndex: number, dishIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingMedia({
        file,
        previewUrl: reader.result as string,
        catIndex,
        dishIndex,
      });
    };
    reader.readAsDataURL(file);
  };

  const onMediaEditorSave = (
    processedUrl: string,
    transform: { x: number; y: number; scale: number },
  ) => {
    if (!editingMedia) return;
    const isVideo = editingMedia.file.type.startsWith("video/");
    if (isVideo)
      handleDishUpdate(
        editingMedia.catIndex,
        editingMedia.dishIndex,
        "videoUrl",
        processedUrl,
      );
    else
      handleDishUpdate(
        editingMedia.catIndex,
        editingMedia.dishIndex,
        "imageUrl",
        processedUrl,
      );
    handleDishUpdate(
      editingMedia.catIndex,
      editingMedia.dishIndex,
      "mediaTransform",
      transform,
    );
    setEditingMedia(null);
  };

  const handleSaveAll = () => {
    supabaseService
      .saveMenu(menuItems)
      .then(() => setUnsavedChanges(false))
      .catch((err: Error) => {
        console.error("Save failed:", err);
        alert(`Failed to save menu: ${err?.message ?? "Unknown error"}. Please try again.`);
      });
  };

  const COLORS = ["#fff", "#666", "#333", "#999"];

  // Plan Info Component to reuse in Mobile/Desktop
  const PlanInfo = () => (
    <div className="px-6 pb-4 mt-auto">
      <div
        className={`p-3 rounded-lg border ${userTier === UserTier.PLUS ? "bg-purple-900/20 border-purple-500/50" : "bg-zinc-900 border-zinc-800"}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Plus
            size={14}
            strokeWidth={3}
            className={
              userTier === UserTier.PLUS ? "text-purple-400" : "text-zinc-500"
            }
          />
          <span
            className={`text-xs font-bold tracking-widest ${userTier === UserTier.PLUS ? "text-purple-400" : "text-zinc-500"}`}
          >
            {userTier === UserTier.PLUS ? "PLUS PLAN" : "FREE PLAN"}
          </span>
        </div>
        {userTier === UserTier.FREE && (
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setPaywallTrigger("Upgrade to Plus");
            }}
            className="text-[10px] text-white underline mt-1"
          >
            Upgrade to Plus
          </button>
        )}
      </div>
    </div>
  );

  const NavigationLinks = () => (
    <nav className="flex-1 px-4 py-2 space-y-1">
      <button
        onClick={() => {
          setCurrentView("DASHBOARD");
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${currentView === "DASHBOARD" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "text-zinc-500 hover:text-white hover:bg-zinc-900"}`}
      >
        <TrendingUp size={18} />
        <span className="font-medium">Analytics</span>
      </button>
      <button
        onClick={() => {
          setCurrentView("MENU");
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${currentView === "MENU" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "text-zinc-500 hover:text-white hover:bg-zinc-900"}`}
      >
        <Utensils size={18} />
        <span className="font-medium">Menu Editor</span>
      </button>
      <button
        onClick={() => {
          setCurrentView("CUSTOMERS");
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${currentView === "CUSTOMERS" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "text-zinc-500 hover:text-white hover:bg-zinc-900"}`}
      >
        <Users size={18} />
        <span className="font-medium">Customers</span>
      </button>
    </nav>
  );

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Paywall Modal */}
      {paywallTrigger && (
        <PaywallModal
          trigger={paywallTrigger}
          onClose={() => setPaywallTrigger(null)}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* QR Modal */}
      {isQrModalOpen && <QrCodeModal onClose={() => setIsQrModalOpen(false)} />}

      {/* Media Editor Modal */}
      {editingMedia && (
        <MediaEditor
          file={editingMedia.file}
          initialPreviewUrl={editingMedia.previewUrl}
          onSave={onMediaEditorSave}
          onCancel={() => setEditingMedia(null)}
        />
      )}

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <span className="font-bold text-black text-xs">M</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Minute Menus
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-white p-1"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 flex justify-end">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-zinc-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <div className="px-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Navigation</h2>
            <p className="text-zinc-500 text-sm">Manage your restaurant.</p>
          </div>
          <NavigationLinks />
          <PlanInfo />
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-black border-r border-zinc-800 flex-col hidden md:flex h-full">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <span className="font-bold text-black text-lg">M</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Minute Menus
          </span>
        </div>

        <NavigationLinks />
        <PlanInfo />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col bg-black relative pt-14 md:pt-0">
        {/* Dashboard View */}
        {currentView === "DASHBOARD" && metrics && (
          <div className="flex-1 overflow-y-auto p-4 md:p-12 animate-in fade-in duration-500 pb-24">
            <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 md:mb-12 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-2">
                  Dashboard
                </h1>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <p className="text-zinc-500 text-sm">Live Updates (10s)</p>
                  </div>

                  {/* Date Range Filter */}
                  <div className="flex bg-zinc-900 rounded-md p-1 ml-0 md:ml-4">
                    {(["24h", "7d", "30d"] as TimeWindow[]).map((w) => (
                      <button
                        key={w}
                        onClick={() => setTimeWindow(w)}
                        className={`px-3 py-1 text-xs font-bold rounded ${timeWindow === w ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
                      >
                        {w.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 border border-zinc-700 hover:bg-white hover:text-black text-white px-4 sm:px-6 py-2 rounded text-sm font-medium transition-colors self-start md:self-auto w-full sm:w-auto justify-center sm:justify-start"
              >
                <Download size={14} />
                Export CSV
              </button>
            </header>

            {/* Key Metrics Grid - Connected to Real Data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
              {[
                {
                  label: "Avg Order Time",
                  value: `${Math.floor(metrics.avgOrderTime / 60)}m ${(metrics.avgOrderTime % 60).toFixed(0)}s`,
                  sub: "From App Open",
                },
                {
                  label: "Conversion Rate",
                  value: `${metrics.conversionRate.toFixed(1)}%`,
                  sub: "Orders / Est. Sessions",
                },
                {
                  label: "Total Views",
                  value: metrics.totalViews,
                  sub: `Past ${timeWindow}`,
                },
                {
                  label: "Top Performer",
                  value:
                    metrics.dishPerformance[0]?.name.substring(0, 15) + "..." ||
                    "-",
                  sub: "Highest Engagement",
                },
              ].map((metric, i) => (
                <div
                  key={i}
                  onClick={() => triggerPaywall("Detailed Analytics")}
                  className="bg-zinc-900/50 p-3 sm:p-4 md:p-6 rounded border border-zinc-800 hover:border-zinc-600 transition-colors group cursor-pointer hover:bg-zinc-900"
                >
                  <div className="text-zinc-500 mb-2 md:mb-3 text-xs uppercase tracking-widest group-hover:text-zinc-300 transition-colors">
                    {metric.label}
                  </div>
                  <div className="text-xl md:text-3xl font-light text-white mb-1 md:mb-2 truncate">
                    {metric.value}
                  </div>
                  <div className="text-xs text-zinc-600 font-mono">
                    {metric.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Insights Section */}
            <section className="mb-8 md:mb-12">
              <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-white"></div>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="text-white" size={20} />
                      <h2 className="text-lg font-medium text-white">
                        Analysis Engine
                      </h2>
                    </div>
                    <button
                      onClick={handleGenerateInsights}
                      disabled={isLoadingInsights}
                      className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-5 py-2 rounded text-sm font-bold transition-all disabled:opacity-50 w-full md:w-auto justify-center"
                    >
                      {isLoadingInsights ? (
                        <Sparkles className="animate-spin" size={14} />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {isLoadingInsights ? "PROCESSING" : "GENERATE REPORT"}
                    </button>
                  </div>

                  <div className="min-h-[80px]">
                    {insights ? (
                      <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed font-light whitespace-pre-line">
                        {insights}
                      </div>
                    ) : (
                      <p className="text-zinc-600 text-sm italic">
                        Click generate to analyze real-time patterns...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
              {/* 1. Views Over Time (Hourly/Daily) */}
              <div
                className="bg-black border border-zinc-800 p-4 md:p-6 rounded relative group cursor-pointer overflow-hidden"
                onClick={() => triggerPaywall("Detailed Analytics")}
              >
                <div className="flex justify-between items-center mb-8 relative z-20">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    Views Over Time
                  </h3>
                  {userTier === UserTier.FREE && (
                    <Lock size={16} className="text-zinc-500" />
                  )}
                </div>

                <div
                  className={`h-64 w-full transition-all duration-500 ${userTier === UserTier.FREE ? "filter blur-md opacity-40 pointer-events-none" : ""}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.hourlyTraffic}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#333"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="hour"
                        stroke="#666"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#666"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#000",
                          borderColor: "#333",
                          color: "#fff",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#fff"
                        strokeWidth={2}
                        dot={{ fill: "black", stroke: "white" }}
                        activeDot={{ r: 6, fill: "white" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {userTier === UserTier.FREE && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <div className="bg-black p-3 rounded-full mb-3 border border-zinc-800 shadow-xl">
                      <Lock size={20} className="text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">
                      Unlock Plus
                    </h3>
                    <p className="text-zinc-400 text-xs mb-4">
                      View detailed analytics
                    </p>
                    <button className="bg-white text-black px-5 py-2 rounded-full font-bold text-[10px] tracking-widest hover:bg-zinc-200 transition-colors shadow-lg border border-white">
                      UNLOCK WITH PLUS
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Conversion Funnel */}
              <div
                className="bg-black border border-zinc-800 p-4 md:p-6 rounded relative group cursor-pointer overflow-hidden"
                onClick={() => triggerPaywall("Detailed Analytics")}
              >
                <div className="flex justify-between items-center mb-8 relative z-20">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    Conversion Funnel
                  </h3>
                  {userTier === UserTier.FREE && (
                    <Lock size={16} className="text-zinc-500" />
                  )}
                </div>

                <div
                  className={`h-64 w-full transition-all duration-500 ${userTier === UserTier.FREE ? "filter blur-md opacity-40 pointer-events-none" : ""}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.conversionFunnel}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#333"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        stroke="#666"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        dataKey="stage"
                        type="category"
                        width={100}
                        stroke="#999"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#222" }}
                        contentStyle={{
                          backgroundColor: "#000",
                          borderColor: "#333",
                          color: "#fff",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#fff"
                        barSize={30}
                        radius={[0, 4, 4, 0]}
                      >
                        {metrics.conversionFunnel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {userTier === UserTier.FREE && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <div className="bg-black p-3 rounded-full mb-3 border border-zinc-800 shadow-xl">
                      <Lock size={20} className="text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">
                      Unlock Plus
                    </h3>
                    <p className="text-zinc-400 text-xs mb-4">
                      Get funnel insights
                    </p>
                    <button className="bg-white text-black px-5 py-2 rounded-full font-bold text-[10px] tracking-widest hover:bg-zinc-200 transition-colors shadow-lg border border-white">
                      UNLOCK WITH PLUS
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Top 5 Items Performance */}
              <div
                className="bg-black border border-zinc-800 p-4 md:p-6 rounded relative group cursor-pointer overflow-hidden"
                onClick={() => triggerPaywall("Detailed Analytics")}
              >
                <div className="flex justify-between items-center mb-8 relative z-20">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    Top 5 Items Performance
                  </h3>
                  {userTier === UserTier.FREE && (
                    <Lock size={16} className="text-zinc-500" />
                  )}
                </div>
                <div
                  className={`h-64 w-full transition-all duration-500 ${userTier === UserTier.FREE ? "filter blur-md opacity-40 pointer-events-none" : ""}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.dishPerformance.slice(0, 5)}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#333"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#666"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) =>
                          val.length > 10 ? val.substring(0, 8) + ".." : val
                        }
                      />
                      <YAxis
                        stroke="#666"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#000",
                          borderColor: "#333",
                          color: "#fff",
                        }}
                      />
                      <Bar
                        dataKey="views"
                        fill="#fff"
                        barSize={20}
                        radius={[4, 4, 0, 0]}
                        name="Views"
                      />
                      <Bar
                        dataKey="conversions"
                        fill="#333"
                        barSize={20}
                        radius={[4, 4, 0, 0]}
                        name="Orders/Conversions"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {userTier === UserTier.FREE && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <div className="bg-black p-3 rounded-full mb-3 border border-zinc-800 shadow-xl">
                      <Lock size={20} className="text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">
                      Unlock Plus
                    </h3>
                    <p className="text-zinc-400 text-xs mb-4">
                      Track item performance
                    </p>
                    <button className="bg-white text-black px-5 py-2 rounded-full font-bold text-[10px] tracking-widest hover:bg-zinc-200 transition-colors shadow-lg border border-white">
                      UNLOCK WITH PLUS
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Peak Activity (Hourly Traffic Heatmap Proxy) */}
              <div
                className="bg-black border border-zinc-800 p-4 md:p-6 rounded relative group cursor-pointer overflow-hidden"
                onClick={() => triggerPaywall("Detailed Analytics")}
              >
                <div className="flex justify-between items-center mb-8 relative z-20">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    Peak Activity Hours
                  </h3>
                  {userTier === UserTier.FREE && (
                    <Lock size={16} className="text-zinc-500" />
                  )}
                </div>
                <div
                  className={`h-64 w-full flex items-center justify-center transition-all duration-500 ${userTier === UserTier.FREE ? "filter blur-md opacity-40 pointer-events-none" : ""}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.hourlyTraffic}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#333"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="hour"
                        stroke="#666"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#000",
                          borderColor: "#333",
                          color: "#fff",
                        }}
                      />
                      <Bar
                        dataKey="views"
                        fill="#4ade80"
                        barSize={15}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {userTier === UserTier.FREE && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                    <div className="bg-black p-3 rounded-full mb-3 border border-zinc-800 shadow-xl">
                      <Lock size={20} className="text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">
                      Unlock Plus
                    </h3>
                    <p className="text-zinc-400 text-xs mb-4">
                      Analyze peak times
                    </p>
                    <button className="bg-white text-black px-5 py-2 rounded-full font-bold text-[10px] tracking-widest hover:bg-zinc-200 transition-colors shadow-lg border border-white">
                      UNLOCK WITH PLUS
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Menu Management View */}
        {currentView === "MENU" && (
          <div className="flex-1 overflow-y-auto bg-black animate-in slide-in-from-right-4 duration-500 pb-24">
            {/* Menu Header */}
            <header className="bg-black/80 backdrop-blur-md sticky top-0 z-20 px-4 md:px-8 py-5 border-b border-zinc-800 flex flex-col md:flex-row justify-between md:items-center gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
                  Menu Editor
                </h1>
                <p className="text-zinc-500 text-xs mt-1">
                  Add categories, upload reels, and fill in item details — then hit Save.
                </p>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                {/* Unsaved changes pill */}
                {unsavedChanges && (
                  <button
                    onClick={handleSaveAll}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-xs font-bold tracking-widest hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] animate-in fade-in duration-300"
                  >
                    <Save size={13} />
                    SAVE CHANGES
                  </button>
                )}

                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="group flex items-center gap-2 border border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white pl-4 pr-3 py-2 rounded-full transition-all duration-300"
                  title="QR Code Studio"
                >
                  <span className="text-xs font-bold tracking-widest">QR CODES</span>
                  <div className="w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-black transition-colors">
                    <QrCode size={13} fill="currentColor" className="ml-0.5" />
                  </div>
                </button>

                <button
                  onClick={onNavigateToCustomer}
                  className="group flex items-center gap-2 border border-zinc-700 hover:bg-white hover:border-white hover:text-black text-white pl-4 pr-3 py-2 rounded-full transition-all duration-300"
                  title="Open Live Customer View"
                >
                  <span className="text-xs font-bold tracking-widest">LIVE VIEW</span>
                  <div className="w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                    <Play size={11} fill="currentColor" className="ml-0.5" />
                  </div>
                </button>
              </div>
            </header>

            {/* Category Tabs */}
            <div className="px-4 md:px-8 pt-6 pb-0 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-1 overflow-x-auto">
                {menuItems.length === 0 && (
                  <span className="text-zinc-600 text-sm italic mr-4">No categories yet — click + to add one</span>
                )}
                {menuItems.map((cat, idx) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryIdx(idx)}
                    className={`relative px-5 py-3 text-sm font-semibold tracking-wide transition-all duration-300 whitespace-nowrap rounded-t-md ${selectedCategoryIdx === idx
                      ? "text-white bg-black border border-b-black border-zinc-800"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                      }`}
                  >
                    {cat.title}
                    <span className="ml-2 text-[10px] text-zinc-600 font-mono">
                      {cat.items.length}
                    </span>
                  </button>
                ))}
                <button
                  onClick={handleAddCategory}
                  title="Add Category"
                  className="ml-2 flex items-center gap-1.5 px-3 py-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-md transition-colors text-xs font-bold tracking-widest border border-transparent hover:border-zinc-700"
                >
                  <Plus size={14} />
                  ADD CATEGORY
                </button>
              </div>
            </div>

            {/* Category Title + Actions bar */}
            {menuItems.length > 0 && (
              <div className="px-4 md:px-8 py-4 bg-black border-b border-zinc-900 flex items-center justify-between gap-4">
                {isEditingCategory ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200 flex-1">
                    <input
                      value={tempCategoryTitle}
                      onChange={(e) => setTempCategoryTitle(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-600 text-white px-3 py-1.5 rounded-lg outline-none focus:border-white font-medium text-base max-w-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const newMenu = [...menuItems];
                          newMenu[selectedCategoryIdx].title = tempCategoryTitle;
                          setMenuItems(newMenu);
                          setIsEditingCategory(false);
                          setUnsavedChanges(true);
                        }
                        if (e.key === "Escape") setIsEditingCategory(false);
                      }}
                    />
                    <button
                      onClick={() => {
                        const newMenu = [...menuItems];
                        newMenu[selectedCategoryIdx].title = tempCategoryTitle;
                        setMenuItems(newMenu);
                        setIsEditingCategory(false);
                        setUnsavedChanges(true);
                      }}
                      className="text-xs bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-zinc-200"
                    >
                      SAVE NAME
                    </button>
                    <button
                      onClick={() => setIsEditingCategory(false)}
                      className="text-zinc-500 hover:text-white p-1.5"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                    setTempCategoryTitle(menuItems[selectedCategoryIdx].title);
                    setIsEditingCategory(true);
                  }}>
                    <h2 className="text-lg font-semibold text-white">
                      {menuItems[selectedCategoryIdx]?.title}
                    </h2>
                    <Edit2 size={13} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                )}

                <button
                  onClick={handleAddDish}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all hover:border-zinc-500"
                >
                  <Plus size={15} />
                  Add Item
                </button>
              </div>
            )}

            {/* Items Grid or Empty State */}
            {menuItems.length === 0 ? (
              /* ── Full empty state: no categories at all ── */
              <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                  <Utensils size={36} strokeWidth={1.2} className="text-zinc-500" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-3">Your menu is empty</h2>
                <p className="text-zinc-500 text-sm max-w-sm mb-8 leading-relaxed">
                  Start by creating a <strong className="text-zinc-300">Category</strong> (e.g. "Starters", "Mains", "Drinks"),
                  then add items inside it. Each item gets a short-form video reel that customers swipe through.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-12">
                  <button
                    onClick={handleAddCategory}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all"
                  >
                    <Plus size={16} />
                    Create First Category
                  </button>
                </div>
                {/* How-to steps */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
                  {[
                    { step: "1", title: "Create a Category", desc: "Group your items — Starters, Mains, Drinks, etc." },
                    { step: "2", title: "Add Menu Items", desc: "Give each dish a name, description, and price." },
                    { step: "3", title: "Upload a Reel", desc: "Add a short video or photo to each dish card." },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 text-left">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 mb-3">{step}</div>
                      <p className="text-white font-semibold text-sm mb-1">{title}</p>
                      <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : menuItems[selectedCategoryIdx]?.items.length === 0 ? (
              /* ── Category exists but has no items ── */
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                  <Plus size={28} strokeWidth={1.5} className="text-zinc-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No items in this category</h3>
                <p className="text-zinc-500 text-sm max-w-xs mb-6 leading-relaxed">
                  Click <strong className="text-zinc-300">Add Item</strong> above to create your first dish. You can then upload a video reel and fill in its details.
                </p>
                <button
                  onClick={handleAddDish}
                  className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all"
                >
                  <Plus size={15} />
                  Add First Item
                </button>
              </div>
            ) : (
              /* ── Items Grid ── */
              <div className="px-4 md:px-8 py-8 pb-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {menuItems[selectedCategoryIdx]?.items.map((dish, idx) => (
                    <div
                      key={dish.id}
                      className="w-full group flex flex-col relative"
                    >
                      {/* Options Menu Button */}
                      <div className="absolute top-3 right-3 z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOptionsDishId(
                              activeOptionsDishId === dish.id ? null : dish.id,
                            );
                          }}
                          className="w-8 h-8 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors border border-white/20"
                        >
                          <MoreVertical size={15} />
                        </button>

                        {/* Options Dropdown */}
                        {activeOptionsDishId === dish.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-40 animate-in fade-in slide-in-from-top-2">
                            <button
                              onClick={() => handleDuplicateDish(selectedCategoryIdx, idx)}
                              className="w-full px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3 border-b border-zinc-800"
                            >
                              <Copy size={14} />
                              Duplicate Item
                            </button>
                            <button
                              onClick={() => { alert("Marked as sold out"); setActiveOptionsDishId(null); }}
                              className="w-full px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3 border-b border-zinc-800"
                            >
                              <EyeOff size={14} />
                              Mark Sold Out
                            </button>
                            <button
                              onClick={() => handleDeleteDish(selectedCategoryIdx, idx)}
                              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center gap-3"
                            >
                              <Trash2 size={14} />
                              Delete Item
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Media / Reel Upload */}
                      <div className="relative w-full aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 group-hover:border-zinc-600 transition-all duration-500 shadow-lg mb-4">
                        <div className="w-full h-full overflow-hidden relative bg-black">
                          {dish.videoUrl ? (
                            <video
                              src={dish.videoUrl}
                              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-500"
                              style={
                                dish.mediaTransform
                                  ? { transform: `translate(${dish.mediaTransform.x}%, ${dish.mediaTransform.y}%) scale(${dish.mediaTransform.scale})`, transformOrigin: "center center" }
                                  : {}
                              }
                              autoPlay muted loop playsInline
                            />
                          ) : dish.imageUrl ? (
                            <img
                              src={dish.imageUrl}
                              alt={dish.name}
                              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-500"
                              style={
                                dish.mediaTransform
                                  ? { transform: `translate(${dish.mediaTransform.x}%, ${dish.mediaTransform.y}%) scale(${dish.mediaTransform.scale})`, transformOrigin: "center center" }
                                  : {}
                              }
                            />
                          ) : (
                            /* No media placeholder */
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-700">
                              <ImageIcon size={32} strokeWidth={1.2} />
                              <span className="text-xs font-mono tracking-widest">NO MEDIA</span>
                            </div>
                          )}
                        </div>

                        {/* Upload overlay on hover */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 backdrop-blur-[2px]">
                          <label className="cursor-pointer flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mb-3 hover:bg-white hover:text-black transition-all">
                              {dish.videoUrl ? <Video size={20} /> : <ImageIcon size={20} />}
                            </div>
                            <span className="text-xs font-bold tracking-widest uppercase text-white">
                              {dish.videoUrl || dish.imageUrl ? "Change Media" : "Upload Reel / Photo"}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,video/*"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  onFileSelect(selectedCategoryIdx, idx, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>

                        {/* Slot badge */}
                        <div className="absolute top-3 left-3 text-[10px] font-mono text-zinc-500 bg-black/60 px-2 py-0.5 rounded z-10">
                          #{idx + 1}
                        </div>
                      </div>

                      {/* Form Fields */}
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1 block">Item Name</label>
                          <input
                            type="text"
                            value={dish.name}
                            onChange={(e) => handleDishUpdate(selectedCategoryIdx, idx, "name", e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-base font-medium text-white focus:border-zinc-500 outline-none transition-all placeholder-zinc-700"
                            placeholder="e.g. Butter Chicken"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1 block">Description</label>
                          <textarea
                            value={dish.description}
                            onChange={(e) => handleDishUpdate(selectedCategoryIdx, idx, "description", e.target.value)}
                            rows={3}
                            maxLength={500}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-zinc-600 focus:text-white outline-none transition-all resize-none leading-relaxed placeholder-zinc-700"
                            placeholder="Ingredients, flavour notes..."
                          />
                          <div className="text-right text-[10px] text-zinc-600 mt-0.5 font-mono">
                            {dish.description.length} / 500
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                          <label className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Price</label>
                          <div className="flex items-center gap-1">
                            <DollarSign size={12} className="text-zinc-400" />
                            <input
                              type="number"
                              value={dish.price}
                              onFocus={(e) => {
                                if (userTier === UserTier.FREE) {
                                  e.target.blur();
                                  setPaywallTrigger("Smart Pricing");
                                }
                              }}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleDishUpdate(selectedCategoryIdx, idx, "price", isNaN(val) ? 0 : Math.max(0, val));
                              }}
                              step="0.50"
                              className="w-20 bg-transparent text-right font-mono text-white focus:outline-none py-0.5 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add another item card */}
                  <button
                    onClick={handleAddDish}
                    className="w-full aspect-[9/16] rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40 flex flex-col items-center justify-center gap-3 transition-all text-zinc-600 hover:text-zinc-300 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 group-hover:bg-zinc-800 transition-all border border-zinc-800">
                      <Plus size={28} />
                    </div>
                    <span className="font-bold tracking-widest uppercase text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      Add Item
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === "CUSTOMERS" && (
          <div className="flex items-center justify-center h-full text-zinc-600 bg-black animate-in fade-in">
            <div className="text-center">
              <Users
                size={48}
                strokeWidth={1}
                className="mx-auto mb-6 opacity-50"
              />
              <h2 className="text-xl font-light text-white mb-2">
                Customer Directory
              </h2>
              <p className="font-mono text-xs">
                CRM MODULE v1.1 PENDING UPDATE
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
