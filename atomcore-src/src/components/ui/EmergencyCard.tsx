import { useEffect, useRef } from 'react';
import { useGame } from '../../stores/gameStore';
import { useUI } from '../../stores/uiStore';
import { EMERGENCIES, preparedness } from '../../game/accidents/accidents';
import { LOCATION_BY_ID } from '../../game/progression/locations';
import { endpointWorld } from '../../game/network/network';
import { run, A, haptic } from '../../ui/actions';
import { audio } from '../../systems/audio/audio';
import { Icon } from './Icons';

// Alarm card for the oldest active emergency: what happened, a countdown and
// the possible responses. Ignoring it leaves the automatic systems to respond.

export function EmergencyCard() {
  const g = useGame();
  const e = g.emergencies.find((x) => x.started <= g.gameTime);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!e || seen.current === e.id) return;
    seen.current = e.id;
    audio.sfx('alarm');
    haptic(80);
  }, [e]);
  if (!e) return null;
  const def = EMERGENCIES[e.kind];
  const site = g.sites[e.siteId];
  const left = Math.max(0, e.deadline - g.gameTime);
  const prep = site ? preparedness(g, site) : 0;
  const where = e.target >= 0 && site ? endpointWorld(site, e.target) : null;
  const choose = (opt: string | null) => {
    if (g.activeSite !== e.siteId) run((s) => A.switchSite(s, e.siteId), { structural: true, sound: null });
    run((s) => A.respondEmergency(s, e.id, opt), { structural: true, sound: 'click' });
  };
  const more = g.emergencies.filter((x) => x.started <= g.gameTime).length - 1;
  return (
    <div className="emergency" role="alertdialog" aria-labelledby="em-title">
      <div className="em-head">
        <Icon name="scram" size={22} />
        <div className="em-titles">
          <div id="em-title" className="em-title">{def.title}</div>
          <div className="em-sub">{LOCATION_BY_ID[e.siteId]?.name}{more > 0 ? ` · +${more} more` : ''} · preparedness {Math.round(prep * 100)}%</div>
        </div>
        <div className="em-time mono">{Math.ceil(left)} s</div>
      </div>
      <div className="em-bar"><div style={{ width: `${(left / def.countdown) * 100}%` }} /></div>
      <p className="em-text">{def.describe(g, e)}</p>
      <div className="em-options">
        {def.options.map((o) => (
          <button key={o.id} type="button" className="em-opt" onClick={() => choose(o.id)}>
            <b>{o.label}</b>
            <span>{o.detail}</span>
          </button>
        ))}
      </div>
      <div className="em-foot">
        <span className="muted small">If you do nothing: {def.autoText}</span>
        {where && (
          <button type="button" className="linklike small" onClick={() => {
            if (g.activeSite !== e.siteId) run((s) => A.switchSite(s, e.siteId), { structural: true, sound: null });
            useUI.getState().cameraCmd({ kind: 'focus', x: where[0], z: where[1], distance: 35 });
          }}>Show</button>
        )}
      </div>
    </div>
  );
}
