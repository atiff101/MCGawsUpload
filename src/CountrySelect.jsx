import { useState, useRef, useEffect } from "react";
import { COUNTRIES } from "./cbamData";

export default function CountrySelect({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  const selected = COUNTRIES.find((c) => c.code === value);

  const q = query.trim().toLowerCase();
  const filtered =
    q === ""
      ? COUNTRIES
      : COUNTRIES.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q),
        );

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(country) {
    onChange(country.code);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) select(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="country-select-wrapper">
      <input
        type="text"
        value={open ? query : selected ? selected.name : ""}
        placeholder="Search for a country..."
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
        className="field-control"
      />
      {open && (
        <div className="country-dropdown">
          {filtered.length === 0 && (
            <div className="country-no-results">No matching country</div>
          )}
          {filtered.map((c, i) => (
            <div
              key={c.code}
              onMouseDown={(e) => {
                e.preventDefault();
                select(c);
              }}
              onMouseEnter={() => setHighlight(i)}
              className="country-option"
              style={{
                backgroundColor:
                  i === highlight
                    ? "#eff6ff"
                    : c.code === value
                      ? "#f3f4f6"
                      : "#ffffff",
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
