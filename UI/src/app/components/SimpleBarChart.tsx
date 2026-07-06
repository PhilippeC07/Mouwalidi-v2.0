import { useRef, useState, useEffect } from 'react';

export interface BarDatum {
  name: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarDatum[];
  height?: number;
  defaultColor?: string;
  unit?: string;
  formatValue?: (v: number) => string;
}

const PAD_BASE = { top: 16, right: 16, bottom: 36, left: 52 };
const PAD_ROTATED_BOTTOM = 74;
const AVG_CHAR_WIDTH = 6;

function niceMax(v: number): number {
  if (v === 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil((v * 1.15) / exp) * exp;
}

function yTicks(max: number, steps = 5): number[] {
  const step = max / steps;
  return Array.from({ length: steps + 1 }, (_, i) =>
    parseFloat((step * i).toFixed(4)),
  );
}

export function SimpleBarChart({
  data,
  height = 200,
  defaultColor = '#facc15',
  unit = '',
  formatValue,
}: SimpleBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    datum: BarDatum;
  } | null>(null);

  const updateWidth = () => {
    const nextWidth = containerRef?.current?.offsetWidth || 600;
    setWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const ro = new ResizeObserver(() => {
      updateWidth();
    });

    ro.observe(element);

    return () => ro.disconnect();
  }, []);

  const cw = width - PAD_BASE.left - PAD_BASE.right;
  const slotW = data.length > 0 ? cw / data.length : cw;
  const longestLabelLen = data.reduce((max, d) => Math.max(max, d.name.length), 0);
  const needsRotation = longestLabelLen * AVG_CHAR_WIDTH > slotW - 8;
  const PAD = { ...PAD_BASE, bottom: needsRotation ? PAD_ROTATED_BOTTOM : PAD_BASE.bottom };
  // Keep the plotted bar area the same regardless of rotation — grow the
  // total SVG height instead of stealing room from the bars themselves.
  const svgHeight = height + (PAD.bottom - PAD_BASE.bottom);

  const ch = svgHeight - PAD.top - PAD.bottom;
  const maxVal = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = yTicks(maxVal);

  const barW = Math.max(4, slotW * 0.55);
  const r = Math.min(5, barW / 2);

  const xOf = (i: number) => PAD.left + i * slotW + slotW / 2;
  const yOf = (v: number) => PAD.top + ch - (v / maxVal) * ch;

  const fmt = (v: number) => (formatValue ? formatValue(v) : `${v}${unit}`);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        width={width}
        height={svgHeight}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Grid lines + Y labels */}
        {ticks.map((tick, ti) => {
          const y = yOf(tick);
          return (
            <g key={`ytick-${ti}`}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + cw}
                y2={y}
                stroke="#1f2937"
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fill="#6b7280"
                fontSize={11}
                fontFamily="inherit"
              >
                {fmt(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars + X labels */}
        {data.map((d, i) => {
          const rawH = (d.value / maxVal) * ch;
          const bh = Math.max(0, rawH);
          const bx = xOf(i) - barW / 2;
          const by = yOf(d.value);
          const fill = d.color ?? defaultColor;

          return (
            <g key={`bar-${i}`}>
              {/* Bar (rounded top only) */}
              {bh > 0 && (
                <path
                  d={`
                    M ${bx + r} ${by}
                    L ${bx + barW - r} ${by}
                    Q ${bx + barW} ${by} ${bx + barW} ${by + r}
                    L ${bx + barW} ${by + bh}
                    L ${bx} ${by + bh}
                    L ${bx} ${by + r}
                    Q ${bx} ${by} ${bx + r} ${by}
                    Z
                  `}
                  fill={fill}
                  onMouseMove={(e) =>
                    setTooltip({ x: e.clientX, y: e.clientY, datum: d })
                  }
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'default' }}
                />
              )}

              {/* X-axis label */}
              <text
                x={xOf(i)}
                y={PAD.top + ch + 20}
                textAnchor={needsRotation ? 'end' : 'middle'}
                transform={needsRotation ? `rotate(-35 ${xOf(i)} ${PAD.top + ch + 20})` : undefined}
                fill="#6b7280"
                fontSize={11}
                fontFamily="inherit"
              >
                {d.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 44,
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 8,
            padding: '6px 10px',
            color: '#f9fafb',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ color: '#9ca3af', marginBottom: 2 }}>
            {tooltip.datum.name}
          </div>
          <div style={{ fontWeight: 600 }}>{fmt(tooltip.datum.value)}</div>
        </div>
      )}
    </div>
  );
}
