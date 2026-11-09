import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "@mui/material";
import "../styles/events.css";

export type EventSnapshot = {
  filename: string;
  image: string;
  mime_type: string;
  timestamp: string;
  category: string;
  camera_id?: string;
  camera_location?: string;
};

const labels: Record<string, string> = {
  NoHelmet: "No Helmet", "wrong-rute": "Wrong Direction", "signal-jumpig": "Signal Jump",
};
const emptyFilters = { cameras: [] as string[], locations: [] as string[], types: [] as string[], dateFrom: "", dateTo: "", timeFrom: "", timeTo: "" };

function parts(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { date: "", time: "", display: "Unavailable" };
  // All filter values and displayed times use the same city timezone.
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map(part => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}`, display: date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }), seconds: values.second };
}

export default function EventsTable({ snapshots, loading }: { snapshots: EventSnapshot[]; loading: boolean }) {
  const [filters, setFilters] = useState(emptyFilters);
  const [selected, setSelected] = useState<EventSnapshot | null>(null);
  const rows = snapshots.map(snapshot => ({ ...snapshot, ...parts(snapshot.timestamp), camera: snapshot.camera_id || "Unavailable", location: snapshot.camera_location || "Unavailable", violation: labels[snapshot.category] || snapshot.category }));
  const visible = rows.filter(row =>
    (!filters.cameras.length || filters.cameras.includes(row.camera)) &&
    (!filters.locations.length || filters.locations.includes(row.location)) &&
    (!filters.types.length || filters.types.includes(row.violation)) &&
    (!filters.dateFrom || row.date >= filters.dateFrom) &&
    (!filters.dateTo || (!!row.date && row.date <= filters.dateTo)) &&
    (!filters.timeFrom || row.time >= filters.timeFrom) &&
    (!filters.timeTo || (!!row.time && row.time <= filters.timeTo))
  );
  const invalidRange = (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) || (filters.timeFrom && filters.timeTo && filters.timeFrom > filters.timeTo);
  const imageUrl = (snapshot: EventSnapshot) => `data:${snapshot.mime_type};base64,${snapshot.image}`;

  return <section className="events-section" aria-labelledby="events-heading">
    <Link className="back-button" to="/operational">← Back to home</Link>
    <div className="events-heading"><div><p className="eyebrow">Violation monitoring</p><h2 id="events-heading">Events</h2><p>Review violations reported by edge devices and request the surrounding footage.</p></div><span className="session-status" role="status">{loading ? "Refreshing · " : ""}{visible.length} of {rows.length} events</span></div>
    <div className="events-filters">
      <div className="filters-heading"><div><strong>Filters</strong><small>Select one or more options to refine events.</small></div><button type="button" className="clear-filters" onClick={() => setFilters(emptyFilters)}>Clear filters</button></div>
      <div className="filter-grid">
        {([ ["cameras", "Camera", "camera"], ["locations", "Location", "location"], ["types", "Violation type", "violation"] ] as const).map(([key, title, field]) => <fieldset className="checkbox-filter" key={key}><legend>{title}</legend><div className="filter-checklist">{[...new Set(rows.map(row => row[field]))].sort().map(value => <label key={value}><input type="checkbox" checked={filters[key].includes(value)} onChange={event => { const checked = event.target.checked; setFilters(current => ({ ...current, [key]: checked ? [...current[key], value] : current[key].filter(item => item !== value) })); }} />{value}</label>)}</div></fieldset>)}
        {(["date", "time"] as const).map(kind => <div className={`date-filter ${kind}-filter-group`} key={kind}><span>{kind === "date" ? "Date range" : "Time range (IST)"}</span><div>{(["From", "To"] as const).map(bound => { const key = `${kind}${bound}` as "dateFrom" | "dateTo" | "timeFrom" | "timeTo"; return <label key={key}>{bound}<input type={kind} value={filters[key]} onChange={event => setFilters(current => ({ ...current, [key]: event.target.value }))} /></label>; })}</div></div>)}
      </div>
      {invalidRange && <p role="alert">From must be earlier than To.</p>}
    </div>
    <div className="events-table-wrap"><table className="events-table"><thead><tr>{["Event date", "Event time", "Camera ID", "Camera location", "Type of violation", "Snapshot", "Footage", "Action"].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>
      {visible.map(row => <tr key={`${row.category}:${row.filename}`}><td>{row.display}</td><td>{row.time ? `${row.time}:${row.seconds}` : "Unavailable"}</td><td><code className="camera-id">{row.camera}</code></td><td>{row.location}</td><td><span className="violation-badge">{row.violation}</span></td><td><button className="snapshot-button" type="button" aria-label={`Open ${row.violation} snapshot`} onClick={() => setSelected(row)}><img src={imageUrl(row)} alt={`${row.violation} violation snapshot`} /></button></td><td><button className="footage-button" type="button" disabled title="Event-specific footage is not supported by the current API">Open footage</button><small className="provisional-text">Unavailable</small></td><td><div className="action-buttons"><button className="action-button process-action" type="button" disabled title="Requires a processing API">Process Action</button><button className="action-button exemption-action" type="button" disabled title="Requires an exemption API">Request Exemption</button></div></td></tr>)}
      {!visible.length && <tr><td colSpan={8}>{loading ? "Loading events…" : "No events match the selected filters."}</td></tr>}
    </tbody></table></div>
    <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth aria-labelledby="snapshot-title"><div className="image-modal"><h3 id="snapshot-title">Violation snapshot</h3><button className="modal-close" type="button" aria-label="Close snapshot" onClick={() => setSelected(null)}>×</button>{selected && <><img src={imageUrl(selected)} alt="Enlarged violation snapshot" /><a className="download-button" href={imageUrl(selected)} download={selected.filename}>Download snapshot</a></>}</div></Dialog>
  </section>;
}
