import SiteNavbar from "@/components/common/SiteNavbar";
import { SeoHead } from "@/components/common/SeoHead";

const ZoomIntegration = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar />
      <div className="h-16" />
      <SeoHead
        title="Zoom Integration Guide | Ebdaey"
        description="How to add, use, and remove the Ebdaey Zoom integration."
        path="/zoom-integration"
      />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16" dir="ltr">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Ebdaey Zoom Integration
          </h1>
          <p className="text-muted-foreground text-sm">
            Guide to installing, using, and removing the Ebdaey Zoom app.
          </p>
        </div>

        <div className="space-y-10 text-start">
          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ebdaey is a learning marketplace where mentors sell live courses and one-on-one
              consultations. The Zoom integration lets mentors automatically create Zoom meetings
              for their live courses and consultation sessions, and share the join links with
              enrolled students.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Prerequisites</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>An active Ebdaey mentor account (sign up at <a href="https://ebdaey.com" className="text-primary hover:underline">ebdaey.com</a>).</li>
              <li>A Zoom account with permission to create meetings.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">How to add the app</h2>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
              <li>Sign in to your Ebdaey mentor dashboard at <a href="https://ebdaey.com/app/dashboard" className="text-primary hover:underline">ebdaey.com/app/dashboard</a>.</li>
              <li>Open the <strong>Integrations</strong> section from the sidebar.</li>
              <li>Click <strong>Connect Zoom</strong>. You will be redirected to Zoom to sign in and authorize Ebdaey.</li>
              <li>Review the requested permissions and click <strong>Allow</strong>.</li>
              <li>You will be redirected back to Ebdaey with a confirmation that Zoom is connected.</li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">How to use the app</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>When you create a live course session or a consultation slot in Ebdaey, a Zoom meeting is created automatically in your Zoom account.</li>
              <li>The Zoom join link is shared with the enrolled student(s) via email and inside their Ebdaey student dashboard.</li>
              <li>You can view all upcoming meetings under <strong>Upcoming Appointments</strong> in your mentor dashboard.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">How to remove the app</h2>
            <p className="text-muted-foreground">You can disconnect the Zoom integration in two ways:</p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>From Ebdaey:</strong> Go to <em>Mentor Dashboard → Integrations</em>, find
                the Zoom card, and click <strong>Disconnect</strong>. Ebdaey will revoke your
                access token and delete stored Zoom credentials.
              </li>
              <li>
                <strong>From Zoom:</strong> Sign in to the{" "}
                <a href="https://marketplace.zoom.us/user/installed" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Zoom Marketplace</a>,
                find <em>Ebdaey</em> under <strong>Installed Apps</strong>, and click{" "}
                <strong>Remove</strong>.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Scopes we request</h2>
            <p className="text-muted-foreground">
              Ebdaey requests only the scopes required for the integration to work:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <code className="text-foreground font-mono text-sm">user:read:user</code> — called
                once during connection (<em>GET /users/me</em>) to read the Zoom user ID and email of
                the account being connected, so meetings are created under the correct host.
              </li>
              <li>
                <code className="text-foreground font-mono text-sm">meeting:write:meeting</code> —
                called when a mentor schedules a live course session, consultation, or session
                bundle booking (<em>POST /users/&#123;userId&#125;/meetings</em>) to create the Zoom
                meeting and obtain the join URL shared with enrolled students.
              </li>
              <li>
                Host-only security settings (waiting room on, join-before-host off, participants
                muted on entry, no alternative hosts) are included in the same create request, so no
                additional read or update permissions are requested.
              </li>

            </ul>
            <p className="text-muted-foreground">
              Ebdaey does not read participants, registrants, recordings, transcripts, chat, or
              account settings, and never touches meetings it did not create.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Data used</h2>
            <p className="text-muted-foreground">
              Ebdaey uses only the minimum Zoom data required to create and secure meetings and share
              join links: your Zoom user ID, encrypted access/refresh tokens, and the meeting IDs,
              join URLs, and host start URLs we create on your behalf. See our{" "}
              <a href="https://ebdaey.com/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>{" "}
              for full details, including how to request access to or deletion of your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Troubleshooting</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Meeting link missing:</strong> open the session in your mentor dashboard; the
                meeting is created automatically on first view if it was not created earlier.
              </li>
              <li>
                <strong>Students can join before you, or appear to have host controls:</strong>
                {" "}disconnect and reconnect Zoom once so the updated permissions are granted, then
                reopen the session. Security settings are re-applied automatically to upcoming
                meetings.
              </li>
              <li>
                <strong>Connection expired:</strong> reconnect Zoom from{" "}
                <em>Mentor Dashboard → Integrations</em>.
              </li>
            </ul>
          </section>



          <section className="space-y-3">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-3">Support</h2>
            <p className="text-muted-foreground">
              For any help with the integration, contact us at{" "}
              <a href="mailto:support@ebdaey.com" className="text-primary hover:underline">support@ebdaey.com</a>{" "}
              or visit our <a href="https://ebdaey.com/contact" className="text-primary hover:underline">contact page</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ZoomIntegration;
