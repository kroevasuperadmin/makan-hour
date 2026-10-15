import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { checkoutStatus, createCheckout, PayNotConfigured, rm } from '@makan/core';
import { Button, Card, color, Gap, Row, T, Icon, space } from '@makan/ui';

type Props = { kind: 'invoice' | 'topup'; payRef: string; amountSen: number; email: string; description: string; label: string;
  onPaid: (ref: string, method: string | null) => void; onUnavailable?: () => void; kindOfButton?: 'primary' | 'accent' | 'secondary'; testID?: string };

// Opens Stripe Checkout (FPX or card) from our server, then polls until Stripe says it's paid.
export default function PayButton(p: Props) {
  const [bill, setBill] = useState<{ id: string; url: string; test: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [off, setOff] = useState(false);
  const [offMsg, setOffMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!bill) return;
    let stop = false;
    const tick = async () => {
      try { const st = await checkoutStatus(bill.id); if (st.paid && !stop) { stop = true; p.onPaid(st.ref || st.id, st.method); } } catch { /* keep polling */ }
    };
    const t = setInterval(tick, 4000); tick();
    return () => { stop = true; clearInterval(t); };
  }, [bill?.id]);

  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const b = await createCheckout({ kind: p.kind, ref: p.payRef, amountSen: p.amountSen, email: p.email, description: p.description });
      setBill(b); await Linking.openURL(b.url);
    } catch (e) {
      if (e instanceof PayNotConfigured) { setOff(true); setOffMsg(/demo/i.test(e.message) ? 'This is a demo account, so payments use the mock flow and nothing is charged.' : null); } else setErr(e instanceof Error ? e.message : 'Payment failed to start');
    } finally { setBusy(false); }
  };

  const demoNote = offMsg || 'The payment server has no Stripe key yet. Nothing was charged.';
  if (off) return (
    <Card tone="warn">
      <T v="h2" style={{ color: color.warn }}>{offMsg ? 'Demo account: mock payment only' : "Online payment isn't switched on yet"}</T>
      <T v="small" style={{ color: color.warn }}>{demoNote}</T>
      {p.onUnavailable && <><Gap h={space.m} /><Button testID="fpx-mock" kind="secondary" label="Walk through the mock flow instead" onPress={p.onUnavailable} /></>}
    </Card>
  );
  if (bill) return (
    <Card tone="info">
      <Row style={{ gap: space.s }}><Icon name="clock" size={16} c={color.info} /><T v="h2" style={{ color: color.info }}>Waiting for payment</T></Row>
      <T v="small" style={{ color: color.info }}>Finish paying {rm(p.amountSen)} on the Stripe page, by FPX or card. This screen updates once Stripe confirms{bill.test ? ' (Stripe test mode, no real money)' : ''}.</T>
      <Gap h={space.m} />
      <Row style={{ gap: space.s }}>
        <Button kind="secondary" label="Open payment page again" onPress={() => Linking.openURL(bill.url)} />
        <Button kind="ghost" label="Cancel" onPress={() => setBill(null)} />
      </Row>
    </Card>
  );
  return (
    <View>
      <Button testID={p.testID} kind={p.kindOfButton ?? 'primary'} icon="building" label={busy ? 'Opening payment…' : p.label} disabled={busy} onPress={start} />
      {err && <T v="small" style={{ color: color.danger, marginTop: space.xs }}>{err}</T>}
    </View>
  );
}
