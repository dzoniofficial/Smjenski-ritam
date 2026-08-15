import { useState, useEffect, useRef } from "react";
import { Plus, Minus, Trash2, Moon, Sun, Coffee, AlertTriangle, Briefcase, Info } from "lucide-react";

const C = {
  bg: "#05070D",
  surface: "#0D1424",
  surface2: "#141D34",
  border: "#212B47",
  textPrimary: "#EAF0FF",
  textMuted: "#8A93B3",
  sleep: "#2B3B77",
  sleepText: "#B9C4F2",
  seek: "#BFEFFF",
  seekDeep: "#6FD3EE",
  avoid: "#F2A65A",
  avoidDeep: "#D98A3D",
  neutral: "#232E4C",
  shiftBar: "#5EEAD4",
  caffeine: "#FB7185",
  danger: "#F87171",
  caution: "#FBBF24",
};

const OFF_ID = "off";
const OFF_DEFAULT_WAKE = 6.5;

function mod24(h) {
  return ((h % 24) + 24) % 24;
}
function clockStr(h) {
  const x = mod24(h);
  const hh = Math.floor(x);
  const mm = Math.round((x - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function decToTimeInput(h) {
  const x = mod24(h);
  const hh = Math.floor(x);
  const mm = Math.round((x - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function timeInputToDec(str) {
  const [h, m] = str.split(":").map(Number);
  return h + m / 60;
}
function circularDiff(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 24 - d);
}
function isNight(clockHour) {
  const h = mod24(clockHour);
  return h >= 21 || h < 7;
}

function buildProfile(startClock, durationHours) {
  const duration = !durationHours || durationHours <= 0 ? 24 : Math.min(durationHours, 24);
  const wake = mod24(startClock - 1);
  return {
    wakeClock: wake,
    startClock: mod24(startClock),
    endClock: mod24(startClock + duration),
    durationHours: duration,
    timeline: [
      { t: "seek", s: 0, e: 2.5 },
      { t: "neutral", s: 2.5, e: 14 },
      { t: "avoid", s: 14, e: 16 },
      { t: "sleep", s: 16, e: 24 },
    ],
    shiftBar: { s: 1.0, e: Math.min(1.0 + duration, 24) },
    caffeineLocal: 8.0,
    sleepMidClock: mod24(wake + 20),
  };
}
const OFF_PROFILE = { ...buildProfile(OFF_DEFAULT_WAKE + 1, 0), shiftBar: null };

function zoneNote(zoneType, wake) {
  if (zoneType === "seek") {
    const mid = mod24(wake + 1.25);
    return isNight(mid) ? "vani je mrak — koristi jako umjetno svjetlo" : null;
  }
  if (zoneType === "avoid") {
    const mid = mod24(wake + 15);
    return !isNight(mid) ? "vani je dan — nosi tamne naočale" : null;
  }
  if (zoneType === "sleep") {
    const mid = mod24(wake + 20);
    return !isNight(mid) ? "spavaš danju — zamrači sobu" : null;
  }
  return null;
}

function resolveEffectiveId(days, idx) {
  const day = days[idx];
  if (day.shiftId !== OFF_ID) return day.shiftId;
  for (let i = idx + 1; i < days.length; i++) if (days[i].shiftId !== OFF_ID) return days[i].shiftId;
  for (let i = idx - 1; i >= 0; i--) if (days[i].shiftId !== OFF_ID) return days[i].shiftId;
  return OFF_ID;
}

function profileFor(shiftId, shiftDefs) {
  if (shiftId === OFF_ID) return { profile: OFF_PROFILE, name: "Slobodan dan", clockRange: null };
  const def = shiftDefs.find((d) => d.id === shiftId);
  if (!def) return { profile: OFF_PROFILE, name: "Slobodan dan", clockRange: null };
  const duration = mod24(def.end - def.start) || 24;
  const profile = buildProfile(def.start, duration);
  return { profile, name: def.name, clockRange: `${clockStr(profile.startClock)}–${clockStr(profile.endClock)}` };
}

function ZoneBand({ profile, showShiftBar }) {
  const zoneColor = (t) =>
    t === "sleep" ? C.sleep : t === "seek" ? C.seek : t === "avoid" ? C.avoid : C.neutral;
  const tickHours = [0, 6, 12, 18, 24];

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height: 34, borderRadius: 6, overflow: "hidden", background: C.neutral }}>
        {profile.timeline.map((seg, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{
              left: `${(seg.s / 24) * 100}%`,
              width: `${((seg.e - seg.s) / 24) * 100}%`,
              background: zoneColor(seg.t),
            }}
          />
        ))}
        {showShiftBar && profile.shiftBar && (
          <div
            className="absolute"
            style={{
              left: `${(profile.shiftBar.s / 24) * 100}%`,
              width: `${((profile.shiftBar.e - profile.shiftBar.s) / 24) * 100}%`,
              top: 24,
              height: 6,
              borderRadius: 3,
              background: C.shiftBar,
            }}
          />
        )}
        <div
          className="absolute"
          style={{ left: `${(profile.caffeineLocal / 24) * 100}%`, top: 2, width: 2, height: 30, background: C.caffeine }}
        />
      </div>
      <div className="relative w-full mt-1" style={{ height: 14 }}>
        {tickHours.map((h) => (
          <div
            key={h}
            className="absolute"
            style={{
              left: `${(h / 24) * 100}%`,
              transform: h === 0 ? "translateX(0%)" : h === 24 ? "translateX(-100%)" : "translateX(-50%)",
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              color: C.textMuted,
            }}
          >
            {clockStr(profile.wakeClock + h)}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCard({ index, day, shiftDefs, effectiveId, isBorrowed, risk }) {
  const { profile, name, clockRange } = profileFor(effectiveId, shiftDefs);
  const showShiftBar = day.shiftId !== OFF_ID;

  const seekNote = zoneNote("seek", profile.wakeClock);
  const avoidNote = zoneNote("avoid", profile.wakeClock);
  const sleepNote = zoneNote("sleep", profile.wakeClock);

  return (
    <div className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: C.textMuted }}>DAN {index + 1}</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: day.shiftId === OFF_ID ? "transparent" : C.surface2, border: `1px solid ${C.border}`, color: C.textPrimary }}
          >
            {name}
            {clockRange && <span style={{ color: C.textMuted }}> · {clockRange}</span>}
          </span>
          {isBorrowed && <span className="text-xs" style={{ color: C.textMuted }}>(ritam pripremljen za {name.toLowerCase()})</span>}
        </div>
        {risk && risk.level !== "ok" && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ color: risk.level === "high" ? C.danger : C.caution, background: "rgba(255,255,255,0.03)" }}>
            <AlertTriangle size={13} />
            {risk.level === "high" ? "Nagla promjena ritma" : "Primjetna promjena ritma"}
          </div>
        )}
      </div>

      <ZoneBand profile={profile} showShiftBar={showShiftBar} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <InfoBit icon={<Moon size={14} />} color={C.sleepText} label="San" value={clockStr(profile.wakeClock + 16) + "–" + clockStr(profile.wakeClock + 24) + " (8h)"} note={sleepNote} />
        <InfoBit icon={<Sun size={14} />} color={C.seekDeep} label="Traži jako svjetlo" value={clockStr(profile.wakeClock) + "–" + clockStr(profile.wakeClock + 2.5)} note={seekNote} />
        <InfoBit icon={<Sun size={14} style={{ opacity: 0.5 }} />} color={C.avoidDeep} label="Izbjegavaj svjetlo" value={clockStr(profile.wakeClock + 14) + "–" + clockStr(profile.wakeClock + 16)} note={avoidNote} />
        <InfoBit icon={<Coffee size={14} />} color={C.caffeine} label="Posljednja kava" value={clockStr(profile.wakeClock + profile.caffeineLocal)} />
      </div>

      {risk && risk.level !== "ok" && (
        <p className="text-xs mt-3" style={{ color: C.textMuted }}>
          Razlika u odnosu na prethodni dan: ~{risk.diff.toFixed(1)}h pomaka unutarnjeg sata.
          {risk.level === "high" ? " Tijelo prirodno mijenja ritam ~1–2h dnevno — ovakav skok znači ozbiljan umor i pad koncentracije." : " Očekuj blagi pad energije dok se ritam ne stabilizira."}
        </p>
      )}
    </div>
  );
}

