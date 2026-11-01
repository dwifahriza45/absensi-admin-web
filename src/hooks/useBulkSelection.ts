import { useEffect, useState } from "react";

type Selectable = { can_delete?: boolean };
export function useBulkSelection<T extends Selectable>(
  items: T[],
  getId: (item: T) => string,
  scope: string,
) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setIds(new Set());
  }, [scope]);
  const selected = items.filter(
    (item) => item.can_delete === true && ids.has(getId(item)),
  );
  const selectedIds = new Set(selected.map(getId));
  const toggle = (id: string, checked: boolean) =>
    setIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  const pageState = (rows: T[]) => {
    const eligible = rows.filter((item) => item.can_delete === true);
    const count = eligible.filter((item) =>
      selectedIds.has(getId(item)),
    ).length;
    return {
      disabled: eligible.length === 0,
      checked: eligible.length > 0 && count === eligible.length,
      indeterminate: count > 0 && count < eligible.length,
    };
  };
  const togglePage = (rows: T[], checked: boolean) =>
    setIds((current) => {
      const next = new Set(current);
      for (const item of rows) {
        if (item.can_delete === true) {
          if (checked) next.add(getId(item));
          else next.delete(getId(item));
        }
      }
      return next;
    });
  return {
    selected,
    selectedIds,
    toggle,
    pageState,
    togglePage,
    clear: () => setIds(new Set()),
  };
}
