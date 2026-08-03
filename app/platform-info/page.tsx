import Link from 'next/link';

const sections = [
  { id: 'about', title: 'About StudyDock', body: 'StudyDock helps students discover and share university study resources while keeping new submissions subject to moderation.' },
  { id: 'guidelines', title: 'Community guidelines', body: 'Upload only material you are authorized to share. Do not upload personal data, confidential assessments, malware, or content that infringes another person’s rights.' },
  { id: 'help', title: 'Help center', body: 'For sign-in problems, first retry email verification or password recovery. For upload problems, keep the error message and request time so an operator can find the redacted server log.' },
  { id: 'updates', title: 'Product updates', body: 'A public update feed has not been launched yet. Release information is maintained with the project repositories.' },
  { id: 'careers', title: 'Careers', body: 'There are no published openings at this time.' },
  { id: 'contact', title: 'Contact', body: 'A production support address must be configured before public launch. Until then, use the repository issue tracker for non-sensitive technical reports only.' },
  { id: 'privacy', title: 'Privacy notice', body: 'The final jurisdiction-specific privacy notice, retention schedule, support contact, and data-controller details require owner and legal approval before production launch.' },
  { id: 'terms', title: 'Terms of use', body: 'Final production terms and the uploader content licence require owner and legal approval before uploads are opened to the public.' },
  { id: 'copyright', title: 'Copyright', body: 'Uploaders must have permission to share their material. A formal copyright-reporting and takedown workflow must be approved before production launch.' },
  { id: 'dmca', title: 'Copyright complaints', body: 'A designated complaint contact and takedown procedure have not yet been published. These are launch-blocking policy items, not an active legal notice.' },
];

export default function PlatformInfoPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Platform information</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Operational guidance is available now. Items that need owner or legal approval are clearly marked so draft text is not mistaken for a production policy.
      </p>
      <div className="mt-10 space-y-5">
        {sections.map((section) => (
          <section id={section.id} key={section.id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-xl font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Return to <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/">StudyDock</Link>.
      </p>
    </main>
  );
}
