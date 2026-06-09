// Global Xaman sign modal — shows QR code + deeplink button for every payload.
// Triggered via CustomEvent so it works from xaman.ts without React context.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { X, ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { XamanPayload } from '@/lib/xaman';

export const XAMAN_MODAL_OPEN = 'xaman:open';
export const XAMAN_MODAL_CLOSE = 'xaman:close';

export function emitXamanOpen(payload: XamanPayload) {
  window.dispatchEvent(new CustomEvent(XAMAN_MODAL_OPEN, { detail: payload }));
}
export function emitXamanClose() {
  window.dispatchEvent(new CustomEvent(XAMAN_MODAL_CLOSE));
}

export function XamanModal() {
  const [payload, setPayload] = useState<XamanPayload | null>(null);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setQrError(false);
      setPayload((e as CustomEvent<XamanPayload>).detail);
    };
    const onClose = () => setPayload(null);
    window.addEventListener(XAMAN_MODAL_OPEN, onOpen);
    window.addEventListener(XAMAN_MODAL_CLOSE, onClose);
    return () => {
      window.removeEventListener(XAMAN_MODAL_OPEN, onOpen);
      window.removeEventListener(XAMAN_MODAL_CLOSE, onClose);
    };
  }, []);

  if (!payload) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-background shadow-2xl">
        <button
          onClick={() => setPayload(null)}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-base font-semibold">
            <Smartphone className="h-5 w-5 text-accent" />
            Sign in Xaman
          </div>

          <p className="text-sm text-muted-foreground">
            Scan this QR code with the <strong>Xaman</strong> app on your phone, or tap the button below if you're on mobile.
          </p>

          {/* QR code from Xaman */}
          <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-lg border border-border bg-white p-1">
            {!qrError ? (
              <img
                src={payload.refs.qr_png}
                alt="Xaman QR code"
                className="h-full w-full object-contain"
                onError={() => setQrError(true)}
              />
            ) : (
              <span className="text-xs text-muted-foreground">QR unavailable</span>
            )}
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => window.open(payload.next.always, '_blank', 'noopener')}
          >
            <ExternalLink className="h-4 w-4" />
            Open in Xaman app
          </Button>

          <p className="text-[11px] text-muted-foreground">
            This dialog closes automatically once you sign or cancel.
          </p>
        </div>
      </div>
    </div>
  );
}
