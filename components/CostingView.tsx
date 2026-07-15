import { getErrorMessage } from "@minute-menus/errors";
import { formatPriceInCurrency } from "@minute-menus/currency";
import {
  dishIngredientCost,
  evaluatePrice,
  suggestPrice,
  totalMonthlyOverhead,
  type MonthlyOverhead,
} from "@minute-menus/costing";
import type {
  Category,
  Dish,
  Ingredient,
  IngredientInvoice,
  InvoiceLineItem,
  PurchaseUnit,
  RestaurantOverhead,
} from "@minute-menus/types";
import { InlineLoader } from "@minute-menus/ui";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { supabaseService } from "../services/supabaseService";
import { StorageGuidePanel } from "./StorageGuidePanel";

const UNITS: PurchaseUnit[] = ["kg", "g", "l", "ml", "piece"];
const PAGE_SIZE = 8;
const PICKER_PAGE_SIZE = 5;

type PickerOption = {
  id: string;
  primary: string;
  secondary?: string;
  trailing?: string;
};

const firstOfMonth = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const baseUnitLabel = (unit: PurchaseUnit): string =>
  unit === "piece" ? "pcs" : unit === "l" || unit === "ml" ? "ml" : "g";

const EMPTY_OVERHEAD: MonthlyOverhead = {
  rent: 0,
  wages: 0,
  electricity: 0,
  gas: 0,
  internet: 0,
  packing: 0,
  other: 0,
};

export interface CostingViewProps {
  menuItems: Category[];
  restaurantId: string | null;
  restaurantSlug: string;
  currency: string;
  isDarkTheme: boolean;
  onDishPriceUpdated: (dishId: string, price: number) => void;
}

