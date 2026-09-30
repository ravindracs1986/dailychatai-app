import Link from "next/link"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/navigation"
import { CONFIG } from "@/config"

export const metadata = {
  title: `Privacy Policy | ${CONFIG.site.name}`,
  description: "Privacy Policy for dailychatai AI Chat.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString("en-US")}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground text-sm">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              Dailychatai AI Chat (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) respects your privacy. This Privacy
              Policy explains how we collect, use, store, and protect your information when you use
              our AI chatbot and related services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p>
              We may collect: (a) information you provide when you register (e.g., username, email,
              password hash, profile picture); (b) messages you send to the chatbot and responses you
              receive; (c) usage data such as how often you use the Service and which features you use;
              (d) technical data such as IP address and browser type when you access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <p>
              We use your information to provide, maintain, and improve the Service; to authenticate
              your account; to enforce usage limits and subscription plans; to send you service-related
              communications (e.g., password reset); and to comply with applicable law. We do not sell
              your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. AI and Third-Party Services</h2>
            <p>
              Your messages may be sent to third-party AI providers (e.g., OpenRouter) to generate
              responses. Those providers have their own privacy practices. We may also use services
              such as Cloudinary for profile pictures and Stripe for payments; their privacy policies
              apply to data they process.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Retention</h2>
            <p>
              We retain your account data and conversation history for as long as your account is
              active or as needed to provide the Service. You may request deletion of your account and
              associated data by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Security</h2>
            <p>
              We use industry-standard measures (e.g., encryption, secure passwords) to protect your
              data. No method of transmission or storage is 100% secure; we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to access, correct, delete, or export
              your personal data, or to object to or restrict certain processing. Contact us via the{" "}
              <Link href="/contact" className="text-primary underline hover:no-underline">
                Contact
              </Link>{" "}
              page to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Changes</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the updated policy on
              this page and indicate the last updated date. Your continued use of the Service after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Contact</h2>
            <p>
              For privacy-related questions, please use our{" "}
              <Link href="/contact" className="text-primary underline hover:no-underline">
                Contact
              </Link>{" "}
              page.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link href="/">
            <Button variant="outline">Back to home</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
