import { ImageEditorView } from "../components/ImageEditorView";
import {
  AlertTriangle,
  BrainCircuit,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  Crown,
  Download,
  Edit2,
  EyeOff,
  Image as ImageIcon,
  LayoutDashboard,
  Link as LinkIcon,
  Lock,
  LogOut,
  Loader2,
  Menu,
  Moon,
  MoreVertical,
  MousePointer2,
  Move,
  Package,
  PauseCircle,
  Play,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Utensils,
  Video,
  X,
  ZoomIn,
} from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
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
import { SUPPORTED_CURRENCIES, formatPriceInCurrency, getSymbolForCurrency } from "@minute-menus/currency";
import { getErrorMessage } from "@minute-menus/errors";
import { compressDataUrl } from "@minute-menus/menu-persistence";
import { generateAnalyticsReport } from "@minute-menus/ai";
import { supabaseService } from "../services/supabaseService";
import { supabase } from "../lib/supabase";
import {
  type AggregatedMetrics,
  type AnalyticsReport,
  type Category,
  type CustomerDirectoryEntry,
  type CustomerSubscription,
  type DailyOrder,
  type DeliveryTicket,
  type Dish,
  type MealPlan,
  type RefundRequest,
  type TicketReason,
  TICKET_REASON_LABELS,
  TIME_SLOT_LABELS,
  UserTier,
} from "@minute-menus/types";
import {
  ButtonSpinner,
  InlineLoader,
  PanelLoader,
  SaveChangesButton,
} from "@minute-menus/ui";

type ViewMode = "DASHBOARD" | "MENU" | "IMAGE_EDITOR" | "CUSTOMERS" | "SUBSCRIPTIONS";
type SubTab = "plans" | "subscribers" | "tomorrow" | "tickets" | "refunds";
type TimeWindow = "24h" | "7d" | "30d";

