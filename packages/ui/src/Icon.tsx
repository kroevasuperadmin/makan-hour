import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from './theme';

export type IconName = 'check' | 'clock' | 'pin' | 'users' | 'receipt' | 'truck' | 'alert' | 'lock' | 'chevron' | 'printer' | 'building' | 'bowl' | 'bell' | 'shield' | 'refresh';
export function Icon({ name, size = 20, c = color.ink, w = 2 }: { name: IconName; size?: number; c?: string; w?: number }) {
  const p = { stroke: c, strokeWidth: w, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'check' && <Path d="M4.5 12.5l5 5L19.5 7" {...p} />}
      {name === 'clock' && <><Circle cx="12" cy="12" r="8.5" {...p} /><Path d="M12 7.5V12l3 2" {...p} /></>}
      {name === 'pin' && <><Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" {...p} /><Circle cx="12" cy="10" r="2.3" {...p} /></>}
      {name === 'users' && <><Circle cx="9" cy="8.5" r="3.2" {...p} /><Path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 5.5a3 3 0 010 6M18 14.5c1.6.6 2.7 2.2 3 4.5" {...p} /></>}
      {name === 'receipt' && <><Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" {...p} /><Path d="M9 8h6M9 12h6" {...p} /></>}
      {name === 'truck' && <><Path d="M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5V16h-7" {...p} /><Circle cx="7" cy="17.5" r="1.8" {...p} /><Circle cx="17" cy="17.5" r="1.8" {...p} /></>}
      {name === 'alert' && <><Path d="M12 3.5l9.5 16.5h-19z" {...p} /><Path d="M12 10v4.5M12 17.3v.2" {...p} /></>}
      {name === 'lock' && <><Rect x="5" y="10.5" width="14" height="10" rx="1.5" {...p} /><Path d="M8 10.5V7.5a4 4 0 018 0v3" {...p} /></>}
      {name === 'chevron' && <Path d="M9 5l7 7-7 7" {...p} />}
      {name === 'printer' && <><Path d="M7 9V3.5h10V9M7 17H4.5V9.5h15V17H17" {...p} /><Rect x="7" y="14" width="10" height="6.5" {...p} /></>}
      {name === 'building' && <><Path d="M4.5 21V4h10v17M14.5 9h5v12M2.5 21h19" {...p} /><Path d="M8 8h3M8 12h3M8 16h3" {...p} /></>}
      {name === 'bowl' && <><Path d="M3 11.5h18a9 9 0 01-18 0z" {...p} /><Path d="M9 7.5c0-1.5 1.5-1.5 1.5-3M13.5 7.5c0-1.5 1.5-1.5 1.5-3" {...p} /></>}
      {name === 'bell' && <><Path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 1.5h-15z" {...p} /><Path d="M10 20.5h4" {...p} /></>}
      {name === 'shield' && <><Path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z" {...p} /><Path d="M8.8 12l2.2 2.2 4.2-4.4" {...p} /></>}
      {name === 'refresh' && <><Path d="M19.5 12a7.5 7.5 0 11-2.2-5.3" {...p} /><Path d="M19.5 4v4h-4" {...p} /></>}
    </Svg>
  );
}