function InfoBit({ icon, color, label, value, note }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5" style={{ color }}>
        {icon}
        <span className="text-xs font-semibold" style={{ color: C.textMuted }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: C.textPrimary }}>{value}</div>
      {note && <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>{note}</div>}
    </div>
  );
}

function ShiftDefsEditor({ shiftDefs, setShiftDefs }) {
  const updateName = (id, name) => setShiftDefs((defs) => defs.map((d) => (d.id === id ? { ...d, name } : d)));
  const updateStart = (id, val) => setShiftDefs((defs) => defs.map((d) => (d.id === id ? { ...d, start: timeInputToDec(val) } : d)));
  const updateEnd = (id, val) => setShiftDefs((defs) => defs.map((d) => (d.id === id ? { ...d, end: timeInputToDec(val) } : d)));
  const removeDef = (id) => setShiftDefs((defs) => (defs.length <= 1 ? defs : defs.filter((d) => d.id !== id)));
  const addDef = () =>
    setShiftDefs((defs) => (defs.length >= 30 ? defs : [...defs, { id: "s" + Date.now(), name: `Smjena ${defs.length + 1}`, start: 7, end: 19 }]));

  return (
    <div className="rounded-2xl p-4 mb-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <h2 className="font-semibold mb-1" style={{ color: C.textPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>
        Tvoje smjene
      </h2>
      <p className="text-xs mb-3" style={{ color: C.textMuted }}>
        Unesi svoje ime, početak i kraj za svaku smjenu — trajanje (npr. 8h ili 12h) se računa samo.
      </p>
      <div className="flex flex-col gap-2">
        {shiftDefs.map((d) => {
          const duration = mod24(d.end - d.start) || 24;
          return (
            <div key={d.id} className="flex items-center gap-2 rounded-xl p-2 flex-wrap" style={{ background: C.surface2 }}>
              <input
                value={d.name}
                onChange={(e) => updateName(d.id, e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium"
                style={{ color: C.textPrimary }}
              />
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={decToTimeInput(d.start)}
                  onChange={(e) => updateStart(d.id, e.target.value)}
                  className="bg-transparent outline-none text-sm"
                  style={{ color: C.textPrimary, fontFamily: "'IBM Plex Mono', monospace", colorScheme: "dark" }}
                />
                <span className="text-xs" style={{ color: C.textMuted }}>–</span>
                <input
                  type="time"
                  value={decToTimeInput(d.end)}
                  onChange={(e) => updateEnd(d.id, e.target.value)}
                  className="bg-transparent outline-none text-sm"
                  style={{ color: C.textPrimary, fontFamily: "'IBM Plex Mono', monospace", colorScheme: "dark" }}
                />
              </div>
              <span className="text-xs" style={{ color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                ({duration % 1 === 0 ? duration : duration.toFixed(1)}h)
              </span>
              <button onClick={() => removeDef(d.id)} className="p-1 rounded-lg" style={{ opacity: shiftDefs.length <= 1 ? 0.3 : 1 }} aria-label="Ukloni smjenu" disabled={shiftDefs.length <= 1}>
                <Trash2 size={14} color={C.textMuted} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={addDef}
        className="flex items-center gap-1 mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg"
        style={{ background: C.surface2, color: C.textPrimary, opacity: shiftDefs.length >= 30 ? 0.4 : 1 }}
        disabled={shiftDefs.length >= 30}
      >
        <Plus size={13} /> Nova smjena
      </button>
    </div>
  );
}

function ScheduleEditor({ days, setDays, shiftDefs }) {
  const cycleOrder = [...shiftDefs.map((d) => d.id), OFF_ID];
  const cycle = (idx) => {
    setDays((d) => {
      const next = [...d];
      const curr = cycleOrder.indexOf(next[idx].shiftId);
      const nextIdx = curr === -1 ? 0 : (curr + 1) % cycleOrder.length;
      next[idx] = { shiftId: cycleOrder[nextIdx] };
      return next;
    });
  };
  const addDay = () => setDays((d) => (d.length >= 30 ? d : [...d, { shiftId: OFF_ID }]));
  const removeDay = () => setDays((d) => (d.length <= 2 ? d : d.slice(0, -1)));

  const colorFor = (shiftId, i) => {
    if (shiftId === OFF_ID) return C.neutral;
    const idx = shiftDefs.findIndex((d) => d.id === shiftId);
    const palette = [C.sleep, C.seekDeep, C.avoidDeep, C.shiftBar, C.caffeine, C.caution];
    return palette[idx % palette.length];
  };
  const nameFor = (shiftId) => (shiftId === OFF_ID ? "Slobodno" : shiftDefs.find((d) => d.id === shiftId)?.name || "?");

  return (
    <div className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold" style={{ color: C.textPrimary, fontFamily: "'Space Grotesk', sans-serif" }}>
          Tvoj raspored
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={removeDay} className="p-1.5 rounded-lg" style={{ background: C.surface2, color: C.textPrimary }} aria-label="Ukloni dan">
            <Minus size={14} />
          </button>
          <span style={{ color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, width: 24, textAlign: "center" }}>{days.length}</span>
          <button onClick={addDay} className="p-1.5 rounded-lg" style={{ background: C.surface2, color: C.textPrimary }} aria-label="Dodaj dan">
            <Plus size={14} />
          </button>
        </div>
      </div>
      <p className="text-xs mb-3" style={{ color: C.textMuted }}>
        Dodirni dan da promijeniš smjenu — redom kroz {shiftDefs.map((d) => d.name).join(" → ")} → Slobodno
      </p>
      <div className="flex flex-wrap gap-2">
        {days.map((day, i) => (
          <button key={i} onClick={() => cycle(i)} className="rounded-xl px-3 py-2 text-left" style={{ background: C.surface2, border: `1.5px solid ${colorFor(day.shiftId, i)}`, minWidth: 80 }}>
            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>DAN {i + 1}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{nameFor(day.shiftId)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

const STORAGE_KEY = "smenski-ritam-v3";
const DEFAULT_SHIFT_DEFS = [
  { id: "a", name: "Prva smjena", start: 7, end: 19 },
  { id: "b", name: "Druga smjena", start: 19, end: 7 },
];
const DEFAULT_DAYS = [
  { shiftId: OFF_ID }, { shiftId: "a" }, { shiftId: "a" }, { shiftId: "b" },
  { shiftId: "b" }, { shiftId: OFF_ID }, { shiftId: OFF_ID },
];

export default function ShiftRhythmPlanner() {
  const [shiftDefs, setShiftDefs] = useState(DEFAULT_SHIFT_DEFS);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.days) && Array.isArray(parsed.shiftDefs)) {
          setShiftDefs(parsed.shiftDefs);
          setDays(parsed.days);
        }
      }
    } catch (e) {
      /* nema spremljenog rasporeda — koristi zadani */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ shiftDefs, days }));
      } catch (e) {
        console.error("Spremanje nije uspjelo:", e);
      }
    }, 400);
  }, [shiftDefs, days, loaded]);

  useEffect(() => {
    const validIds = new Set(shiftDefs.map((d) => d.id));
    validIds.add(OFF_ID);
    setDays((ds) => ds.map((d) => (validIds.has(d.shiftId) ? d : { shiftId: OFF_ID })));
  }, [shiftDefs]);

  const effectiveIds = days.map((_, i) => resolveEffectiveId(days, i));
  const risks = effectiveIds.map((id, i) => {
    if (i === 0) return null;
    const midA = profileFor(id, shiftDefs).profile.sleepMidClock;
    const midB = profileFor(effectiveIds[i - 1], shiftDefs).profile.sleepMidClock;
    const diff = circularDiff(midA, midB);
    const level = diff >= 6 ? "high" : diff >= 3 ? "caution" : "ok";
    return { level, diff };
  });

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }} className="w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
      `}</style>
      <div className="max-w-2xl mx-auto px-4 py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-1" style={{ color: C.shiftBar }}>
            <Briefcase size={16} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 1 }}>PLANER ZA SMJENSKI RAD</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: C.textPrimary, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: -0.5 }}>
            Smjenski ritam
          </h1>
          <p className="mt-1 text-sm" style={{ color: C.textMuted }}>
            Svatko postavlja svoje radno vrijeme — bilo koji početak i kraj. Za svaki dan: kada
            tražiti jako svjetlo, kada ga izbjegavati, kada spavati i kada popiti posljednju kavu.
          </p>
        </header>

        <ShiftDefsEditor shiftDefs={shiftDefs} setShiftDefs={setShiftDefs} />

        <div className="mb-5">
          <ScheduleEditor days={days} setDays={setDays} shiftDefs={shiftDefs} />
        </div>

        <div className="flex flex-wrap gap-4 mb-5 px-1">
          <Legend swatch={C.sleep} label="San" />
          <Legend swatch={C.seek} label="Traži jako svjetlo" />
          <Legend swatch={C.avoid} label="Izbjegavaj svjetlo" />
          <Legend bar={C.shiftBar} label="Smjena" />
          <Legend dot={C.caffeine} label="Granica za kofein" />
        </div>

        <div className="space-y-3">
          {days.map((day, i) => (
            <DayCard
              key={i}
              index={i}
              day={day}
              shiftDefs={shiftDefs}
              effectiveId={effectiveIds[i]}
              isBorrowed={day.shiftId === OFF_ID && effectiveIds[i] !== OFF_ID}
              risk={risks[i]}
            />
          ))}
        </div>

        <div className="flex gap-2 items-start mt-6 p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <Info size={15} style={{ color: C.textMuted, marginTop: 2, flexShrink: 0 }} />
          <p className="text-xs" style={{ color: C.textMuted, lineHeight: 1.5 }}>
            Ovo je pojednostavljeni alat zasnovan na općim principima kronobiologije, a ne osobni
            medicinski savjet. Trake su okrenute prema trenutku buđenja za svaku smjenu, pa svaka
            pokriva puni ciklus budan → spava → budan. Za kronične probleme sa snom obrati se liječniku
            ili specijalistu za medicinu spavanja.
          </p>
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, bar, dot, label }) {
  return (
    <div className="flex items-center gap-1.5">
      {swatch && <span style={{ width: 10, height: 10, borderRadius: 3, background: swatch, display: "inline-block" }} />}
      {bar && <span style={{ width: 10, height: 4, borderRadius: 2, background: bar, display: "inline-block" }} />}
      {dot && <span style={{ width: 2, height: 10, background: dot, display: "inline-block" }} />}
      <span className="text-xs" style={{ color: C.textMuted }}>{label}</span>
    </div>
  );
}
