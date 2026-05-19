import { useEffect, useState, type ChangeEvent } from 'react';
import {
  createRegisterTemplate,
  deleteLocalRegisterRecord,
  loadLocalPlanningRegisters,
  localRegisterLabels,
  mergeLocalPlanningRegisters,
  parseLocalRegisterImport,
  parseRegisterDraft,
  saveLocalPlanningRegisters,
  upsertLocalRegisterRecord,
  type LocalPlanningRegisters,
  type LocalRegisterType,
} from './localPlanningRegisters';

const registerTypes = Object.keys(localRegisterLabels) as LocalRegisterType[];

export function LocalRegistersPanel() {
  const [registers, setRegisters] = useState<LocalPlanningRegisters>(() => loadLocalPlanningRegisters());
  const [activeType, setActiveType] = useState<LocalRegisterType>('buildingFacts');
  const [draft, setDraft] = useState(() => JSON.stringify(createRegisterTemplate('buildingFacts'), null, 2));
  const [message, setMessage] = useState('Local browser storage only. Export before clearing browser data.');

  useEffect(() => {
    saveLocalPlanningRegisters(registers);
  }, [registers]);

  function switchType(type: LocalRegisterType) {
    setActiveType(type);
    setDraft(JSON.stringify(createRegisterTemplate(type), null, 2));
    setMessage('Template loaded. Edit JSON, then save to local register.');
  }

  function saveDraft() {
    const result = parseRegisterDraft(activeType, draft);
    if (!result.record) {
      setMessage(result.errors.join('; '));
      return;
    }
    const record = result.record;
    setRegisters((current) => upsertLocalRegisterRecord(current, activeType, record));
    setMessage(`Saved ${record.id} locally.`);
  }

  function editRecord(record: object) {
    setDraft(JSON.stringify(record, null, 2));
    setMessage('Loaded local record into editor. Save to update it.');
  }

  function importRegisters(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseLocalRegisterImport(String(reader.result ?? ''));
      if (!result.registers) {
        setMessage(result.errors.join('; '));
        return;
      }
      setRegisters((current) => mergeLocalPlanningRegisters(current, result.registers!));
      setMessage(`Imported local register file: ${file.name}.`);
      input.value = '';
    };
    reader.onerror = () => setMessage(`Could not read local register file: ${file.name}.`);
    reader.readAsText(file);
  }

  return (
    <section className="panel">
      <div className="panel-title">Local Editable Registers</div>
      <p className="panel-copy">
        Local-only working registers for site notes and project reasoning. Data is stored in this browser via localStorage and
        is not committed automatically.
      </p>
      <div className="filter-pill-row">
        {registerTypes.map((type) => (
          <button className={`filter-pill ${activeType === type ? 'filter-pill-active' : ''}`} key={type} onClick={() => switchType(type)} type="button">
            {localRegisterLabels[type]}
          </button>
        ))}
      </div>
      <div className="local-register-grid">
        <div>
          <label className="local-register-label" htmlFor="local-register-editor">JSON editor</label>
          <textarea
            className="local-register-editor"
            id="local-register-editor"
            onChange={(event) => setDraft(event.target.value)}
            value={draft}
          />
          <div className="local-register-actions">
            <button className="filter-pill filter-pill-active" onClick={saveDraft} type="button">Save locally</button>
            <button className="filter-pill" onClick={() => switchType(activeType)} type="button">Reset template</button>
            <label className="filter-pill local-register-import">
              Import JSON
              <input accept="application/json,.json" onChange={importRegisters} type="file" />
            </label>
          </div>
          <p className="fine-print">{message}</p>
        </div>
        <div className="planning-list">
          {registers[activeType].length === 0 && <div><strong>Noch keine lokalen Einträge</strong><span>Eintrag über den JSON-Editor hinzufügen.</span></div>}
          {registers[activeType].map((record) => (
            <div key={record.id}>
              <strong>{record.id}</strong>
              <span>{'label' in record ? record.label : 'statement' in record ? record.statement : 'description' in record ? record.description : record.decision_title}</span>
              <div className="local-register-actions">
                <button className="filter-pill" onClick={() => editRecord(record)} type="button">Edit</button>
                <button
                  className="filter-pill"
                  onClick={() => setRegisters((current) => deleteLocalRegisterRecord(current, activeType, record.id))}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <details className="local-register-export">
        <summary>Export local registers JSON</summary>
        <pre>{JSON.stringify(registers, null, 2)}</pre>
      </details>
    </section>
  );
}
