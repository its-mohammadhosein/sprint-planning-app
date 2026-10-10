"use client";

import { useEffect, useRef, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type ComboboxOption = { id: number; label: string };

const DEBOUNCE_MS = 300;

/**
 * A single-select combobox that live-fetches its options from `endpoint`
 * as the user types, instead of filtering a list already loaded in full.
 */
export function SearchCombobox<T>({
  id,
  value,
  onChange,
  endpoint,
  params,
  mapItem,
  placeholder,
  emptyLabel = "No results.",
  disabled = false,
  clearable = true,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: ComboboxOption | null;
  onChange: (option: ComboboxOption | null) => void;
  endpoint: string;
  params?: Record<string, string>;
  mapItem: (raw: T) => ComboboxOption;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  clearable?: boolean;
  "aria-invalid"?: boolean;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [options, setOptions] = useState<ComboboxOption[]>(value ? [value] : []);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  });

  // Reflect selection changes made from outside (resetting the form, or a
  // parent field like Team clearing this one) back into the input text.
  // Adjusted during render (React's documented escape hatch for this exact
  // case) rather than in an effect, so there's no stale-text flash.
  const valueKey = `${value?.id ?? ""}:${value?.label ?? ""}`;
  const [prevValueKey, setPrevValueKey] = useState(valueKey);
  if (valueKey !== prevValueKey) {
    setPrevValueKey(valueKey);
    setQuery(value?.label ?? "");
  }

  function search(q: string) {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const searchParams = new URLSearchParams({ ...params, q });
    fetch(`${endpoint}?${searchParams.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: T[]) => {
        if (requestId !== requestIdRef.current) return;
        setOptions(data.map(mapItem));
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setOptions([]);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }

  useEffect(() => {
    // Mount, and whenever a bias param (e.g. the assignee's team filter)
    // changes — re-run with whatever is currently typed.
    search(queryRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  function handleInputValueChange(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(next), DEBOUNCE_MS);
  }

  return (
    <Combobox
      items={options}
      value={value}
      onValueChange={onChange}
      inputValue={query}
      onInputValueChange={handleInputValueChange}
      filter={null}
      isItemEqualToValue={(a: ComboboxOption | null, b: ComboboxOption | null) => a?.id === b?.id}
      itemToStringValue={(item: ComboboxOption | null) => (item ? String(item.id) : "")}
      itemToStringLabel={(item: ComboboxOption | null) => item?.label ?? ""}
      disabled={disabled}
    >
      <ComboboxInput id={id} placeholder={placeholder} showClear={clearable} aria-invalid={ariaInvalid} />
      <ComboboxContent>
        <ComboboxEmpty>{loading ? "Searching…" : emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(item: ComboboxOption) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
