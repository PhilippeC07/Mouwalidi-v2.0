import { useRef, useState, useEffect } from 'react';

export interface LineSeries {
  name: string;
  color: string;
  points: { x: string; y: number }[];
}

interface SimpleLineChartProps {
  series: LineSeries[];
  height?: number;
  formatValue?: (v: number) => string;
}

const PAD = { top: 20, right: 76, bottom: 32, left: 56 };

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil((v * 1.15) / exp) * exp;
}

function yTicks(min: number, max: number, steps = 5): number[] {
  const step = (max - min) / steps;
  return Array.from({ length: steps + 1 }, (_, i) => parseFloat((min + step * i).toFixed(4)));
}

export function SimpleLineChart({ series, height = 220, formatValue }: SimpleLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth((prev) => {
      const next = el.offsetWidth || 600;
      return prev === next ? prev : next;
    });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pointCount = series[0]?.points.length ?? 0;
  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;
  const allValues = series.flatMap((s) => s.points.map((p) => p.y));
  const rawMin = Math.min(...allValues, 0);
  const maxVal = niceMax(Math.max(...allValues, 0));
  const minVal = rawMin < 0 ? -niceMax(-rawMin) : 0;
  const span = maxVal - minVal || 1;
  const ticks = yTicks(minVal, maxVal);

  const xOf = (i: number) => (pointCount <= 1 ? PAD.left + cw / 2 : PAD.left + (i / (pointCount - 1)) * cw);
  const yOf = (v: number) => PAD.top + ch - ((v - minVal) / span) * ch;
  const fmt = (v: number) => (formatValue ? formatValue(v) : String(Math.round(v)));

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    if (pointCount <= 1) { setHoverIndex(0); return; }
    const ratio = Math.min(1, Math.max(0, (relX - PAD.left) / cw));
    setHoverIndex(Math.round(ratio * (pointCount - 1)));
  }

  // Nudge apart end-labels that would otherwise collide vertically.
  const endLabels = series.map((s) => {
    const last = s.points[s.points.length - 1];
    return { name: s.name, color: s.color, y: last ? yOf(last.y) : 0, value: last?.y ?? 0 };
  }).sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i++) {
    if (endLabels[i].y - endLabels[i - 1].y < 14) {
      endLabels[i].y = endLabels[i - 1].y + 14;
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
        {ticks.map((tick, ti) => {
          const y = yOf(tick);
          return (
            <g key={`ytick-${ti}`}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cw} y2={y} stroke="var(--br)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fill="var(--tx-3)" fontSize={11} fontFamily="inherit">
                {formatValue ? formatValue(tick) : tick}
              </text>
            </g>
          );
        })}

        {/* A single series reads as a trend, not an identity comparison — an
            area wash under the line reinforces that without needing a legend.
            Anchored to the zero baseline, not the chart's bottom edge, so it
            reads correctly when values dip negative. */}
        {series.length === 1 && series.map((s) => {
          const linePath = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(p.y)}`).join(' ');
          const zeroY = yOf(0);
          const areaPath = `${linePath} L ${xOf(pointCount - 1)} ${zeroY} L ${xOf(0)} ${zeroY} Z`;
          return <path key={`area-${s.name}`} d={areaPath} fill={s.color} opacity={0.1} stroke="none" />;
        })}

        {minVal < 0 && (
          <line x1={PAD.left} y1={yOf(0)} x2={PAD.left + cw} y2={yOf(0)} stroke="var(--tx-4)" strokeWidth={1} />
        )}

        {series.map((s) => {
          const path = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(p.y)}`).join(' ');
          return (
            <path key={s.name} d={path} fill="none" stroke={s.color} strokeWidth={2}
              strokeLinejoin="round" strokeLinecap="round" />
          );
        })}

        {series.map((s) => {
          const last = s.points[s.points.length - 1];
          if (!last) return null;
          return (
            <circle key={`end-${s.name}`} cx={xOf(pointCount - 1)} cy={yOf(last.y)} r={5}
              fill={s.color} stroke="var(--bg-0)" strokeWidth={2} />
          );
        })}

        {endLabels.map((l) => (
          <text key={`label-${l.name}`} x={PAD.left + cw + 8} y={l.y + 4} fontSize={11} fontFamily="inherit" fill="var(--tx-2)">
            {fmt(l.value)}
          </text>
        ))}

        {series[0]?.points.map((p, i) => (
          <text key={`xlabel-${i}`} x={xOf(i)} y={PAD.top + ch + 20} textAnchor="middle" fill="var(--tx-3)" fontSize={11} fontFamily="inherit">
            {p.x}
          </text>
        ))}

        {hoverIndex !== null && (
          <line x1={xOf(hoverIndex)} y1={PAD.top} x2={xOf(hoverIndex)} y2={PAD.top + ch}
            stroke="var(--tx-4)" strokeWidth={1} />
        )}
        {hoverIndex !== null && series.map((s) => {
          const p = s.points[hoverIndex];
          if (!p) return null;
          return (
            <circle key={`hover-${s.name}`} cx={xOf(hoverIndex)} cy={yOf(p.y)} r={5}
              fill={s.color} stroke="var(--bg-0)" strokeWidth={2} />
          );
        })}

        <rect x={PAD.left} y={PAD.top} width={cw} height={ch} fill="transparent"
          onMouseMove={handleMove} onMouseLeave={() => setHoverIndex(null)} style={{ cursor: 'crosshair' }} />
      </svg>

      {hoverIndex !== null && (
        <div style={{
          position: 'absolute',
          left: Math.min(xOf(hoverIndex) + 12, width - 150),
          top: 8,
          background: 'var(--bg-2)',
          border: '1px solid var(--br)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 12,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          <div style={{ color: 'var(--tx-3)', marginBottom: 4 }}>{series[0]?.points[hoverIndex]?.x}</div>
          {series.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ width: 10, height: 2, background: s.color, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ color: 'var(--tx-2)' }}>{s.name}</span>
              <strong style={{ color: 'var(--tx-0)', marginLeft: 'auto' }}>{fmt(s.points[hoverIndex]?.y ?? 0)}</strong>
            </div>
          ))}
        </div>
      )}

      {/* A single series needs no legend box — the chart's own title already
          names what's plotted; a one-swatch legend would just restate it. */}
      {series.length > 1 && (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
          {series.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx-3)' }}>
              <span style={{ width: 12, height: 2, background: s.color, display: 'inline-block', borderRadius: 1 }} />
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
