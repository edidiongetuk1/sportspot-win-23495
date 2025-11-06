import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="p-6 md:p-8 bg-card/80 backdrop-blur-lg border-primary/20">
          <div className="prose prose-invert max-w-none">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              GameX – Privacy Policy
            </h1>
            <p className="text-muted-foreground mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <p className="text-foreground/90 mb-6">
              At GameX, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-2 text-primary/80">Personal Information</h3>
              <p className="text-foreground/90 mb-3">
                When you register on GameX, we collect the following personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 mb-4">
                <li>Email address</li>
                <li>Account password (encrypted)</li>
                <li>Payment information (processed securely through third-party payment providers)</li>
                <li>Transaction history and betting activity</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 text-primary/80">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, time spent, features used)</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Location data (if you grant permission)</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">2. How We Use Your Information</h2>
              <p className="text-foreground/90 mb-3">We use your information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li><strong>Account Management:</strong> To create and manage your GameX account</li>
                <li><strong>Transaction Processing:</strong> To process deposits, withdrawals, and wagers</li>
                <li><strong>Communication:</strong> To send you important updates, notifications, and promotional offers</li>
                <li><strong>Security:</strong> To detect and prevent fraud, abuse, and unauthorized access</li>
                <li><strong>Compliance:</strong> To comply with legal obligations and regulatory requirements</li>
                <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve our services</li>
                <li><strong>Customer Support:</strong> To respond to your inquiries and provide assistance</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">3. Information Sharing and Disclosure</h2>
              <p className="text-foreground/90 mb-3">
                We do not sell your personal information to third parties. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li><strong>Service Providers:</strong> With trusted third-party service providers who assist in operating our platform (payment processors, hosting services, analytics providers)</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>Consent:</strong> When you have given explicit consent to share your information</li>
                <li><strong>Protection:</strong> To protect the rights, property, or safety of GameX, our users, or others</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">4. Data Security</h2>
              <p className="text-foreground/90 mb-3">
                We implement robust security measures to protect your information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>Encryption of sensitive data using industry-standard protocols (SSL/TLS)</li>
                <li>Secure password storage with advanced hashing algorithms</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Monitoring for suspicious activity and potential security breaches</li>
              </ul>
              <p className="text-foreground/90 mt-3">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your information, 
                we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">5. Cookies and Tracking Technologies</h2>
              <p className="text-foreground/90 mb-3">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li><strong>Essential Cookies:</strong> Required for the platform to function properly</li>
                <li><strong>Performance Cookies:</strong> Help us analyze how users interact with our platform</li>
                <li><strong>Functionality Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Advertising Cookies:</strong> Used to deliver relevant advertisements</li>
              </ul>
              <p className="text-foreground/90 mt-3">
                You can control cookie settings through your browser preferences, but disabling certain cookies may affect 
                platform functionality.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">6. Data Retention</h2>
              <p className="text-foreground/90">
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>Provide our services and maintain your account</li>
                <li>Comply with legal and regulatory obligations</li>
                <li>Resolve disputes and enforce our agreements</li>
                <li>Prevent fraud and maintain security</li>
              </ul>
              <p className="text-foreground/90 mt-3">
                After account closure, we may retain certain information for a reasonable period to comply with legal requirements.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">7. Your Privacy Rights</h2>
              <p className="text-foreground/90 mb-3">You have the following rights regarding your personal information:</p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
                <li><strong>Data Portability:</strong> Request your data in a structured, machine-readable format</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where consent was given</li>
              </ul>
              <p className="text-foreground/90 mt-3">
                To exercise these rights, please contact us at{" "}
                <a href="mailto:gamexsuppo@gmail.com" className="text-primary hover:underline">
                  gamexsuppo@gmail.com
                </a>
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">8. Children's Privacy</h2>
              <p className="text-foreground/90">
                GameX is not intended for users under 18 years of age. We do not knowingly collect personal information 
                from children. If we discover that we have inadvertently collected information from a minor, we will 
                delete it immediately.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">9. International Data Transfers</h2>
              <p className="text-foreground/90">
                Your information may be transferred to and processed in countries other than your country of residence. 
                We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy 
                and applicable data protection laws.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">10. Third-Party Links</h2>
              <p className="text-foreground/90">
                Our platform may contain links to third-party websites or services. We are not responsible for the privacy 
                practices of these external sites. We encourage you to review their privacy policies before providing any 
                personal information.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">11. Changes to This Privacy Policy</h2>
              <p className="text-foreground/90">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
                We will notify you of significant changes by posting the updated policy on our platform and updating the 
                "Last updated" date. Continued use of GameX after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">12. Contact Us</h2>
              <p className="text-foreground/90">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                please contact us at:
              </p>
              <p className="text-foreground/90 mt-2">
                <strong>Email:</strong>{" "}
                <a href="mailto:gamexsuppo@gmail.com" className="text-primary hover:underline">
                  gamexsuppo@gmail.com
                </a>
              </p>
            </section>

            <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground/90">
                <strong>Your Privacy Matters:</strong> At GameX, we are committed to transparency and protecting your rights. 
                If you have any concerns about how your data is handled, please don't hesitate to reach out to us.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
