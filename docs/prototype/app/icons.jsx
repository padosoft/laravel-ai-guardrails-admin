/* ============================================================
   Icon set — minimal stroke icons (lucide-style)
   window.Icon — <Icon name="shield" size={16} />
   ============================================================ */
(function () {
  "use strict";

  const P = {
    shield: "M12 3 4 6v6c0 4.5 3.4 7.6 8 9 4.6-1.4 8-4.5 8-9V6l-8-3Z",
    scan: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2|M7 12h10",
    filter: "M3 5h18l-7 8v6l-4-2v-4L3 5Z",
    gavel: "M14 13l-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10|M10.5 6.5l5 5|M8 4l8 8|M14.5 2.5l3 3M5.5 11.5l3 3|M14 21h7",
    dashboard: "M3 3h8v8H3V3Z|M13 3h8v5h-8V3Z|M13 10h8v11h-8V10Z|M3 13h8v8H3v-8Z",
    list: "M8 6h13M8 12h13M8 18h13|M3 6h.01M3 12h.01M3 18h.01",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z|M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z",
    flask: "M9 3h6|M10 3v6.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-8.5V3|M7.5 14h9",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z|M21 21l-4.3-4.3",
    x: "M18 6 6 18M6 6l12 12",
    check: "M20 6 9 17l-5-5",
    chevronRight: "M9 6l6 6-6 6",
    chevronDown: "M6 9l6 6 6-6",
    sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z|M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
    moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
    alert: "M12 9v4M12 17h.01|M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
    info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z|M12 11v5M12 8h.01",
    inbox: "M22 12h-6l-2 3h-4l-2-3H2|M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z",
    refresh: "M3 12a9 9 0 0 1 15-6.7L21 8|M21 3v5h-5|M21 12a9 9 0 0 1-15 6.7L3 16|M3 21v-5h5",
    plus: "M12 5v14M5 12h14",
    bolt: "M13 2 3 14h7l-1 8 10-12h-7l1-8Z",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z|M12 7v5l3 2",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z|M5 21a7 7 0 0 1 14 0",
    eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
    db: "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Z|M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5|M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
    lock: "M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z|M8 11V7a4 4 0 0 1 8 0v4",
    eyeOff: "M2 12s3.5-7 10-7c1.6 0 3 .4 4.3 1M22 12s-3.5 7-10 7c-1.6 0-3-.4-4.3-1|M9.9 9.9a3 3 0 0 0 4.2 4.2|M3 3l18 18",
    hash: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18",
    history: "M3 3v5h5|M3.05 13a9 9 0 1 0 2.6-6.4L3 8|M12 7v5l3 2",
    wand: "M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5",
  };

  function Icon({ name, size = 16, stroke = 2, style, className }) {
    const d = P[name];
    if (!d) return null;
    const parts = d.split("|");
    return React.createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: stroke,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        style,
        className,
      },
      parts.map((p, i) => React.createElement("path", { key: i, d: p }))
    );
  }

  window.Icon = Icon;
})();
