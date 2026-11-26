import { useRef, useState } from 'react';
import { useSettings, resolveQuality, type Quality } from '../../stores/settingsStore';
import { useGameStore } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { encodeSave, decodeSave } from '../../systems/save/serialize';
import { wipeSave } from '../../systems/save/storage';
import { getCloudProvider } from '../../systems/save/cloud';
import { persist } from '../../systems/loop';
import { createInitialState } from '../../game/state';
import { Button, Section, Slider, Toggle, Tabs } from '../ui/common';
import { confirm } from '../../ui/actions';
import { audio } from '../../systems/audio/audio';
import { TIPS, showTip } from '../ui/Tips';
import { Icon } from '../ui/Icons';

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function SettingsPanel() {
  const s = useSettings();
  const lastSaved = useGameStore((x) => x.lastSavedAt);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cloud = getCloudProvider();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;

  const exportCode = async () => {
    const c = encodeSave(useGameStore.getState().game);
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg('Save code copied to the clipboard. Paste it into Import on your other device.');
    } catch {
      setMsg('Save code shown below — select and copy it.');
    }
  };

  const download = () => {
    const c = encodeSave(useGameStore.getState().game);
    const blob = new Blob([c], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `atomcore-save-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const importCode = (text: string) => {
    try {
      const state = decodeSave(text);
      confirm('Load this save?', `Company level ${state.level}, ${state.unlockedSites.length} site(s). Your current progress on this device will be replaced.`, 'Load save', () => {
        useGameStore.getState().setGame(state);
        useUI.getState().select(null);
        void persist();
        setMsg('Save loaded.');
      }, true);
    } catch (e) {
      setMsg((e as Error).message);
      audio.sfx('error');
    }
  };

  return (
    <div className="panel-stack">
      <Section title="Audio">
        <Toggle label="Mute all" on={s.muted} onChange={(v) => s.set({ muted: v })} />
        <Slider label="Master" value={s.master} onChange={(v) => s.set({ master: v })} format={pct} />
        <Slider label="Effects" value={s.sfx} onChange={(v) => s.set({ sfx: v })} format={pct} />
        <Slider label="Plant ambience" value={s.ambience} onChange={(v) => s.set({ ambience: v })} format={pct} />
        <Slider label="Music" value={s.music} onChange={(v) => s.set({ music: v })} format={pct} />
      </Section>
      <Section title="Graphics">
        <Tabs<Quality> value={s.quality} onChange={(q) => s.set({ quality: q })}
          tabs={[{ id: 'auto', label: `Auto (${resolveQuality('auto')})` }, { id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]} />
        <div className="muted small">Low: no shadows or bloom (best battery). High: soft shadows, bloom, more particles.</div>
        <Toggle label="Building labels" on={s.showLabels} onChange={(v) => s.set({ showLabels: v })} sub="Coloured tags over buildings: icon + name when zoomed in, icon only when zoomed out" />
        <Toggle label="Day / night cycle" on={s.dayNight} onChange={(v) => s.set({ dayNight: v })} sub="Lighting follows the in-game day" />
        <Toggle label="Auto-adjust resolution" on={s.adaptiveRes} onChange={(v) => s.set({ adaptiveRes: v })}
          sub="Lowers sharpness a little when the frame rate drops. Turn off for a fixed, always-sharp picture (uses more battery)." />
        <Toggle label="Show FPS" on={s.showFps} onChange={(v) => s.set({ showFps: v })} />
        <Toggle label="Vibration feedback" on={s.haptics} onChange={(v) => s.set({ haptics: v })} sub="Where the device supports it" />
      </Section>
      <Section title="Help & tips">
        <div className="tip-list">
          {TIPS.map((t) => (
            <button key={t.id} type="button" className="tip-row" onClick={() => showTip(t.id)}>
              <Icon name={t.icon} size={16} /> <span>{t.title}</span> <Icon name="help" size={15} />
            </button>
          ))}
        </div>
        <Button small variant="ghost" onClick={() => useSettings.getState().set({ seenTips: [] })}>Show all tips again as I play</Button>
      </Section>
      <Section title="Save game">
        <div className="muted small">Progress saves automatically every 15 s and when you leave the app. Last saved: {lastSaved ? new Date(lastSaved).toLocaleTimeString() : '—'}</div>
        <div className="action-grid">
          <Button icon="check" onClick={async () => { await persist(); setMsg('Game saved.'); audio.sfx('complete'); }}>Save now</Button>
          <Button icon="upload" onClick={exportCode}>Export code</Button>
          <Button icon="download" onClick={download}>Download file</Button>
          <Button icon="upload" onClick={() => fileRef.current?.click()}>Load file</Button>
        </div>
        <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) importCode(await f.text());
          e.target.value = '';
        }} />
        <textarea className="code-box" placeholder="Paste a save code here to import it…" value={code} onChange={(e) => setCode(e.target.value)} rows={3} />
        <Button wide disabled={!code.trim()} onClick={() => importCode(code)}>Import from code</Button>
        {msg && <div className="hint-box">{msg}</div>}
        <div className="muted small">Moving between iPhone and PC: Export code on one device, paste it into Import on the other.</div>
      </Section>
      <Section title="Cloud save">
        <div className="muted small">Status: <b>{cloud.isConfigured() ? cloud.name : 'Not available yet'}</b>. The save system is built to plug in a cloud provider later; until then use Export / Import above.</div>
      </Section>
      <Section title="Install on your phone">
        {standalone ? <div className="small good">ATOMCORE is running as an installed app.</div> : (
          <div className="small">
            {isIOS ? <>In Safari tap <b>Share</b> → <b>Add to Home Screen</b>. ATOMCORE then opens full screen and works offline.</> :
              <>Use your browser's <b>Install app</b> / <b>Add to Home screen</b> option. On iPhone use Safari → Share → Add to Home Screen.</>}
          </div>
        )}
      </Section>
      <Section title="Danger zone">
        <Button variant="danger" wide onClick={() => confirm('Start a new game?', 'This permanently deletes all progress on this device, including shares and achievements. Export a save code first if you want a backup.', 'Delete everything', async () => {
          await wipeSave();
          useGameStore.getState().setGame(createInitialState());
          useUI.getState().select(null);
          await persist();
        }, true)}>Reset game</Button>
      </Section>
      <p className="muted small center">ATOMCORE v{__APP_VERSION__} · An educational tycoon game. Reactor physics are simplified for play and are not engineering guidance.</p>
    </div>
  );
}
