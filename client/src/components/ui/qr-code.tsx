import * as React from "react"
import QRCode from "qrcode"
import { cn } from "@/lib/utils"

interface QRCodeProps extends React.HTMLAttributes<HTMLDivElement> {
  data: string
  size?: number
  level?: "L" | "M" | "Q" | "H"
  includeMargin?: boolean
}

export const QRCodeDisplay = React.forwardRef<HTMLDivElement, QRCodeProps>(
  ({ data, size = 128, level = "M", includeMargin = true, className, ...props }, ref) => {
    const [qrDataUrl, setQrDataUrl] = React.useState<string>("")
    const [error, setError] = React.useState<string>("")

    React.useEffect(() => {
      const generateQR = async () => {
        try {
          const url = await QRCode.toDataURL(data, {
            width: size,
            margin: includeMargin ? 4 : 0,
            errorCorrectionLevel: level,
          })
          setQrDataUrl(url)
          setError("")
        } catch (err) {
          setError("Failed to generate QR code")
          console.error("QR Code generation error:", err)
        }
      }

      generateQR()
    }, [data, size, level, includeMargin])

    if (error) {
      return (
        <div
          ref={ref}
          className={cn("flex items-center justify-center p-4 text-destructive", className)}
          {...props}
        >
          {error}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="QR Code"
            width={size}
            height={size}
            className="rounded-lg"
          />
        )}
      </div>
    )
  }
)

QRCodeDisplay.displayName = "QRCodeDisplay"

export { QRCodeDisplay as QRCode }
