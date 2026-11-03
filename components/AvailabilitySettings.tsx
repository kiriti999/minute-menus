import { CalendarOff, CalendarPlus, Plus, Save, Trash2, Truck } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { DEFAULT_OPERATING_HOURS, type OperatingSlot, type RestaurantAvailability, type WeeklyOperatingHours } from "@minute-menus/types";
import { supabaseService } from "../services/supabaseService";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const AvailabilitySettings: React.FC<{ isDarkTheme: boolean }> = ({ isDarkTheme }) => {
  const [availability, setAvailability] = useState<RestaurantAvailability>({
    timezone: "Asia/Kolkata", deliveryEnabled: true, operatingHours: DEFAULT_OPERATING_HOURS,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabaseService.getRestaurantDetails().then((details) => setAvailability({
      timezone: details.timezone,
      deliveryEnabled: details.delivery_enabled,
      operatingHours: details.operating_hours,
    })).catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load availability"));
  }, []);

  const updateDay = (day: number, slots: OperatingSlot[]) => {
    setAvailability((prev) => ({ ...prev, operatingHours: { ...prev.operatingHours, [day]: slots } }));
  };
  const save = async () => {
    setSaving(true); setMessage("");
    try { await supabaseService.updateRestaurantAvailability(availability); setMessage("Availability saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Failed to save availability"); }
    finally { setSaving(false); }
  };
  const inputClass = `min-w-0 flex-1 sm:flex-none rounded-lg border px-2 py-2 text-sm ${isDarkTheme ? "border-zinc-700 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-900"}`;
  const iconButton = "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-semibold sm:px-3";
  const neutral = isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100";
  const setSlot = (day: number, slots: OperatingSlot[], index: number, patch: Partial<OperatingSlot>) =>
    updateDay(day, slots.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className={`flex-1 overflow-y-auto p-4 md:p-10 ${isDarkTheme ? "bg-black text-white" : "bg-zinc-50 text-zinc-900"}`}>
      <div className="mx-auto max-w-3xl min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Kitchen availability</h1>
          <p className="mt-1 text-sm opacity-70">Customers can order only during these restaurant-local times.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
            <span className="shrink-0">Timezone</span>
            <input
              className={`${inputClass} sm:w-52`}
              value={availability.timezone}
              onChange={(e) => setAvailability({ ...availability, timezone: e.target.value })}
            />
          </label>
          <button
            type="button"
            aria-label={`Delivery ${availability.deliveryEnabled ? "on" : "off"}`}
            onClick={() => setAvailability({ ...availability, deliveryEnabled: !availability.deliveryEnabled })}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${availability.deliveryEnabled ? "bg-emerald-600" : "bg-zinc-600"}`}
          >
            <Truck size={16} />
            <span className="sm:hidden">{availability.deliveryEnabled ? "On" : "Off"}</span>
            <span className="hidden sm:inline">Delivery {availability.deliveryEnabled ? "On" : "Off"}</span>
          </button>
        </div>
        <div className="space-y-3">
          {DAYS.map((name, day) => {
            const slots = availability.operatingHours[day] ?? [];
            const open = slots.length > 0;
            return (
              <div key={name} className={`rounded-xl border p-3 sm:p-4 ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-semibold">{name}</span>
                  <button
                    type="button"
                    className={`${iconButton} ${neutral}`}
                    aria-label={open ? `Mark ${name} closed` : `Add hours for ${name}`}
                    onClick={() => updateDay(day, open ? [] : [{ start: "09:00", end: "22:00" }])}
                  >
                    {open ? <CalendarOff size={16} /> : <CalendarPlus size={16} />}
                    <span className="hidden sm:inline">{open ? "Mark closed" : "Add hours"}</span>
                  </button>
                </div>
                {slots.map((slot, index) => (
                  <div className="mb-2 flex items-center gap-2" key={`${name}-${index}`}>
                    <input type="time" className={inputClass} value={slot.start} onChange={(e) => setSlot(day, slots, index, { start: e.target.value })} />
                    <span>to</span>
                    <input type="time" className={inputClass} value={slot.end} onChange={(e) => setSlot(day, slots, index, { end: e.target.value })} />
                    <button
                      type="button"
                      className={`${iconButton} shrink-0 border-red-500/40 text-red-500 hover:bg-red-500/10`}
                      aria-label={`Remove ${name} slot ${index + 1}`}
                      onClick={() => updateDay(day, slots.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                ))}
                {open && (
                  <button
                    type="button"
                    className={`${iconButton} border-dashed ${neutral}`}
                    aria-label={`Add another slot for ${name}`}
                    onClick={() => updateDay(day, [...slots, { start: "18:00", end: "22:00" }])}
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add another slot</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50 sm:w-auto"
        >
          <Save size={16} />
          {saving ? "Saving…" : "Save availability"}
        </button>
        {message && <p className="text-sm opacity-80">{message}</p>}
      </div>
    </div>
  );
};