// --- Paywall Modal Component ---
interface PaywallModalProps {
  onClose: () => void;
  onUpgrade: () => void;
  trigger: string;
  isDarkTheme: boolean;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  onClose,
  onUpgrade,
  trigger,
  isDarkTheme,
}) => {
  return (
    <div className={`fixed inset-0 z-[100] backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 ${isDarkTheme ? 'bg-black/80' : 'bg-white/80'}`}>
      <div className={`border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}>
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
        <div className={`p-8 md:w-3/5 relative ${isDarkTheme ? 'bg-black' : 'bg-zinc-50'}`}>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 ${isDarkTheme ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
          >
            <X size={20} />
          </button>

          <div className="text-center mb-8">
            <p className={`text-xs uppercase tracking-widest mb-1 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Feature Locked
            </p>
            <h3 className={`text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{trigger}</h3>
          </div>

          <div className="space-y-4">
            <button
              onClick={onUpgrade}
              className={`w-full border p-4 rounded-lg flex justify-between items-center group transition-all ${isDarkTheme ? 'border-white/20 bg-zinc-900 hover:bg-zinc-800' : 'border-zinc-300 bg-white hover:bg-zinc-100'}`}
            >
              <div className="text-left">
                <div className={`font-bold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>Annual Plan</div>
                <div className={`text-xs ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>Billed $120/year</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-green-900/30 text-green-400 text-[10px] font-bold px-2 py-1 rounded">
                  SAVE 17%
                </span>
                <span className={`text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                  $10
                  <span className={`text-xs font-normal ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>/mo</span>
                </span>
              </div>
            </button>

            <button
              onClick={onUpgrade}
              className={`w-full border p-4 rounded-lg flex justify-between items-center transition-all ${isDarkTheme ? 'border-white bg-white hover:bg-zinc-200' : 'border-zinc-900 bg-zinc-900 hover:bg-zinc-800'}`}
            >
              <div className="text-left">
                <div className={`font-bold ${isDarkTheme ? 'text-black' : 'text-white'}`}>Monthly Plan</div>
                <div className={isDarkTheme ? 'text-zinc-600 text-xs' : 'text-zinc-400 text-xs'}>Cancel anytime</div>
              </div>
              <span className={`text-xl font-bold ${isDarkTheme ? 'text-black' : 'text-white'}`}>
                $12
                <span className={`text-xs font-normal ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>/mo</span>
              </span>
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={onClose}
              className={`text-xs ${isDarkTheme ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-500 hover:text-zinc-700'}`}
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
  restaurantSlug: string;
  restaurantName: string;
  onSlugUpdated: (newSlug: string) => void;
  isDarkTheme: boolean;
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({
  onClose,
  restaurantSlug: initialSlug,
  restaurantName,
  onSlugUpdated,
  isDarkTheme,
}) => {
  const [color, setColor] = useState("#000000");
  const [copied, setCopied] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [editedSlug, setEditedSlug] = useState(initialSlug);
  const [isEditing, setIsEditing] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFixingSlug, setIsFixingSlug] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Check if slug is a UUID (legacy format)
  const isUuidSlug = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentSlug);

  // Auto-fix legacy UUID slugs on mount
  useEffect(() => {
    if (isUuidSlug) {
      setIsFixingSlug(true);
      supabaseService.fixLegacySlug()
        .then((newSlug) => {
          setCurrentSlug(newSlug);
          setEditedSlug(newSlug);
          onSlugUpdated(newSlug);
        })
        .catch(console.error)
        .finally(() => setIsFixingSlug(false));
    }
  }, []);

  // Generate the restaurant URL - use production URL if set, otherwise window.location.origin
  const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const restaurantUrl = `${baseUrl}/${currentSlug}`;

  const handleSaveSlug = async () => {
    const slug = editedSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "");
    if (!slug) {
      setSlugError("URL cannot be empty");
      return;
    }
    if (slug === currentSlug) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSlugError(null);
    try {
      await supabaseService.updateRestaurantSlug(slug);
      setCurrentSlug(slug);
      setEditedSlug(slug);
      setIsEditing(false);
      onSlugUpdated(slug);
    } catch (err) {
      setSlugError(getErrorMessage(err, "Failed to update URL"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(restaurantUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `${currentSlug}-qr-code.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleDownloadSVG = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.download = `${currentSlug}-qr-code.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed inset-0 z-[70] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 ${isDarkTheme ? 'bg-black/90' : 'bg-white/90'}`}>
      <div className={`border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}>
        <div className={`p-6 border-b flex justify-between items-center ${isDarkTheme ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-3">
            <QrCode className={isDarkTheme ? 'text-white' : 'text-zinc-900'} size={20} />
            <h2 className={`text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>QR Code Studio</h2>
          </div>
          <button onClick={onClose}>
            <X size={20} className={`${isDarkTheme ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`} />
          </button>
        </div>

        <div className={`p-8 flex flex-col items-center ${isDarkTheme ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
          {/* Loading state when fixing legacy slug */}
          {isFixingSlug && (
            <div className="text-center mb-6">
              <div className={`animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mx-auto mb-2 ${isDarkTheme ? 'border-white' : 'border-zinc-900'}`} />
              <p className={`text-sm ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>Generating friendly URL...</p>
            </div>
          )}

          {/* QR Code Display */}
          <div ref={qrRef} className="bg-white p-6 rounded-xl shadow-xl mb-6">
            <QRCodeCanvas
              value={restaurantUrl}
              size={200}
              bgColor="#ffffff"
              fgColor={color}
              level="H"
              marginSize={1}
            />
            {/* Hidden SVG for download */}
            <div className="hidden">
              <QRCodeSVG
                value={restaurantUrl}
                size={400}
                bgColor="#ffffff"
                fgColor={color}
                level="H"
              />
            </div>
          </div>

          {/* Restaurant Name */}
          <p className={`font-bold text-lg mb-2 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{restaurantName}</p>

          {/* URL Display & Edit */}
          <div className="w-full mb-6">
            {isEditing ? (
              <div className="space-y-2">
                <div className={`flex items-center gap-2 rounded-lg p-3 ${isDarkTheme ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <span className={`text-sm ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>{baseUrl}/</span>
                  <input
                    type="text"
                    value={editedSlug}
                    onChange={(e) => setEditedSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    className={`flex-1 bg-transparent text-sm border-b outline-none ${isDarkTheme ? 'text-white border-zinc-600 focus:border-white' : 'text-zinc-900 border-zinc-300 focus:border-zinc-900'}`}
                    placeholder="your-restaurant-name"
                    autoFocus
                  />
                </div>
                {slugError && <p className="text-red-400 text-xs">{slugError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSlug}
                    disabled={isSaving}
                    className={`flex-1 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50 ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                  >
                    {isSaving ? "Saving..." : "Save URL"}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditedSlug(currentSlug); setSlugError(null); }}
                    className={`px-4 py-2 rounded font-medium text-sm transition-colors ${isDarkTheme ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-lg p-3 flex items-center justify-between gap-2 ${isDarkTheme ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <code className={`text-sm truncate flex-1 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {restaurantUrl}
                </code>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`p-1.5 rounded transition-colors ${isDarkTheme ? 'hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'}`}
                    title="Edit URL"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={handleCopyUrl}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isDarkTheme ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'}`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Color Selection */}
          <div className="w-full space-y-6">
            <div className="text-center">
              <label className={`text-xs uppercase tracking-widest mb-4 block ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>
                Select Brand Color
              </label>
              <div className="flex gap-4 justify-center">
                {[
                  { hex: "#000000", label: "Black" },
                  { hex: "#4f46e5", label: "Indigo" },
                  { hex: "#10b981", label: "Emerald" },
                  { hex: "#f43f5e", label: "Rose" },
                  { hex: "#f59e0b", label: "Amber" },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    className={`w-10 h-10 rounded-full border-2 transition-all shadow-lg ${color === c.hex ? (isDarkTheme ? "border-white scale-110" : "border-zinc-900 scale-110") : "border-transparent hover:scale-110"}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Download Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleDownloadPNG}
                className={`py-3 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2 ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
              >
                <Download size={16} />
                PNG
              </button>
              <button
                onClick={handleDownloadSVG}
                className={`py-3 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2 border ${isDarkTheme ? 'bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border-zinc-300'}`}
              >
                <Download size={16} />
                SVG
              </button>
              <button
                onClick={() => window.print()}
                className={`py-3 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2 border ${isDarkTheme ? 'bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border-zinc-300'}`}
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </div>

        <div className={`p-4 border-t text-center ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <p className={`text-[10px] ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>
            Print this QR code on table tents, menus, or at the entrance.
            Customers scan to view your menu instantly.
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
  isDarkTheme: boolean;
}

const MediaEditor: React.FC<MediaEditorProps> = ({
  file,
  initialPreviewUrl,
  initialTransform,
  onSave,
  onCancel,
  isDarkTheme,
}) => {
  const [scale, setScale] = useState(initialTransform?.scale || 1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCompressing, setIsCompressing] = useState(false);
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

  const handleConfirm = async () => {
    if (!containerRef.current || isCompressing) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const xPercent = (position.x / width) * 100;
    const yPercent = (position.y / height) * 100;
    let processedUrl = initialPreviewUrl;

    if (!isVideo) {
      setIsCompressing(true);
      try {
        processedUrl = await compressDataUrl(initialPreviewUrl);
      } catch (error) {
        console.error("Image compression failed:", error);
      } finally {
        setIsCompressing(false);
      }
    }

    onSave(processedUrl, { x: xPercent, y: yPercent, scale: scale });
  };

  return (
    <div className={`fixed inset-0 z-[60] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 ${isDarkTheme ? 'bg-black/90' : 'bg-white/90'}`}>
      <div className={`border rounded-xl shadow-2xl max-w-5xl w-full flex flex-col lg:flex-row overflow-hidden h-[85vh] lg:h-auto lg:max-h-[90vh] ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}>
        {/* Left/Top: Preview Area */}
        <div className={`flex-1 relative flex items-center justify-center p-4 lg:p-8 overflow-hidden select-none ${isDarkTheme ? 'bg-black' : 'bg-zinc-100'}`}>
          <div
            ref={containerRef}
            className={`relative w-full max-w-[240px] md:max-w-[280px] lg:max-w-[320px] aspect-[9/16] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border ring-1 group cursor-move touch-none ${isDarkTheme ? 'bg-zinc-800 border-zinc-700 ring-white/10' : 'bg-zinc-200 border-zinc-300 ring-black/10'}`}
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
              <div className={`backdrop-blur text-[10px] px-2 py-1 rounded-full border ${isDarkTheme ? 'bg-black/50 text-white border-white/10' : 'bg-white/50 text-zinc-900 border-black/10'}`}>
                DRAG TO PAN
              </div>
            </div>
          </div>
        </div>

        {/* Right/Bottom: Controls Sidebar */}
        <div className={`w-full lg:w-80 p-6 flex flex-col border-t lg:border-t-0 lg:border-l z-10 shrink-0 h-auto ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="mb-4 lg:mb-6">
            <h3 className={`font-bold text-lg ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>Edit Media</h3>
            <p className={`text-xs ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Adjust your content to fit the vertical 9:16 format.
            </p>
          </div>

          {/* Zoom Control */}
          <div className="mb-4 lg:mb-8 space-y-4 lg:space-y-6">
            <div className="space-y-3">
              <div className={`flex justify-between text-xs ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
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
                className={`w-full h-12 md:h-1 rounded-lg appearance-none cursor-pointer ${isDarkTheme ? 'bg-zinc-700 accent-white' : 'bg-zinc-300 accent-zinc-900'}`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto w-full flex flex-col items-center gap-4">
            <button
              onClick={handleConfirm}
              disabled={isCompressing}
              className={`w-full md:w-[80%] lg:w-full h-12 font-bold text-sm rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
            >
              {isCompressing ? (
                <>
                  <ButtonSpinner />
                  COMPRESSING…
                </>
              ) : (
                "SAVE CHANGES"
              )}
            </button>
            <button
              onClick={onCancel}
              className={`w-full md:w-[80%] lg:w-full h-12 bg-transparent border font-bold text-sm rounded flex items-center justify-center transition-colors ${isDarkTheme ? 'border-zinc-700 text-white hover:bg-zinc-800' : 'border-zinc-300 text-zinc-900 hover:bg-zinc-100'}`}
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
  onSignOut: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onNavigateToCustomer,
  onSignOut,
  isDarkTheme,
  onToggleTheme,
}) => {
  const [currentView, setCurrentView] = useState<ViewMode>("DASHBOARD");
  const [insights, setInsights] = useState<string>("");
  const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReport | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState("");

  // Restaurant Details (for QR code)
  const [restaurantDetails, setRestaurantDetails] = useState<{
    id: string;
    name: string;
    slug: string;
    currency: string;
  } | null>(null);

  // Show first-time setup modal when restaurant was created with default name
  const needsSetup = restaurantDetails?.name === "My Restaurant";

  const handleSetupSave = async () => {
    if (!setupName.trim()) { setSetupError("Please enter a name."); return; }
    setSetupSaving(true);
    setSetupError("");
    try {
      const updated = await supabaseService.updateRestaurantName(setupName.trim());
      setRestaurantDetails(prev => prev ? { ...prev, name: updated.name, slug: updated.slug } : null);
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : "Failed to save. Try again.");
    } finally {
      setSetupSaving(false);
    }
  };

  // Data State
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [menuItems, setMenuItems] = useState<Category[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h");

  // Tier & Paywall State
  const [userTier, setUserTier] = useState<UserTier>(UserTier.FREE);
  const [paywallTrigger, setPaywallTrigger] = useState<string | null>(null);

  // Customer Directory State
  const [customerDirectory, setCustomerDirectory] = useState<CustomerDirectoryEntry[]>([]);
  const [custSearch, setCustSearch] = useState("");
  const [custPage, setCustPage] = useState(0);

  // Subscription Management State
  const [subTab, setSubTab] = useState<SubTab>("plans");
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [customerSubs, setCustomerSubs] = useState<CustomerSubscription[]>([]);
  const [tomorrowOrders, setTomorrowOrders] = useState<DailyOrder[]>([]);
  const [deliveryTickets, setDeliveryTickets] = useState<DeliveryTicket[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [editingPlan, setEditingPlan] = useState<Partial<MealPlan> | null>(null);

  // Editor State
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [tempCategoryTitle, setTempCategoryTitle] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const unsavedChangesRef = useRef(false);
  const [editingMedia, setEditingMedia] = useState<{
    file: File;
    previewUrl: string;
    catIndex: number;
    dishIndex: number;
  } | null>(null);
  const [activeOptionsDishId, setActiveOptionsDishId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    unsavedChangesRef.current = unsavedChanges;
  }, [unsavedChanges]);

  const loadMenuFromServer = () => {
    if (unsavedChangesRef.current) return;
    setMenuLoading(true);
    supabaseService
      .getMenu()
      .then(setMenuItems)
      .catch(console.error)
      .finally(() => setMenuLoading(false));
  };

  const loadRestaurantDetails = () => {
    supabaseService.getRestaurantDetails().then(setRestaurantDetails).catch(console.error);
  };

  const loadDashboardMetrics = () => {
    supabaseService.getAggregatedMetrics(timeWindow).then(setMetrics).catch(console.error);
  };

  const loadSubscriptionData = () => {
    supabaseService.getMealPlans().then(setMealPlans).catch(console.error);
    supabaseService.getCustomerSubscriptions().then(setCustomerSubs).catch(console.error);
    supabaseService.getTomorrowsOrders().then(setTomorrowOrders).catch(console.error);
    supabaseService.getDeliveryTickets().then(setDeliveryTickets).catch(console.error);
    supabaseService.getRefundRequests().then(setRefundRequests).catch(console.error);
  };

  const loadCustomersData = () => {
    supabaseService.getCustomerDirectory().then(setCustomerDirectory).catch(console.error);
  };

  const refreshViewData = (view: ViewMode) => {
    if (view === "DASHBOARD") loadDashboardMetrics();
    if (view === "MENU") loadMenuFromServer();
    if (view === "CUSTOMERS") loadCustomersData();
    if (view === "SUBSCRIPTIONS") loadSubscriptionData();
  };

  // Bootstrap restaurant row + shared owner context (once)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (uid) {
        try {
          const pendingName = localStorage.getItem("mm_pending_restaurant_name") ?? "My Restaurant";
          await supabaseService.ensureRestaurant(pendingName, uid);
          localStorage.removeItem("mm_pending_restaurant_name");
        } catch { /* already exists */ }
      }
      loadRestaurantDetails();
      supabaseService.getTier().then(setUserTier).catch(console.error);
    });
  }, []);

  // Load data only for the active tab
  useEffect(() => {
    refreshViewData(currentView);
  }, [currentView, timeWindow]);

  // Poll analytics/subscriptions only on tabs that use them
  useEffect(() => {
    if (currentView !== "DASHBOARD" && currentView !== "SUBSCRIPTIONS") return;
    const interval = setInterval(() => refreshViewData(currentView), 30000);
    return () => clearInterval(interval);
  }, [currentView, timeWindow]);

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
      const seenKey = `mm_paywall_seen_${reason}`;
      if (sessionStorage.getItem(seenKey)) return false; // already shown this session
      sessionStorage.setItem(seenKey, "1");
      setPaywallTrigger(reason);
      return true;
    }
    return false;
  };

  const handleGenerateInsights = async () => {
    if (triggerPaywall("AI Analysis")) return;
    setIsLoadingInsights(true);
    try {
      const report = await supabaseService.buildAnalyticsReport(timeWindow);
      setAnalyticsReport(report);
      const name = restaurantDetails?.name ?? "the restaurant";
      const text = await generateAnalyticsReport(report, name);
      setInsights(text);
    } catch (err) {
      console.error("Analytics report error:", err);
      setInsights("Failed to generate report. Please try again.");
    } finally {
      setIsLoadingInsights(false);
    }
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
    value: Dish[keyof Dish],
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
      setActiveOptionsDishId(null);
      // Auto-save deletion to database
      supabaseService
        .saveMenu(newMenu)
        .then((saved) => {
          setMenuItems(saved);
          setUnsavedChanges(false);
        })
        .catch((err: unknown) => {
          console.error("Delete save failed:", err);
          alert(`Failed to delete item: ${getErrorMessage(err)}`);
        });
    }
  };

  const handleToggleManualSoldOut = (catIndex: number, dishIndex: number) => {
    const dish = menuItems[catIndex].items[dishIndex];
    const newValue = !dish.manualSoldOut;
    const newMenu = [...menuItems];
    newMenu[catIndex].items[dishIndex] = { ...dish, manualSoldOut: newValue };
    setMenuItems(newMenu);
    setActiveOptionsDishId(null);
    supabaseService
      .toggleManualSoldOut(dish.id, dish.name, newValue)
      .catch((err: unknown) => {
        // Revert on failure
        setMenuItems(menuItems);
        console.error("Failed to toggle sold-out:", err);
        alert(`Failed to update sold-out status: ${getErrorMessage(err)}`);
      });
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
    // Persist immediately so a refresh doesn't lose the new category
    supabaseService.saveMenu(newMenu).catch(console.error);
  };

  const handleAddDish = () => {
    const newDish: Dish = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      ingredients: "",
      benefits: "",
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
    const urlField = isVideo ? "videoUrl" : "imageUrl";

    const newMenu = [...menuItems];
    newMenu[editingMedia.catIndex].items[editingMedia.dishIndex] = {
      ...newMenu[editingMedia.catIndex].items[editingMedia.dishIndex],
      [urlField]: processedUrl,
      mediaTransform: transform,
    };
    setMenuItems(newMenu);
    setEditingMedia(null);
    setUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    setIsSavingMenu(true);
    try {
      const saved = await supabaseService.saveMenu(menuItems);
      setMenuItems(saved);
      setUnsavedChanges(false);
    } catch (err) {
      console.error("Save failed:", err);
      alert(`Failed to save menu: ${getErrorMessage(err)}. Please try again.`);
    } finally {
      setIsSavingMenu(false);
    }
  };

  const COLORS = ["#fff", "#666", "#333", "#999"];

  // Plan Info Component to reuse in Mobile/Desktop
  const PlanInfo = () => (
    <div className="px-6 pb-4 mt-auto">
      <div
        className={`p-3 rounded-lg border ${userTier === UserTier.PLUS ? "bg-purple-900/20 border-purple-500/50" : isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-300"}`}
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
            className={`text-[10px] underline mt-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}
          >
            Upgrade to Plus
          </button>
        )}
      </div>
      <button
        onClick={() => {
          setIsMobileMenuOpen(false);
          onSignOut();
        }}
        className={`w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${isDarkTheme ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'}`}
      >
        <LogOut size={14} />
        Sign Out
      </button>
    </div>
  );

  const NavigationLinks = () => (
    <nav className="flex-1 px-4 py-2 space-y-1">
      <button
        onClick={() => {
          setCurrentView("DASHBOARD");
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${currentView === "DASHBOARD" ? (isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white") + " shadow-[0_0_15px_rgba(255,255,255,0.1)]" : isDarkTheme ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"}`}
      >
        <TrendingUp size={18} />
        <span className="font-medium">Analytics</span>
      </button>
      <button
        onClick={() => {
          setCurrentView("MENU");
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${currentView === "MENU" ? (isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white") + " shadow-[0_0_15px_rgba(255,255,255,0.1)]" : isDarkTheme ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"}`}
      >
        <Utensils size={18} />
        <span className="font-medium">Menu Editor</span>
      </button>
      <button
        onClick={() => {
          setCurrentView("IMAGE_EDITOR");
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${currentView === "IMAGE_EDITOR" ? (isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white") + " shadow-[0_0_15px_rgba(255,255,255,0.1)]" : isDarkTheme ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"}`}
      >
        <Sparkles size={18} />
        <span className="font-medium">Image Editor</span>
      </button>
      <button
        onClick={() => {
          setCurrentView("CUSTOMERS");
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${currentView === "CUSTOMERS" ? (isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white") + " shadow-[0_0_15px_rgba(255,255,255,0.1)]" : isDarkTheme ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"}`}
      >
        <Users size={18} />
        <span className="font-medium">Customers</span>
      </button>
      <button
        onClick={() => {
          setCurrentView("SUBSCRIPTIONS");
          setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${currentView === "SUBSCRIPTIONS" ? (isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white") + " shadow-[0_0_15px_rgba(255,255,255,0.1)]" : isDarkTheme ? "text-zinc-500 hover:text-white hover:bg-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"}`}
      >
        <Package size={18} />
        <span className="font-medium">Subscriptions</span>
      </button>

      {/* QR Code Button - Standalone action */}
      <div className={`pt-4 mt-4 border-t ${isDarkTheme ? 'border-zinc-800' : 'border-zinc-300'}`}>
        <button
          onClick={() => {
            setIsQrModalOpen(true);
            setIsMobileMenuOpen(false);
          }}
          disabled={!restaurantDetails}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${isDarkTheme ? 'bg-gradient-to-r from-zinc-800 to-zinc-900 text-white hover:from-zinc-700 hover:to-zinc-800 border border-zinc-700' : 'bg-gradient-to-r from-zinc-200 to-zinc-300 text-zinc-900 hover:from-zinc-300 hover:to-zinc-400 border border-zinc-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <QrCode size={18} />
          <span className="font-medium">Get QR Code</span>
        </button>

        {/* Currency Selector */}
        <div className="mt-3">
          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>
            Menu Currency
          </label>
          <select
            value={restaurantDetails?.currency ?? "USD"}
            onChange={async (e) => {
              const newCurrency = e.target.value;
              try {
                await supabaseService.updateRestaurantCurrency(newCurrency);
                setRestaurantDetails(prev => prev ? { ...prev, currency: newCurrency } : null);
              } catch (err) {
                console.error("Failed to update currency", err);
              }
            }}
            className={`w-full px-3 py-2 rounded-md text-sm font-medium outline-none transition-all ${isDarkTheme ? 'bg-zinc-900 border border-zinc-800 text-white focus:border-zinc-600' : 'bg-white border border-zinc-300 text-zinc-900 focus:border-zinc-500'}`}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  );

  return (
    <div className={`flex h-screen ${isDarkTheme ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-900'} overflow-hidden font-sans selection:bg-white selection:text-black transition-colors duration-300`}>
      {/* Paywall Modal */}
      {paywallTrigger && (
        <PaywallModal
          trigger={paywallTrigger}
          onClose={() => setPaywallTrigger(null)}
          onUpgrade={handleUpgrade}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* QR Modal */}
      {isQrModalOpen && restaurantDetails && (
        <QrCodeModal
          onClose={() => setIsQrModalOpen(false)}
          restaurantSlug={restaurantDetails.slug}
          restaurantName={restaurantDetails.name}
          onSlugUpdated={(newSlug) => setRestaurantDetails(prev => prev ? { ...prev, slug: newSlug } : null)}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* First-time restaurant setup (Google/OAuth signups bypass the sign-up form) */}
      {needsSetup && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center">
              <div className="w-12 h-12 bg-white rounded-lg mx-auto flex items-center justify-center mb-4">
                <span className="font-bold text-black text-xl">M</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Name your restaurant</h2>
              <p className="text-zinc-400 text-sm">This is shown to customers on your menu and QR code.</p>
            </div>
            <div>
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetupSave()}
                placeholder="e.g. The Spice Garden"
                autoFocus
                className="w-full bg-black border border-zinc-700 text-white px-4 py-3 rounded-lg outline-none focus:border-white transition-all placeholder-zinc-600 text-sm"
              />
              {setupError && <p className="text-red-400 text-xs mt-2">{setupError}</p>}
            </div>
            <button
              onClick={handleSetupSave}
              disabled={setupSaving || !setupName.trim()}
              className="w-full bg-white text-black py-3 rounded-lg font-bold text-sm tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {setupSaving ? <Loader2 className="animate-spin" size={18} /> : "GET STARTED"}
            </button>
          </div>
        </div>
      )}

      {/* Media Editor Modal */}
      {editingMedia && (
        <MediaEditor
          file={editingMedia.file}
          initialPreviewUrl={editingMedia.previewUrl}
          onSave={onMediaEditorSave}
          onCancel={() => setEditingMedia(null)}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* Mobile Header */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-50 border-b px-4 py-3 flex justify-between items-center ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${isDarkTheme ? 'bg-white' : 'bg-zinc-900'}`}>
            <span className={`font-bold text-xs ${isDarkTheme ? 'text-black' : 'text-white'}`}>{(restaurantDetails?.name?.[0] ?? 'M').toUpperCase()}</span>
          </div>
          <span className={`text-sm font-bold tracking-tight ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
            {restaurantDetails?.name ?? 'Minute Menus'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-full transition-colors ${isDarkTheme ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}
          >
            {isDarkTheme ? <Sun size={20} className="text-white" /> : <Moon size={20} className="text-zinc-800" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`p-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className={`fixed inset-0 z-[60] backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-300 ${isDarkTheme ? 'bg-black/95' : 'bg-white/95'}`}>
          <div className="p-4 flex justify-end">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className={`p-2 ${isDarkTheme ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <X size={24} />
            </button>
          </div>
          <div className="px-6 mb-8">
            <h2 className={`text-2xl font-bold mb-2 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>Navigation</h2>
            <p className={`text-sm ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>Manage your restaurant.</p>
          </div>
          <NavigationLinks />
          <PlanInfo />
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`w-64 border-r flex-col hidden md:flex h-full ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${isDarkTheme ? 'bg-white' : 'bg-zinc-900'}`}>
              <span className={`font-bold text-lg ${isDarkTheme ? 'text-black' : 'text-white'}`}>{(restaurantDetails?.name?.[0] ?? 'M').toUpperCase()}</span>
            </div>
            <span className={`text-sm font-bold tracking-tight truncate ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
              {restaurantDetails?.name ?? 'Minute Menus'}
            </span>
          </div>
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-full transition-colors ${isDarkTheme ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}
          >
            {isDarkTheme ? <Sun size={18} className="text-white" /> : <Moon size={18} className="text-zinc-800" />}
          </button>
        </div>

        <NavigationLinks />
        <PlanInfo />
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden flex flex-col relative pt-14 md:pt-0 ${isDarkTheme ? 'bg-black' : 'bg-zinc-50'}`}>
        {/* Dashboard View */}
        {currentView === "DASHBOARD" && metrics && (
          <div className="flex-1 overflow-y-auto p-4 md:p-12 animate-in fade-in duration-500 pb-24">
            <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 md:mb-12 gap-4">
              <div>
                <h1 className={`text-3xl md:text-4xl font-light tracking-tight mb-2 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                  Dashboard
                </h1>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <p className={`text-sm ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>Live Updates (10s)</p>
                  </div>

                  {/* Date Range Filter */}
                  <div className={`flex rounded-md p-1 ml-0 md:ml-4 ${isDarkTheme ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
                    {(["24h", "7d", "30d"] as TimeWindow[]).map((w) => (
                      <button
                        key={w}
                        onClick={() => setTimeWindow(w)}
                        className={`px-3 py-1 text-xs font-bold rounded ${timeWindow === w ? (isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white") : isDarkTheme ? "text-zinc-500 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}
                      >
                        {w.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                className={`flex items-center gap-2 border px-4 sm:px-6 py-2 rounded text-sm font-medium transition-colors self-start md:self-auto w-full sm:w-auto justify-center sm:justify-start ${isDarkTheme ? 'border-zinc-700 hover:bg-white hover:text-black text-white' : 'border-zinc-400 hover:bg-zinc-900 hover:text-white text-zinc-900'}`}
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
                  className={`p-3 sm:p-4 md:p-6 rounded border transition-colors group cursor-pointer ${isDarkTheme ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900' : 'bg-white border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'}`}
                >
                  <div className={`mb-2 md:mb-3 text-xs uppercase tracking-widest transition-colors ${isDarkTheme ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-700'}`}>
                    {metric.label}
                  </div>
                  <div className={`text-xl md:text-3xl font-light mb-1 md:mb-2 truncate ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                    {metric.value}
                  </div>
                  <div className={`text-xs font-mono ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    {metric.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Insights Section */}
            <section className="mb-8 md:mb-12">
              <div className={`border rounded overflow-hidden relative group ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${isDarkTheme ? 'bg-white' : 'bg-zinc-900'}`}></div>
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <BrainCircuit className={isDarkTheme ? 'text-white' : 'text-zinc-900'} size={20} />
                      <h2 className={`text-lg font-medium ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                        Analysis Engine
                      </h2>
                    </div>
                    <button
                      onClick={handleGenerateInsights}
                      disabled={isLoadingInsights}
                      className={`flex items-center gap-2 px-5 py-2 rounded text-sm font-bold transition-all disabled:opacity-50 w-full md:w-auto justify-center ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                    >
                      {isLoadingInsights ? (
                        <Sparkles className="animate-spin" size={14} />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {isLoadingInsights ? "PROCESSING" : "GENERATE REPORT"}
                    </button>
                  </div>

                  {/* Data snapshot pills — visible once report is built */}
                  {analyticsReport && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {[
                        { label: "Revenue", value: `${analyticsReport.currency} ${analyticsReport.revenue.total.toFixed(2)}` },
                        { label: "Orders", value: String(analyticsReport.revenue.orderCount) },
                        { label: "Views", value: String(analyticsReport.engagement.totalViews) },
                        { label: "Engagement", value: `${analyticsReport.engagement.engagementRate.toFixed(1)}%` },
                        { label: "Active Subs", value: String(analyticsReport.subscriptions.active) },
                        { label: "Delivery Rate", value: `${analyticsReport.subscriptions.deliveryRate.toFixed(1)}%` },
                        { label: "New Customers", value: String(analyticsReport.customers.newThisPeriod) },
                      ].map(({ label, value }) => (
                        <span key={label} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${isDarkTheme ? 'border-zinc-700 text-zinc-400' : 'border-zinc-300 text-zinc-600'}`}>
                          <span className={`font-bold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{value}</span>
                          <span>{label}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="min-h-[80px]">
                    {insights ? (
                      <div className="space-y-4">
                        {insights.split(/^## /m).filter(Boolean).map((section) => {
                          const newlineIdx = section.indexOf("\n");
                          const title = newlineIdx === -1 ? section.trim() : section.slice(0, newlineIdx).trim();
                          const body = newlineIdx === -1 ? "" : section.slice(newlineIdx + 1).trim();
                          return (
                            <div key={title} className={`border-l-2 pl-4 ${isDarkTheme ? 'border-zinc-700' : 'border-zinc-300'}`}>
                              <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>{title}</h4>
                              <p className={`text-sm leading-relaxed whitespace-pre-line ${isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'}`}>{body}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={`text-sm italic ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-500'}`}>
                        Click generate to analyse real-time patterns across orders, subscriptions, and menu engagement...
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
                className={`border p-4 md:p-6 rounded relative group cursor-pointer overflow-hidden ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-300'}`}
                onClick={() => triggerPaywall("Detailed Analytics")}
              >
                <div className="flex justify-between items-center mb-8 relative z-20">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
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
                    <div className={`p-3 rounded-full mb-3 border shadow-xl ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-300'}`}>
                      <Lock size={20} className={isDarkTheme ? 'text-white' : 'text-zinc-900'} />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                      Unlock Plus
                    </h3>
                    <p className={`text-xs mb-4 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      View detailed analytics
                    </p>
                    <button className={`px-5 py-2 rounded-full font-bold text-[10px] tracking-widest transition-colors shadow-lg border ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200 border-white' : 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900'}`}>
                      UNLOCK WITH PLUS
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Conversion Funnel */}
              <div
                className={`border p-4 md:p-6 rounded relative group cursor-pointer overflow-hidden ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-300'}`}
                onClick={() => triggerPaywall("Detailed Analytics")}
              >
                <div className="flex justify-between items-center mb-8 relative z-20">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
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
                    <div className={`p-3 rounded-full mb-3 border shadow-xl ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-300'}`}>
                      <Lock size={20} className={isDarkTheme ? 'text-white' : 'text-zinc-900'} />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                      Unlock Plus
                    </h3>
                    <p className={`text-xs mb-4 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      Get funnel insights
                    </p>
                    <button className={`px-5 py-2 rounded-full font-bold text-[10px] tracking-widest transition-colors shadow-lg border ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200 border-white' : 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900'}`}>
                      UNLOCK WITH PLUS
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Top 5 Items Performance */}
              <div
                className={`border p-4 md:p-6 rounded relative group cursor-pointer overflow-hidden ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-300'}`}
                onClick={() => triggerPaywall("Detailed Analytics")}
              >
                <div className="flex justify-between items-center mb-8 relative z-20">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
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
                    <div className={`p-3 rounded-full mb-3 border shadow-xl ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-300'}`}>
                      <Lock size={20} className={isDarkTheme ? 'text-white' : 'text-zinc-900'} />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                      Unlock Plus
                    </h3>
                    <p className={`text-xs mb-4 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      Track item performance
                    </p>
                    <button className={`px-5 py-2 rounded-full font-bold text-[10px] tracking-widest transition-colors shadow-lg border ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200 border-white' : 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900'}`}>
                      UNLOCK WITH PLUS
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Peak Activity (Hourly Traffic Heatmap Proxy) */}
              <div
                className={`border p-4 md:p-6 rounded relative group cursor-pointer overflow-hidden ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-300'}`}
                onClick={() => triggerPaywall("Detailed Analytics")}
              >
                <div className="flex justify-between items-center mb-8 relative z-20">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
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
                        stroke={isDarkTheme ? "#333" : "#e4e4e7"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="hour"
                        stroke={isDarkTheme ? "#666" : "#71717a"}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkTheme ? "#000" : "#fff",
                          borderColor: isDarkTheme ? "#333" : "#d4d4d8",
                          color: isDarkTheme ? "#fff" : "#18181b",
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
                    <div className={`p-3 rounded-full mb-3 border shadow-xl ${isDarkTheme ? 'bg-black border-zinc-800' : 'bg-white border-zinc-300'}`}>
                      <Lock size={20} className={isDarkTheme ? 'text-white' : 'text-zinc-900'} />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                      Unlock Plus
                    </h3>
                    <p className={`text-xs mb-4 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      Analyze peak times
                    </p>
                    <button className={`px-5 py-2 rounded-full font-bold text-[10px] tracking-widest transition-colors shadow-lg border ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200 border-white' : 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900'}`}>
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
          <div className={`flex-1 overflow-y-auto animate-in slide-in-from-right-4 duration-500 pb-24 ${isDarkTheme ? 'bg-black' : 'bg-zinc-50'}`}>
            {/* Menu Header */}
            <header className={`backdrop-blur-md sticky top-0 z-20 px-4 md:px-8 py-5 border-b flex flex-col md:flex-row justify-between md:items-center gap-3 ${isDarkTheme ? 'bg-black/80 border-zinc-800' : 'bg-white/80 border-zinc-200'}`}>
              <div>
                <h1 className={`text-2xl md:text-3xl font-light tracking-tight ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                  Menu Editor
                </h1>
                <p className={`text-xs mt-1 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  Add categories, upload reels, and fill in item details — then hit Save.
                </p>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                {/* Unsaved changes pill */}
                <SaveChangesButton
                  visible={unsavedChanges || isSavingMenu}
                  isSaving={isSavingMenu}
                  onClick={handleSaveAll}
                  saveIcon={<Save size={13} />}
                  className={isDarkTheme ? 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.25)]' : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg'}
                />

                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className={`group flex items-center gap-2 border pl-4 pr-3 py-2 rounded-full transition-all duration-300 ${isDarkTheme ? 'border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'}`}
                  title="QR Code Studio"
                >
                  <span className="text-xs font-bold tracking-widest">QR CODES</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isDarkTheme ? 'bg-zinc-900 group-hover:bg-black' : 'bg-zinc-200 group-hover:bg-zinc-300'}`}>
                    <QrCode size={13} fill="currentColor" className="ml-0.5" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (restaurantDetails?.slug) {
                      window.location.assign(`/${restaurantDetails.slug}`);
                    }
                  }}
                  disabled={!restaurantDetails?.slug}
                  className={`group flex items-center gap-2 border pl-4 pr-3 py-2 rounded-full transition-all duration-300 disabled:opacity-40 ${isDarkTheme ? 'border-zinc-700 hover:bg-white hover:border-white hover:text-black text-white' : 'border-zinc-300 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white text-zinc-900'}`}
                  title="Open Live Customer View"
                >
                  <span className="text-xs font-bold tracking-widest">LIVE VIEW</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isDarkTheme ? 'bg-zinc-900 group-hover:bg-black group-hover:text-white' : 'bg-zinc-200 group-hover:bg-white group-hover:text-zinc-900'}`}>
                    <Play size={11} fill="currentColor" className="ml-0.5" />
                  </div>
                </button>
              </div>
            </header>

            {/* Category Tabs */}
            <div className={`px-4 md:px-8 pt-6 pb-0 border-b ${isDarkTheme ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
              <div className="flex items-center gap-1 overflow-x-auto">
                {menuLoading ? (
                  <InlineLoader
                    label="Loading menu…"
                    className={`mr-4 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}
                  />
                ) : menuItems.length === 0 ? (
                  <span className={`text-sm italic mr-4 ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-500'}`}>No categories yet — click + to add one</span>
                ) : null}
                {!menuLoading && menuItems.map((cat, idx) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryIdx(idx)}
                    className={`relative px-5 py-3 text-sm font-semibold tracking-wide transition-all duration-300 whitespace-nowrap rounded-t-md ${selectedCategoryIdx === idx
                      ? isDarkTheme
                        ? "text-white bg-black border border-b-black border-zinc-800"
                        : "text-zinc-900 bg-white border border-b-white border-zinc-300"
                      : isDarkTheme
                        ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
                      }`}
                  >
                    {cat.title}
                    <span className={`ml-2 text-[10px] font-mono ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {cat.items.length}
                    </span>
                  </button>
                ))}
                <button
                  onClick={handleAddCategory}
                  disabled={menuLoading}
                  title="Add Category"
                  className={`ml-2 flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors text-xs font-bold tracking-widest border border-transparent disabled:opacity-40 disabled:pointer-events-none ${isDarkTheme ? 'text-zinc-500 hover:text-white hover:bg-zinc-900 hover:border-zinc-700' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 hover:border-zinc-300'}`}
                >
                  <Plus size={14} />
                  ADD CATEGORY
                </button>
              </div>
            </div>

            {/* Category Title + Actions bar */}
            {menuItems.length > 0 && (
              <div className={`px-4 md:px-8 py-4 border-b flex items-center justify-between gap-4 ${isDarkTheme ? 'bg-black border-zinc-900' : 'bg-white border-zinc-200'}`}>
                {isEditingCategory ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200 flex-1">
                    <input
                      value={tempCategoryTitle}
                      onChange={(e) => setTempCategoryTitle(e.target.value)}
                      className={`flex-1 border px-3 py-1.5 rounded-lg outline-none font-medium text-base max-w-xs ${isDarkTheme ? 'bg-zinc-900 border-zinc-600 text-white focus:border-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-900'}`}
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
                      className={`text-xs px-4 py-2 rounded-lg font-bold ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                    >
                      SAVE NAME
                    </button>
                    <button
                      onClick={() => setIsEditingCategory(false)}
                      className={`p-1.5 ${isDarkTheme ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
                    setTempCategoryTitle(menuItems[selectedCategoryIdx].title);
                    setIsEditingCategory(true);
                  }}>
                    <h2 className={`text-lg font-semibold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
                      {menuItems[selectedCategoryIdx]?.title}
                    </h2>
                    <Edit2 size={13} className={`transition-colors ${isDarkTheme ? 'text-zinc-600 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-700'}`} />
                  </div>
                )}

                <button
                  onClick={handleAddDish}
                  className={`flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDarkTheme ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white hover:border-zinc-500' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-900 hover:border-zinc-400'}`}
                >
                  <Plus size={15} />
                  Add Item
                </button>
              </div>
            )}

            {/* Items Grid or Empty State */}
            {menuLoading ? (
              <PanelLoader
                label="Loading your menu…"
                labelClassName={`text-sm font-medium ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}
                spinnerClassName={`mb-4 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-500'}`}
              />
            ) : menuItems.length === 0 ? (
              /* ── Full empty state: no categories at all ── */
              <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center mb-6 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
                  <Utensils size={36} strokeWidth={1.2} className={isDarkTheme ? 'text-zinc-500' : 'text-zinc-400'} />
                </div>
                <h2 className={`text-2xl font-semibold mb-3 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>Your menu is empty</h2>
                <p className={`text-sm max-w-sm mb-8 leading-relaxed ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  Start by creating a <strong className={isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'}>Category</strong> (e.g. "Starters", "Mains", "Drinks"),
                  then add items inside it. Each item gets a short-form video reel that customers swipe through.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-12">
                  <button
                    onClick={handleAddCategory}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
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
                    <div key={step} className={`border rounded-xl p-5 text-left ${isDarkTheme ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-3 ${isDarkTheme ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}`}>{step}</div>
                      <p className={`font-semibold text-sm mb-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{title}</p>
                      <p className={`text-xs leading-relaxed ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : menuItems[selectedCategoryIdx]?.items.length === 0 ? (
              /* ── Category exists but has no items ── */
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className={`w-16 h-16 rounded-xl border flex items-center justify-center mb-5 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
                  <Plus size={28} strokeWidth={1.5} className={isDarkTheme ? 'text-zinc-500' : 'text-zinc-400'} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>No items in this category</h3>
                <p className={`text-sm max-w-xs mb-6 leading-relaxed ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  Click <strong className={isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'}>Add Item</strong> above to create your first dish. You can then upload a video reel and fill in its details.
                </p>
                <button
                  onClick={handleAddDish}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
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
                          className={`w-8 h-8 backdrop-blur rounded-full flex items-center justify-center transition-colors border ${isDarkTheme ? 'bg-black/60 text-white hover:bg-white hover:text-black border-white/20' : 'bg-white/60 text-zinc-900 hover:bg-zinc-900 hover:text-white border-zinc-900/20'}`}
                        >
                          <MoreVertical size={15} />
                        </button>

                        {/* Options Dropdown */}
                        {activeOptionsDishId === dish.id && (
                          <div className={`absolute right-0 mt-2 w-48 border rounded-xl shadow-2xl overflow-hidden z-40 animate-in fade-in slide-in-from-top-2 ${isDarkTheme ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'}`}>
                            <button
                              onClick={() => handleDuplicateDish(selectedCategoryIdx, idx)}
                              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 border-b ${isDarkTheme ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white border-zinc-800' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border-zinc-200'}`}
                            >
                              <Copy size={14} />
                              Duplicate Item
                            </button>
                            <button
                              onClick={() => handleToggleManualSoldOut(selectedCategoryIdx, idx)}
                              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 border-b ${dish.manualSoldOut
                                ? isDarkTheme ? 'text-green-400 hover:bg-zinc-800 hover:text-green-300 border-zinc-800' : 'text-green-600 hover:bg-zinc-100 hover:text-green-700 border-zinc-200'
                                : isDarkTheme ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white border-zinc-800' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border-zinc-200'
                                }`}
                            >
                              <EyeOff size={14} />
                              {dish.manualSoldOut ? "Mark Available" : "Mark Sold Out"}
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
                      <div className={`relative w-full aspect-[9/16] rounded-xl overflow-hidden border transition-all duration-500 shadow-lg mb-4 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800 group-hover:border-zinc-600' : 'bg-zinc-100 border-zinc-300 group-hover:border-zinc-400'}`}>
                        <div className={`w-full h-full overflow-hidden relative ${isDarkTheme ? 'bg-black' : 'bg-zinc-50'}`}>
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
                            <div className={`w-full h-full flex flex-col items-center justify-center gap-3 ${isDarkTheme ? 'text-zinc-700' : 'text-zinc-400'}`}>
                              <ImageIcon size={32} strokeWidth={1.2} />
                              <span className="text-xs font-mono tracking-widest">NO MEDIA</span>
                            </div>
                          )}
                        </div>

                        {/* Upload overlay on hover */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px] ${isDarkTheme ? 'bg-black/50' : 'bg-white/50'}`}>
                          <label className="cursor-pointer flex flex-col items-center justify-center">
                            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-3 transition-all ${isDarkTheme ? 'border-white hover:bg-white hover:text-black' : 'border-zinc-900 hover:bg-zinc-900 hover:text-white'}`}>
                              {dish.videoUrl ? <Video size={20} /> : <ImageIcon size={20} />}
                            </div>
                            <span className={`text-xs font-bold tracking-widest uppercase ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>
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
                        <div className={`absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded z-10 ${isDarkTheme ? 'text-zinc-500 bg-black/60' : 'text-zinc-600 bg-white/60'}`}>
                          #{idx + 1}
                        </div>

                        {/* Manual sold-out badge */}
                        {dish.manualSoldOut && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-20 rounded-xl">
                            <div className="border-2 border-red-400/80 px-4 py-2 rotate-[-12deg]">
                              <span className="text-red-400 font-black text-xl tracking-[0.25em] uppercase">Sold Out</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Form Fields */}
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-500'}`}>Item Name</label>
                          <input
                            type="text"
                            value={dish.name}
                            onChange={(e) => handleDishUpdate(selectedCategoryIdx, idx, "name", e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 text-base font-medium outline-none transition-all ${isDarkTheme ? 'bg-zinc-950 border-zinc-800 text-white focus:border-zinc-500 placeholder-zinc-700' : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500 placeholder-zinc-400'}`}
                            placeholder="e.g. Butter Chicken"
                          />
                        </div>
                        <div>
                          <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-500'}`}>Description</label>
                          <textarea
                            value={dish.description}
                            onChange={(e) => handleDishUpdate(selectedCategoryIdx, idx, "description", e.target.value)}
                            rows={3}
                            maxLength={500}
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-all resize-none leading-relaxed ${isDarkTheme ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-zinc-600 focus:text-white placeholder-zinc-700' : 'bg-zinc-50 border-zinc-300 text-zinc-600 focus:border-zinc-500 focus:text-zinc-900 placeholder-zinc-400'}`}
                            placeholder="Ingredients, flavour notes..."
                          />
                          <div className={`text-right text-[10px] mt-0.5 font-mono ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            {dish.description.length} / 500
                          </div>
                        </div>
                        <div>
                          <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-500'}`}>Ingredients</label>
                          <textarea
                            value={dish.ingredients ?? ""}
                            onChange={(e) => handleDishUpdate(selectedCategoryIdx, idx, "ingredients", e.target.value)}
                            rows={2}
                            maxLength={300}
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-all resize-none leading-relaxed ${isDarkTheme ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-zinc-600 focus:text-white placeholder-zinc-700' : 'bg-zinc-50 border-zinc-300 text-zinc-600 focus:border-zinc-500 focus:text-zinc-900 placeholder-zinc-400'}`}
                            placeholder="e.g. Apple, beetroot, carrot, mint"
                          />
                        </div>
                        <div>
                          <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-500'}`}>Benefits</label>
                          <textarea
                            value={dish.benefits ?? ""}
                            onChange={(e) => handleDishUpdate(selectedCategoryIdx, idx, "benefits", e.target.value)}
                            rows={2}
                            maxLength={300}
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-all resize-none leading-relaxed ${isDarkTheme ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-zinc-600 focus:text-white placeholder-zinc-700' : 'bg-zinc-50 border-zinc-300 text-zinc-600 focus:border-zinc-500 focus:text-zinc-900 placeholder-zinc-400'}`}
                            placeholder="e.g. Detox, boosts immunity, aids digestion"
                          />
                        </div>
                        <div className={`flex items-center justify-between border rounded-lg px-3 py-2 ${isDarkTheme ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-300'}`}>
                          <label className={`text-xs font-bold uppercase tracking-widest ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>Calories (kcal)</label>
                          <input
                            type="number"
                            value={dish.calories ?? ""}
                            placeholder="—"
                            min={0}
                            step={1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleDishUpdate(
                                selectedCategoryIdx,
                                idx,
                                "calories",
                                e.target.value === "" ? undefined : Math.max(0, isNaN(val) ? 0 : val),
                              );
                            }}
                            className={`w-20 bg-transparent text-right font-mono focus:outline-none py-0.5 text-sm ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}
                          />
                        </div>
                        <div className={`flex items-center justify-between border rounded-lg px-3 py-2 ${isDarkTheme ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-300'}`}>
                          <label className={`text-xs font-bold uppercase tracking-widest ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>Price</label>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-medium ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {getSymbolForCurrency(restaurantDetails?.currency ?? "USD")}
                            </span>
                            <input
                              type="number"
                              value={dish.price || ""}
                              placeholder="0"
                              onFocus={(e) => {
                                if (userTier === UserTier.FREE) {
                                  const seen = sessionStorage.getItem("mm_paywall_seen_Smart Pricing");
                                  if (!seen) {
                                    e.target.blur();
                                    sessionStorage.setItem("mm_paywall_seen_Smart Pricing", "1");
                                    setPaywallTrigger("Smart Pricing");
                                  }
                                }
                              }}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleDishUpdate(selectedCategoryIdx, idx, "price", isNaN(val) ? 0 : Math.max(0, val));
                              }}
                              step="0.50"
                              className={`w-20 bg-transparent text-right font-mono focus:outline-none py-0.5 text-sm ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}
                            />
                          </div>
                        </div>
                        <div className={`flex items-center justify-between border rounded-lg px-3 py-2 ${isDarkTheme ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-300'}`}>
                          <div>
                            <label className={`text-xs font-bold uppercase tracking-widest ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-600'}`}>Daily Stock (SKU)</label>
                            <p className={`text-[10px] mt-0.5 font-mono ${isDarkTheme ? 'text-zinc-700' : 'text-zinc-400'}`}>Leave blank for unlimited</p>
                          </div>
                          <input
                            type="number"
                            value={dish.stockQuantity ?? ""}
                            placeholder="∞"
                            min={0}
                            step={1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleDishUpdate(
                                selectedCategoryIdx,
                                idx,
                                "stockQuantity",
                                e.target.value === "" ? undefined : Math.max(0, isNaN(val) ? 0 : val),
                              );
                            }}
                            className={`w-20 bg-transparent text-right font-mono focus:outline-none py-0.5 pr-1 text-sm border-none ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add another item card */}
                  <button
                    onClick={handleAddDish}
                    className={`w-full aspect-[9/16] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all group ${isDarkTheme ? 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40 text-zinc-600 hover:text-zinc-300' : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-100/40 text-zinc-400 hover:text-zinc-600'}`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-all border ${isDarkTheme ? 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800' : 'bg-zinc-100 group-hover:bg-zinc-200 border-zinc-300'}`}>
                      <Plus size={28} />
                    </div>
                    <span className={`font-bold tracking-widest uppercase text-xs transition-colors ${isDarkTheme ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-700'}`}>
                      Add Item
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === "IMAGE_EDITOR" && (
          <ImageEditorView
            menuItems={menuItems}
            restaurantId={restaurantDetails?.id ?? null}
            isDarkTheme={isDarkTheme}
            onMenuUpdated={(saved) => {
              setMenuItems(saved);
              setUnsavedChanges(false);
            }}
          />
        )}

        {currentView === "CUSTOMERS" && (() => {
          const PAGE_SIZE = 20;
          const filtered = customerDirectory.filter(
            (c) =>
              !custSearch ||
              c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
              c.phone.includes(custSearch),
          );
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const safePage = Math.min(custPage, totalPages - 1);
          const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

          return (
            <div className={`flex-1 overflow-y-auto p-4 md:p-10 animate-in fade-in duration-500 pb-24 ${isDarkTheme ? 'bg-black' : 'bg-zinc-50'}`}>
              {/* Header */}
              <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
                <div>
                  <h1 className={`text-3xl font-light tracking-tight mb-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>Customers</h1>
                  <p className={`text-sm ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    {filtered.length} customer{filtered.length !== 1 ? "s" : ""}{custSearch ? " matched" : " total"}
                  </p>
                </div>
                {/* Search */}
                <div className={`relative flex items-center ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <Search size={15} className="absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => { setCustSearch(e.target.value); setCustPage(0); }}
                    placeholder="Search by name or phone…"
                    className={`pl-9 pr-4 py-2 rounded-lg border text-sm outline-none w-64 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400'}`}
                  />
                  {custSearch && (
                    <button onClick={() => { setCustSearch(""); setCustPage(0); }} className="absolute right-3">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </header>

              {/* Table */}
              <div className={`rounded-xl border overflow-hidden ${isDarkTheme ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`text-[10px] font-bold uppercase tracking-widest ${isDarkTheme ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
                        {["Name", "Mobile", "Subscription", "Orders", "Delivered", "Last Active", "Joined"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkTheme ? 'divide-zinc-800' : 'divide-zinc-100'}`}>
                      {pageRows.length === 0 && (
                        <tr>
                          <td colSpan={7} className={`px-4 py-16 text-center ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            <Users size={32} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                            {custSearch ? "No customers matched your search" : "No customers yet"}
                          </td>
                        </tr>
                      )}
                      {pageRows.map((c) => (
                        <tr key={c.id} className={`transition-colors ${isDarkTheme ? 'hover:bg-zinc-900/60' : 'hover:bg-zinc-50'} ${isDarkTheme ? 'bg-black' : 'bg-white'}`}>
                          {/* Name */}
                          <td className="px-4 py-3">
                            <span className={`font-medium ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{c.name}</span>
                            {c.email && <p className={`text-xs mt-0.5 ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>{c.email}</p>}
                          </td>
                          {/* Mobile */}
                          <td className={`px-4 py-3 font-mono text-xs ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>{c.phone}</td>
                          {/* Subscription */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs ${isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'}`}>{c.planName}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.subStatus === "active" ? "bg-green-900/40 text-green-400" : c.subStatus === "paused" ? "bg-amber-900/40 text-amber-400" : "bg-red-900/40 text-red-400"}`}>
                                {c.subStatus}
                              </span>
                            </div>
                          </td>
                          {/* Orders */}
                          <td className={`px-4 py-3 text-center font-mono font-bold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{c.totalOrders}</td>
                          {/* Delivered (most active metric) */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold text-xs ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{c.deliveredOrders}</span>
                              {c.totalOrders > 0 && (
                                <div className={`h-1.5 w-16 rounded-full overflow-hidden ${isDarkTheme ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                                  <div
                                    className="h-full rounded-full bg-green-500"
                                    style={{ width: `${Math.round((c.deliveredOrders / Math.max(c.totalOrders, 1)) * 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Last Active */}
                          <td className={`px-4 py-3 text-xs ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            {c.lastActiveDate ?? "—"}
                          </td>
                          {/* Joined */}
                          <td className={`px-4 py-3 text-xs ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            {new Date(c.joinedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={`flex items-center justify-between px-4 py-3 border-t ${isDarkTheme ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'}`}>
                    <p className={`text-xs ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCustPage((p) => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                        className={`p-1.5 rounded transition-colors disabled:opacity-30 ${isDarkTheme ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const page = totalPages <= 7 ? i : i === 0 ? 0 : i === 6 ? totalPages - 1 : safePage - 2 + i;
                        if (page < 0 || page >= totalPages) return null;
                        return (
                          <button key={page} onClick={() => setCustPage(page)}
                            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${safePage === page ? (isDarkTheme ? 'bg-white text-black' : 'bg-zinc-900 text-white') : isDarkTheme ? 'text-zinc-500 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-200'}`}>
                            {page + 1}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCustPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={safePage >= totalPages - 1}
                        className={`p-1.5 rounded transition-colors disabled:opacity-30 ${isDarkTheme ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'}`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ─── Subscriptions View ─────────────────────────────────────────── */}
        {currentView === "SUBSCRIPTIONS" && (
          <div className={`flex-1 overflow-y-auto p-4 md:p-10 animate-in fade-in duration-500 pb-24 ${isDarkTheme ? 'bg-black' : 'bg-zinc-50'}`}>
            <header className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
              <div>
                <h1 className={`text-3xl font-light tracking-tight mb-1 ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>Subscriptions</h1>
                <p className={`text-sm ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>Manage meal plans, subscribers, and daily deliveries</p>
              </div>
              {subTab === "plans" && (
                <button
                  onClick={() => setEditingPlan({ name: "", description: "", priceMonthly: 0, deliveryFee: 0, isActive: true, dishIds: [] })}
                  className={`flex items-center gap-2 px-5 py-2 rounded text-sm font-bold transition-colors ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                >
                  <Plus size={14} /> New Plan
                </button>
              )}
            </header>

            {/* Sub-tabs */}
            <div className={`flex gap-1 mb-8 rounded-md p-1 w-fit ${isDarkTheme ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
              {(["plans", "subscribers", "tomorrow", "tickets", "refunds"] as SubTab[]).map((t) => (
                <button key={t} onClick={() => setSubTab(t)}
                  className={`px-4 py-1.5 text-xs font-bold rounded capitalize ${subTab === t ? (isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white") : isDarkTheme ? "text-zinc-500 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
                  {t === "tomorrow" ? "Tomorrow" : t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === "tickets" && deliveryTickets.filter(tk => tk.status !== "resolved").length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5">
                      {deliveryTickets.filter(tk => tk.status !== "resolved").length}
                    </span>
                  )}
                  {t === "refunds" && refundRequests.filter(r => r.status === "pending").length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                      {refundRequests.filter(r => r.status === "pending").length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Plans Tab ──────────────────────────────────────────────────── */}
            {subTab === "plans" && (
              <div className="space-y-4">
                {/* Plan Editor Modal */}
                {editingPlan !== null && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-lg rounded-xl border shadow-2xl ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                      <div className={`flex items-center justify-between p-5 border-b ${isDarkTheme ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <h2 className={`text-lg font-bold ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{editingPlan.id ? "Edit Plan" : "New Meal Plan"}</h2>
                        <button onClick={() => setEditingPlan(null)}><X size={18} className={isDarkTheme ? 'text-zinc-500' : 'text-zinc-400'} /></button>
                      </div>
                      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                        {([
                          { label: "Plan Name", key: "name", type: "text", placeholder: "e.g. Lunch Box Monthly" },
                          { label: "Description", key: "description", type: "text", placeholder: "Short description for customers" },
                        ] as const).map(({ label, key, type, placeholder }) => (
                          <div key={key}>
                            <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</label>
                            <input type={type} value={(editingPlan as Record<string, unknown>)[key] as string ?? ""} placeholder={placeholder}
                              onChange={(e) => setEditingPlan(prev => ({ ...prev!, [key]: e.target.value }))}
                              className={`w-full px-3 py-2 rounded border text-sm outline-none ${isDarkTheme ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}`} />
                          </div>
                        ))}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>Monthly Price ({restaurantDetails?.currency ?? "USD"})</label>
                            <input type="number" min="0" value={editingPlan.priceMonthly ?? 0}
                              onChange={(e) => setEditingPlan(prev => ({ ...prev!, priceMonthly: parseFloat(e.target.value) || 0 }))}
                              className={`w-full px-3 py-2 rounded border text-sm outline-none ${isDarkTheme ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}`} />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>Delivery Fee per order (0 = free)</label>
                            <input type="number" min="0" value={editingPlan.deliveryFee ?? 0}
                              onChange={(e) => setEditingPlan(prev => ({ ...prev!, deliveryFee: parseFloat(e.target.value) || 0 }))}
                              className={`w-full px-3 py-2 rounded border text-sm outline-none ${isDarkTheme ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'}`} />
                          </div>
                        </div>
                        <div>
                          <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>Dishes in this plan</label>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {menuItems.flatMap(c => c.items).map(dish => (
                              <label key={dish.id} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer ${isDarkTheme ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
                                <input type="checkbox"
                                  checked={(editingPlan.dishIds ?? []).includes(dish.id)}
                                  onChange={(e) => setEditingPlan(prev => ({
                                    ...prev!,
                                    dishIds: e.target.checked
                                      ? [...(prev!.dishIds ?? []), dish.id]
                                      : (prev!.dishIds ?? []).filter(id => id !== dish.id),
                                  }))}
                                  className="accent-white"
                                />
                                <span className={`text-sm ${isDarkTheme ? 'text-zinc-300' : 'text-zinc-700'}`}>{dish.name}</span>
                              </label>
                            ))}
                            {menuItems.flatMap(c => c.items).length === 0 && (
                              <p className={`text-xs text-center py-3 ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>Add dishes in Menu Editor first</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`flex gap-3 p-5 border-t ${isDarkTheme ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <button onClick={() => setEditingPlan(null)}
                          className={`flex-none px-4 py-2 rounded text-sm font-medium ${isDarkTheme ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'}`}>
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!editingPlan.name) return;
                            supabaseService.saveMealPlan(
                              { name: editingPlan.name!, description: editingPlan.description ?? "", priceMonthly: editingPlan.priceMonthly ?? 0, deliveryFee: editingPlan.deliveryFee ?? 0, isActive: editingPlan.isActive ?? true, dishIds: editingPlan.dishIds ?? [] },
                              editingPlan.id,
                            ).then(() => { supabaseService.getMealPlans().then(setMealPlans); setEditingPlan(null); })
                              .catch((e: Error) => alert(e.message));
                          }}
                          className={`flex-1 py-2 rounded text-sm font-bold ${isDarkTheme ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                          Save Plan
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {mealPlans.length === 0 && (
                  <div className={`text-center py-16 border rounded-xl ${isDarkTheme ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'}`}>
                    <Package size={40} strokeWidth={1} className="mx-auto mb-4 opacity-40" />
                    <p className={`font-medium ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>No meal plans yet</p>
                    <p className="text-sm mt-1">Create a plan to start offering subscriptions</p>
                  </div>
                )}

                {mealPlans.map(plan => (
                  <div key={plan.id} className={`border rounded-xl p-5 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold text-base ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{plan.name}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>{plan.isActive ? "Active" : "Inactive"}</span>
                        </div>
                        <p className={`text-sm mt-0.5 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>{plan.description}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setEditingPlan({ ...plan })} className={`p-1.5 rounded ${isDarkTheme ? 'hover:bg-zinc-800 text-zinc-500 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}><Edit2 size={14} /></button>
                        <button onClick={() => { if (confirm("Delete this plan?")) supabaseService.deleteMealPlan(plan.id).then(() => supabaseService.getMealPlans().then(setMealPlans)).catch((e: Error) => alert(e.message)); }} className={`p-1.5 rounded ${isDarkTheme ? 'hover:bg-zinc-800 text-zinc-500 hover:text-red-400' : 'hover:bg-zinc-100 text-zinc-500 hover:text-red-500'}`}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className={`flex gap-4 text-sm ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <span className="flex items-center gap-1"><Tag size={12} /> {getSymbolForCurrency(restaurantDetails?.currency ?? "USD")}{plan.priceMonthly}/mo</span>
                      <span className="flex items-center gap-1"><Package size={12} /> {plan.deliveryFee > 0 ? `+${plan.deliveryFee} delivery` : "Free delivery"}</span>
                      <span>{plan.dishIds.length} dish{plan.dishIds.length !== 1 ? "es" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Subscribers Tab ─────────────────────────────────────────────── */}
            {subTab === "subscribers" && (
              <div className="space-y-3">
                {customerSubs.length === 0 && (
                  <div className={`text-center py-16 border rounded-xl ${isDarkTheme ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'}`}>
                    <Users size={40} strokeWidth={1} className="mx-auto mb-4 opacity-40" />
                    <p className={`font-medium ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>No subscribers yet</p>
                  </div>
                )}
                {customerSubs.map(sub => (
                  <div key={sub.id} className={`border rounded-xl p-4 flex items-center gap-4 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{sub.customerName}</span>
                        <span className={`text-xs font-mono ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>{sub.phone}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${sub.status === "active" ? 'bg-green-900/40 text-green-400' : sub.status === "paused" ? 'bg-amber-900/40 text-amber-400' : 'bg-red-900/40 text-red-400'}`}>{sub.status}</span>
                      </div>
                      <div className={`text-xs mt-0.5 flex gap-3 flex-wrap ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        <span>{sub.planName}</span>
                        <span>{sub.deliveryType}</span>
                        <span>{TIME_SLOT_LABELS[sub.timeSlot]}</span>
                        <span>until {sub.endDate}</span>
                        {sub.status === "paused" && sub.pauseUntil && <span className="text-amber-400">paused till {sub.pauseUntil}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tomorrow's Orders Tab ───────────────────────────────────────── */}
            {subTab === "tomorrow" && (
              <div>
                {tomorrowOrders.length === 0 && (
                  <div className={`text-center py-16 border rounded-xl ${isDarkTheme ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'}`}>
                    <Calendar size={40} strokeWidth={1} className="mx-auto mb-4 opacity-40" />
                    <p className={`font-medium ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>No orders for tomorrow yet</p>
                    <p className="text-sm mt-1">Customers can select their dish until 5:00 PM IST today</p>
                  </div>
                )}
                <div className="space-y-3">
                  {(["08-09", "12-14", "19-21"] as const).map(slot => {
                    const slotOrders = tomorrowOrders.filter(o => {
                      const sub = customerSubs.find(s => s.id === o.subscriptionId);
                      return sub?.timeSlot === slot;
                    });
                    if (slotOrders.length === 0) return null;
                    return (
                      <div key={slot}>
                        <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>{TIME_SLOT_LABELS[slot]}</h3>
                        <div className="space-y-2">
                          {slotOrders.map(order => {
                            const sub = customerSubs.find(s => s.id === order.subscriptionId);
                            return (
                              <div key={order.id} className={`border rounded-lg px-4 py-3 flex items-center justify-between ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                                <div>
                                  <span className={`font-medium text-sm ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{sub?.customerName ?? "—"}</span>
                                  <span className={`text-xs ml-3 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>{order.dishName || "No selection yet"}</span>
                                  {sub && <span className={`text-xs ml-3 ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>{sub.deliveryType}</span>}
                                </div>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt("Cancellation reason:");
                                    if (!reason) return;
                                    supabaseService.cancelDailyOrder(order.id, reason)
                                      .then(() => supabaseService.getTomorrowsOrders().then(setTomorrowOrders))
                                      .catch((e: Error) => alert(e.message));
                                  }}
                                  className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${isDarkTheme ? 'border-zinc-700 text-zinc-400 hover:border-red-500 hover:text-red-400' : 'border-zinc-300 text-zinc-500 hover:border-red-400 hover:text-red-500'}`}>
                                  Cancel
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tickets Tab ────────────────────────────────────────────────── */}
            {subTab === "tickets" && (
              <div className="space-y-3">
                {deliveryTickets.length === 0 && (
                  <div className={`text-center py-16 border rounded-xl ${isDarkTheme ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'}`}>
                    <AlertTriangle size={40} strokeWidth={1} className="mx-auto mb-4 opacity-40" />
                    <p className={`font-medium ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>No delivery tickets</p>
                  </div>
                )}
                {deliveryTickets.map(ticket => (
                  <div key={ticket.id} className={`border rounded-xl p-4 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{TICKET_REASON_LABELS[ticket.reason]}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ticket.status === "open" ? 'bg-red-900/40 text-red-400' : ticket.status === "investigating" ? 'bg-amber-900/40 text-amber-400' : 'bg-green-900/40 text-green-400'}`}>{ticket.status}</span>
                        </div>
                        {ticket.notes && <p className={`text-sm mt-1 ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>{ticket.notes}</p>}
                        <p className={`text-xs mt-1 ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>{new Date(ticket.createdAt).toLocaleDateString()}</p>
                        {(ticket.adjustments ?? []).map(adj => (
                          <p key={adj.id} className={`text-xs mt-1 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>Resolution: {adj.notes}</p>
                        ))}
                      </div>
                      {ticket.status !== "resolved" && (
                        <button
                          onClick={() => {
                            const notes = window.prompt("Resolution notes:");
                            if (!notes) return;
                            supabaseService.resolveDeliveryTicket(ticket.id, notes)
                              .then(() => supabaseService.getDeliveryTickets().then(setDeliveryTickets))
                              .catch((e: Error) => alert(e.message));
                          }}
                          className={`shrink-0 text-xs px-3 py-1.5 rounded border font-medium ${isDarkTheme ? 'border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400' : 'border-zinc-300 text-zinc-500 hover:border-green-500 hover:text-green-600'}`}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Refunds Tab ────────────────────────────────────────────────── */}
            {subTab === "refunds" && (
              <div className="space-y-3">
                {refundRequests.length === 0 && (
                  <div className={`text-center py-16 border rounded-xl ${isDarkTheme ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'}`}>
                    <CreditCard size={40} strokeWidth={1} className="mx-auto mb-4 opacity-40" />
                    <p className={`font-medium ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>No refund requests</p>
                  </div>
                )}
                {refundRequests.map(refund => (
                  <div key={refund.id} className={`border rounded-xl p-4 ${isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`font-bold text-sm ${isDarkTheme ? 'text-white' : 'text-zinc-900'}`}>{restaurantDetails?.currency} {refund.amount.toFixed(2)}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${refund.status === "pending" ? 'bg-amber-900/40 text-amber-400' : refund.status === "approved" ? 'bg-blue-900/40 text-blue-400' : refund.status === "processed" ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{refund.status}</span>
                        </div>
                        <p className={`text-sm ${isDarkTheme ? 'text-zinc-400' : 'text-zinc-600'}`}>{refund.reason}</p>
                        <p className={`text-xs mt-1 ${isDarkTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>{new Date(refund.createdAt).toLocaleDateString()}</p>
                        {refund.restaurantNotes && <p className={`text-xs mt-1 ${isDarkTheme ? 'text-zinc-500' : 'text-zinc-500'}`}>Note: {refund.restaurantNotes}</p>}
                      </div>
                      {refund.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          {(["approved", "rejected", "processed"] as const).map(action => (
                            <button key={action}
                              onClick={() => {
                                const notes = action !== "rejected" ? undefined : (window.prompt("Rejection reason:") ?? undefined);
                                supabaseService.updateRefundStatus(refund.id, action, notes)
                                  .then(() => supabaseService.getRefundRequests().then(setRefundRequests))
                                  .catch((e: Error) => alert(e.message));
                              }}
                              className={`text-xs px-3 py-1.5 rounded border font-medium capitalize transition-colors ${isDarkTheme ? 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500' : 'border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400'}`}>
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