export const CostingView: React.FC<CostingViewProps> = ({
  menuItems,
  restaurantId,
  restaurantSlug,
  currency,
  isDarkTheme,
  onDishPriceUpdated,
}) => {
  const [month, setMonth] = useState<string>(firstOfMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [overhead, setOverhead] = useState<MonthlyOverhead>(EMPTY_OVERHEAD);
  const [expectedOrders, setExpectedOrders] = useState<string>("");
  const [savingOverhead, setSavingOverhead] = useState(false);

  const [invoices, setInvoices] = useState<IngredientInvoice[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<InvoiceLineItem[]>([]);
  const [parsedFileName, setParsedFileName] = useState("");
  const [parsedFileUrl, setParsedFileUrl] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [parsedPage, setParsedPage] = useState(0);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientPage, setIngredientPage] = useState(0);

  const allDishes = useMemo(
    () =>
      menuItems.flatMap((cat) =>
        cat.items.map((dish) => ({ dish, category: cat.title })),
      ),
    [menuItems],
  );
  const storageMenuItems = useMemo(
    () =>
      menuItems.flatMap((cat) =>
        cat.items.map((dish) => ({
          name: dish.name,
          category: cat.title,
          ingredients: dish.ingredients?.trim() || dish.description?.trim() || "",
        })),
      ),
    [menuItems],
  );
  const categoryList = useMemo(
    () => menuItems.map((cat) => cat.title),
    [menuItems],
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDishId, setSelectedDishId] = useState<string>("");
  const [recipe, setRecipe] = useState<Array<{ ingredientId: string; quantity: number }>>([]);
  const [dishPriceInput, setDishPriceInput] = useState<string>("");
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [showManualIngredientForm, setShowManualIngredientForm] = useState(false);
  const [manualIngredient, setManualIngredient] = useState({
    name: "",
    quantity: "",
    unit: "g" as PurchaseUnit,
    amount: "",
  });
  const [savingManualIngredient, setSavingManualIngredient] = useState(false);

  const card = isDarkTheme ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200";
  const input = isDarkTheme
    ? "bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600"
    : "bg-white border-zinc-300 text-zinc-900 focus:border-zinc-500";
  const label = isDarkTheme ? "text-zinc-500" : "text-zinc-600";

  const loadMonth = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError("");
    try {
      const [oh, invs, ings] = await Promise.all([
        supabaseService.getOverhead(month, restaurantId),
        supabaseService.getInvoices(month, restaurantId),
        supabaseService.getIngredients(restaurantId),
      ]);
      setOverhead(oh ? overheadToForm(oh) : EMPTY_OVERHEAD);
      setExpectedOrders(oh?.expectedOrders ? String(oh.expectedOrders) : "");
      setInvoices(invs);
      setIngredients(ings);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [restaurantId, month]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    if (!selectedDishId) {
      setRecipe([]);
      setDishPriceInput("");
      return;
    }
    supabaseService
      .getRecipeLines(selectedDishId)
      .then((lines) => setRecipe(lines.map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity }))))
      .catch((e) => setError(getErrorMessage(e)));
    const dish = allDishes.find((d) => d.dish.id === selectedDishId)?.dish;
    setDishPriceInput(dish?.price ? String(dish.price) : "");
  }, [selectedDishId, allDishes]);

  // ── Overhead ───────────────────────────────────────────────────────────────
  const handleSaveOverhead = async () => {
    if (!restaurantId) return;
    setSavingOverhead(true);
    setError("");
    try {
      const payload: RestaurantOverhead = {
        restaurantId,
        month,
        rent: overhead.rent ?? 0,
        wages: overhead.wages ?? 0,
        electricity: overhead.electricity ?? 0,
        gas: overhead.gas ?? 0,
        internet: overhead.internet ?? 0,
        packing: overhead.packing ?? 0,
        other: overhead.other ?? 0,
        expectedOrders: expectedOrders ? Number(expectedOrders) : null,
      };
      await supabaseService.saveOverhead(payload);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSavingOverhead(false);
    }
  };

  // ── Invoice upload + parse ───────────────────────────────────────────────────
  const handleInvoiceFile = async (file: File) => {
    if (!restaurantId) return;
    setParsing(true);
    setError("");
    setParsedRows([]);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again.");
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ restaurantId, fileDataUrl: dataUrl }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to parse invoice");
      }
      const { lineItems, fileUrl } = (await res.json()) as { 
        lineItems: InvoiceLineItem[];
        fileUrl?: string;
      };
      setParsedRows(lineItems);
      setParsedFileUrl(fileUrl ?? "");
      setParsedPage(0);
      setParsedFileName(file.name);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setParsing(false);
    }
  };

  const parsedTotal = useMemo(
    () => parsedRows.reduce((s, r) => s + r.amount, 0),
    [parsedRows],
  );

  const parsedTotalPages = Math.max(1, Math.ceil(parsedRows.length / PAGE_SIZE));
  const parsedPageRows = useMemo(
    () =>
      parsedRows
        .map((row, idx) => ({ row, idx }))
        .slice(parsedPage * PAGE_SIZE, parsedPage * PAGE_SIZE + PAGE_SIZE),
    [parsedRows, parsedPage],
  );

  const filteredIngredients = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    return q ? ingredients.filter((i) => i.name.toLowerCase().includes(q)) : ingredients;
  }, [ingredients, ingredientSearch]);

  const ingredientTotalPages = Math.max(1, Math.ceil(filteredIngredients.length / PAGE_SIZE));
  const ingredientPageSafe = Math.min(ingredientPage, ingredientTotalPages - 1);
  const pagedIngredients = useMemo(
    () =>
      filteredIngredients.slice(
        ingredientPageSafe * PAGE_SIZE,
        ingredientPageSafe * PAGE_SIZE + PAGE_SIZE,
      ),
    [filteredIngredients, ingredientPageSafe],
  );

  const filteredDishes = useMemo(
    () =>
      selectedCategory
        ? allDishes.filter((d) => d.category === selectedCategory)
        : allDishes,
    [allDishes, selectedCategory],
  );

  const dishOptions = useMemo<PickerOption[]>(
    () =>
      filteredDishes.map(({ dish, category }) => ({
        id: dish.id,
        primary: dish.name,
        secondary: category,
        trailing: formatPriceInCurrency(dish.price, currency),
      })),
    [filteredDishes, currency],
  );

  const ingredientOptions = useMemo<PickerOption[]>(
    () =>
      ingredients.map((ing) => ({
        id: ing.id,
        primary: ing.name,
        trailing: `${formatPriceInCurrency(ing.unitCost, currency)}/${baseUnitLabel(ing.purchaseUnit)}`,
      })),
    [ingredients, currency],
  );

  const updateParsedRow = (idx: number, patch: Partial<InvoiceLineItem>) =>
    setParsedRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const handleSaveInvoice = async () => {
    if (!restaurantId || parsedRows.length === 0) return;
    setSavingInvoice(true);
    setError("");
    try {
      const invoiceId = await supabaseService.saveInvoice(
        month, 
        parsedRows, 
        parsedFileName, 
        parsedFileUrl,
        restaurantId
      );
      await Promise.all(
        parsedRows.map((r) =>
          supabaseService.upsertIngredient(
            {
              name: r.name,
              purchaseUnit: r.unit,
              purchaseQuantity: r.quantity,
              purchaseAmount: r.amount,
              source: "invoice",
              sourceInvoiceId: invoiceId,
            },
            restaurantId,
          ),
        ),
      );
      setParsedRows([]);
      setParsedFileName("");
      setParsedFileUrl("");
      await loadMonth();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSavingInvoice(false);
    }
  };

  const monthInvoiceTotal = useMemo(
    () => invoices.reduce((s, i) => s + i.totalAmount, 0),
    [invoices],
  );

  const manualIngredientsTotal = useMemo(
    () => ingredients.filter((i) => i.source === "manual").reduce((s, i) => s + i.purchaseAmount, 0),
    [ingredients],
  );

  const totalSpend = monthInvoiceTotal + manualIngredientsTotal;

  const handleDeleteIngredient = async (id: string) => {
    try {
      await supabaseService.deleteIngredient(id);
      setIngredients((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleSaveManualIngredient = async () => {
    if (!restaurantId) return;
    if (!manualIngredient.name.trim()) {
      setError("Ingredient name is required");
      return;
    }
    const qty = Number(manualIngredient.quantity);
    const amt = Number(manualIngredient.amount);
    if (!qty || qty <= 0 || !amt || amt <= 0) {
      setError("Valid quantity and amount are required");
      return;
    }
    setSavingManualIngredient(true);
    setError("");
    try {
      await supabaseService.upsertIngredient(
        {
          name: manualIngredient.name.trim(),
          purchaseUnit: manualIngredient.unit,
          purchaseQuantity: qty,
          purchaseAmount: amt,
          source: "manual",
        },
        restaurantId,
      );
      setShowManualIngredientForm(false);
      setManualIngredient({ name: "", quantity: "", unit: "g", amount: "" });
      await loadMonth();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSavingManualIngredient(false);
    }
  };

  // ── Dish costing ─────────────────────────────────────────────────────────────
  const ingredientById = useMemo(() => {
    const map = new Map<string, Ingredient>();
    ingredients.forEach((i) => map.set(i.id, i));
    return map;
  }, [ingredients]);

  const recipeCostLines = useMemo(
    () =>
      recipe.map((r) => ({
        unitCost: ingredientById.get(r.ingredientId)?.unitCost ?? 0,
        quantity: r.quantity,
      })),
    [recipe, ingredientById],
  );

  const ingredientCost = useMemo(() => dishIngredientCost(recipeCostLines), [recipeCostLines]);

  const suggestion = useMemo(
    () =>
      suggestPrice(ingredientCost, {
        overhead,
        expectedOrders: expectedOrders ? Number(expectedOrders) : null,
      }),
    [ingredientCost, overhead, expectedOrders],
  );

  const priceHealth = useMemo(() => {
    const price = Number(dishPriceInput);
    if (!dishPriceInput || Number.isNaN(price)) return null;
    return evaluatePrice(price, suggestion);
  }, [dishPriceInput, suggestion]);

  const addRecipeLine = () => {
    const firstUnused = ingredients.find((i) => !recipe.some((r) => r.ingredientId === i.id));
    if (!firstUnused) return;
    setRecipe((prev) => [...prev, { ingredientId: firstUnused.id, quantity: 0 }]);
  };

  const handleSaveRecipe = async () => {
    if (!selectedDishId || !restaurantId) return;
    setSavingRecipe(true);
    setError("");
    try {
      await supabaseService.saveRecipeLines(
        selectedDishId,
        recipe.filter((r) => r.quantity > 0),
        ingredientCost,
        restaurantId,
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleApplyPrice = async (price: number) => {
    if (!selectedDishId) return;
    setError("");
    try {
      await supabaseService.updateDishPrice(selectedDishId, price);
      setDishPriceInput(String(price));
      onDishPriceUpdated(selectedDishId, price);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  if (!restaurantId) {
    return <div className={`p-6 ${label}`}>Create your restaurant first to use costing.</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-light ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
            Menu Costing & Pricing
          </h1>
          <p className={`text-sm ${label}`}>
            Cost each plate from your ingredient purchases and price it with a healthy margin.
          </p>
        </div>
        <div>
          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${label}`}>
            Month
          </label>
          <input
            type="month"
            value={month.slice(0, 7)}
            onChange={(e) => setMonth(`${e.target.value}-01`)}
            className={`px-3 py-2 rounded-md text-sm outline-none border ${input}`}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {restaurantId && (
        <StorageGuidePanel
          menuItems={storageMenuItems}
          restaurantId={restaurantId}
          restaurantSlug={restaurantSlug}
          isDarkTheme={isDarkTheme}
        />
      )}

      {loading ? (
        <InlineLoader label="Loading costing data…" />
      ) : (
        <>
          {/* Overhead */}
          <section className={`border rounded-xl p-5 ${card}`}>
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${label}`}>
              Monthly Fixed Costs
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  ["rent", "Rent"],
                  ["wages", "Wages"],
                  ["electricity", "Electricity"],
                  ["gas", "Gas / LPG"],
                  ["internet", "Internet / Phone"],
                  ["packing", "Packing"],
                  ["other", "Other"],
                ] as Array<[keyof MonthlyOverhead, string]>
              ).map(([key, lbl]) => (
                <div key={key}>
                  <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${label}`}>
                    {lbl}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={overhead[key] ?? 0}
                    onChange={(e) =>
                      setOverhead((prev) => ({ ...prev, [key]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    className={`w-full px-3 py-2 rounded-md text-sm outline-none border ${input}`}
                  />
                </div>
              ))}
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${label}`}>
                  Expected orders/mo
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="optional"
                  value={expectedOrders}
                  onChange={(e) => setExpectedOrders(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md text-sm outline-none border ${input}`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className={`text-sm ${label}`}>
                Total overhead:{" "}
                <span className={isDarkTheme ? "text-white" : "text-zinc-900"}>
                  {formatPriceInCurrency(totalMonthlyOverhead(overhead), currency)}
                </span>
                {expectedOrders && Number(expectedOrders) > 0 && (
                  <>
                    {" · "}per plate:{" "}
                    <span className={isDarkTheme ? "text-white" : "text-zinc-900"}>
                      {formatPriceInCurrency(totalMonthlyOverhead(overhead) / Number(expectedOrders), currency)}
                    </span>
                  </>
                )}
              </p>
              <button
                onClick={handleSaveOverhead}
                disabled={savingOverhead}
                className="bg-white text-black px-4 py-2 rounded-md font-bold text-xs tracking-widest hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2"
              >
                {savingOverhead ? <Loader2 className="animate-spin" size={14} /> : null} SAVE
              </button>
            </div>
          </section>

          {/* Invoices */}
          <section className={`border rounded-xl p-5 ${card}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-widest ${label}`}>
                Purchase Invoices & Manual Entries
              </h2>
              <div className={`text-sm ${label} text-right`}>
                <div className="flex items-center gap-3">
                  <span>
                    Invoice purchases:{" "}
                    <span className={isDarkTheme ? "text-white" : "text-zinc-900"}>
                      {formatPriceInCurrency(monthInvoiceTotal, currency)}
                    </span>{" "}
                    ({invoices.length})
                  </span>
                  <span>
                    Manual entries:{" "}
                    <span className={isDarkTheme ? "text-white" : "text-zinc-900"}>
                      {formatPriceInCurrency(manualIngredientsTotal, currency)}
                    </span>{" "}
                    ({ingredients.filter((i) => i.source === "manual").length})
                  </span>
                </div>
                <div className={`mt-1 pt-1 border-t ${isDarkTheme ? "border-zinc-700" : "border-zinc-300"}`}>
                  Total spend:{" "}
                  <span className={`font-bold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
                    {formatPriceInCurrency(totalSpend, currency)}
                  </span>
                </div>
              </div>
            </div>

            <label
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 cursor-pointer transition-colors ${
                isDarkTheme ? "border-zinc-800 hover:border-zinc-600" : "border-zinc-300 hover:border-zinc-500"
              }`}
            >
              {parsing ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span className={`text-sm ${label}`}>Reading invoice with AI…</span>
                </>
              ) : (
                <>
                  <Upload size={22} className={label} />
                  <span className={`text-sm ${label}`}>Upload invoice (PDF or image)</span>
                </>
              )}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                disabled={parsing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleInvoiceFile(f);
                  e.target.value = "";
                }}
              />
            </label>

            {parsedRows.length > 0 && (
              <div className="mt-4">
                <p className={`text-xs mb-2 flex items-center gap-1 ${label}`}>
                  <FileText size={12} /> {parsedFileName} — review & edit before saving
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={label}>
                        <th className="text-left font-medium py-1">Item</th>
                        <th className="text-right font-medium py-1">Qty</th>
                        <th className="text-left font-medium py-1 pl-2">Unit</th>
                        <th className="text-right font-medium py-1">Amount</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPageRows.map(({ row, idx }) => (
                        <tr key={idx} className={isDarkTheme ? "text-white" : "text-zinc-900"}>
                          <td className="py-1 pr-2">
                            <input
                              value={row.name}
                              onChange={(e) => updateParsedRow(idx, { name: e.target.value })}
                              className={`w-full px-2 py-1 rounded border text-sm ${input}`}
                            />
                          </td>
                          <td className="py-1">
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => updateParsedRow(idx, { quantity: Number(e.target.value) || 0 })}
                              className={`w-20 px-2 py-1 rounded border text-sm text-right ${input}`}
                            />
                          </td>
                          <td className="py-1 pl-2">
                            <select
                              value={row.unit}
                              onChange={(e) => updateParsedRow(idx, { unit: e.target.value as PurchaseUnit })}
                              className={`px-2 py-1 rounded border text-sm ${input}`}
                            >
                              {UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1">
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) => updateParsedRow(idx, { amount: Number(e.target.value) || 0 })}
                              className={`w-24 px-2 py-1 rounded border text-sm text-right ${input}`}
                            />
                          </td>
                          <td className="py-1 pl-2">
                            <button
                              onClick={() => setParsedRows((rows) => rows.filter((_, i) => i !== idx))}
                              className="text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginator
                  page={parsedPage}
                  totalPages={parsedTotalPages}
                  onPage={setParsedPage}
                  isDark={isDarkTheme}
                />
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-sm ${label}`}>
                    Parsed total:{" "}
                    <span className={isDarkTheme ? "text-white" : "text-zinc-900"}>
                      {formatPriceInCurrency(parsedTotal, currency)}
                    </span>
                  </span>
                  <button
                    onClick={handleSaveInvoice}
                    disabled={savingInvoice}
                    className="bg-white text-black px-4 py-2 rounded-md font-bold text-xs tracking-widest hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingInvoice ? <Loader2 className="animate-spin" size={14} /> : <Receipt size={14} />}
                    SAVE TO LIBRARY
                  </button>
                </div>
              </div>
            )}

            {/* Uploaded invoices list */}
            {invoices.length > 0 && (
              <div className="mt-6">
                <p className={`text-xs font-medium mb-2 uppercase tracking-wider ${label}`}>
                  Uploaded this month ({invoices.length})
                </p>
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isDarkTheme ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={16} className={label} />
                        <div>
                          <p className={`text-sm ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
                            {inv.fileName || "Invoice"}
                          </p>
                          <p className={`text-xs ${label}`}>
                            {new Date(inv.createdAt).toLocaleDateString()} •{" "}
                            {formatPriceInCurrency(inv.totalAmount, currency)} •{" "}
                            {inv.lineItems.length} items
                          </p>
                        </div>
                      </div>
                      {inv.fileUrl && (
                        <a
                          href={inv.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            isDarkTheme
                              ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                          }`}
                        >
                          <Download size={12} />
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Ingredient library */}
          <section className={`border rounded-xl p-5 ${card}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-widest ${label}`}>
                Ingredient Library ({ingredients.length})
              </h2>
              {ingredients.length > 0 && (
                <div className="relative">
                  <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${label}`} />
                  <input
                    value={ingredientSearch}
                    onChange={(e) => {
                      setIngredientSearch(e.target.value);
                      setIngredientPage(0);
                    }}
                    placeholder="Search ingredients…"
                    className={`w-56 pl-8 pr-3 py-1.5 rounded-md text-sm outline-none border ${input}`}
                  />
                </div>
              )}
            </div>
            {ingredients.length === 0 ? (
              <p className={`text-sm ${label}`}>Upload an invoice or create manual entries to build your ingredient list.</p>
            ) : filteredIngredients.length === 0 ? (
              <p className={`text-sm ${label}`}>No ingredients match “{ingredientSearch}”.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={label}>
                        <th className="text-left font-medium py-1">Ingredient</th>
                        <th className="text-right font-medium py-1">Purchased</th>
                        <th className="text-right font-medium py-1">Unit cost</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {pagedIngredients.map((ing) => (
                        <tr key={ing.id} className={isDarkTheme ? "text-white" : "text-zinc-900"}>
                          <td className="py-1.5">
                            <div className="flex items-center gap-2">
                              <span>{ing.name}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                                  ing.source === "invoice"
                                    ? isDarkTheme
                                      ? "bg-blue-950 text-blue-300"
                                      : "bg-blue-100 text-blue-700"
                                    : isDarkTheme
                                      ? "bg-amber-950 text-amber-300"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {ing.source === "invoice" ? "Invoice" : "Manual"}
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 text-right">
                            {ing.purchaseQuantity} {ing.purchaseUnit} · {formatPriceInCurrency(ing.purchaseAmount, currency)}
                          </td>
                          <td className="py-1.5 text-right font-mono">
                            {formatPriceInCurrency(ing.unitCost, currency)}/{baseUnitLabel(ing.purchaseUnit)}
                          </td>
                          <td className="py-1.5 pl-2 text-right">
                            <button
                              onClick={() => handleDeleteIngredient(ing.id)}
                              className="text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginator
                  page={ingredientPageSafe}
                  totalPages={ingredientTotalPages}
                  onPage={setIngredientPage}
                  isDark={isDarkTheme}
                />
              </>
            )}
          </section>

          {/* Dish costing */}
          <section className={`border rounded-xl p-5 ${card}`}>
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${label}`}>
              Dish Costing
            </h2>

            {/* Category filter */}
            {categoryList.length > 0 && (
              <div className="mb-4">
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${label}`}>
                  Filter by category
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === ""
                        ? "bg-white text-black"
                        : isDarkTheme
                          ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                    }`}
                  >
                    All ({allDishes.length})
                  </button>
                  {categoryList.map((cat) => {
                    const count = allDishes.filter((d) => d.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          selectedCategory === cat
                            ? "bg-white text-black"
                            : isDarkTheme
                              ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${label}`}>
                Select dish
              </label>
              {allDishes.length === 0 ? (
                <p className={`text-sm ${label}`}>
                  Add dishes in Menu Editor first — they will appear here for per-plate costing.
                </p>
              ) : (
                <SearchablePicker
                  options={dishOptions}
                  selectedId={selectedDishId}
                  onSelect={setSelectedDishId}
                  searchPlaceholder="Search dishes by name or category…"
                  noResultsText={(q) => `No dishes match “${q}”.`}
                  isDark={isDarkTheme}
                  inputClass={input}
                  labelClass={label}
                />
              )}
            </div>

            {selectedDishId && (
              <>
                {ingredients.length === 0 ? (
                  <p className={`text-sm ${label}`}>Add ingredients to your library first.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {recipe.map((line, idx) => {
                        const ing = ingredientById.get(line.ingredientId);
                        const lineCost = (ing?.unitCost ?? 0) * line.quantity;
                        return (
                          <div key={idx} className="flex flex-wrap items-center gap-2">
                            <div className="flex-1 min-w-[12rem]">
                              <SearchablePicker
                                options={ingredientOptions}
                                selectedId={line.ingredientId}
                                onSelect={(id) =>
                                  setRecipe((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, ingredientId: id } : r)),
                                  )
                                }
                                searchPlaceholder="Search ingredient…"
                                noResultsText={(q) => `No ingredients match “${q}”.`}
                                isDark={isDarkTheme}
                                inputClass={input}
                                labelClass={label}
                                compact
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={line.quantity || ""}
                                onChange={(e) =>
                                  setRecipe((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, quantity: Number(e.target.value) || 0 } : r,
                                    ),
                                  )
                                }
                                className={`w-24 px-2 py-2 rounded-md text-sm text-right outline-none border ${input}`}
                              />
                              <span className={`text-xs w-8 ${label}`}>
                                {baseUnitLabel(ing?.purchaseUnit ?? "g")}
                              </span>
                            </div>
                            <span className={`text-sm w-24 text-right font-mono ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
                              {formatPriceInCurrency(lineCost, currency)}
                            </span>
                            <button
                              onClick={() => setRecipe((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        onClick={addRecipeLine}
                        disabled={ingredients.length === 0}
                        className={`flex items-center gap-1 text-sm ${label} hover:${isDarkTheme ? "text-white" : "text-zinc-900"} disabled:opacity-50`}
                      >
                        <Plus size={14} /> Add ingredient
                      </button>
                      <button
                        onClick={() => setShowManualIngredientForm(true)}
                        className={`flex items-center gap-1 text-sm ${isDarkTheme ? "text-white" : "text-zinc-900"} underline hover:no-underline`}
                      >
                        <Plus size={14} /> Create New Ingredient
                      </button>
                    </div>

                    {/* Manual ingredient form */}
                    {showManualIngredientForm && (
                      <div className={`mt-4 p-4 border rounded-lg ${card}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`text-xs font-bold uppercase tracking-widest ${label}`}>
                            New Ingredient (Manual Entry)
                          </h3>
                          <button
                            onClick={() => {
                              setShowManualIngredientForm(false);
                              setManualIngredient({ name: "", quantity: "", unit: "g", amount: "" });
                            }}
                            className={`text-xs ${label} hover:${isDarkTheme ? "text-white" : "text-zinc-900"}`}
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${label}`}>
                              Ingredient Name
                            </label>
                            <input
                              type="text"
                              value={manualIngredient.name}
                              onChange={(e) => setManualIngredient((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g., Paneer (cash purchase)"
                              className={`w-full px-3 py-2 rounded-md text-sm outline-none border ${input}`}
                            />
                          </div>
                          <div>
                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${label}`}>
                              Purchase Quantity
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={manualIngredient.quantity}
                                onChange={(e) => setManualIngredient((prev) => ({ ...prev, quantity: e.target.value }))}
                                placeholder="1"
                                className={`flex-1 px-3 py-2 rounded-md text-sm outline-none border ${input}`}
                              />
                              <select
                                value={manualIngredient.unit}
                                onChange={(e) =>
                                  setManualIngredient((prev) => ({ ...prev, unit: e.target.value as PurchaseUnit }))
                                }
                                className={`px-3 py-2 rounded-md text-sm outline-none border ${input}`}
                              >
                                {UNITS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${label}`}>
                              Purchase Amount
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={manualIngredient.amount}
                              onChange={(e) => setManualIngredient((prev) => ({ ...prev, amount: e.target.value }))}
                              placeholder="250"
                              className={`w-full px-3 py-2 rounded-md text-sm outline-none border ${input}`}
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={handleSaveManualIngredient}
                              disabled={savingManualIngredient}
                              className="w-full bg-white text-black px-4 py-2 rounded-md font-bold text-xs tracking-widest hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {savingManualIngredient ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                              SAVE & ADD TO RECIPE
                            </button>
                          </div>
                        </div>
                        <p className={`text-xs mt-2 ${label}`}>
                          For cash purchases or when you don't have an invoice yet. This will be added to your ingredient library.
                        </p>
                      </div>
                    )}

                    {/* Cost + suggested price */}
                    <div className={`mt-5 pt-4 border-t ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <Stat label="Ingredient cost / plate" value={formatPriceInCurrency(suggestion.ingredientCost, currency)} isDark={isDarkTheme} />
                        <Stat
                          label="Overhead / plate"
                          value={suggestion.overheadPerPlate != null ? formatPriceInCurrency(suggestion.overheadPerPlate, currency) : "—"}
                          isDark={isDarkTheme}
                        />
                        <Stat label="True cost / plate" value={formatPriceInCurrency(suggestion.trueCostPerPlate, currency)} isDark={isDarkTheme} />
                        <Stat
                          label={`Suggested (${suggestion.minMarkupPercent}–${suggestion.maxMarkupPercent}%)`}
                          value={`${formatPriceInCurrency(suggestion.minPrice, currency)} – ${formatPriceInCurrency(suggestion.maxPrice, currency)}`}
                          isDark={isDarkTheme}
                          highlight
                        />
                      </div>

                      <div className="flex flex-wrap items-end gap-3 mt-4">
                        <div>
                          <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${label}`}>
                            Menu price (ex-GST)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={dishPriceInput}
                            onChange={(e) => setDishPriceInput(e.target.value)}
                            className={`w-36 px-3 py-2 rounded-md text-sm outline-none border ${input}`}
                          />
                        </div>
                        <button
                          onClick={() => handleApplyPrice(suggestion.minPrice)}
                          className="bg-white text-black px-3 py-2 rounded-md font-bold text-xs tracking-widest hover:bg-zinc-200"
                        >
                          USE {formatPriceInCurrency(suggestion.minPrice, currency)}
                        </button>
                        <button
                          onClick={() => {
                            const p = Number(dishPriceInput);
                            if (!Number.isNaN(p) && p > 0) handleApplyPrice(p);
                          }}
                          className={`px-3 py-2 rounded-md font-bold text-xs tracking-widest border ${
                            isDarkTheme ? "border-zinc-700 text-white hover:bg-zinc-900" : "border-zinc-300 text-zinc-900 hover:bg-zinc-100"
                          }`}
                        >
                          SET ENTERED PRICE
                        </button>
                        <button
                          onClick={handleSaveRecipe}
                          disabled={savingRecipe}
                          className={`px-3 py-2 rounded-md font-bold text-xs tracking-widest border disabled:opacity-50 flex items-center gap-2 ${
                            isDarkTheme ? "border-zinc-700 text-white hover:bg-zinc-900" : "border-zinc-300 text-zinc-900 hover:bg-zinc-100"
                          }`}
                        >
                          {savingRecipe ? <Loader2 className="animate-spin" size={14} /> : <Calculator size={14} />}
                          SAVE RECIPE
                        </button>
                      </div>

                      {priceHealth && (
                        <div
                          className={`mt-3 flex items-center gap-2 text-sm ${
                            priceHealth.level === "ok" ? "text-green-500" : "text-amber-500"
                          }`}
                        >
                          {priceHealth.level === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                          {priceHealth.message}
                          {priceHealth.markupPercent != null && ` (${priceHealth.markupPercent}% markup)`}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const SearchablePicker: React.FC<{
  options: PickerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchPlaceholder: string;
  noResultsText: (query: string) => string;
  isDark: boolean;
  inputClass: string;
  labelClass: string;
  compact?: boolean;
}> = ({
  options,
  selectedId,
  onSelect,
  searchPlaceholder,
  noResultsText,
  isDark,
  inputClass,
  labelClass,
  compact,
}) => {
  const [editing, setEditing] = useState(!selectedId);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (selectedId) setEditing(false);
  }, [selectedId]);

  const selected = options.find((o) => o.id === selectedId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.primary.toLowerCase().includes(q) ||
        (o.secondary?.toLowerCase().includes(q) ?? false),
    );
  }, [options, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PICKER_PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const paged = filtered.slice(
    pageSafe * PICKER_PAGE_SIZE,
    pageSafe * PICKER_PAGE_SIZE + PICKER_PAGE_SIZE,
  );

  const startEdit = () => {
    setEditing(true);
    setSearch("");
    setPage(0);
  };

  const pick = (id: string) => {
    onSelect(id);
    setEditing(false);
    setSearch("");
    setPage(0);
  };

  if (selected && !editing) {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
          isDark ? "bg-zinc-900 border-zinc-700" : "bg-zinc-50 border-zinc-200"
        }`}
      >
        <div className="min-w-0">
          <p className={`font-medium truncate ${compact ? "text-sm" : "text-sm"} ${isDark ? "text-white" : "text-zinc-900"}`}>
            {selected.primary}
          </p>
          {selected.secondary && (
            <p className={`text-xs truncate ${labelClass}`}>{selected.secondary}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {selected.trailing && (
            <span className={`font-mono text-xs ${isDark ? "text-white" : "text-zinc-900"}`}>
              {selected.trailing}
            </span>
          )}
          <button
            type="button"
            onClick={startEdit}
            className={`text-xs underline ${labelClass} ${isDark ? "hover:text-white" : "hover:text-zinc-900"}`}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${labelClass}`} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={searchPlaceholder}
          className={`w-full pl-8 pr-3 py-2 rounded-md text-sm outline-none border ${inputClass}`}
        />
      </div>
      {filtered.length === 0 ? (
        <p className={`text-sm ${labelClass}`}>{noResultsText(search)}</p>
      ) : (
        <>
          <div
            className={`rounded-lg border divide-y ${
              isDark ? "border-zinc-800 divide-zinc-800" : "border-zinc-200 divide-zinc-200"
            }`}
          >
            {paged.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => pick(opt.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  isDark ? "text-white hover:bg-zinc-900" : "text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{opt.primary}</p>
                  {opt.secondary && (
                    <p className={`text-xs truncate ${labelClass}`}>{opt.secondary}</p>
                  )}
                </div>
                {opt.trailing && (
                  <span className="font-mono text-xs shrink-0">{opt.trailing}</span>
                )}
              </button>
            ))}
          </div>
          <Paginator page={pageSafe} totalPages={totalPages} onPage={setPage} isDark={isDark} />
        </>
      )}
      {selected && editing && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className={`text-xs ${labelClass} ${isDark ? "hover:text-white" : "hover:text-zinc-900"}`}
        >
          Cancel
        </button>
      )}
    </div>
  );
};

const Paginator: React.FC<{
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  isDark: boolean;
}> = ({ page, totalPages, onPage, isDark }) => {
  if (totalPages <= 1) return null;
  const muted = isDark ? "text-zinc-500" : "text-zinc-600";
  const btn = `p-1.5 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${
    isDark ? "border-zinc-700 text-white hover:bg-zinc-900" : "border-zinc-300 text-zinc-900 hover:bg-zinc-100"
  }`;
  return (
    <div className="flex items-center justify-end gap-3 mt-3">
      <span className={`text-xs ${muted}`}>
        Page {page + 1} of {totalPages}
      </span>
      <button className={btn} disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft size={16} />
      </button>
      <button
        className={btn}
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; isDark: boolean; highlight?: boolean }> = ({
  label,
  value,
  isDark,
  highlight,
}) => (
  <div>
    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
      {label}
    </p>
    <p className={`font-mono ${highlight ? "text-base font-bold" : "text-sm"} ${isDark ? "text-white" : "text-zinc-900"}`}>
      {value}
    </p>
  </div>
);

const overheadToForm = (o: RestaurantOverhead): MonthlyOverhead => ({
  rent: o.rent,
  wages: o.wages,
  electricity: o.electricity,
  gas: o.gas,
  internet: o.internet,
  packing: o.packing,
  other: o.other,
});
