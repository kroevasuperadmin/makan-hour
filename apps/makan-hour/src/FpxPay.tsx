import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { billStatus, createBill, PayNotConfigured, rm } from '@makan/core';
import { Button, Card, color, Gap, Row, T, Icon, space } from '@makan/ui';

type Props = { kind: 'invoice' | 'topup'; payRef: string; amountSen: number; name: string; email: string; description: string; label: string;
  onPaid: (billId: string) => void; onUnavailable?: () => void; kindOfButton?: 'primary' | 'accent' | 'secondary'; testID?: string };

// Creates a Billplz bill on our server, opens the FPX page, then polls until Billplz says it's paid.
export default function FpxPay(p: Props) {
  const [bill, setBill] = useState<{ id: string; url: string; sandbox: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [off, setOff] = useState(false);

  useEffect(() => {
    if (!bill) return;
    let stop = false;
    const tick = async () => {
      try { const st = await billStatus(bill.id); if (st.paid && !stop) { stop = true; p.onPaid(bill.id); } } catch { /* keep polling */ }
    };
    const t = setInterval(tick, 4000); tick();
    return () => { stop = true; clearInterval(t); };
  }, [bill?.id]);

  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const b = await createBill({ kind: p.kind, ref: p.payRef, amountSen: p.amountSen, name: p.name, email: p.email, description: p.description });
      setBill(b); await Linking.openURL(b.url);
    } catch (e) {
      if (e instanceof PayNotConfigured) setOff(true); else setErr(e instanceof Error ? e.message : 'Payment failed to start');
    } finally { setBusy(false); }
  };

  if (off) return (
    <Card tone="warn">
      <T v="h2" style={{ color: color.warn }}>FPX isn't switched on yet</T>
      <T v="small" style={{ color: color.warn }}>The payment server has no Billplz merchant keys. Nothing was charged.</T>
      {p.onUnavailable && <><Gap h={space.m} /><Button testID="fpx-mock" kind="secondary" label="Walk through the mock flow instead" onPress={p.onUnavailable} /></>}
    </Card>
  );
  if (bill) return (
    <Card tone="info">
      <Row style={{ gap: space.s }}><Icon name="clock" size={16} c={color.info} /><T v="h2" style={{ color: color.info }}>Waiting for your bank</T></Row>
      <T v="small" style={{ color: color.info }}>Finish paying {rm(p.amountSen)} on the FPX page. This updates by itself once Billplz confirms{bill.sandbox ? ' (Billplz sandbox, no real money)' : ''}.</T>
      <Gap h={space.m} />
      <Row style={{ gap: space.s }}>
        <Button kind="secondary" label="Open FPX page again" onPress={() => Linking.openURL(bill.url)} />
        <Button kind="ghost" label="Cancel" onPress={() => setBill(null)} />
      </Row>
    </Card>
  );
  return (
    <View>
      <Button testID={p.testID} kind={p.kindOfButton ?? 'primary'} icon="building" label={busy ? 'Opening FPX…' : p.label} disabled={busy} onPress={start} />
      {err && <T v="small" style={{ color: color.danger, marginTop: space.xs }}>{err}</T>}
    </View>
  );
}
