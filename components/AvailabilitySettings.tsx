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
  const inputClass = `rounded-lg border px-2 py-2 text-sm ${isDarkTheme ? "border-zinc-700 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-900"}`;
  return (
    <div className={`flex-1 overflow-y-auto p-4 md:p-10 ${isDarkTheme ? "bg-black text-white" : "bg-zinc-50 text-zinc-900"}`}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div><h1 className="text-2xl font-bold">Kitchen availability</h1><p className="mt-1 text-sm opacity-70">Customers can order only during these restaurant-local times.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Timezone <input className={`${inputClass} ml-2 w-52`} value={availability.timezone} onChange={(e) => setAvailability({ ...availability, timezone: e.target.value })} /></label>
          <button onClick={() => setAvailability({ ...availability, deliveryEnabled: !availability.deliveryEnabled })} className={`rounded-full px-4 py-2 text-sm font-semibold ${availability.deliveryEnabled ? "bg-emerald-600 text-white" : "bg-zinc-600 text-white"}`}>
            Delivery {availability.deliveryEnabled ? "On" : "Off"}
          </button>
        </div>
        <div className="space-y-3">
          {DAYS.map((name, day) => {
            const slots = availability.operatingHours[day] ?? [];
            return <div key={name} className={`rounded-xl border p-4 ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
              <div className="mb-3 flex items-center justify-between"><span className="font-semibold">{name}</span><button className="text-sm text-blue-500" onClick={() => updateDay(day, slots.length ? [] : [{ start: "09:00", end: "22:00" }])}>{slots.length ? "Mark closed" : "Add hours"}</button></div>
              {slots.map((slot, index) => <div className="mb-2 flex items-center gap-2" key={`${name}-${index}`}>
                <input type="time" className={inputClass} value={slot.start} onChange={(e) => updateDay(day, slots.map((item, i) => i === index ? { ...item, start: e.target.value } : item))} />
                <span>to</span>
                <input type="time" className={inputClass} value={slot.end} onChange={(e) => updateDay(day, slots.map((item, i) => i === index ? { ...item, end: e.target.value } : item))} />
                <button className="text-sm text-red-500" onClick={() => updateDay(day, slots.filter((_, i) => i !== index))}>Remove</button>
              </div>)}
              {slots.length > 0 && <button className="text-xs text-blue-500" onClick={() => updateDay(day, [...slots, { start: "18:00", end: "22:00" }])}>+ Add another slot</button>}
            </div>;
          })}
        </div>
        <button disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save availability"}</button>
        {message && <p className="text-sm opacity-80">{message}</p>}
      </div>
    </div>
  );
};
