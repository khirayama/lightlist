import { KeyboardEvent, ReactNode } from "react";
import qs from "query-string";
import Link from "next/link";

export function ParamsLink(props: {
  href?: string;
  params?: Query;
  mergeParams?: boolean;
  replace?: boolean;
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
  const href = (props.href || window.location.pathname) + (s ? `?${s}` : "");
  delete p.mergeParams;
  delete p.params;
  return <Link {...{ ...p, href }}>{props.children}</Link>;
}
