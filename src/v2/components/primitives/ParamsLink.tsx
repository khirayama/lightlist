import { KeyboardEvent, ReactNode } from "react";
import qs from "query-string";
import Link from "next/link";

export function ParamsLink(props: {
  href: string;
  params?: Query;
  mergeParams?: boolean;
  className?: string;
  tabIndex?: number;
  children: ReactNode;
  onKeyDown?: (e?: KeyboardEvent<HTMLAnchorElement>) => void;
}) {
  const p = { ...props };
  const q = props.mergeParams
    ? { ...qs.parse(window.location.search), ...props.params }
    : props.params;
  const s = qs.stringify(q);
  const href = props.href + (s ? `?${s}` : "");
  p.href = href;
  delete p.mergeParams;
  delete p.params;
  return <Link {...p}>{props.children}</Link>;
}
