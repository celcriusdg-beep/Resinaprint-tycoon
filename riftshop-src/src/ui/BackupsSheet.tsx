import { useState } from 'react';
import { fmt } from '../game/economy';
import { MAX_LEVEL } from '../game/progression';
import { act, exportSave, listBackups, restoreSave, useStore } from '../store';
import { Button, Modal } from './common';

/** Backups kept on this phone, export/import, and putting lost progress back. */
export function BackupsSheet({ onClose }: { onClose: () => void }) {
  const say = useStore((s) => s.say);
  const g = useStore((s) => s.g);
  const backups = listBackups();
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [level, setLevel] = useState(g.level);
  const [cash, setCash] = useState(Math.round(g.cash));
  const restore = (data: string) => {
    if (!confirm('Load this save? Your current game is backed up first.')) return;
    const err = restoreSave(data);
    if (err) say(err, true);
  };
  const copy = async () => {
    const data = exportSave();
    try {
      await navigator.clipboard.writeText(data);
      say('Save copied — paste it into Notes to keep it safe.');
    } catch {
      setText(data);
      setImporting(true);
      say('Copy the text in the box below.', true);
    }
  };
  return (
    <Modal title="💾 Backups" onClose={onClose}>
      <p className="muted small">The game keeps a copy of your save every shop day, before updates and before a restore. Tap one to go back to it.</p>
      {backups.length === 0 && <p className="muted small">No backups yet — one is made at the end of each shop day.</p>}
      <div className="backups">
        {backups.map((b) => (
          <div key={b.at + b.label} className="backup-row">
            <div>
              <b>{b.label}</b>
              <span className="muted small">{new Date(b.at).toLocaleString()} · {b.level ? `level ${b.level} · ${fmt(b.cash)} · day ${b.day}` : 'unreadable'}</span>
            </div>
            <Button small onClick={() => restore(b.data)}>Restore</Button>
          </div>
        ))}
      </div>

      <h3 className="build-h">Keep your own copy</h3>
      <div className="row">
        <Button small onClick={copy}>Copy save</Button>
        <Button small kind="ghost" onClick={() => setImporting((v) => !v)}>Paste a save</Button>
      </div>
      {importing && (
        <div className="import">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a copied save here" rows={4} />
          <Button kind="primary" small disabled={!text.trim()} onClick={() => restore(text.trim())}>Load this save</Button>
        </div>
      )}

      <h3 className="build-h">Lost progress?</h3>
      <p className="muted small">If a save got lost before backups existed, set your level and cash back to what you had.</p>
      <div className="recover">
        <label>Level <input inputMode="numeric" value={level} onChange={(e) => setLevel(Math.max(1, Math.min(MAX_LEVEL, parseInt(e.target.value) || 1)))} /></label>
        <label>Cash $ <input inputMode="numeric" value={cash} onChange={(e) => setCash(Math.max(0, parseInt(e.target.value) || 0))} /></label>
        <Button kind="gold" small onClick={() => {
          if (!confirm(`Set level ${level} and ${fmt(cash)} cash?`)) return;
          act((s) => { s.level = level; s.xp = 0; s.levelUps = []; s.cash = cash; s.bestWorth = Math.max(s.bestWorth, cash); });
          say('Progress restored.');
          onClose();
        }}>Set</Button>
      </div>
    </Modal>
  );
}
