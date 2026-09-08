"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QrCode, Download } from "lucide-react"

type Mode = "register" | "login"

export function QRShare() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("register")

  const origin = typeof window !== "undefined" ? window.location.origin : "https://abilispace.org"
  const targetUrl = `${origin}/${mode}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(targetUrl)}`

  function handleDownload() {
    const link = document.createElement("a")
    link.href = qrSrc + "&format=png"
    link.download = `abilispace-${mode}-qr.png`
    link.target = "_blank"
    link.click()
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 px-6 py-3 h-auto font-medium"
        aria-label="Show QR code to share"
      >
        <QrCode className="h-4 w-4" aria-hidden="true" />
        Share via QR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>Scan to Join Abilispace</DialogTitle>
          </DialogHeader>

          {/* Toggle between Sign Up / Sign In */}
          <div className="flex rounded-md border overflow-hidden mx-auto w-fit">
            <button
              onClick={() => setMode("register")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode("login")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Sign In
            </button>
          </div>

          {/* QR Code image */}
          <div className="flex justify-center p-3 bg-white rounded-xl border mx-auto">
            <Image
              src={qrSrc}
              alt={`QR code to ${mode === "register" ? "sign up for" : "sign in to"} Abilispace`}
              width={200}
              height={200}
              unoptimized
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Scan with your phone camera to {mode === "register" ? "create an account" : "sign in"}
          </p>

          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 mx-auto w-fit">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download QR
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
