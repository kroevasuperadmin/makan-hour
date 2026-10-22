// One switch: MAKAN_OPEN_DEMO=on. The app turns this on at startup from that
// env value. Anything else, including unset, leaves the allow-list and the
// live office data exactly as they are.
let on = false;

export function setOpenDemo(next: boolean) {
  on = next;
}

export function openDemoOn() {
  return on;
}
