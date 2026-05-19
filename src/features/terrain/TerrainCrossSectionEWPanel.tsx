import { crossSectionDataEW } from './generated/crossSectionDataEW';

const PART1_COLOR = '#e07b39';
const PART2_COLOR = '#4a90d9';
const W = 800;
const H = 260;
const PAD = { top: 28, right: 20, bottom: 44, left: 54 };

export function TerrainCrossSectionEWPanel() {
    const { points, buildingParts } = crossSectionDataEW;

    const es = points.map(p => p.distE);
    const zs = points.map(p => p.zSmooth);

    const minE = es[0];
    const maxE = es[es.length - 1];
    const minZ = Math.min(...zs) - 0.5;
    const maxZ = Math.max(...zs) + 1.0;

    const cx = (e: number) => PAD.left + ((e - minE) / (maxE - minE)) * (W - PAD.left - PAD.right);
    const cy = (z: number) => PAD.top + ((maxZ - z) / (maxZ - minZ)) * (H - PAD.top - PAD.bottom);

    const smoothLine = points.map(p => `${cx(p.distE).toFixed(1)},${cy(p.zSmooth).toFixed(1)}`).join(' ');
    const rawLine = points.map(p => `${cx(p.distE).toFixed(1)},${cy(p.zRaw).toFixed(1)}`).join(' ');

    const fillPath =
        `M ${cx(minE).toFixed(1)},${cy(minZ).toFixed(1)} ` +
        points.map(p => `L ${cx(p.distE).toFixed(1)},${cy(p.zSmooth).toFixed(1)}`).join(' ') +
        ` L ${cx(maxE).toFixed(1)},${cy(minZ).toFixed(1)} Z`;

    const yTick0 = Math.ceil(minZ / 2) * 2;
    const yTicks: number[] = [];
    for (let z = yTick0; z <= maxZ; z += 2) yTicks.push(z);

    const xTick0 = Math.ceil(minE / 20) * 20;
    const xTicks: number[] = [];
    for (let e = xTick0; e <= maxE; e += 20) xTicks.push(e);

    const { part1, part2 } = buildingParts;

    const floorLines = [
        { label: 'Part 1', z: part1.floorM, color: PART1_COLOR, eW: part1.eWest, eE: part1.eEast },
        { label: 'Part 2', z: part2.floorM, color: PART2_COLOR, eW: part2.eWest, eE: part2.eEast },
    ];

    return (
        <section className="panel">
            <div style={{ padding: '0 4px' }}>
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ width: '100%', height: 'auto', display: 'block', background: '#111827', borderRadius: 6 }}
                    aria-label="E–W terrain cross-section"
                >
                    <defs>
                        <linearGradient id="terrainFillEW" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4a7c59" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#1e3a2f" stopOpacity="0.85" />
                        </linearGradient>
                        <clipPath id="chartClipEW">
                            <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} />
                        </clipPath>
                    </defs>

                    {/* Grid */}
                    {yTicks.map(z => (
                        <line key={z} x1={PAD.left} x2={W - PAD.right} y1={cy(z)} y2={cy(z)}
                            stroke="#ffffff18" strokeWidth="0.6" strokeDasharray="3 4" />
                    ))}
                    {xTicks.map(e => (
                        <line key={e} x1={cx(e)} x2={cx(e)} y1={PAD.top} y2={H - PAD.bottom}
                            stroke="#ffffff10" strokeWidth="0.5" strokeDasharray="2 5" />
                    ))}

                    {/* Building part spans */}
                    {floorLines.map(fl => (
                        <rect key={fl.label}
                            x={cx(fl.eW)} width={Math.max(1, cx(fl.eE) - cx(fl.eW))}
                            y={PAD.top} height={H - PAD.top - PAD.bottom}
                            fill={fl.color} fillOpacity="0.10" clipPath="url(#chartClipEW)" />
                    ))}

                    {/* Terrain fill */}
                    <path d={fillPath} fill="url(#terrainFillEW)" clipPath="url(#chartClipEW)" />

                    {/* Raw */}
                    <polyline points={rawLine} fill="none"
                        stroke="#6aaa6a" strokeWidth="0.7" strokeOpacity="0.45" clipPath="url(#chartClipEW)" />

                    {/* Smooth */}
                    <polyline points={smoothLine} fill="none"
                        stroke="#90d490" strokeWidth="1.8" clipPath="url(#chartClipEW)" />

                    {/* Floor lines */}
                    {floorLines.map(fl => (
                        <g key={fl.label} clipPath="url(#chartClipEW)">
                            <line
                                x1={cx(fl.eW)} x2={cx(fl.eE)}
                                y1={cy(fl.z)} y2={cy(fl.z)}
                                stroke={fl.color} strokeWidth="1.4" strokeDasharray="5 3" strokeOpacity="0.9"
                            />
                            <text x={cx((fl.eW + fl.eE) / 2)} y={cy(fl.z) - 4}
                                fill={fl.color} fontSize="7.5" textAnchor="middle" fontWeight="600">
                                {fl.label} {fl.z.toFixed(2)} m
                            </text>
                        </g>
                    ))}

                    {/* Address point */}
                    <line x1={cx(0)} x2={cx(0)} y1={PAD.top} y2={H - PAD.bottom}
                        stroke="#f0c040" strokeWidth="1.2" strokeDasharray="4 3" strokeOpacity="0.8" />
                    <text x={cx(0)} y={PAD.top - 6} fill="#f0c040" fontSize="7" textAnchor="middle">addr</text>

                    {/* Y-axis */}
                    {yTicks.map(z => (
                        <g key={z}>
                            <line x1={PAD.left - 3} x2={PAD.left} y1={cy(z)} y2={cy(z)} stroke="#666" strokeWidth="1" />
                            <text x={PAD.left - 5} y={cy(z) + 3.5} fill="#888" fontSize="8" textAnchor="end">{z}</text>
                        </g>
                    ))}

                    {/* X-axis */}
                    {xTicks.map(e => (
                        <g key={e}>
                            <line x1={cx(e)} x2={cx(e)} y1={H - PAD.bottom} y2={H - PAD.bottom + 3} stroke="#666" strokeWidth="1" />
                            <text x={cx(e)} y={H - PAD.bottom + 12} fill="#888" fontSize="8" textAnchor="middle">{e > 0 ? `+${e}` : e}</text>
                        </g>
                    ))}

                    {/* Compass labels */}
                    <text x={PAD.left + 4} y={H - PAD.bottom + 28} fill="#666" fontSize="8">◀ West</text>
                    <text x={W - PAD.right - 4} y={H - PAD.bottom + 28} fill="#666" fontSize="8" textAnchor="end">East ▶</text>

                    {/* Axis label */}
                    <text x={W / 2} y={H - 4} fill="#666" fontSize="8" textAnchor="middle">
                        Distance from address point [m] — west ← 0 → east
                    </text>
                    <text x={12} y={(PAD.top + H - PAD.bottom) / 2} fill="#666" fontSize="8"
                        textAnchor="middle" transform={`rotate(-90,12,${(PAD.top + H - PAD.bottom) / 2})`}>
                        Elevation [m DHHN2016]
                    </text>

                    {/* Legend */}
                    <g transform={`translate(${W - PAD.right - 180},${PAD.top + 4})`}>
                        <rect width="178" height="54" fill="#0006" rx="3" />
                        <line x1="6" y1="12" x2="24" y2="12" stroke="#90d490" strokeWidth="1.8" />
                        <text x="28" y="15" fill="#aaa" fontSize="7.5">Smoothed (7-pt median)</text>
                        <line x1="6" y1="24" x2="24" y2="24" stroke="#6aaa6a" strokeWidth="0.8" strokeOpacity="0.6" />
                        <text x="28" y="27" fill="#aaa" fontSize="7.5">DGM1 raw (1 m grid)</text>
                        <rect x="6" y="32" width="12" height="8" fill={PART1_COLOR} fillOpacity="0.4" />
                        <text x="22" y="39" fill="#aaa" fontSize="7.5">Part 1 footprint (E–W)</text>
                        <rect x="6" y="42" width="12" height="8" fill={PART2_COLOR} fillOpacity="0.4" />
                        <text x="22" y="49" fill="#aaa" fontSize="7.5">Part 2 footprint (E–W)</text>
                    </g>

                    {/* Source note */}
                    <text x={W - PAD.right} y={H - PAD.bottom - 4}
                        fill="#444" fontSize="6.5" textAnchor="end">
                        BayLfU DGM1 · ±{crossSectionDataEW.corridorM} m N corridor · ETRS89/UTM32N
                    </text>
                </svg>
            </div>
        </section>
    );
}
