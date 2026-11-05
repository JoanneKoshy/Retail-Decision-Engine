// Chart colours. No green anywhere, per the brief.
export const C = {
  blue: '#0073ea',
  blueLight: '#7fb6f5',
  purple: '#a25ddc',
  amber: '#fdab3d',
  coral: '#e2445c',
  grey: '#a8adb7',
  greyLight: '#e3e5ea',
  text: '#323338',
  muted: '#676879',
  grid: '#e6e9ef',
}

export const toneColor = {
  go: C.blue,
  caution: C.amber,
  stop: C.coral,
  neutral: C.grey,
  info: C.purple,
}

export const axisProps = {
  tick: { fill: C.muted, fontSize: 12 },
  axisLine: { stroke: C.grid },
  tickLine: false,
}
