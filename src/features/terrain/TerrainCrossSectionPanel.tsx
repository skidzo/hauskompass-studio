import { crossSectionData } from './generated/crossSectionData';

const PART1_COLOR = '#e07b39';
const PART2_COLOR = '#4a90d9';
const W = 800;
const H = 260;
const PAD = { top: 28, right: 20, bottom: 44, left: 54 };

export function TerrainCrossSectionPanel() {
    const { points, buildingParts } = crossSectionData;

    const ns = points.map(p => p.distN);
    const zs = points.map(p => p.zSmooth);
    const zsr = points.map(p => p.zRaw);

    const minN = ns[0];
    const maxN = ns[ns.length - 1];
    const minZ = Math.min(...zs) - 0.5;
    const maxZ = Math.max(...zs) + 1.0;

    const cx = (n: number) => PAD.left + ((n - minN) / (maxN - minN)) * (W - PAD.left - PAD.right);
    const cy = (z: number) => PAD.top + ((maxZ - z) / (maxZ - minZ)) * (H - PAD.top - PAD.bottom);

    // Build SVG polyline strings
    const smoothLine = points.map(p => `${cx(p.distN).toFixed(1)},${cy(p.zSmooth).toFixed(1)}`).join(' ');
    const rawLine = points.map(p => `${cx(p.distN).toFixed(1)},${cy(p.zRaw).toFixed(1)}`).join(' ');

    // Fill polygon: smooth line + bottom-right + bottom-left
    const fillPath =
        `M ${cx(minN).toFixed(1)},${cy(minZ).toFixed(1)} ` +
        points.map(p => `L ${cx(p.distN).toFixed(1)},${cy(p.zSmooth).toFixed(1)}`).join(' ') +
        ` L ${cx(maxN).toFixed(1)},${cy(minZ).toFixed(1)} Z`;

    // Y-axis ticks (every 2 m)
    const yTick0 = Math.ceil(minZ / 2) * 2;
    const yTicks: number[] = [];
    for (let z = yTick0; z <= maxZ; z += 2) yTicks.push(z);

    // X-axis ticks (every 20 m)
    const xTick0 = Math.ceil(minN / 20) * 20;
    const xTicks: number[] = [];
    for (let n = xTick0; n <= maxN; n += 20) xTicks.push(n);

    const { part1, part2 } = buildingParts;

    // Floor level reference lines (only show if within profile range)
    const floorLines = [
        { label: `Part 1 floor\n${part1.zFloor?.toFixed(2)} m`, z: part1.zFloor ?? 0, color: PART1_COLOR, nS: part1.nSouth ?? 0, nN: part1.nNorth ?? 0 },
        { label: `Part 2 floor\n${part2.zFloor?.toFixed(2)} m`, z: part2.zFloor ?? 0, color: PART2_COLOR, nS: part2.nSouth ?? 0, nN: part2.nNorth ?? 0 },
    ];

    return (
        <section className="panel">
            <div style={{ padding: '0 4px' }}>
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ width: '100%', height: 'auto', display: 'block', background: '#111827', borderRadius: 6 }}
                    aria-label="N–S terrain cross-section"
                >
                    <defs>
                        <linearGradient id="terrainFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4a7c59" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#1e3a2f" stopOpacity="0.85" />
                        </linearGradient>
                        <clipPath id="chartClip">
                            <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} />
                        </clipPath>
                    </defs>

                    {/* Grid lines */}
                    {yTicks.map(z => (
                        <line key={z} x1={PAD.left} x2={W - PAD.right} y1={cy(z)} y2={cy(z)}
                            stroke="#ffffff18" strokeWidth="0.6" strokeDasharray="3 4" />
                    ))}
                    {xTicks.map(n => (
                        <line key={n} x1={cx(n)} x2={cx(n)} y1={PAD.top} y2={H - PAD.bottom}
                            stroke="#ffffff10" strokeWidth="0.5" strokeDasharray="2 5" />
                    ))}

                    {/* Building part spans */}
                    {floorLines.map(fl => (
                        <rect key={fl.color}
                            x={cx(fl.nS)} width={cx(fl.nN) - cx(fl.nS)}
                            y={PAD.top} height={H - PAD.top - PAD.bottom}
                            fill={fl.color} fillOpacity="0.10" clipPath="url(#chartClip)" />
                    ))}

                    {/* Terrain fill */}
                    <path d={fillPath} fill="url(#terrainFill)" clipPath="url(#chartClip)" />

                    {/* Raw data */}
                    <polyline points={rawLine} fill="none"
                        stroke="#6aaa6a" strokeWidth="0.7" strokeOpacity="0.45" clipPath="url(#chartClip)" />

                    {/* Smooth line */}
                    <polyline points={smoothLine} fill="none"
                        stroke="#90d490" strokeWidth="1.8" clipPath="url(#chartClip)" />

                    {/* Floor reference lines */}
                    {floorLines.map(fl => (
                        <g key={fl.color} clipPath="url(#chartClip)">
                            <line
                                x1={cx(fl.nS)} x2={cx(fl.nN)}
                                y1={cy(fl.z)} y2={cy(fl.z)}
                                stroke={fl.color} strokeWidth="1.4" strokeDasharray="5 3" strokeOpacity="0.9"
                            />
                            <text x={cx((fl.nS + fl.nN) / 2)} y={cy(fl.z) - 4}
                                fill={fl.color} fontSize="7.5" textAnchor="middle" fontWeight="600">
                                {fl.z.toFixed(2)} m
                            </text>
                        </g>
                    ))}

                    {/* Address point */}
                    <line x1={cx(0)} x2={cx(0)} y1={PAD.top} y2={H - PAD.bottom}
                        stroke="#f0c040" strokeWidth="1.2" strokeDasharray="4 3" strokeOpacity="0.8" />
                    <text x={cx(0)} y={PAD.top - 6} fill="#f0c040" fontSize="7" textAnchor="middle">addr</text>

                    {/* Y-axis ticks + labels */}
                    {yTicks.map(z => (
                        <g key={z}>
                            <line x1={PAD.left - 4} x2={PAD.left} y1={cy(z)} y2={cy(z)} stroke="#666" strokeWidth="0.8" />
                            <text x={PAD.left - 6} y={cy(z) + 3.5} fill="#888" fontSize="8" textAnchor="end">
                                {z}
                            </text>
                        </g>
                    ))}

                    {/* X-axis ticks + labels */}
                    {xTicks.map(n => (
                        <g key={n}>
                            <line x1={cx(n)} x2={cx(n)} y1={H - PAD.bottom} y2={H - PAD.bottom + 4} stroke="#666" strokeWidth="0.8" />
                            <text x={cx(n)} y={H - PAD.bottom + 13} fill="#888" fontSize="8" textAnchor="middle">
                                {n > 0 ? `+${n}` : n}
                            </text>
                        </g>
                    ))}

                    {/* Axis labels */}
                    <text x={PAD.left + (W - PAD.left - PAD.right) / 2} y={H - 4}
                        fill="#666" fontSize="8.5" textAnchor="middle">
                        Distance from address point [m]  ◀ South · North ▶
                    </text>
                    <text
                        x={10} y={PAD.top + (H - PAD.top - PAD.bottom) / 2}
                        fill="#666" fontSize="8" textAnchor="middle"
                        transform={`rotate(-90, 10, ${PAD.top + (H - PAD.top - PAD.bottom) / 2})`}
                    >
                        Elevation [m a.s.l.]
                    </text>

                    {/* Legend */}
                    <g transform={`translate(${PAD.left + 8}, ${PAD.top + 8})`}>
                        <rect width="84" height="44" rx="3" fill="#000000" fillOpacity="0.5" />
                        <line x1="6" y1="9" x2="18" y2="9" stroke="#90d490" strokeWidth="1.8" />
                        <text x="22" y="12" fill="#aaa" fontSize="7">Smoothed (7-pt median)</text>
                        <line x1="6" y1="21" x2="18" y2="21" stroke="#6aaa6a" strokeWidth="0.8" strokeOpacity="0.5" />
                        <text x="22" y="24" fill="#aaa" fontSize="7">DGM1 raw (1 m grid)</text>
                        <rect x="6" y="30" width="6" height="6" fill={PART1_COLOR} fillOpacity="0.5" />
                        <text x="16" y="36.5" fill="#aaa" fontSize="7">Part 1 / Part 2</text>
                        <rect x="46" y="30" width="6" height="6" fill={PART2_COLOR} fillOpacity="0.5" />
                    </g>

                    {/* Compass labels */}
                    <text x={PAD.left + 4} y={H - PAD.bottom - 4} fill="#555" fontSize="8">◀ S</text>
                    <text x={W - PAD.right - 4} y={H - PAD.bottom - 4} fill="#555" fontSize="8" textAnchor="end">N ▶</text>

                    {/* Data source note */}
                    <text x={W - PAD.right} y={H - 3} fill="#444" fontSize="6.5" textAnchor="end">
                        BayLfU DGM1 open data · corridor ±20 m · 120 pts
                    </text>
                </svg>
            </div>
        </section>
    );
}
