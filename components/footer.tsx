import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background py-4 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <p className="text-sm text-muted-foreground text-center">
          By messaging dailychatai AI, an AI chatbot, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">
            Terms
          </Link>{" "}
          and have read our{" "}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </footer>
  )
}
