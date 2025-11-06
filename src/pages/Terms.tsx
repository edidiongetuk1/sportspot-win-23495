import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
              GameX – Terms and Conditions
            </h1>
            <p className="text-muted-foreground mb-6">
              Welcome to GameX, a digital platform for gaming and betting entertainment.
              By creating an account or using our services, you agree to the following Terms and Conditions. 
              Please read them carefully before participating.
            </p>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">1. Eligibility</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>You must be 18 years of age or older to register, deposit funds, place wagers, or use any GameX service.</li>
                <li>By using GameX, you confirm that the information you provide is accurate and that you are legally permitted to participate in online betting according to your local laws.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">2. Account Responsibility</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>Each user is allowed only one GameX account.</li>
                <li>You are solely responsible for maintaining the confidentiality of your login details and activities on your account.</li>
                <li>GameX will not be liable for any loss arising from unauthorized account use.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">3. Wager Rules and Refund Policy</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>Once a wager is created, the amount placed will be held until the event concludes.</li>
                <li>If <strong>no clear winner is determined</strong> in a wager or event, <strong>50% of the initial deposit</strong> will be refunded to each participant.</li>
                <li>Refunds will be credited back to the user's <strong>GameX wallet</strong> within a reasonable processing period.</li>
                <li>GameX reserves the right to review and validate any wager result before final settlement.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">4. Withdrawals</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>Withdrawals are <strong>initiated by the user only</strong> from their GameX account.</li>
                <li>Processing time for withdrawals is <strong>a minimum of 24 hours and a maximum of 48 hours</strong> from the time of request.</li>
                <li>GameX is not responsible for additional delays caused by third-party payment processors or banks.</li>
                <li>Users must ensure their payment details are correct to avoid failed transactions.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">5. Deposits and Balances</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>All deposits must be made through GameX's approved payment channels.</li>
                <li>Deposited funds are non-transferable and may only be used for wagers within the platform.</li>
                <li>Suspicious or fraudulent transactions may lead to account suspension or closure.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">6. Responsible Gaming</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>GameX promotes <strong>fair play and responsible betting</strong>.</li>
                <li>Users are encouraged to bet responsibly and not exceed their financial limits.</li>
                <li>GameX reserves the right to suspend or restrict accounts showing signs of misuse, addiction, or fraud.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">7. Fair Play and Anti-Fraud</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>Any attempt to manipulate game outcomes, use automated scripts, or exploit system vulnerabilities is strictly prohibited.</li>
                <li>Violations will result in <strong>permanent account suspension</strong> and potential forfeiture of funds.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">8. Data Protection and Privacy</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>GameX collects only the information necessary to operate the platform securely.</li>
                <li>Personal and financial data are handled in accordance with our <strong>Privacy Policy</strong> and applicable data protection laws.</li>
                <li>GameX will never sell or share your personal data without your consent.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">9. Dispute Resolution</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>In the event of any dispute, users are encouraged to contact <strong>GameX Support</strong> via official channels.</li>
                <li>GameX's decision regarding wager outcomes or account matters shall be considered final, unless otherwise required by law.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">10. Amendments</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>GameX reserves the right to <strong>modify, update, or replace</strong> these Terms and Conditions at any time.</li>
                <li>Continued use of the platform after any update constitutes acceptance of the revised terms.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">11. Legal Disclaimer</h2>
              <ul className="list-disc list-inside space-y-2 text-foreground/90">
                <li>GameX provides gaming entertainment only where it is legally permitted.</li>
                <li>Users are responsible for ensuring compliance with local laws before participating.</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3 text-primary">12. Contact Us</h2>
              <p className="text-foreground/90">
                For inquiries or support, please contact us at:{" "}
                <a href="mailto:gamexsuppo@gmail.com" className="text-primary hover:underline">
                  gamexsuppo@gmail.com
                </a>
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
